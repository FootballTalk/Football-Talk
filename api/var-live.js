const FALLBACK_ARTICLE='https://www.premierleague.com/en/news/4707041/matchweek-3-var-decisions-explained';
const NEWS_URL='https://www.premierleague.com/en/news';
const CACHE_MS=25*1000;
let cache={at:0,data:null};

function cleanHtml(s=''){
  return String(s)
    .replace(/<script[\s\S]*?<\/script>/gi,' ')
    .replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;/gi,' ')
    .replace(/&amp;/gi,'&')
    .replace(/&quot;/gi,'"')
    .replace(/&#39;|&apos;/gi,"'")
    .replace(/\s+/g,' ')
    .trim();
}
function abs(u=''){return /^https?:\/\//i.test(u)?u:`https://www.premierleague.com${u.startsWith('/')?'':'/'}${u}`;}
async function get(url){const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 FootballTalk/1.0'},cache:'no-store'});if(!r.ok)throw new Error(`Premier League ${r.status}`);return r.text();}
async function latestArticle(){
  try{
    const html=await get(NEWS_URL);
    const hits=[...html.matchAll(/href=["']([^"']*(?:var-decisions-explained|VAR-decisions-explained)[^"']*)["']/gi)].map(m=>abs(m[1]));
    if(hits.length)return hits[0];
  }catch{}
  return FALLBACK_ARTICLE;
}
function parseUpdates(html,source){
  const text=cleanHtml(html);
  const updates=[];
  const re=/(#[A-Z]{6,8})\s*[–-]\s*(\d{1,3}(?:\+\d{1,2})?[’']?)\s*(VAR OVERTURN|VAR REVIEW|VAR CHECK)?\s*([^#]{20,700}?)(?=(?:#[A-Z]{6,8}\s*[–-])|Incident\s*-|$)/g;
  let m;
  while((m=re.exec(text))){
    const tag=m[1],minute=m[2].replace("'",'’'),kind=(m[3]||'VAR UPDATE').trim();
    let detail=m[4].replace(/—\s*Premier League Match Centre[\s\S]*$/i,'').trim();
    detail=detail.replace(/\s+/g,' ').slice(0,520);
    if(detail.length<15)continue;
    updates.push({id:`${tag}-${minute}-${kind}`.toLowerCase().replace(/[^a-z0-9]+/g,'-'),match:tag,minute,kind,detail,source});
  }
  if(!updates.length){
    const incidentRe=/Incident\s*-\s*(\d{1,3}(?:\+\d{1,2})?)\s*min\s*([^]{20,600}?)(?=Incident\s*-|Matchweek\s+\d+|$)/gi;
    while((m=incidentRe.exec(text))){const minute=`${m[1]}’`,detail=m[2].replace(/\s+/g,' ').trim().slice(0,520);updates.push({id:`incident-${minute}-${updates.length}`,match:'PREMIER LEAGUE',minute,kind:'VAR UPDATE',detail,source});}
  }
  return updates.slice(-12).reverse();
}
module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','s-maxage=20, stale-while-revalidate=40');
  res.setHeader('Access-Control-Allow-Origin','*');
  try{
    if(cache.data&&Date.now()-cache.at<CACHE_MS)return res.status(200).json(cache.data);
    const source=await latestArticle();
    const html=await get(source);
    const updates=parseUpdates(html,source);
    const data={ok:true,source:'Premier League Match Centre',sourceUrl:source,updatedAt:new Date().toISOString(),updates};
    cache={at:Date.now(),data};
    return res.status(200).json(data);
  }catch(e){
    return res.status(200).json({ok:false,source:'Premier League Match Centre',updatedAt:new Date().toISOString(),updates:[],error:String(e.message||e)});
  }
};