const TELEGRAM_URL='https://t.me/s/fabrizioromanotg';

function decodeHtml(value=''){
  return String(value)
    .replace(/<br\s*\/?\s*>/gi,'\n')
    .replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi,'$1')
    .replace(/<[^>]+>/g,' ')
    .replace(/&amp;/g,'&')
    .replace(/&quot;/g,'"')
    .replace(/&#39;|&apos;/g,"'")
    .replace(/&lt;/g,'<')
    .replace(/&gt;/g,'>')
    .replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)))
    .replace(/\s+/g,' ')
    .trim();
}

function transferContext(text=''){
  return /\b(sign|signing|signed|join|joins|joining|joined|transfer|move|deal|agreement|agreed|fee|loan|medical|contract|bid|club|player)\b/i.test(text);
}

function confirmedDeal(text=''){
  const t=String(text).replace(/\s+/g,' ').trim();
  if(!transferContext(t))return false;
  if(/\bhere we go!?\b/i.test(t))return true;
  return /\b(?:deal (?:is |now )?done|deal completed|all done|done deal|deal sealed|sealed deal|move (?:is |now )?done|transfer (?:is |now )?done)\b/i.test(t);
}

function cleanForPublishing(text=''){
  return String(text)
    .replace(/^RT\s+@FabrizioRomano:\s*/i,'')
    .replace(/^Fabrizio Romano\s*[:\-–—]\s*/i,'')
    .replace(/Fabrizio Romano/gi,'')
    .replace(/@FabrizioRomano/gi,'')
    .replace(/\bHERE WE GO!?\b/gi,'')
    .replace(/\s*[—-]\s*\(\s*\)\s*[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}.*$/i,'')
    .replace(/\s*[—-]\s*\([^)]*\)\s*[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}.*$/i,'')
    .replace(/\s+([,.;!?])/g,'$1')
    .replace(/\s+/g,' ')
    .replace(/^[\s:;,.\-–—]+|[\s:;,.\-–—]+$/g,'')
    .trim();
}

function titleFor(text=''){
  let clean=cleanForPublishing(text)
    .replace(/^🚨\s*/,'')
    .replace(/\s+https?:\/\/\S+/g,'')
    .trim();
  if(clean.length>170)clean=clean.slice(0,169).trimEnd()+'…';
  return clean||'Transfer deal agreed';
}

function descriptionFor(text=''){
  let clean=cleanForPublishing(text).replace(/\s+https?:\/\/\S+/g,'').trim();
  if(clean.length>320)clean=clean.slice(0,319).trimEnd()+'…';
  return clean;
}

function dedupeKey(item){
  return String(item.title||'')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g,' ')
    .replace(/\b(excl|exclusive)\b/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function parseTelegram(html=''){
  const blocks=String(html).split(/<div class="tgme_widget_message_wrap[^>]*>/i).slice(1);
  const items=[];
  for(const block of blocks){
    const post=(block.match(/data-post="([^"]+)"/i)||[])[1]||'';
    const messageId=(post.match(/\/(\d+)$/)||[])[1]||'';
    const date=(block.match(/<time[^>]+datetime="([^"]+)"/i)||[])[1]||'';
    const textHtml=(block.match(/<div class="tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/i)||[])[1]||'';
    const text=decodeHtml(textHtml);
    if(!messageId||!text||!confirmedDeal(text))continue;
    const published=date?Date.parse(date):NaN;
    if(!Number.isFinite(published))continue;
    const link=`https://t.me/fabrizioromanotg/${messageId}`;
    items.push({
      title:titleFor(text),
      link,
      description:descriptionFor(text),
      image:'',
      published,
      publishedAt:new Date(published).toISOString(),
      source:'Verified transfer confirmation feed',
      type:'TRANSFER',
      stage:'ROMANO_CONFIRMED',
      confirmationPhase:'insider-confirmed',
      relevance:8,
      debatePrompt:'Good move? Have your say 👇'
    });
  }
  const seen=new Set();
  return items
    .sort((a,b)=>b.published-a.published)
    .filter(item=>{const key=dedupeKey(item);if(!key||seen.has(key))return false;seen.add(key);return true;})
    .slice(0,20);
}

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','s-maxage=60, stale-while-revalidate=120');
  try{
    const response=await fetch(TELEGRAM_URL,{headers:{'User-Agent':'Mozilla/5.0 FootballTalk Transfer Monitor/2.1'},cache:'no-store'});
    if(!response.ok)throw new Error(`Telegram ${response.status}`);
    const html=await response.text();
    const items=parseTelegram(html);
    return res.status(200).json({updatedAt:new Date().toISOString(),source:'official-public-channel',items});
  }catch(error){
    console.error('Transfer confirmation feed unavailable',error);
    return res.status(200).json({updatedAt:new Date().toISOString(),source:'official-public-channel',items:[],warning:'confirmation-feed-unavailable'});
  }
};
