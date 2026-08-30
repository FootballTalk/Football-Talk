const fs=require('fs');
const path=require('path');

const BUFFER_ENDPOINT='https://api.buffer.com';
const SITE_URL='https://www.footballtalk.uk/';
const DEFAULT_SOCIAL_IMAGE=`${SITE_URL}api/social-card-image`;
const MANUAL_PREFIX='buffer-manual:';
const QUEUE_FILE=path.join(process.cwd(),'data','buffer-manual.json');
const LOW_QUOTA_THRESHOLD=5;
const DEFAULT_BACKOFF_MS=30*60*1000;
let bufferBackoffUntil=0;
let lastRateLimit=null;

function siteConfig(){const text=fs.readFileSync(path.join(process.cwd(),'config.js'),'utf8');const url=(text.match(/SUPABASE_URL:\s*'([^']+)'/)||[])[1];const key=(text.match(/SUPABASE_ANON_KEY:\s*'([^']+)'/)||[])[1];if(!url||!key)throw new Error('Missing site config');return{url,key};}
function sbHeaders(cfg,extra={}){return{apikey:cfg.key,Authorization:`Bearer ${cfg.key}`,...extra};}
function parseNumber(value){const n=Number(value);return Number.isFinite(n)?n:null;}
function parseRateLimitHeader(value,name){const m=String(value||'').match(new RegExp(`${name}\\s*=\\s*(\\d+)`,'i'));return m?parseNumber(m[1]):null;}
function backoffState(){const remainingMs=Math.max(0,bufferBackoffUntil-Date.now());return remainingMs>0?{active:true,retryAfterSeconds:Math.ceil(remainingMs/1000),until:new Date(bufferBackoffUntil).toISOString(),rateLimit:lastRateLimit}:{active:false,rateLimit:lastRateLimit};}
function applyRateLimitHeaders(r){
  const raw=r.headers.get('ratelimit')||'';
  const remaining=parseNumber(r.headers.get('x-ratelimit-remaining'))??parseRateLimitHeader(raw,'remaining');
  const resetRaw=r.headers.get('x-ratelimit-reset')||parseRateLimitHeader(raw,'reset');
  const retryAfter=parseNumber(r.headers.get('retry-after'));
  lastRateLimit={remaining,raw:raw||null,retryAfterSeconds:retryAfter};
  let until=0;
  if(retryAfter!=null)until=Date.now()+Math.max(0,retryAfter)*1000;
  else if(resetRaw!=null){const reset=Number(resetRaw);until=reset>1e10?reset:reset>1e9?reset*1000:Date.now()+reset*1000;}
  if(r.status===429)bufferBackoffUntil=Math.max(bufferBackoffUntil,until||Date.now()+DEFAULT_BACKOFF_MS);
  else if(remaining!=null&&remaining<=LOW_QUOTA_THRESHOLD)bufferBackoffUntil=Math.max(bufferBackoffUntil,until||Date.now()+DEFAULT_BACKOFF_MS);
  return{remaining,low:remaining!=null&&remaining<=LOW_QUOTA_THRESHOLD};
}
async function gql(query,variables={}){
  const key=process.env.BUFFER_API_KEY;if(!key)throw new Error('BUFFER_API_KEY is not configured');
  const r=await fetch(BUFFER_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify({query,variables}),cache:'no-store'});
  const rate=applyRateLimitHeaders(r);
  const data=await r.json().catch(()=>({}));
  if(r.status===429){const state=backoffState();throw new Error(`Buffer HTTP 429; backing off for ${state.retryAfterSeconds}s`);}
  if(!r.ok)throw new Error(`Buffer HTTP ${r.status}`);
  if(data.errors?.length)throw new Error(data.errors.map(e=>e.message).join('; '));
  if(rate.low){const state=backoffState();throw new Error(`Buffer quota low; backing off for ${state.retryAfterSeconds}s`);}
  return data.data;
}
async function connectionInfo(){const orgResult=await gql(`query FootballTalkOrganizations { account { organizations { id name } } }`);const organization=orgResult?.account?.organizations?.[0];if(!organization)return{organization:null,channels:[]};const channelResult=await gql(`query FootballTalkChannels($organizationId: OrganizationId!) { channels(input:{organizationId:$organizationId,filter:{isLocked:false}}) { id name displayName service isQueuePaused } }`,{organizationId:organization.id});return{organization,channels:channelResult?.channels||[]};}
function channelFor(info,service){return(info.channels||[]).find(c=>String(c.service||'').toLowerCase()===service&&(service==='facebook'?/football\s*talk/i.test(`${c.name||''} ${c.displayName||''}`):service==='twitter'?/footballt8lk/i.test(`${c.name||''} ${c.displayName||''}`):true));}
function loadQueue(){if(!fs.existsSync(QUEUE_FILE))return[];const parsed=JSON.parse(fs.readFileSync(QUEUE_FILE,'utf8'));return Array.isArray(parsed)?parsed:Array.isArray(parsed.items)?parsed.items:[];}
async function alreadyRecorded(cfg,id,service){const key=`${MANUAL_PREFIX}${service}:${id}`;const url=`${cfg.url}/rest/v1/poll_responses?select=poll_id&poll_id=eq.${encodeURIComponent(key)}&limit=1`;const r=await fetch(url,{headers:sbHeaders(cfg),cache:'no-store'});if(!r.ok)return false;const rows=await r.json();return Array.isArray(rows)&&rows.length>0;}
async function remember(cfg,item,post,service){const record={kind:'buffer-manual',storyId:item.id,title:item.title,bufferPostId:post?.id||null,createdAt:new Date().toISOString(),channel:service};const r=await fetch(`${cfg.url}/rest/v1/poll_responses`,{method:'POST',headers:sbHeaders(cfg,{'Content-Type':'application/json',Prefer:'return=minimal'}),body:JSON.stringify({poll_id:`${MANUAL_PREFIX}${service}:${item.id}`,answer:JSON.stringify(record)})});if(!r.ok)throw new Error(`Supabase ${r.status}`);}
async function createPost(channelId,text,service,image){const variables={channelId,text,image:image||DEFAULT_SOCIAL_IMAGE};let query;if(service==='instagram'){query=`mutation FootballTalkManualInstagram($channelId: ChannelId!,$text: String,$image: String!) { createPost(input:{text:$text,channelId:$channelId,schedulingType:automatic,mode:shareNow,saveToDraft:false,assets:[{image:{url:$image}}],metadata:{instagram:{type:post,shouldShareToFeed:true}}}) { ... on PostActionSuccess { post { id text dueAt } } ... on MutationError { message } } }`;}else if(service==='facebook'){query=`mutation FootballTalkManualFacebook($channelId: ChannelId!,$text: String,$image: String!) { createPost(input:{text:$text,channelId:$channelId,schedulingType:automatic,mode:shareNow,saveToDraft:false,assets:[{image:{url:$image}}],metadata:{facebook:{type:post}}}) { ... on PostActionSuccess { post { id text dueAt } } ... on MutationError { message } } }`;}else{query=`mutation FootballTalkManualX($channelId: ChannelId!,$text: String,$image: String!) { createPost(input:{text:$text,channelId:$channelId,schedulingType:automatic,mode:shareNow,saveToDraft:false,assets:[{image:{url:$image}}]}) { ... on PostActionSuccess { post { id text dueAt } } ... on MutationError { message } } }`;}const data=await gql(query,variables);const payload=data?.createPost;if(!payload?.post)throw new Error(payload?.message||`Buffer did not create the ${service} post`);return payload.post;}
function textFor(item,service){const raw=service==='facebook'?item.facebook:service==='instagram'?item.instagram:item.x;const text=String(raw||'').trim();if(service==='twitter'&&text.length>280)return text.slice(0,279).trimEnd()+'…';return text;}
async function pendingState(cfg,items){const state=[];for(const item of items){if(!item?.id||item.enabled===false)continue;const done={};for(const service of['facebook','twitter','instagram'])done[service]=await alreadyRecorded(cfg,item.id,service);state.push({id:item.id,title:item.title||'',done});}return state;}
async function firstPending(cfg,items){for(const item of items){if(!item?.id||item.enabled===false)continue;const services=[];for(const service of['facebook','twitter','instagram'])if(!(await alreadyRecorded(cfg,item.id,service)))services.push(service);if(services.length)return{item,services};}return null;}

async function publishPending(){
  const backoff=backoffState();if(backoff.active)return{ok:true,published:false,reason:'Buffer rate-limit backoff active',backoff};
  const cfg=siteConfig();const items=loadQueue();
  const work=await firstPending(cfg,items);
  if(!work)return{ok:true,published:false,reason:'No pending manual Buffer posts',rateLimit:lastRateLimit};

  const info=await connectionInfo();
  const targets={facebook:channelFor(info,'facebook'),twitter:channelFor(info,'twitter'),instagram:channelFor(info,'instagram')};
  const missing=work.services.filter(service=>!targets[service]);
  if(missing.length)throw new Error(`Buffer channel not found: ${missing.join(', ')}`);

  const posts=[];const errors=[];
  for(const service of work.services){
    const text=textFor(work.item,service);
    if(!text){errors.push({service,error:'Missing post text'});continue;}
    try{const post=await createPost(targets[service].id,text,service,work.item.image||DEFAULT_SOCIAL_IMAGE);await remember(cfg,work.item,post,service);posts.push({service,channel:targets[service].displayName||targets[service].name,postId:post.id});}
    catch(error){const detail=String(error.message||error);errors.push({service,error:detail});if(/HTTP 429|quota low|backing off/i.test(detail))break;}
  }
  return{ok:posts.length>0||errors.length===0,published:posts.length>0,id:work.item.id,title:work.item.title,posts,errors,backoff:backoffState()};
}

module.exports=async function handler(req,res){res.setHeader('Cache-Control','no-store');if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}try{const isCron=String(req.headers['user-agent']||'').toLowerCase().includes('vercel-cron');if(isCron)return res.status(200).json(await publishPending());const cfg=siteConfig();const items=loadQueue();return res.status(200).json({ok:true,mode:'diagnostic-only',note:'Publishing is restricted to Vercel Cron requests.',queue:await pendingState(cfg,items),backoff:backoffState()});}catch(error){console.error('Manual Buffer publish failed',error);const backoff=backoffState();if(backoff.active)return res.status(200).json({ok:true,published:false,reason:'Buffer rate-limit backoff active',detail:String(error.message||error),backoff});return res.status(502).json({ok:false,error:'Manual Buffer publishing unavailable',detail:String(error.message||error)});}};
