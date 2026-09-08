const CHANNEL_ID='UCG5qGWdu8nIRZqJ_GgDwQ-w';
const FEED_URL=`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

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
function isHighlight(item){
  const text=`${item.title} ${item.description}`.toLowerCase();
  return /highlight|extended highlight|match highlight/.test(text) && !/premier league 2|u21|academy|women|wsl/.test(text);
}

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
    const highlights=all.filter(isHighlight).slice(0,12);
    res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=900');
    return res.status(200).json({source:'Premier League official YouTube channel',channel:'https://www.youtube.com/PremierLeague',channelId:CHANNEL_ID,updated:new Date().toISOString(),highlights});
  }catch(error){
    console.error('Premier League highlights feed error:',error);
    res.setHeader('Cache-Control','no-store');
    return res.status(502).json({error:'Unable to load Premier League highlights right now',channel:'https://www.youtube.com/PremierLeague'});
  }
}
