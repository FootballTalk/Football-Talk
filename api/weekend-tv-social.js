const fs=require('fs');
const path=require('path');

const BUFFER_ENDPOINT='https://api.buffer.com';
const SITE_URL='https://www.footballtalk.uk/';
const TIME_ZONE='Europe/London';
const RECORD_PREFIX='weekend-tv-guide:';
const ALLOWED_COMPETITIONS=[/premier league/i,/championship/i,/scottish premiership/i,/fa cup/i,/carabao cup|league cup/i,/champions league|european cup/i,/europa league|uefa cup/i];

function siteConfig(){const text=fs.readFileSync(path.join(process.cwd(),'config.js'),'utf8');const url=(text.match(/SUPABASE_URL:\s*'([^']+)'/)||[])[1];const key=(text.match(/SUPABASE_ANON_KEY:\s*'([^']+)'/)||[])[1];if(!url||!key)throw new Error('Missing site config');return{url,key};}
function sbHeaders(c,e={}){return{apikey:c.key,Authorization:`Bearer ${c.key}`,...e};}
function londonParts(now=new Date()){const parts=new Intl.DateTimeFormat('en-GB',{timeZone:TIME_ZONE,weekday:'short',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hour12:false}).formatToParts(now);return Object.fromEntries(parts.filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));}
function isoFromParts(p){return`${p.year}-${p.month}-${p.day}`;}
function addDays(iso,days){const d=new Date(`${iso}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
function fridayFor(now=new Date()){return addDays(isoFromParts(londonParts(now)),1);}
function isThursdayEvening(now=new Date()){const p=londonParts(now);return p.weekday==='Thu'&&Number(p.hour)===18;}
function allowed(match){const label=`${match.home||''} ${match.away||''} ${match.competition||''}`;if(/\bU(?:18|19|20|21|23)\b|academy|reserves|premier league 2/i.test(label))return false;return ALLOWED_COMPETITIONS.some(re=>re.test(String(match.competition||'')));}
function shortDate(iso){return new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(`${iso}T12:00:00Z`));}

async function gql(query,variables={}){const key=process.env.BUFFER_API_KEY;if(!key)throw new Error('BUFFER_API_KEY is not configured');const r=await fetch(BUFFER_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify({query,variables}),cache:'no-store'});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(`Buffer HTTP ${r.status}`);if(data.errors?.length)throw new Error(data.errors.map(e=>e.message).join('; '));return data.data;}
async function connectionInfo(){const a=await gql(`query { account { organizations { id name } } }`);const o=a?.account?.organizations?.[0];if(!o)return{channels:[]};const c=await gql(`query C($organizationId: OrganizationId!) { channels(input:{organizationId:$organizationId,filter:{isLocked:false}}) { id name displayName service isQueuePaused } }`,{organizationId:o.id});return{organization:o,channels:c?.channels||[]};}
function channel(info,service){return(info.channels||[]).find(c=>String(c.service||'').toLowerCase()===service&&(service==='facebook'?/football\s*talk/i.test(`${c.name||''} ${c.displayName||''}`):service==='instagram'?/football\s*talk|footballtalk/i.test(`${c.name||''} ${c.displayName||''}`):true));}
async function matches(start){const end=addDays(start,3),r=await fetch(`${SITE_URL}api/tv-guide`,{headers:{'User-Agent':'FootballTalk Weekend TV Social/1.0'},cache:'no-store'});if(!r.ok)throw new Error(`TV guide ${r.status}`);const data=await r.json();return(data.matches||[]).filter(x=>x.date>=start&&x.date<=end&&allowed(x));}
function lines(items){const out=[];let day='';for(const m of items){if(m.date!==day){day=m.date;out.push(`\n${shortDate(day).toUpperCase()}`);}out.push(`${m.time} - ${m.home} v ${m.away} (${m.channel})`);}return out.join('\n').trim();}
function captions(items){const listing=lines(items),link=`${SITE_URL}tv-guide.html`;return{
  facebook:`📺 FOOTBALL TALK: WEEKEND TV GUIDE\n\nHere are the confirmed live UK TV games from Friday through Monday:\n\n${listing}\n\nSchedules can change. Check the full seven-day guide:\n🔗 ${link}\n\nWhich match will you be watching?\n\n#FootballTalk #WhereFansHaveTheirSay`,
  instagram:`📺 WEEKEND TV GUIDE\n\nConfirmed live UK TV games from Friday through Monday:\n\n${listing}\n\nFull seven-day guide at FootballTalk.uk\n\nWhich match will you be watching? 👇\n\n#FootballTalk #FootballOnTV #WhereFansHaveTheirSay`,
  tiktok:`📺 Football on TV this weekend — Friday through Monday. Which match will you be watching? Full guide: FootballTalk.uk #FootballTalk #FootballOnTV`
};}
async function recorded(cfg,start,service){const id=`${RECORD_PREFIX}${start}:${service}`,r=await fetch(`${cfg.url}/rest/v1/poll_responses?select=poll_id&poll_id=eq.${encodeURIComponent(id)}&limit=1`,{headers:sbHeaders(cfg),cache:'no-store'});return r.ok&&(await r.json()).length>0;}
async function remember(cfg,start,service,post){const r=await fetch(`${cfg.url}/rest/v1/poll_responses`,{method:'POST',headers:sbHeaders(cfg,{'Content-Type':'application/json',Prefer:'return=minimal'}),body:JSON.stringify({poll_id:`${RECORD_PREFIX}${start}:${service}`,answer:JSON.stringify({kind:'weekend-tv-guide',start,service,postId:post.id,createdAt:new Date().toISOString()})})});if(!r.ok)throw new Error(`Supabase ${r.status}`);}
async function publish(channelId,text,service,image){const metadata=service==='instagram'?',metadata:{instagram:{type:post,shouldShareToFeed:true}}':service==='facebook'?',metadata:{facebook:{type:post}}':'';const q=`mutation P($channelId: ChannelId!,$text: String,$image: String!) { createPost(input:{text:$text,channelId:$channelId,schedulingType:automatic,mode:shareNow,saveToDraft:false,assets:[{image:{url:$image}}]${metadata}}) { ... on PostActionSuccess { post { id text dueAt } } ... on MutationError { message } } }`;const data=await gql(q,{channelId,text,image});const payload=data?.createPost;if(!payload?.post)throw new Error(payload?.message||`Buffer did not create ${service} post`);return payload.post;}

async function run(force=false){
  if(!force&&!isThursdayEvening())return{ok:true,published:false,reason:'Outside Thursday 18:00 Europe/London window'};
  const start=fridayFor(),items=await matches(start);if(!items.length)return{ok:true,published:false,reason:'No confirmed in-scope televised fixtures',start};
  const cfg=siteConfig(),info=await connectionInfo(),copy=captions(items),image=`${SITE_URL}api/weekend-tv-image?start=${encodeURIComponent(start)}`;
  const results=[],errors=[];
  for(const service of['facebook','instagram','tiktok']){
    if(await recorded(cfg,start,service)){results.push({service,status:'already-published'});continue;}
    const target=channel(info,service);if(!target){errors.push({service,error:'Buffer channel is not connected'});continue;}
    try{const post=await publish(target.id,copy[service],service,image);await remember(cfg,start,service,post);results.push({service,status:'published',postId:post.id});}
    catch(error){errors.push({service,error:String(error.message||error)});}
  }
  return{ok:results.some(x=>x.status==='published')||!errors.length,published:results.some(x=>x.status==='published'),start,matchCount:items.length,image,results,errors};
}

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
  const cron=String(req.headers['user-agent']||'').toLowerCase().includes('vercel-cron');
  const secret=process.env.CRON_SECRET,authorised=secret?req.headers.authorization===`Bearer ${secret}`:cron;
  try{if(cron){if(!authorised)return res.status(401).json({error:'Unauthorized'});return res.status(200).json(await run(false));}return res.status(200).json({ok:true,mode:'diagnostic-only',nextWindow:'Thursday 18:00 Europe/London',services:['facebook','instagram','tiktok'],note:'Publishing is restricted to authenticated Vercel Cron requests.'});}
  catch(error){console.error('Weekend TV social publish failed',error);return res.status(502).json({ok:false,error:'Weekend TV social publishing unavailable',detail:String(error.message||error)});}
};

module.exports._test={addDays,fridayFor,isThursdayEvening,allowed,captions,lines,run};
