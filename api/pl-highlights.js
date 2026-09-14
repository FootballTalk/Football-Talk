const CHANNEL_ID='UCG5qGWdu8nIRZqJ_GgDwQ-w';
const FEED_URL=`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
const MATCH_MAX_AGE_DAYS=14;

function decodeXml(value=''){
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1')
    .replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'")
    .replace(/&lt;/g,'<').replace(/&gt;/g,'>');
}
function readTag(block,tag){
  const match=block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,'i'));
  return match?decodeXml(match[1].trim()):'';
}
function readAttr(block,tag,attr){
  const match=block.match(new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']+)["'][^>]*>`,'i'));
  return match?decodeXml(match[1]):'';
}
function parseFeed(xml){
  const entries=xml.match(/<entry>[\s\S]*?<\/entry>/gi)||[];
  return entries.map(entry=>{
    const id=readTag(entry,'yt:videoId');
    const title=readTag(entry,'title');
    const published=readTag(entry,'published');
    const updated=readTag(entry,'updated');
    const thumbnail=readAttr(entry,'media:thumbnail','url')||`https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    const description=readTag(entry,'media:description');
    return{id,title,published,updated,thumbnail,description,url:id?`https://www.youtube.com/watch?v=${id}`:''};
  }).filter(item=>item.id&&item.title);
}
function excluded(item){
  const text=`${item.title} ${item.description}`.toLowerCase();
  return /premier league 2|u21|u18|academy|women|wsl|shorts?|podcast|interview|press conference|training/.test(text);
}
function recentEnough(item,maxDays=MATCH_MAX_AGE_DAYS){
  const time=Date.parse(item.published||item.updated||'');
  if(!Number.isFinite(time)) return false;
  return Date.now()-time <= maxDays*86400000;
}
function isWeekendRoundup(item){
  const text=`${item.title} ${item.description}`.toLowerCase();
  return /every weekend goal|every goal|all goals|goals of the weekend|all \d+ (?:weekend )?goals|matchweek\s*\d+.*\bgoals\b|weekend round.?up/.test(text);
}
function isMatchHighlight(item){
  if(excluded(item)||isWeekendRoundup(item)||!recentEnough(item)) return false;
  const text=`${item.title} ${item.description}`.toLowerCase();
  const explicit=/extended highlights?|match highlights?|highlights?/.test(text);
  const fixtureTitle=/\b(?:v|vs|versus)\b/.test(item.title.toLowerCase());
  const scoreTitle=/\b\d+\s*[-–—]\s*\d+\b/.test(item.title);
  const matchLanguage=/premier league|matchweek|full[- ]?time|goals?/.test(text);
  return explicit || ((fixtureTitle||scoreTitle)&&matchLanguage);
}
function isHighlight(item){return isWeekendRoundup(item)||isMatchHighlight(item)}

export default async function handler(req,res){
  if(req.method!=='GET'){
    res.setHeader('Allow','GET');
    return res.status(405).json({error:'Method not allowed'});
  }
  try{
    const response=await fetch(FEED_URL,{headers:{'User-Agent':'FootballTalk.uk highlights reader','Accept':'application/atom+xml,application/xml,text/xml'}});
    if(!response.ok) throw new Error(`YouTube feed returned HTTP ${response.status}`);
    const xml=await response.text();
    const all=parseFeed(xml);
    const highlights=all.filter(isHighlight).slice(0,30);
    const weekendRoundup=all.filter(item=>!excluded(item)&&isWeekendRoundup(item)).slice(0,6);
    const matchHighlights=all.filter(isMatchHighlight).slice(0,20);
    res.setHeader('Cache-Control','public, s-maxage=180, stale-while-revalidate=600');
    return res.status(200).json({source:'Premier League official YouTube channel',channel:'https://www.youtube.com/PremierLeague',channelId:CHANNEL_ID,updated:new Date().toISOString(),matchHighlights,weekendRoundup,highlights});
  }catch(error){
    console.error('Premier League highlights feed error:',error);
    res.setHeader('Cache-Control','no-store');
    return res.status(502).json({error:'Unable to load Premier League highlights right now',channel:'https://www.youtube.com/PremierLeague'});
  }
}
