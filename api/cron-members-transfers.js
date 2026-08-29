const fs=require('fs');
const path=require('path');
const TELEGRAM_URL='https://t.me/s/FabrizioRomanoTG';
const PREFIX='members-transfer:';

function siteConfig(){
  const text=fs.readFileSync(path.join(process.cwd(),'config.js'),'utf8');
  const url=(text.match(/SUPABASE_URL:\s*'([^']+)'/)||[])[1];
  const key=(text.match(/SUPABASE_ANON_KEY:\s*'([^']+)'/)||[])[1];
  if(!url||!key)throw new Error('Missing site config');
  return {url,key};
}

function decode(value=''){
  return String(value)
    .replace(/<br\s*\/?>/gi,'\n')
    .replace(/<[^>]+>/g,'')
    .replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'")
    .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ')
    .replace(/\n{3,}/g,'\n\n').trim();
}

function parseTelegram(html=''){
  const blocks=html.split(/<div class="tgme_widget_message_wrap[^>]*>/i).slice(1);
  const items=[];
  for(const block of blocks){
    const post=(block.match(/data-post="FabrizioRomanoTG\/(\d+)"/i)||[])[1];
    const textHtml=(block.match(/<div class="tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/i)||[])[1]||'';
    const text=decode(textHtml);
    if(!post||!text||!/\bhere we go\b/i.test(text))continue;
    const publishedAt=(block.match(/<time[^>]+datetime="([^"]+)"/i)||[])[1]||null;
    items.push({kind:'members-transfer',id:post,text,publishedAt,capturedAt:new Date().toISOString(),link:`https://t.me/FabrizioRomanoTG/${post}`,source:'Fabrizio Romano — Official Telegram'});
  }
  return items.sort((a,b)=>new Date(b.publishedAt||0)-new Date(a.publishedAt||0)).slice(0,20);
}

async function alreadySaved(cfg,id){
  const headers={apikey:cfg.key,Authorization:`Bearer ${cfg.key}`};
  const pollId=`${PREFIX}${id}`;
  const url=`${cfg.url}/rest/v1/poll_responses?select=answer&poll_id=eq.${encodeURIComponent(pollId)}&limit=1`;
  const r=await fetch(url,{headers,cache:'no-store'});
  if(!r.ok)return false;
  const rows=await r.json();
  return Array.isArray(rows)&&rows.length>0;
}

async function saveItem(cfg,item){
  if(await alreadySaved(cfg,item.id))return false;
  const headers={apikey:cfg.key,Authorization:`Bearer ${cfg.key}`,'Content-Type':'application/json',Prefer:'return=minimal'};
  const r=await fetch(`${cfg.url}/rest/v1/poll_responses`,{method:'POST',headers,body:JSON.stringify({poll_id:`${PREFIX}${item.id}`,answer:JSON.stringify(item)})});
  if(!r.ok)throw new Error(`Supabase ${r.status}`);
  return true;
}

module.exports=async function handler(req,res){
  try{
    const cfg=siteConfig();
    const r=await fetch(TELEGRAM_URL,{headers:{'User-Agent':'FootballTalk/1.0 (+https://footballtalk.uk)'},cache:'no-store'});
    if(!r.ok)throw new Error(`Telegram ${r.status}`);
    const items=parseTelegram(await r.text());
    let added=0;
    for(const item of items){if(await saveItem(cfg,item))added++;}
    res.setHeader('Cache-Control','no-store');
    res.status(200).json({ok:true,checkedAt:new Date().toISOString(),found:items.length,added});
  }catch(error){
    console.error('members transfer cron failed',error);
    res.status(500).json({ok:false,error:'Transfer watcher failed'});
  }
};