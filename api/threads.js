const fs=require('fs');
const path=require('path');
const crypto=require('crypto');

const SITE_URL='https://www.footballtalk.uk/';
const THREADS_API='https://graph.threads.net/v1.0';
const PUBLISH_PREFIX='threads-publish:';

function siteConfig(){
  const text=fs.readFileSync(path.join(process.cwd(),'config.js'),'utf8');
  const url=(text.match(/SUPABASE_URL:\s*'([^']+)'/)||[])[1];
  const key=(text.match(/SUPABASE_ANON_KEY:\s*'([^']+)'/)||[])[1];
  if(!url||!key)throw new Error('Missing site config');
  return {url,key};
}
function sbHeaders(cfg,extra={}){return {apikey:cfg.key,Authorization:`Bearer ${cfg.key}`,...extra};}
function clean(value){return String(value||'').replace(/\s+/g,' ').trim();}
function storyKey(item){return crypto.createHash('sha256').update(`${item.link||''}|${item.title||''}`).digest('hex').slice(0,24);}
function eligibility(item){
  if(!item?.title)return {ok:false,reason:'missing-title'};
  if(item.type==='TRANSFER'&&!['OFFICIAL','DEVELOPING'].includes(item.stage))return {ok:false,reason:`transfer-stage-${item.stage||'none'}`};
  if(item.type!=='TRANSFER'&&item.type!=='NEWS')return {ok:false,reason:`unsupported-type-${item.type||'none'}`};
  if((item.relevance||0)<2)return {ok:false,reason:'low-relevance'};
  const age=Date.now()-new Date(item.publishedAt||0).getTime();
  if(!Number.isFinite(age)||age<0)return {ok:false,reason:'invalid-date'};
  if(age>6*60*60*1000)return {ok:false,reason:'older-than-6-hours'};
  return {ok:true,ageMinutes:Math.round(age/60000)};
}
function leadFor(item){return item.type==='TRANSFER'?(item.stage==='OFFICIAL'?'🚨 DEAL DONE':'🔥 TRANSFER CENTRE'):'⚽ FOOTBALL TALK';}
function debateFor(item){
  const title=clean(item.title);
  const supplied=clean(item.debatePrompt);
  if(supplied&&supplied.toLowerCase()!==title.toLowerCase()&&!supplied.toLowerCase().startsWith(title.toLowerCase()))return supplied;
  if(item.type==='TRANSFER')return item.stage==='OFFICIAL'?'Good move? Have your say 👇':'Can you see this one happening? Have your say 👇';
  return 'What’s your verdict? Have your say 👇';
}
function detailFor(item,max=170){
  const title=clean(item.title);
  let detail=clean(item.description||item.summary||item.excerpt||'');
  if(!detail||detail.toLowerCase()===title.toLowerCase()||detail.toLowerCase().startsWith(title.toLowerCase())){
    detail=item.type==='TRANSFER'?(item.stage==='OFFICIAL'?'The deal is confirmed. Here’s the latest.':'The move is developing and gathering pace.'):'The latest football story is developing.';
  }
  if(detail.length>max)detail=detail.slice(0,max-1).trimEnd()+'…';
  return detail;
}
function threadsText(item){
  const lead=leadFor(item);
  const debate=debateFor(item);
  const suffix=`\n\n${SITE_URL}\n\n#FootballTalk #WhereFansHaveTheirSay`;
  const detail=`\n\n${detailFor(item)}`;
  const reserved=lead.length+detail.length+debate.length+suffix.length+8;
  const maxTitle=Math.max(40,500-reserved);
  let title=clean(item.title);
  if(title.length>maxTitle)title=title.slice(0,Math.max(1,maxTitle-1)).trimEnd()+'…';
  return `${lead}\n\n${title}${detail}\n\n${debate}${suffix}`.slice(0,500);
}
async function websiteStories(){
  const r=await fetch(`${SITE_URL}api/news`,{headers:{'User-Agent':'FootballTalk Threads Sync/1.0'},cache:'no-store'});
  if(!r.ok)throw new Error(`Website news ${r.status}`);
  const data=await r.json();
  return data.items||[];
}
async function alreadyRecorded(cfg,id){
  const key=`${PUBLISH_PREFIX}${id}`;
  const url=`${cfg.url}/rest/v1/poll_responses?select=poll_id&poll_id=eq.${encodeURIComponent(key)}&limit=1`;
  const r=await fetch(url,{headers:sbHeaders(cfg),cache:'no-store'});
  if(!r.ok)return false;
  const rows=await r.json();
  return Array.isArray(rows)&&rows.length>0;
}
async function remember(cfg,id,item,postId,username){
  const record={kind:'threads-publish',storyId:id,title:item.title,threadsPostId:postId,username:username||null,createdAt:new Date().toISOString()};
  const r=await fetch(`${cfg.url}/rest/v1/poll_responses`,{method:'POST',headers:sbHeaders(cfg,{'Content-Type':'application/json',Prefer:'return=minimal'}),body:JSON.stringify({poll_id:`${PUBLISH_PREFIX}${id}`,answer:JSON.stringify(record)})});
  if(!r.ok)throw new Error(`Supabase ${r.status}`);
}
async function graph(pathname,{method='GET',params={}}={}){
  const token=process.env.THREADS_ACCESS_TOKEN;
  if(!token)throw new Error('THREADS_ACCESS_TOKEN is not configured');
  const url=new URL(`${THREADS_API}${pathname}`);
  for(const [k,v] of Object.entries({...params,access_token:token}))if(v!==undefined&&v!==null)url.searchParams.set(k,String(v));
  const r=await fetch(url,{method,cache:'no-store'});
  const data=await r.json().catch(()=>({}));
  if(!r.ok||data.error)throw new Error(data.error?.message||`Threads HTTP ${r.status}`);
  return data;
}
async function profile(){
  const configuredId=clean(process.env.THREADS_USER_ID);
  const me=await graph('/me',{params:{fields:'id,username'}});
  return {id:configuredId||me.id,username:me.username||null};
}
async function publishText(userId,text){
  const created=await graph(`/${encodeURIComponent(userId)}/threads`,{method:'POST',params:{media_type:'TEXT',text}});
  if(!created.id)throw new Error('Threads did not return a creation id');
  const published=await graph(`/${encodeURIComponent(userId)}/threads_publish`,{method:'POST',params:{creation_id:created.id}});
  if(!published.id)throw new Error('Threads did not return a published post id');
  return {containerId:created.id,postId:published.id};
}
async function diagnostics(){
  const configured=!!process.env.THREADS_ACCESS_TOKEN;
  if(!configured)return {ok:true,mode:'threads-direct',configured:false,bufferSlotRequired:false,next:'Add THREADS_ACCESS_TOKEN from Meta Threads OAuth. THREADS_USER_ID is optional because /me can resolve it.'};
  const me=await profile();
  const items=await websiteStories();
  const cfg=siteConfig();
  let selected=null;
  for(const item of items){
    if(!eligibility(item).ok)continue;
    if(!(await alreadyRecorded(cfg,storyKey(item)))){selected=item;break;}
  }
  return {ok:true,mode:'threads-direct',configured:true,bufferSlotRequired:false,profile:me,storyCount:items.length,selectedStory:selected?{title:selected.title,publishedAt:selected.publishedAt||null,preview:threadsText(selected)}:null};
}
async function syncPublish(){
  if(!process.env.THREADS_ACCESS_TOKEN)return {ok:true,published:false,configured:false,reason:'Threads OAuth token not configured'};
  const cfg=siteConfig();
  const me=await profile();
  const items=await websiteStories();
  for(const item of items){
    if(!eligibility(item).ok)continue;
    const id=storyKey(item);
    if(await alreadyRecorded(cfg,id))continue;
    const text=threadsText(item);
    const made=await publishText(me.id,text);
    await remember(cfg,id,item,made.postId,me.username);
    return {ok:true,published:true,title:item.title,username:me.username,postId:made.postId,containerId:made.containerId,text};
  }
  return {ok:true,published:false,reason:'No fresh unpublished selected story'};
}

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
  try{
    const isCron=String(req.headers['user-agent']||'').toLowerCase().includes('vercel-cron');
    if(isCron||String(req.query?.run||'')==='1')return res.status(200).json(await syncPublish());
    return res.status(200).json(await diagnostics());
  }catch(error){
    console.error('Threads publishing failed',error);
    return res.status(502).json({ok:false,error:'Threads publishing unavailable',detail:String(error.message||error)});
  }
};
