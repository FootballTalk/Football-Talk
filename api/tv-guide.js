// Football Talk UK TV guide. Normalises public UK listings for our own UI.
const SOURCE='https://www.wheresthematch.com/live-football-on-tv/';
const months={Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
const decode=s=>String(s||'').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&#39;|&apos;/gi,"'").replace(/&quot;/gi,'"').replace(/&ndash;|&#8211;/gi,'–').replace(/&mdash;|&#8212;/gi,'—');
const text=s=>decode(String(s||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
const anchors=s=>[...String(s||'').matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)].map(m=>text(m[1])).filter(x=>x&&!/^image(?::|$)/i.test(x));
const dateRe=/\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+(\d{4})\s+(\d{1,2}:\d{2})\b/i;
const monthNum=name=>months[name.slice(0,3)==='Sep'?'Sep':name.slice(0,3)];
function parseRow(row){
  const plain=text(row),dm=plain.match(dateRe); if(!dm||!plain.includes(' v '))return null;
  // The clock value is plain text in the date/time cell, so it gives us a reliable
  // boundary in the raw HTML even when the written date contains nested markup.
  const pos=row.indexOf(dm[4]);
  if(pos<0)return null;
  const before=row.slice(0,pos),after=row.slice(pos+dm[4].length);
  const ba=anchors(before),aa=anchors(after);
  if(ba.length<3)return null;
  const home=ba[ba.length-3],away=ba[ba.length-2],competition=ba[ba.length-1];
  // After the kick-off time the source repeats the competition, followed by one
  // or more broadcaster links. Remove that repeated competition and keep channels.
  let channels=aa.slice();
  if(channels[0]===competition)channels.shift();
  channels=[...new Set(channels.filter(x=>x&&x!==competition&&!/^(details|more info|fixture)$/i.test(x)))];
  if(!home||!away||!competition||home===away)return null;
  const mon=monthNum(dm[2]);if(mon==null)return null;
  const d=new Date(+dm[3],mon,+dm[1],12);
  return {date:d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'),time:dm[4],home,away,competition,channel:channels.join(', ')||'TV details confirmed',platform:'UK broadcaster / streaming service'};
}
function parse(html){
  const out=[],seen=new Set();
  for(const m of html.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)){
    const x=parseRow(m[0]);if(!x)continue;const k=[x.date,x.time,x.home,x.away].join('|').toLowerCase();if(!seen.has(k)){seen.add(k);out.push(x)}
  }
  return out.sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
}
export default async function handler(req,res){
  try{
    const r=await fetch(SOURCE,{headers:{'user-agent':'Mozilla/5.0 (compatible; FootballTalk/1.0; +https://www.footballtalk.uk)','accept':'text/html,application/xhtml+xml'}});
    if(!r.ok)throw Error('listing source unavailable: '+r.status);
    const html=await r.text(),matches=parse(html);
    if(!matches.length)throw Error('listing source returned no parseable matches');
    res.setHeader('Cache-Control','s-maxage=600, stale-while-revalidate=1200');
    res.status(200).json({market:'UK',days:7,updatedAt:new Date().toISOString(),matches});
  }catch(e){
    res.setHeader('Cache-Control','no-store');
    res.status(200).json({market:'UK',days:7,matches:[],error:'TV listings temporarily unavailable',detail:String(e.message||e)});
  }
}