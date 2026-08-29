const SUPABASE_URL='https://cwilgnubzfpmfvoldttm.supabase.co';
const SUPABASE_ANON_KEY='sb_publishable_GdbObU6cF2eh3wSQ6pz47A_gTgBDjvH';
const TELEGRAM_URL='https://t.me/s/FabrizioRomanoTG';

function decode(value=''){
  return String(value)
    .replace(/<br\s*\/?>/gi,'\n')
    .replace(/<[^>]+>/g,'')
    .replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'")
    .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ')
    .replace(/\n{3,}/g,'\n\n').trim();
}

async function authorised(req){
  const header=req.headers.authorization||'';
  const token=header.startsWith('Bearer ')?header.slice(7):'';
  if(!token)return false;
  try{
    const r=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${token}`}});
    return r.ok;
  }catch{return false;}
}

function parseTelegram(html=''){
  const blocks=html.split(/<div class="tgme_widget_message_wrap[^>]*>/i).slice(1);
  const items=[];
  for(const block of blocks){
    const post=(block.match(/data-post="FabrizioRomanoTG\/(\d+)"/i)||[])[1];
    const textHtml=(block.match(/<div class="tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/i)||[])[1]||'';
    const text=decode(textHtml);
    if(!post||!text||! /\bhere we go\b/i.test(text))continue;
    const publishedAt=(block.match(/<time[^>]+datetime="([^"]+)"/i)||[])[1]||null;
    items.push({id:post,text,publishedAt,link:`https://t.me/FabrizioRomanoTG/${post}`,source:'Fabrizio Romano — Official Telegram'});
  }
  return items.sort((a,b)=>new Date(b.publishedAt||0)-new Date(a.publishedAt||0)).slice(0,20);
}

module.exports=async function handler(req,res){
  if(!(await authorised(req))){res.status(401).json({error:'Members only'});return;}
  try{
    const r=await fetch(TELEGRAM_URL,{headers:{'User-Agent':'FootballTalk/1.0 (+https://footballtalk.uk)'},cache:'no-store'});
    if(!r.ok)throw new Error(`Telegram ${r.status}`);
    const html=await r.text();
    const items=parseTelegram(html);
    res.setHeader('Cache-Control','private, no-store');
    res.status(200).json({updatedAt:new Date().toISOString(),items});
  }catch(error){
    res.status(502).json({error:'Unable to load the members transfer feed just now'});
  }
};