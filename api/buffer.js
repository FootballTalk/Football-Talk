const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const BUFFER_ENDPOINT='https://api.buffer.com';
const DRAFT_PREFIX='buffer-draft:';
const SITE_URL='https://www.footballtalk.uk/';

function siteConfig(){
  const text=fs.readFileSync(path.join(process.cwd(),'config.js'),'utf8');
  const url=(text.match(/SUPABASE_URL:\s*'([^']+)'/)||[])[1];
  const key=(text.match(/SUPABASE_ANON_KEY:\s*'([^']+)'/)||[])[1];
  if(!url||!key)throw new Error('Missing site config');
  return {url,key};
}
function sbHeaders(cfg,extra={}){return {apikey:cfg.key,Authorization:`Bearer ${cfg.key}`,...extra};}

async function gql(query,variables={}){
  const key=process.env.BUFFER_API_KEY;
  if(!key)throw new Error('BUFFER_API_KEY is not configured');
  const r=await fetch(BUFFER_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify({query,variables}),cache:'no-store'});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(`Buffer HTTP ${r.status}`);
  if(data.errors?.length)throw new Error(data.errors.map(e=>e.message).join('; '));
  return {data:data.data,rateLimit:r.headers.get('ratelimit')||null};
}

async function connectionInfo(){
  const orgResult=await gql(`query FootballTalkOrganizations { account { organizations { id name } } }`);
  const organizations=orgResult.data?.account?.organizations||[];
  const organization=organizations[0];
  if(!organization)return {connected:true,organization:null,channels:[],rateLimit:orgResult.rateLimit};
  const channelResult=await gql(`query FootballTalkChannels($organizationId: OrganizationId!) { channels(input:{organizationId:$organizationId,filter:{isLocked:false}}) { id name displayName service isQueuePaused } }`,{organizationId:organization.id});
  return {connected:true,organization,channels:channelResult.data?.channels||[],rateLimit:channelResult.rateLimit||orgResult.rateLimit};
}

function storyKey(item){return crypto.createHash('sha256').update(`${item.link||''}|${item.title||''}`).digest('hex').slice(0,24);}
function eligibility(item){
  if(!item?.title)return {ok:false,reason:'missing-title'};
  if(item.type==='TRANSFER'&&!['OFFICIAL','DEVELOPING'].includes(item.stage))return {ok:false,reason:`transfer-stage-${item.stage||'none'}`};
  if(item.type!=='TRANSFER'&&item.type!=='NEWS')return {ok:false,reason:`unsupported-type-${item.type||'none'}`};
  if((item.relevance||0)<1)return {ok:false,reason:'low-relevance'};
  const age=Date.now()-new Date(item.publishedAt||0).getTime();
  if(!Number.isFinite(age)||age<0)return {ok:false,reason:'invalid-date'};
  if(age>6*60*60*1000)return {ok:false,reason:'older-than-6-hours'};
  return {ok:true,ageMinutes:Math.round(age/60000)};
}
function eligible(item){return eligibility(item).ok;}
function postText(item){
  const transfer=item.type==='TRANSFER';
  const lead=transfer?(item.stage==='OFFICIAL'?'🚨 TRANSFER CENTRE — DEAL DONE':'🔥 TRANSFER CENTRE — GAINING PACE'):'⚽ FOOTBALL TALK';
  const debate=item.debatePrompt||`${item.title} — what’s your verdict?`;
  return `${lead}\n\n${item.title}\n\n${debate}\n\nRead more & have your say: ${SITE_URL}\n\n#WhereFansHaveTheirSay`;
}
async function alreadyDrafted(cfg,id){
  const url=`${cfg.url}/rest/v1/poll_responses?select=poll_id&poll_id=eq.${encodeURIComponent(DRAFT_PREFIX+id)}&limit=1`;
  const r=await fetch(url,{headers:sbHeaders(cfg),cache:'no-store'});
  if(!r.ok)return false;
  const rows=await r.json();
  return Array.isArray(rows)&&rows.length>0;
}
async function rememberDraft(cfg,id,item,post){
  const record={kind:'buffer-draft',storyId:id,title:item.title,bufferPostId:post?.id||null,createdAt:new Date().toISOString(),channel:'facebook'};
  const r=await fetch(`${cfg.url}/rest/v1/poll_responses`,{method:'POST',headers:sbHeaders(cfg,{'Content-Type':'application/json',Prefer:'return=minimal'}),body:JSON.stringify({poll_id:DRAFT_PREFIX+id,answer:JSON.stringify(record)})});
  if(!r.ok)throw new Error(`Supabase ${r.status}`);
}
async function websiteStories(){
  const r=await fetch(`${SITE_URL}api/news`,{headers:{'User-Agent':'FootballTalk Buffer Sync/1.0'},cache:'no-store'});
  if(!r.ok)throw new Error(`Website news ${r.status}`);
  const data=await r.json();
  return data.items||[];
}
async function latestWebsiteStory(){return (await websiteStories()).find(eligible)||null;}
async function createDraft(channelId,text){
  const result=await gql(`mutation FootballTalkDraft($channelId: ChannelId!,$text: String) { createPost(input:{text:$text,channelId:$channelId,schedulingType:automatic,mode:addToQueue,saveToDraft:true,metadata:{facebook:{type:post}}}) { ... on PostActionSuccess { post { id text dueAt } } ... on MutationError { message } } }`,{channelId,text});
  const payload=result.data?.createPost;
  if(!payload?.post)throw new Error(payload?.message||'Buffer did not create the draft');
  return {post:payload.post,rateLimit:result.rateLimit};
}
async function syncDraft(){
  const cfg=siteConfig();
  const item=await latestWebsiteStory();
  if(!item)return {ok:true,created:false,reason:'No fresh selected story'};
  const id=storyKey(item);
  if(await alreadyDrafted(cfg,id))return {ok:true,created:false,reason:'Latest selected story already drafted',title:item.title};
  const info=await connectionInfo();
  const target=(info.channels||[]).find(c=>String(c.service||'').toLowerCase()==='facebook'&&/football\s*talk/i.test(`${c.name||''} ${c.displayName||''}`));
  if(!target)throw new Error('Football Talk Facebook channel not found in Buffer');
  const created=await createDraft(target.id,postText(item));
  await rememberDraft(cfg,id,item,created.post);
  return {ok:true,created:true,title:item.title,channel:target.displayName||target.name||'Facebook',postId:created.post.id,rateLimit:created.rateLimit};
}
async function diagnostics(){
  const cfg=siteConfig();
  const [items,info]=await Promise.all([websiteStories(),connectionInfo()]);
  const target=(info.channels||[]).find(c=>String(c.service||'').toLowerCase()==='facebook'&&/football\s*talk/i.test(`${c.name||''} ${c.displayName||''}`));
  const sample=(items||[]).slice(0,12).map(item=>({title:item.title,type:item.type,stage:item.stage||null,relevance:item.relevance||0,publishedAt:item.publishedAt||null,...eligibility(item)}));
  const selected=(items||[]).find(eligible)||null;
  let duplicate=false;
  if(selected)duplicate=await alreadyDrafted(cfg,storyKey(selected));
  return {
    ok:true,
    mode:'diagnostic',
    bufferConnected:true,
    organization:info.organization?{id:info.organization.id,name:info.organization.name}:null,
    channels:(info.channels||[]).map(c=>({id:c.id,name:c.displayName||c.name,service:c.service,isQueuePaused:!!c.isQueuePaused})),
    facebookTarget:target?{id:target.id,name:target.displayName||target.name}:null,
    storyCount:items.length,
    selectedStory:selected?{title:selected.title,type:selected.type,stage:selected.stage||null,relevance:selected.relevance||0,publishedAt:selected.publishedAt||null,alreadyDrafted:duplicate}:null,
    recentEligibility:sample
  };
}

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
  try{
    const isCron=String(req.headers['user-agent']||'').toLowerCase().includes('vercel-cron');
    if(isCron||String(req.query?.run||'')==='1')return res.status(200).json(await syncDraft());
    return res.status(200).json(await diagnostics());
  }catch(error){
    console.error('Buffer connection failed',error);
    return res.status(502).json({ok:false,error:'Buffer connection unavailable',detail:String(error.message||error)});
  }
};
