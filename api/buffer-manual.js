const fs=require('fs');
const path=require('path');

const BUFFER_ENDPOINT='https://api.buffer.com';
const SITE_URL='https://www.footballtalk.uk/';
const DEFAULT_SOCIAL_IMAGE=`${SITE_URL}api/social-card-image`;
const MANUAL_PREFIX='buffer-manual:';
const QUEUE_FILE=path.join(process.cwd(),'data','buffer-manual.json');

function siteConfig(){
  const text=fs.readFileSync(path.join(process.cwd(),'config.js'),'utf8');
  const url=(text.match(/SUPABASE_URL:\s*'([^']+)'/)||[])[1];
  const key=(text.match(/SUPABASE_ANON_KEY:\s*'([^']+)'/)||[])[1];
  if(!url||!key)throw new Error('Missing site config');
  return {url,key};
}

function sbHeaders(cfg,extra={}){
  return {apikey:cfg.key,Authorization:`Bearer ${cfg.key}`,...extra};
}

async function gql(query,variables={}){
  const key=process.env.BUFFER_API_KEY;
  if(!key)throw new Error('BUFFER_API_KEY is not configured');
  const r=await fetch(BUFFER_ENDPOINT,{
    method:'POST',
    headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},
    body:JSON.stringify({query,variables}),
    cache:'no-store'
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(`Buffer HTTP ${r.status}`);
  if(data.errors?.length)throw new Error(data.errors.map(e=>e.message).join('; '));
  return data.data;
}

async function connectionInfo(){
  const orgResult=await gql(`query FootballTalkOrganizations { account { organizations { id name } } }`);
  const organization=orgResult?.account?.organizations?.[0];
  if(!organization)return {organization:null,channels:[]};
  const channelResult=await gql(`query FootballTalkChannels($organizationId: OrganizationId!) { channels(input:{organizationId:$organizationId,filter:{isLocked:false}}) { id name displayName service isQueuePaused } }`,{organizationId:organization.id});
  return {organization,channels:channelResult?.channels||[]};
}

function channelFor(info,service){
  return (info.channels||[]).find(c=>String(c.service||'').toLowerCase()===service&&(
    service==='facebook'?/football\s*talk/i.test(`${c.name||''} ${c.displayName||''}`):
    service==='twitter'?/footballt8lk/i.test(`${c.name||''} ${c.displayName||''}`):true
  ));
}

function loadQueue(){
  if(!fs.existsSync(QUEUE_FILE))return [];
  const parsed=JSON.parse(fs.readFileSync(QUEUE_FILE,'utf8'));
  return Array.isArray(parsed)?parsed:Array.isArray(parsed.items)?parsed.items:[];
}

async function alreadyRecorded(cfg,id,service){
  const key=`${MANUAL_PREFIX}${service}:${id}`;
  const url=`${cfg.url}/rest/v1/poll_responses?select=poll_id&poll_id=eq.${encodeURIComponent(key)}&limit=1`;
  const r=await fetch(url,{headers:sbHeaders(cfg),cache:'no-store'});
  if(!r.ok)return false;
  const rows=await r.json();
  return Array.isArray(rows)&&rows.length>0;
}

async function remember(cfg,item,post,service){
  const record={
    kind:'buffer-manual',
    storyId:item.id,
    title:item.title,
    bufferPostId:post?.id||null,
    createdAt:new Date().toISOString(),
    channel:service
  };
  const r=await fetch(`${cfg.url}/rest/v1/poll_responses`,{
    method:'POST',
    headers:sbHeaders(cfg,{'Content-Type':'application/json',Prefer:'return=minimal'}),
    body:JSON.stringify({poll_id:`${MANUAL_PREFIX}${service}:${item.id}`,answer:JSON.stringify(record)})
  });
  if(!r.ok)throw new Error(`Supabase ${r.status}`);
}

async function createPost(channelId,text,service,image){
  const variables={channelId,text,image:image||DEFAULT_SOCIAL_IMAGE};
  let query;
  if(service==='instagram'){
    query=`mutation FootballTalkManualInstagram($channelId: ChannelId!,$text: String,$image: String!) { createPost(input:{text:$text,channelId:$channelId,schedulingType:automatic,mode:shareNow,saveToDraft:false,assets:[{image:{url:$image}}],metadata:{instagram:{type:post,shouldShareToFeed:true}}}) { ... on PostActionSuccess { post { id text dueAt } } ... on MutationError { message } } }`;
  }else if(service==='facebook'){
    query=`mutation FootballTalkManualFacebook($channelId: ChannelId!,$text: String,$image: String!) { createPost(input:{text:$text,channelId:$channelId,schedulingType:automatic,mode:shareNow,saveToDraft:false,assets:[{image:{url:$image}}],metadata:{facebook:{type:post}}}) { ... on PostActionSuccess { post { id text dueAt } } ... on MutationError { message } } }`;
  }else{
    query=`mutation FootballTalkManualX($channelId: ChannelId!,$text: String,$image: String!) { createPost(input:{text:$text,channelId:$channelId,schedulingType:automatic,mode:shareNow,saveToDraft:false,assets:[{image:{url:$image}}]}) { ... on PostActionSuccess { post { id text dueAt } } ... on MutationError { message } } }`;
  }
  const data=await gql(query,variables);
  const payload=data?.createPost;
  if(!payload?.post)throw new Error(payload?.message||`Buffer did not create the ${service} post`);
  return payload.post;
}

function textFor(item,service){
  const raw=service==='facebook'?item.facebook:service==='instagram'?item.instagram:item.x;
  const text=String(raw||'').trim();
  if(service==='twitter'&&text.length>280)return text.slice(0,279).trimEnd()+'…';
  return text;
}

async function pendingState(cfg,items){
  const state=[];
  for(const item of items){
    if(!item?.id||item.enabled===false)continue;
    const done={};
    for(const service of ['facebook','twitter','instagram'])done[service]=await alreadyRecorded(cfg,item.id,service);
    state.push({id:item.id,title:item.title||'',done});
  }
  return state;
}

async function publishPending(){
  const cfg=siteConfig();
  const items=loadQueue();
  const info=await connectionInfo();
  const targets={
    facebook:channelFor(info,'facebook'),
    twitter:channelFor(info,'twitter'),
    instagram:channelFor(info,'instagram')
  };
  if(!targets.facebook)throw new Error('Football Talk Facebook channel not found in Buffer');
  if(!targets.twitter)throw new Error('Football Talk X channel not found in Buffer');
  if(!targets.instagram)throw new Error('Football Talk Instagram channel not found in Buffer');

  for(const item of items){
    if(!item?.id||item.enabled===false)continue;
    const pending=[];
    for(const service of Object.keys(targets)){
      if(!(await alreadyRecorded(cfg,item.id,service)))pending.push(service);
    }
    if(!pending.length)continue;

    const posts=[];
    const errors=[];
    for(const service of pending){
      const text=textFor(item,service);
      if(!text){errors.push({service,error:'Missing post text'});continue;}
      try{
        const post=await createPost(targets[service].id,text,service,item.image||DEFAULT_SOCIAL_IMAGE);
        await remember(cfg,item,post,service);
        posts.push({service,channel:targets[service].displayName||targets[service].name,postId:post.id});
      }catch(error){
        errors.push({service,error:String(error.message||error)});
      }
    }
    return {ok:posts.length>0,published:posts.length>0,id:item.id,title:item.title,posts,errors};
  }
  return {ok:true,published:false,reason:'No pending manual Buffer posts'};
}

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET'){
    res.setHeader('Allow','GET');
    return res.status(405).json({error:'Method not allowed'});
  }
  try{
    const isCron=String(req.headers['user-agent']||'').toLowerCase().includes('vercel-cron');
    if(isCron)return res.status(200).json(await publishPending());

    const cfg=siteConfig();
    const items=loadQueue();
    return res.status(200).json({
      ok:true,
      mode:'diagnostic-only',
      note:'Publishing is restricted to Vercel Cron requests.',
      queue:await pendingState(cfg,items)
    });
  }catch(error){
    console.error('Manual Buffer publish failed',error);
    return res.status(502).json({ok:false,error:'Manual Buffer publishing unavailable',detail:String(error.message||error)});
  }
};
