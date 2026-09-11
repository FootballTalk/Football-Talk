const fs=require('fs');
const path=require('path');

const BUFFER_ENDPOINT='https://api.buffer.com';
const SITE_URL='https://www.footballtalk.uk/';
const POST_ID='boxing-day-seven-fixtures-2026';
const RECORD_PREFIX='buffer-once:';
const IMAGE=`${SITE_URL}api/boxing-day-2026-image`;
const SERVICES=['facebook','instagram','tiktok'];

const COPY={
  facebook:`🎄⚽ SEVEN BOXING DAY FIXTURES CONFIRMED!\n\nSeven matches. One huge day of Premier League football. Which fixture are you most looking forward to?\n\nHave your say below 👇\n\n🔗 ${SITE_URL}\n\n#FootballTalk #BoxingDayFootball #WhereFansHaveTheirSay`,
  instagram:`🎄⚽ SEVEN BOXING DAY FIXTURES CONFIRMED!\n\nSeven matches. One huge day of football. Which game are you most looking forward to? 👇\n\nVisit FootballTalk.uk\n\n#FootballTalk #BoxingDayFootball #PremierLeague #WhereFansHaveTheirSay`,
  tiktok:`🎄 Seven Boxing Day fixtures confirmed! Which match are you most looking forward to? ⚽ #FootballTalk #BoxingDayFootball #PremierLeague`
};

function siteConfig(){const text=fs.readFileSync(path.join(process.cwd(),'config.js'),'utf8');const url=(text.match(/SUPABASE_URL:\s*'([^']+)'/)||[])[1];const key=(text.match(/SUPABASE_ANON_KEY:\s*'([^']+)'/)||[])[1];if(!url||!key)throw new Error('Missing site config');return{url,key};}
function sbHeaders(c,e={}){return{apikey:c.key,Authorization:`Bearer ${c.key}`,...e};}
async function gql(query,variables={}){const key=process.env.BUFFER_API_KEY;if(!key)throw new Error('BUFFER_API_KEY is not configured');const r=await fetch(BUFFER_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify({query,variables}),cache:'no-store'});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(`Buffer HTTP ${r.status}`);if(data.errors?.length)throw new Error(data.errors.map(e=>e.message).join('; '));return data.data;}
async function channels(){const a=await gql(`query { account { organizations { id } } }`),o=a?.account?.organizations?.[0];if(!o)return[];const c=await gql(`query C($organizationId: OrganizationId!) { channels(input:{organizationId:$organizationId,filter:{isLocked:false}}) { id name displayName service isQueuePaused } }`,{organizationId:o.id});return c?.channels||[];}
function target(items,service){return items.find(c=>String(c.service||'').toLowerCase()===service&&(service==='facebook'?/football\s*talk/i.test(`${c.name||''} ${c.displayName||''}`):service==='instagram'?/maddogfootballtalk|footballtalk/i.test(`${c.name||''} ${c.displayName||''}`):service==='tiktok'?/footballt8lk|footballtalk/i.test(`${c.name||''} ${c.displayName||''}`):true));}
async function recorded(cfg,service){const id=`${RECORD_PREFIX}${service}:${POST_ID}`,r=await fetch(`${cfg.url}/rest/v1/poll_responses?select=poll_id&poll_id=eq.${encodeURIComponent(id)}&limit=1`,{headers:sbHeaders(cfg),cache:'no-store'});return r.ok&&(await r.json()).length>0;}
async function remember(cfg,service,post){const id=`${RECORD_PREFIX}${service}:${POST_ID}`,answer=JSON.stringify({kind:'buffer-once',postId:POST_ID,service,bufferPostId:post.id,createdAt:new Date().toISOString()});const r=await fetch(`${cfg.url}/rest/v1/poll_responses`,{method:'POST',headers:sbHeaders(cfg,{'Content-Type':'application/json',Prefer:'return=minimal'}),body:JSON.stringify({poll_id:id,answer})});if(!r.ok)throw new Error(`Supabase ${r.status}`);}
async function publish(channelId,text,service){const metadata=service==='instagram'?',metadata:{instagram:{type:post,shouldShareToFeed:true}}':service==='facebook'?',metadata:{facebook:{type:post}}':'';const q=`mutation P($channelId: ChannelId!,$text: String,$image: String!) { createPost(input:{text:$text,channelId:$channelId,schedulingType:automatic,mode:shareNow,saveToDraft:false,assets:[{image:{url:$image}}]${metadata}}) { ... on PostActionSuccess { post { id text dueAt } } ... on MutationError { message } } }`;const data=await gql(q,{channelId,text,image:IMAGE}),payload=data?.createPost;if(!payload?.post)throw new Error(payload?.message||`Buffer did not create ${service} post`);return payload.post;}

async function run(){const cfg=siteConfig(),items=await channels(),results=[],errors=[];for(const service of SERVICES){if(await recorded(cfg,service)){results.push({service,status:'already-published'});continue;}const channel=target(items,service);if(!channel){errors.push({service,error:'Connected Buffer channel not found'});continue;}try{const post=await publish(channel.id,COPY[service],service);await remember(cfg,service,post);results.push({service,status:'published',channel:channel.displayName||channel.name,postId:post.id});}catch(error){errors.push({service,error:String(error.message||error)});}}return{ok:errors.length===0,published:results.some(x=>x.status==='published'),postId:POST_ID,image:IMAGE,results,errors};}

module.exports=async function handler(req,res){res.setHeader('Cache-Control','no-store');if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}const cfg=siteConfig();try{const secret=process.env.CRON_SECRET;if(!secret||req.headers.authorization!==`Bearer ${secret}`){const status={};for(const service of SERVICES)status[service]=await recorded(cfg,service);return res.status(200).json({ok:true,mode:'diagnostic-only',postId:POST_ID,image:IMAGE,published:status});}return res.status(200).json(await run());}catch(error){console.error('Boxing Day Buffer publish failed',error);return res.status(502).json({ok:false,error:'Boxing Day publish unavailable',detail:String(error.message||error)});}};

module.exports._test={target};
