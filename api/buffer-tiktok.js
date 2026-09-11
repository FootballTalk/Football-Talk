const fs=require('fs');
const path=require('path');
const crypto=require('crypto');

const BUFFER_ENDPOINT='https://api.buffer.com';
const SITE_URL='https://www.footballtalk.uk/';
const PUBLISH_PREFIX='buffer-publish:tiktok:';

function siteConfig(){
  const text=fs.readFileSync(path.join(process.cwd(),'config.js'),'utf8');
  const url=(text.match(/SUPABASE_URL:\s*'([^']+)'/)||[])[1];
  const key=(text.match(/SUPABASE_ANON_KEY:\s*'([^']+)'/)||[])[1];
  if(!url||!key)throw new Error('Missing site config');
  return{url,key};
}
function sbHeaders(c,e={}){return{apikey:c.key,Authorization:`Bearer ${c.key}`,...e};}
async function gql(query,variables={}){
  const key=process.env.BUFFER_API_KEY;
  if(!key)throw new Error('BUFFER_API_KEY is not configured');
  const r=await fetch(BUFFER_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify({query,variables}),cache:'no-store'});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(`Buffer HTTP ${r.status}`);
  if(data.errors?.length)throw new Error(data.errors.map(e=>e.message).join('; '));
  return data.data;
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
async function alreadyDone(cfg,id){
  const r=await fetch(`${cfg.url}/rest/v1/poll_responses?select=poll_id&poll_id=eq.${encodeURIComponent(PUBLISH_PREFIX+id)}&limit=1`,{headers:sbHeaders(cfg),cache:'no-store'});
  return r.ok&&(await r.json()).length>0;
}
async function remember(cfg,id,i,p){
  await fetch(`${cfg.url}/rest/v1/poll_responses`,{method:'POST',headers:sbHeaders(cfg,{'Content-Type':'application/json',Prefer:'return=minimal'}),body:JSON.stringify({poll_id:PUBLISH_PREFIX+id,answer:JSON.stringify({storyId:id,title:i.title,bufferPostId:p.id,channel:'tiktok',createdAt:new Date().toISOString()})})});
}
async function stories(){
  const jobs=['api/news','api/romano'].map(x=>fetch(`${SITE_URL}${x}`,{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject(new Error(x))));
  const settled=await Promise.allSettled(jobs);
  return settled.filter(x=>x.status==='fulfilled').flatMap(x=>x.value.items||[]).sort((a,b)=>Number(priority(b))-Number(priority(a))||new Date(b.publishedAt||0)-new Date(a.publishedAt||0));
}
async function tiktokChannel(){
  const a=await gql(`query { account { organizations { id name } } }`);
  const o=a?.account?.organizations?.[0];
  if(!o)throw new Error('No Buffer organization found');
  const c=await gql(`query C($organizationId: OrganizationId!) { channels(input:{organizationId:$organizationId,filter:{isLocked:false}}) { id name displayName service isQueuePaused } }`,{organizationId:o.id});
  const channels=c?.channels||[];
  return channels.find(ch=>String(ch.service||'').toLowerCase()==='tiktok')||null;
}
async function publish(channel,i){
  const q=`mutation P($channelId: ChannelId!,$text: String,$image: String!,$title: String) { createPost(input:{text:$text,channelId:$channelId,schedulingType:automatic,mode:shareNow,saveToDraft:false,assets:[{image:{url:$image}}],metadata:{tiktok:{title:$title}}}) { ... on PostActionSuccess { post { id text dueAt } } ... on MutationError { message } } }`;
  const data=await gql(q,{channelId:channel.id,text:caption(i),image:artwork(i),title:clean(i.title).slice(0,90)});
  const p=data?.createPost;
  if(!p?.post)throw new Error(p?.message||'Buffer did not create TikTok post');
  return p.post;
}
async function run(){
  const cfg=siteConfig();
  const channel=await tiktokChannel();
  if(!channel)return{ok:false,published:false,reason:'TikTok channel is not connected or is locked in Buffer'};
  for(const i of await stories()){
    if(!eligible(i))continue;
    const id=storyKey(i);
    if(await alreadyDone(cfg,id))continue;
    const post=await publish(channel,i);
    await remember(cfg,id,i,post);
    return{ok:true,published:true,title:i.title,postId:post.id,channel:{id:channel.id,name:channel.displayName||channel.name}};
  }
  return{ok:true,published:false,reason:'No fresh unpublished TikTok story'};
}
module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  try{
    const cron=String(req.headers['user-agent']||'').toLowerCase().includes('vercel-cron');
    if(!cron&&String(req.query?.run||'')!=='1')return res.status(200).json({ok:true,mode:'diagnostic-safe',publishing:'tiktok-dedicated',note:'TikTok publishes every 10 minutes via Vercel cron.'});
    return res.status(200).json(await run());
  }catch(e){
    console.error('TikTok Buffer publisher failed',e);
    return res.status(502).json({ok:false,published:false,error:String(e.message||e)});
  }
};
