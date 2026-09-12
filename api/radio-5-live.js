const BBC_SCHEDULE='https://www.bbc.co.uk/sounds/schedules/bbc_radio_five_live';
const BBC_LISTEN='https://www.bbc.co.uk/sounds/play/live/bbc_radio_five_live';

function decode(v){return String(v||'').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&#39;|&apos;/gi,"'").replace(/&quot;/gi,'"').replace(/&ndash;|&#8211;/gi,'–').replace(/&mdash;|&#8212;/gi,'—');}
function plain(html){return decode(String(html||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();}
function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/&/g,' and ').replace(/\b(?:fc|afc|cf)\b/g,' ').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
const ALIASES={
 'manchester united':['manchester united','man utd','man united'],
 'manchester city':['manchester city','man city'],
 'tottenham hotspur':['tottenham hotspur','tottenham','spurs'],
 'wolverhampton wanderers':['wolverhampton wanderers','wolves'],
 'brighton and hove albion':['brighton and hove albion','brighton'],
 'newcastle united':['newcastle united','newcastle'],
 'nottingham forest':['nottingham forest','nottm forest'],
 'west ham united':['west ham united','west ham'],
 'leeds united':['leeds united','leeds'],
 'sheffield united':['sheffield united','sheff utd'],
 'sheffield wednesday':['sheffield wednesday','sheff wed'],
 'queens park rangers':['queens park rangers','qpr']
};
function variants(team){const n=norm(team);const list=ALIASES[n]||[n];return [...new Set(list.map(norm).filter(Boolean))];}
function dateOnly(v){if(!v)return'';const d=new Date(v);if(Number.isNaN(d.getTime()))return'';return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);}
function matchInText(text,home,away){const t=norm(text),hs=variants(home),as=variants(away);for(const h of hs)for(const a of as){for(const phrase of [`${h} v ${a}`,`${h} vs ${a}`,`${a} v ${h}`,`${a} vs ${h}`]){const i=t.indexOf(phrase);if(i<0)continue;const near=t.slice(Math.max(0,i-240),Math.min(t.length,i+phrase.length+320));if(/(?:live )?football commentary|commentary of|5 live sport|premier league|champions league|fa cup|carabao cup|football/.test(near))return near;}}return'';}
async function fetchSchedule(date){const urls=[];if(date)urls.push(`${BBC_SCHEDULE}/${date}`);urls.push(BBC_SCHEDULE);let last='';for(const url of urls){try{const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 (compatible; FootballTalk/1.0; +https://www.footballtalk.uk)','accept':'text/html,application/xhtml+xml'},cache:'no-store'});if(!r.ok){last=`HTTP ${r.status}`;continue;}const html=await r.text();if(html)return{url,text:plain(html)};}catch(e){last=String(e.message||e);}}throw new Error(last||'BBC schedule unavailable');}

export default async function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
 const home=String(req.query?.home||'').trim(),away=String(req.query?.away||'').trim(),date=dateOnly(req.query?.date||'');
 if(!home||!away)return res.status(400).json({error:'home and away are required'});
 try{
  const schedule=await fetchSchedule(date),hit=matchInText(schedule.text,home,away);
  res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=900');
  return res.status(200).json({available:Boolean(hit),station:'BBC Radio 5 Live',listenUrl:BBC_LISTEN,scheduleUrl:BBC_SCHEDULE,source:'BBC Sounds schedule',match:hit?`${home} v ${away}`:null,date:date||null});
 }catch(e){
  res.setHeader('Cache-Control','public, s-maxage=120, stale-while-revalidate=300');
  return res.status(200).json({available:false,station:'BBC Radio 5 Live',listenUrl:BBC_LISTEN,source:'BBC Sounds schedule',error:'BBC schedule temporarily unavailable'});
 }
}
