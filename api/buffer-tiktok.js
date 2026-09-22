const fs=require('fs');
const path=require('path');
const crypto=require('crypto');

const BUFFER_ENDPOINT='https://api.buffer.com';
const SITE_URL='https://www.footballtalk.uk/';
const FALLBACK_TIKTOK_IMAGE=`${SITE_URL}api/instagram-card-image`;
const PUBLISH_PREFIX='buffer-publish:tiktok:';
const BACKOFF_PREFIX='buffer-backoff:';
const CHANNEL_CACHE_PREFIX='buffer-channels:';
const CLAIM_TTL_MS=15*60*1000;
const DEFAULT_BACKOFF_SECONDS=1800;
const MAX_BACKOFF_SECONDS=6*60*60;
const CHANNEL_CACHE_MS=7*24*60*60*1000;
const QUOTA_RESERVE_RATIO=0.10;

function siteConfig(){
  const text=fs.readFileSync(path.join(process.cwd(),'config.js'),'utf8');
  const url=(text.match(/SUPABASE_URL:\s*'([^']+)'/)||[])[1];
  const key=(text.match(/SUPABASE_ANON_KEY:\s*'([^']+)'/)||[])[1];
  if(!url||!key)throw new Error('Missing site config');
  return{url,key};
}
function sbHeaders(c,e={}){return{apikey:c.key,Authorization:`Bearer ${c.key}`,...e};}
function parsePolicies(raw){
  const out=[];
  for(const m of String(raw||'').matchAll(/"([^"]+)"\s*;\s*r=(\d+)\s*;\s*t=(\d+)/gi))out.push({name:m[1],remaining:Number(m[2]),resetSeconds:Number(m[3])});
  return out;
}
function rateInfo(r){
  const retry=Number(r.headers.get('retry-after'));
  const raw=r.headers.get('ratelimit')||'';
  return{raw:raw||null,policies:parsePolicies(raw),retryAfterSeconds:Number.isFinite(retry)&&retry>0?retry:DEFAULT_BACKOFF_SECONDS};
}
function lowQuota(rate){
  return(rate?.policies||[]).find(p=>{
    const q=Number((p.name.match(/^(\d+)-in-/)||[])[1]);
    return Number.isFinite(q)&&q>0&&p.remaining<=Math.max(2,Math.ceil(q*QUOTA_RESERVE_RATIO));
  })||null;
}
async function gql(query,variables={}){
  const key=process.env.BUFFER_API_KEY;
  if(!key)throw new Error('BUFFER_API_KEY is not configured');
  const r=await fetch(BUFFER_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify({query,variables}),cache:'no-store'});
  const rate=rateInfo(r);
  const data=await r.json().catch(()=>({}));
  if(r.status===429){
    const e=new Error(`Buffer HTTP 429; retry after ${rate.retryAfterSeconds}s`);
    e.code='BUFFER_RATE_LIMIT';
    e.retryAfterSeconds=rate.retryAfterSeconds;
    e.rate=rate;
    throw e;
  }
  if(!r.ok)throw new Error(`Buffer HTTP ${r.status}`);
  if(data.errors?.length)throw new Error(data.errors.map(e=>e.message).join('; '));
  const low=lowQuota(rate);
  if(low){
    const e=new Error(`Buffer quota reserve reached for ${low.name}`);
    e.code='BUFFER_QUOTA_LOW';
    e.retryAfterSeconds=Math.max(60,low.resetSeconds);
    e.rate=rate;
    throw e;
  }
  return{data:data.data,rateLimit:rate};
}
async function cacheChannels(cfg,info){
  const id=`${CHANNEL_CACHE_PREFIX}${Date.now()}`;
  await fetch(`${cfg.url}/rest/v1/poll_responses`,{method:'POST',headers:sbHeaders(cfg,{'Content-Type':'application/json',Prefer:'return=minimal'}),body:JSON.stringify({poll_id:id,answer:JSON.stringify({createdAt:new Date().toISOString(),organization:info.organization,channels:info.channels})})});
}
async function cachedChannels(cfg){
  const r=await fetch(`${cfg.url}/rest/v1/poll_responses?select=answer&poll_id=like.${encodeURIComponent(CHANNEL_CACHE_PREFIX+'*')}&limit=50`,{headers:sbHeaders(cfg),cache:'no-store'});
  if(!r.ok)return null;
  let best=null,bestTime=0;
  for(const row of await r.json()){
    try{const x=JSON.parse(row.answer),t=new Date(x.createdAt).getTime();if(t>bestTime){best=x;bestTime=t;}}catch{}
  }
  return best&&Date.now()-bestTime<CHANNEL_CACHE_MS?{organization:best.organization,channels:best.channels||[],cached:true}:null;
}
async function getBackoff(cfg){
  const r=await fetch(`${cfg.url}/rest/v1/poll_responses?select=answer&poll_id=like.${encodeURIComponent(BACKOFF_PREFIX+'*')}&order=poll_id.desc&limit=100`,{headers:sbHeaders(cfg),cache:'no-store'});
  if(!r.ok)return{active:false};
  const now=Date.now(),maxUntil=now+MAX_BACKOFF_SECONDS*1000;
  let latest=0,untilIso=null;
  for(const row of await r.json()){
    try{const x=JSON.parse(row.answer),t=new Date(x.until).getTime();if(Number.isFinite(t)&&t<=maxUntil&&t>latest){latest=t;untilIso=x.until;}}catch{}
  }
  return latest>now?{active:true,until:untilIso,retryAfterSeconds:Math.ceil((latest-now)/1000)}:{active:false};
}
async function setBackoff(cfg,seconds,reason='rate-limit'){
  const requested=Math.max(60,Number(seconds)||DEFAULT_BACKOFF_SECONDS);
  const applied=Math.min(requested,MAX_BACKOFF_SECONDS);
  const until=new Date(Date.now()+applied*1000).toISOString();
  const pollId=`${BACKOFF_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  await fetch(`${cfg.url}/rest/v1/poll_responses`,{method:'POST',headers:sbHeaders(cfg,{'Content-Type':'application/json',Prefer:'return=minimal'}),body:JSON.stringify({poll_id:pollId,answer:JSON.stringify({until,reason,requestedSeconds:requested,appliedSeconds:applied})})});
  return{active:true,until,reason,requestedSeconds:requested,appliedSeconds:applied};
}
function clean(v){return String(v||'').replace(/\b(?:Fabrizio Romano|@FabrizioRomano)\b/gi,'').replace(/\s+/g,' ').trim();}
function storyKey(i){return crypto.createHash('sha256').update(`${i.link||''}|${i.title||''}|${i.stage||''}`).digest('hex').slice(0,24);}
function eligible(i){
  if(!i?.title||!['TRANSFER','NEWS'].includes(i.type)||(i.relevance||0)<2)return false;
  if(i.type==='TRANSFER'&&!['OFFICIAL','DEVELOPING','ROMANO_CONFIRMED'].includes(i.stage))return false;
  const age=Date.now()-new Date(i.publishedAt||0).getTime();
  return Number.isFinite(age)&&age>=0&&age<=21600000;
}
function priority(i){return i.type==='TRANSFER'&&['OFFICIAL','ROMANO_CONFIRMED'].includes(i.stage);}
function lead(i){return i.type!=='TRANSFER'?'⚽ FOOTBALL TALK':i.stage==='OFFICIAL'?'✅ OFFICIAL':i.stage==='ROMANO_CONFIRMED'?"🚨 IT'S A GO":'🔥 TRANSFER CENTRE';}
function detail(i,m=190){let d=clean(i.description||i.summary||'');if(!d)d='The latest football story is developing.';return d.length>m?d.slice(0,m-1)+'…':d;}
function caption(i){return `${lead(i)}\n\n${clean(i.title)}\n\n${detail(i)}\n\nWhat do you think? 👇\n\n#FootballTalk #Football #WhereFansHaveTheirSay`;}
function sourceImage(i){return [i.image,i.imageUrl,i.image_url,i.thumbnail].find(v=>/^https:\/\//i.test(String(v||'')))||'';}
function artwork(i){
  const src=sourceImage(i);
  const stamp=crypto.createHash('sha1').update(`${i.link||''}|${i.title||''}|${src}`).digest('hex').slice(0,12);
  return `${SITE_URL}api/instagram-story-image?src=${encodeURIComponent(src)}&title=${encodeURIComponent(clean(i.title))}&story=${stamp}`;
}
async function readableImage(url){
  try{
    const r=await fetch(url,{cache:'no-store',headers:{'User-Agent':'FootballTalk TikTok Artwork Preflight/1.0'}});
    return r.ok&&/^image\//i.test(String(r.headers.get('content-type')||''))&&r.headers.get('x-ft-instagram-image-mode')!=='missing-story-image';
  }catch{return false;}
}
async function artworkFor(i){
  const generated=artwork(i);
  if(await readableImage(generated))return generated;
  console.warn('TikTok artwork fallback selected',{title:i.title,generated});
  if(await readableImage(FALLBACK_TIKTOK_IMAGE))return FALLBACK_TIKTOK_IMAGE;
  throw new Error('TikTok artwork unavailable: generated and fallback images failed preflight');
}
async function alreadyDone(cfg,id){
  const r=await fetch(`${cfg.url}/rest/v1/poll_responses?select=poll_id&poll_id=eq.${encodeURIComponent(PUBLISH_PREFIX+id)}&limit=1`,{headers:sbHeaders(cfg),cache:'no-store'});
  return r.ok&&(await r.json()).length>0;
}
async function claimPublish(cfg,id){
  const claimKey=PUBLISH_PREFIX+id;
  const url=`${cfg.url}/rest/v1/buffer_publish_claims`;
  const lookup=await fetch(`${url}?select=claim_key,claimed_at&claim_key=eq.${encodeURIComponent(claimKey)}&limit=1`,{headers:sbHeaders(cfg),cache:'no-store'});
  if(!lookup.ok)throw new Error(`TikTok claim lookup failed: Supabase ${lookup.status}`);
  const rows=await lookup.json();
  if(rows.length){
    const age=Date.now()-new Date(rows[0].claimed_at).getTime();
    if(Number.isFinite(age)&&age<CLAIM_TTL_MS)return false;
    const expired=await fetch(`${url}?claim_key=eq.${encodeURIComponent(claimKey)}`,{method:'DELETE',headers:sbHeaders(cfg)});
    if(!expired.ok)throw new Error(`TikTok stale claim release failed: Supabase ${expired.status}`);
  }
  const claimed=await fetch(url,{method:'POST',headers:sbHeaders(cfg,{'Content-Type':'application/json',Prefer:'return=minimal'}),body:JSON.stringify({claim_key:claimKey})});
  if(claimed.status===409)return false;
  if(!claimed.ok)throw new Error(`TikTok claim failed: Supabase ${claimed.status}`);
  return true;
}
async function releaseClaim(cfg,id){
  const claimKey=PUBLISH_PREFIX+id;
  const r=await fetch(`${cfg.url}/rest/v1/buffer_publish_claims?claim_key=eq.${encodeURIComponent(claimKey)}`,{method:'DELETE',headers:sbHeaders(cfg)});
  if(!r.ok)console.error('TikTok claim release failed',{id,status:r.status});
}
async function remember(cfg,id,i,p){
  await fetch(`${cfg.url}/rest/v1/poll_responses`,{method:'POST',headers:sbHeaders(cfg,{'Content-Type':'application/json',Prefer:'return=minimal'}),body:JSON.stringify({poll_id:PUBLISH_PREFIX+id,answer:JSON.stringify({storyId:id,title:i.title,bufferPostId:p.id,channel:'tiktok',createdAt:new Date().toISOString()})})});
}
async function stories(){
  const jobs=['api/news','api/romano'].map(x=>fetch(`${SITE_URL}${x}`,{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject(new Error(x))));
  const settled=await Promise.allSettled(jobs);
  return settled.filter(x=>x.status==='fulfilled').flatMap(x=>x.value.items||[]).sort((a,b)=>Number(priority(b))-Number(priority(a))||new Date(b.publishedAt||0)-new Date(a.publishedAt||0));
}
async function tiktokChannel(cfg){
  const cached=await cachedChannels(cfg);
  if(cached){
    const channel=(cached.channels||[]).find(ch=>String(ch.service||'').toLowerCase()==='tiktok');
    if(channel)return channel;
  }
  const a=await gql(`query { account { organizations { id name } } }`);
  const o=a.data?.account?.organizations?.[0];
  if(!o)throw new Error('No Buffer organization found');
  const result=await gql(`query C($organizationId: OrganizationId!) { channels(input:{organizationId:$organizationId,filter:{isLocked:false}}) { id name displayName service isQueuePaused } }`,{organizationId:o.id});
  const channels=result.data?.channels||[];
  await cacheChannels(cfg,{organization:o,channels});
  return channels.find(ch=>String(ch.service||'').toLowerCase()==='tiktok')||null;
}
async function publish(channel,i){
  const q=`mutation P($channelId: ChannelId!,$text: String,$image: String!,$title: String) { createPost(input:{text:$text,channelId:$channelId,schedulingType:automatic,mode:shareNow,saveToDraft:false,assets:[{image:{url:$image}}],metadata:{tiktok:{title:$title}}}) { ... on PostActionSuccess { post { id text dueAt } } ... on MutationError { message } } }`;
  const image=await artworkFor(i);
  const result=await gql(q,{channelId:channel.id,text:caption(i),image,title:clean(i.title).slice(0,90)});
  const p=result.data?.createPost;
  if(!p?.post)throw new Error(p?.message||'Buffer did not create TikTok post');
  return p.post;
}
async function run(){
  const cfg=siteConfig();
  const hold=await getBackoff(cfg);
  if(hold.active){
    console.info('TikTok publish skipped: shared Buffer backoff active',hold);
    return{ok:true,published:false,reason:'Buffer rate-limit backoff active',backoff:hold};
  }
  let candidate=null;
  for(const i of await stories()){
    if(!eligible(i))continue;
    const id=storyKey(i);
    if(await alreadyDone(cfg,id))continue;
    candidate={i,id};
    break;
  }
  if(!candidate)return{ok:true,published:false,reason:'No fresh unpublished TikTok story'};
  let channel;
  try{
    channel=await tiktokChannel(cfg);
  }catch(error){
    if(error.code==='BUFFER_RATE_LIMIT'||error.code==='BUFFER_QUOTA_LOW'){
      const backoff=await setBackoff(cfg,error.retryAfterSeconds,error.code);
      console.warn('TikTok publish deferred to protect Buffer quota',{code:error.code,backoff});
      return{ok:true,published:false,reason:error.code==='BUFFER_QUOTA_LOW'?'Buffer quota reserve active':'Buffer rate limited',backoff};
    }
    throw error;
  }
  if(!channel)return{ok:false,published:false,reason:'TikTok channel is not connected or is locked in Buffer'};
  if(!(await claimPublish(cfg,candidate.id)))return{ok:true,published:false,reason:'TikTok story already claimed or published',title:candidate.i.title};
  let post=null;
  try{
    post=await publish(channel,candidate.i);
    await remember(cfg,candidate.id,candidate.i,post);
    return{ok:true,published:true,title:candidate.i.title,postId:post.id,channel:{id:channel.id,name:channel.displayName||channel.name}};
  }catch(error){
    if(!post)await releaseClaim(cfg,candidate.id);
    if(error.code==='BUFFER_RATE_LIMIT'||error.code==='BUFFER_QUOTA_LOW'){
      const backoff=await setBackoff(cfg,error.retryAfterSeconds,error.code);
      console.warn('TikTok publish deferred to protect Buffer quota',{code:error.code,backoff});
      return{ok:true,published:false,reason:error.code==='BUFFER_QUOTA_LOW'?'Buffer quota reserve active':'Buffer rate limited',backoff};
    }
    throw error;
  }
}
module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  try{
    const cron=String(req.headers['user-agent']||'').toLowerCase().includes('vercel-cron');
    if(!cron){
      if(String(req.query?.run||'')==='1')console.warn('Blocked non-cron TikTok publish request');
      return res.status(200).json({ok:true,mode:'diagnostic-safe',publishing:'tiktok-dedicated',note:'Publishing is restricted to authenticated Vercel Cron requests.'});
    }
    return res.status(200).json(await run());
  }catch(e){
    console.error('TikTok Buffer publisher failed',e);
    return res.status(502).json({ok:false,published:false,error:String(e.message||e)});
  }
};
