const fs=require('fs');
const path=require('path');
const TELEGRAM_URL='https://t.me/s/FabrizioRomanoTG';
const PREFIX='members-transfer:';
const MAX_ITEM_AGE_MS=7*24*60*60*1000;

function siteConfig(){
  const text=fs.readFileSync(path.join(process.cwd(),'config.js'),'utf8');
  const url=(text.match(/SUPABASE_URL:\s*'([^']+)'/)||[])[1];
  const key=(text.match(/SUPABASE_ANON_KEY:\s*'([^']+)'/)||[])[1];
  if(!url||!key)throw new Error('Missing site config');
  return {url,key};
}

function sbHeaders(cfg,extra={}){return {apikey:cfg.key,Authorization:`Bearer ${cfg.key}`,...extra};}

function decode(value=''){
  return String(value)
    .replace(/<br\s*\/?>/gi,'\n')
    .replace(/<[^>]+>/g,'')
    .replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'")
    .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ')
    .replace(/\n{3,}/g,'\n\n').trim();
}

function isFresh(publishedAt){
  const ts=Date.parse(publishedAt||'');
  return Number.isFinite(ts)&&Date.now()-ts<=MAX_ITEM_AGE_MS&&Date.now()-ts>=-60*60*1000;
}

function isTickerEligible(text='',publishedAt){
  const value=String(text||'');
  if(!/\bhere we go\b/i.test(value))return false;
  if(!isFresh(publishedAt))return false;
  if(/\b(podcast|youtube|twitch|giveaway|sponsor(?:ed)?|betting|episode|interview|merch|subscribe)\b/i.test(value))return false;
  return /\b(to|join(?:s|ed|ing)?|sign(?:s|ed|ing)?|move(?:s|d|ing)?|loan|deal|agreement|transfer|contract|extension)\b/i.test(value);
}

function tickerText(value=''){
  let text=String(value||'')
    .replace(/https?:\/\/\S+/gi,' ')
    .replace(/@[A-Za-z0-9_]+/g,' ')
    .replace(/#[A-Za-z0-9_]+/g,' ')
    .replace(/\bFabrizio\s+Romano\b/gi,' ')
    .replace(/\bRomano\b/gi,' ')
    .replace(/\s{2,}/g,' ')
    .trim();
  const here=text.search(/\bhere we go\b/i);
  if(here>=0){
    const after=text.slice(here).match(/[.!?](?:\s|$)/);
    if(after){
      const end=here+after.index+1;
      const next=text.slice(end).match(/^\s*([^.!?]{0,180}[.!?])/);
      text=next?text.slice(0,end+next[0].length):text.slice(0,end);
    }
  }
  if(text.length>280)text=text.slice(0,277).trimEnd()+'…';
  return text.replace(/\s+([,.;!?])/g,'$1').replace(/\s{2,}/g,' ').trim();
}

async function authorised(req,cfg){
  const header=req.headers.authorization||'';
  const token=header.startsWith('Bearer ')?header.slice(7):'';
  if(!token)return false;
  try{
    const r=await fetch(`${cfg.url}/auth/v1/user`,{headers:{apikey:cfg.key,Authorization:`Bearer ${token}`}});
    return r.ok;
  }catch{return false;}
}

function parseTelegram(html=''){
  const blocks=html.split(/<div class="tgme_widget_message_wrap[^>]*>/i).slice(1);
  const items=[];
  for(const block of blocks){
    const post=(block.match(/data-post="FabrizioRomanoTG\/(\d+)"/i)||[])[1];
    const textHtml=(block.match(/<div class="tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/i)||[])[1]||'';
    const rawText=decode(textHtml);
    const publishedAt=(block.match(/<time[^>]+datetime="([^"]+)"/i)||[])[1]||null;
    if(!post||!rawText||!isTickerEligible(rawText,publishedAt))continue;
    const text=tickerText(rawText);
    if(!text)continue;
    items.push({kind:'members-transfer',id:post,text,publishedAt,capturedAt:new Date().toISOString(),link:`https://t.me/FabrizioRomanoTG/${post}`,source:'transfer confirmation feed'});
  }
  return items.sort((a,b)=>new Date(b.publishedAt||0)-new Date(a.publishedAt||0)).slice(0,20);
}

async function alreadySaved(cfg,id){
  const pollId=`${PREFIX}${id}`;
  const url=`${cfg.url}/rest/v1/poll_responses?select=answer&poll_id=eq.${encodeURIComponent(pollId)}&limit=1`;
  const r=await fetch(url,{headers:sbHeaders(cfg),cache:'no-store'});
  if(!r.ok)return false;
  const rows=await r.json();
  return Array.isArray(rows)&&rows.length>0;
}

async function saveItem(cfg,item){
  if(await alreadySaved(cfg,item.id))return false;
  const r=await fetch(`${cfg.url}/rest/v1/poll_responses`,{
    method:'POST',
    headers:sbHeaders(cfg,{'Content-Type':'application/json',Prefer:'return=minimal'}),
    body:JSON.stringify({poll_id:`${PREFIX}${item.id}`,answer:JSON.stringify(item)})
  });
  if(!r.ok)throw new Error(`Supabase ${r.status}`);
  return true;
}

async function captureLatest(cfg){
  const r=await fetch(TELEGRAM_URL,{headers:{'User-Agent':'FootballTalk/1.0 (+https://footballtalk.uk)'},cache:'no-store'});
  if(!r.ok)throw new Error(`Telegram ${r.status}`);
  const items=parseTelegram(await r.text());
  let added=0;
  for(const item of items){if(await saveItem(cfg,item))added++;}
  return {items,added};
}

async function storedItems(cfg){
  const url=`${cfg.url}/rest/v1/poll_responses?select=poll_id,answer&poll_id=like.${encodeURIComponent(PREFIX+'*')}&limit=200`;
  const r=await fetch(url,{headers:sbHeaders(cfg),cache:'no-store'});
  if(!r.ok)throw new Error(`Supabase ${r.status}`);
  const rows=await r.json();
  return rows.map(row=>{try{return JSON.parse(row.answer)}catch{return null}})
    .filter(item=>item&&item.kind==='members-transfer'&&item.id&&item.text&&isTickerEligible(item.text,item.publishedAt))
    .map(item=>({...item,text:tickerText(item.text)}))
    .filter(item=>item.text)
    .sort((a,b)=>new Date(b.publishedAt||0)-new Date(a.publishedAt||0))
    .slice(0,20);
}

module.exports=async function handler(req,res){
  try{
    const cfg=siteConfig();
    const isCron=String(req.headers['user-agent']||'').toLowerCase().includes('vercel-cron');

    if(isCron){
      const result=await captureLatest(cfg);
      res.setHeader('Cache-Control','no-store');
      res.status(200).json({ok:true,checkedAt:new Date().toISOString(),found:result.items.length,added:result.added});
      return;
    }

    if(!(await authorised(req,cfg))){res.status(401).json({error:'Members only'});return;}

    let items=[];
    try{items=await storedItems(cfg);}catch(_){ }
    if(!items.length){
      const result=await captureLatest(cfg);
      items=result.items;
    }

    res.setHeader('Cache-Control','private, no-store');
    res.status(200).json({updatedAt:new Date().toISOString(),items,continuous:true,checkIntervalMinutes:2});
  }catch(error){
    console.error('members transfer API failed',error);
    res.status(502).json({error:'Unable to load the members transfer feed just now'});
  }
};