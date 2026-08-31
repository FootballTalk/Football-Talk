const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const BUFFER_ENDPOINT='https://api.buffer.com';
const DRAFT_PREFIX='buffer-draft:';
const PUBLISH_PREFIX='buffer-publish:';
const SITE_URL='https://www.footballtalk.uk/';
const DEFAULT_SOCIAL_IMAGE=`${SITE_URL}api/social-card-image`;
const INSTAGRAM_SOCIAL_IMAGE=`${SITE_URL}api/instagram-card-image`;

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
function storyKey(item){return crypto.createHash('sha256').update(`${item.link||''}|${item.title||''}|${item.stage||''}`).digest('hex').slice(0,24);}
function eligibility(item){
  if(!item?.title)return {ok:false,reason:'missing-title'};
  if(item.type==='TRANSFER'&&!['OFFICIAL','DEVELOPING','ROMANO_CONFIRMED'].includes(item.stage))return {ok:false,reason:`transfer-stage-${item.stage||'none'}`};
  if(item.type!=='TRANSFER'&&item.type!=='NEWS')return {ok:false,reason:`unsupported-type-${item.type||'none'}`};
  if((item.relevance||0)<2)return {ok:false,reason:'low-relevance'};
  const age=Date.now()-new Date(item.publishedAt||0).getTime();
  if(!Number.isFinite(age)||age<0)return {ok:false,reason:'invalid-date'};
  if(age>6*60*60*1000)return {ok:false,reason:'older-than-6-hours'};
  return {ok:true,ageMinutes:Math.round(age/60000)};
}
function eligible(item){return eligibility(item).ok;}
function cleanTitle(value){return String(value||'').replace(/\b(?:Fabrizio Romano|@FabrizioRomano)\b/gi,'').replace(/\s+/g,' ').trim();}
function leadFor(item){
  if(item.type!=='TRANSFER')return '⚽ FOOTBALL TALK';
  if(item.stage==='ROMANO_CONFIRMED')return "🚨 IT'S A GO";
  if(item.stage==='OFFICIAL')return '✅ OFFICIAL';
  return '🔥 TRANSFER CENTRE — GAINING PACE';
}
function debateFor(item){
  const title=cleanTitle(item.title);
  let debate=String(item.debatePrompt||'').trim();
  if(debate&&cleanTitle(debate).toLowerCase()!==title.toLowerCase()&&!cleanTitle(debate).toLowerCase().startsWith(title.toLowerCase()))return debate;
  if(item.type==='TRANSFER')return ['OFFICIAL','ROMANO_CONFIRMED'].includes(item.stage)?'Good move? Have your say 👇':'Can you see this one happening? Have your say 👇';
  if(/\blive\b/i.test(title))return 'Follow the action and have your say 👇';
  return 'What’s your verdict? Have your say 👇';
}
function detailFor(item,max=260){
  const title=cleanTitle(item.title);
  let detail=cleanTitle(item.description||item.summary||item.excerpt||'');
  if(!detail||detail.toLowerCase()===title.toLowerCase()||detail.toLowerCase().startsWith(title.toLowerCase())){
    if(item.type==='TRANSFER'){
      if(item.stage==='ROMANO_CONFIRMED')detail='The deal is agreed and can be treated as confirmed. The official club announcement is still to follow.';
      else if(item.stage==='OFFICIAL')detail='The club has now confirmed the move. Here’s the latest as the signing is made official.';
      else detail='The move is developing and beginning to gather pace. Here’s the latest.';
    }else detail='The latest football story is developing. Here’s the key update from the live feed.';
  }
  if(detail.length>max)detail=detail.slice(0,max-1).trimEnd()+'…';
  return detail;
}
function facebookText(item){return `${leadFor(item)}\n\n${cleanTitle(item.title)}\n\n${detailFor(item)}\n\n💬 ${debateFor(item)}\n\n🔗 ${SITE_URL}\n\n#WhereFansHaveTheirSay`;}
function instagramText(item){return `${leadFor(item)}\n\n${cleanTitle(item.title)}\n\n${detailFor(item,220)}\n\n💬 ${debateFor(item)}\n\nMore football at footballtalk.uk\n\n#FootballTalk #WhereFansHaveTheirSay`;}
function xText(item){
  const lead=leadFor(item);
  const suffix=`\n\n${SITE_URL}`;
  const debate=`\n\n${debateFor(item)}`;
  const detail=`\n\n${detailFor(item,95)}`;
  const available=Math.max(30,280-lead.length-detail.length-debate.length-suffix.length-4);
  let title=cleanTitle(item.title);
  if(title.length>available)title=title.slice(0,Math.max(1,available-1)).trimEnd()+'…';
  return `${lead}\n\n${title}${detail}${debate}${suffix}`.slice(0,280);
}
function imageUrl(item){
  const candidates=[item.image,item.imageUrl,item.image_url,item.thumbnail,item.thumbnailUrl,item.media?.image,item.media?.url];
  const found=candidates.find(v=>/^https:\/\//i.test(String(v||'')));
  return found||DEFAULT_SOCIAL_IMAGE;
}
function imageFor(item,service){return service==='instagram'?INSTAGRAM_SOCIAL_IMAGE:imageUrl(item);}
async function alreadyRecorded(cfg,prefix,id,service){
  const key=`${prefix}${service}:${id}`;
  const url=`${cfg.url}/rest/v1/poll_responses?select=poll_id&poll_id=eq.${encodeURIComponent(key)}&limit=1`;
  const r=await fetch(url,{headers:sbHeaders(cfg),cache:'no-store'});
  if(!r.ok)return false;
  const rows=await r.json();
  return Array.isArray(rows)&&rows.length>0;
}
async function remember(cfg,prefix,kind,id,item,post,service){
  const record={kind,storyId:id,title:item.title,stage:item.stage||null,confirmationPhase:item.confirmationPhase||null,source:item.source||null,bufferPostId:post?.id||null,createdAt:new Date().toISOString(),channel:service};
  const r=await fetch(`${cfg.url}/rest/v1/poll_responses`,{method:'POST',headers:sbHeaders(cfg,{'Content-Type':'application/json',Prefer:'return=minimal'}),body:JSON.stringify({poll_id:`${prefix}${service}:${id}`,answer:JSON.stringify(record)})});
  if(!r.ok)throw new Error(`Supabase ${r.status}`);
}
async function fetchStoryFeed(endpoint,label){
  const r=await fetch(`${SITE_URL}${endpoint}`,{headers:{'User-Agent':'FootballTalk Buffer Sync/2.0'},cache:'no-store'});
  if(!r.ok)throw new Error(`${label} ${r.status}`);
  const data=await r.json();
  return data.items||[];
}
async function websiteStories(){
  const settled=await Promise.allSettled([
    fetchStoryFeed('api/news','Website news'),
    fetchStoryFeed('api/romano','Confirmed transfer feed')
  ]);
  const items=settled.filter(r=>r.status==='fulfilled').flatMap(r=>r.value||[]);
  if(!items.length){
    const reasons=settled.filter(r=>r.status==='rejected').map(r=>String(r.reason?.message||r.reason));
    throw new Error(reasons.join('; ')||'No story feeds available');
  }
  return items.sort((a,b)=>new Date(b.publishedAt||0)-new Date(a.publishedAt||0));
}
async function createPost(channelId,text,service,{draft=false,image=null}={}){
  let query;
  const variables={channelId,text};
  if(image)variables.image=image;
  if(service==='instagram'){
    query=`mutation FootballTalkInstagramPost($channelId: ChannelId!,$text: String,$image: String!) { createPost(input:{text:$text,channelId:$channelId,schedulingType:automatic,mode:shareNow,saveToDraft:false,assets:[{image:{url:$image}}],metadata:{instagram:{type:post,shouldShareToFeed:true}}}) { ... on PostActionSuccess { post { id text dueAt } } ... on MutationError { message } } }`;
  }else if(service==='facebook'){
    query=`mutation FootballTalkFacebookPost($channelId: ChannelId!,$text: String,$image: String!) { createPost(input:{text:$text,channelId:$channelId,schedulingType:automatic,mode:shareNow,saveToDraft:false,assets:[{image:{url:$image}}],metadata:{facebook:{type:post}}}) { ... on PostActionSuccess { post { id text dueAt } } ... on MutationError { message } } }`;
  }else{
    query=`mutation FootballTalkXPost($channelId: ChannelId!,$text: String,$image: String!) { createPost(input:{text:$text,channelId:$channelId,schedulingType:automatic,mode:shareNow,saveToDraft:false,assets:[{image:{url:$image}}]}) { ... on PostActionSuccess { post { id text dueAt } } ... on MutationError { message } } }`;
  }
  const result=await gql(query,variables);
  const payload=result.data?.createPost;
  if(!payload?.post)throw new Error(payload?.message||`Buffer did not create the ${service} post`);
  return {post:payload.post,rateLimit:result.rateLimit};
}
function channelFor(info,service){
  return (info.channels||[]).find(c=>String(c.service||'').toLowerCase()===service&&(
    service==='facebook'?/football\s*talk/i.test(`${c.name||''} ${c.displayName||''}`):
    service==='twitter'?/footballt8lk/i.test(`${c.name||''} ${c.displayName||''}`):true
  ));
}
async function syncPublish(){
  const cfg=siteConfig();
  const items=await websiteStories();
  const info=await connectionInfo();
  const targets={facebook:channelFor(info,'facebook'),twitter:channelFor(info,'twitter'),instagram:channelFor(info,'instagram')};
  if(!targets.facebook)throw new Error('Football Talk Facebook channel not found in Buffer');
  if(!targets.twitter)throw new Error('Football Talk X channel not found in Buffer');
  if(!targets.instagram)throw new Error('Football Talk Instagram channel not found in Buffer');
  for(const item of items){
    if(!eligible(item))continue;
    const id=storyKey(item);
    const pending=[];
    for(const service of Object.keys(targets))if(!(await alreadyRecorded(cfg,PUBLISH_PREFIX,id,service)))pending.push(service);
    if(!pending.length)continue;
    const published=[];
    const errors=[];
    for(const service of pending){
      const target=targets[service];
      const text=service==='facebook'?facebookText(item):service==='instagram'?instagramText(item):xText(item);
      const image=imageFor(item,service);
      try{
        const made=await createPost(target.id,text,service,{draft:false,image});
        await remember(cfg,PUBLISH_PREFIX,'buffer-publish',id,item,made.post,service);
        published.push({service,channel:target.displayName||target.name,postId:made.post.id,image});
      }catch(error){errors.push({service,error:String(error.message||error)});}
    }
    return {ok:published.length>0,published:published.length>0,title:item.title,stage:item.stage||null,posts:published,errors,instagram:'automatic-square-image'};
  }
  return {ok:true,published:false,reason:'No fresh unpublished selected story',instagram:'automatic-square-image'};
}
async function diagnostics(){
  const cfg=siteConfig();
  const [items,info]=await Promise.all([websiteStories(),connectionInfo()]);
  const targets={facebook:channelFor(info,'facebook'),twitter:channelFor(info,'twitter'),instagram:channelFor(info,'instagram')};
  const sample=(items||[]).slice(0,12).map(item=>({title:item.title,type:item.type,stage:item.stage||null,confirmationPhase:item.confirmationPhase||null,source:item.source||null,relevance:item.relevance||0,publishedAt:item.publishedAt||null,image:item.image||null,...eligibility(item)}));
  let selected=null;
  for(const item of items){
    if(!eligible(item))continue;
    const id=storyKey(item);
    const published=await Promise.all(['facebook','twitter','instagram'].map(s=>alreadyRecorded(cfg,PUBLISH_PREFIX,id,s)));
    if(published.some(v=>!v)){selected=item;break;}
  }
  return {ok:true,mode:'diagnostic',publishing:'facebook-x-instagram-live',transferConfirmation:'verified-insider-plus-club-official',instagram:'automatic-square-image',instagramImage:INSTAGRAM_SOCIAL_IMAGE,bufferConnected:true,organization:info.organization?{id:info.organization.id,name:info.organization.name}:null,channels:(info.channels||[]).map(c=>({id:c.id,name:c.displayName||c.name,service:c.service,isQueuePaused:!!c.isQueuePaused})),targets:Object.fromEntries(Object.entries(targets).map(([k,v])=>[k,v?{id:v.id,name:v.displayName||v.name}:null])),storyCount:items.length,selectedStory:selected?{title:selected.title,type:selected.type,stage:selected.stage||null,confirmationPhase:selected.confirmationPhase||null,source:selected.source||null,relevance:selected.relevance||0,publishedAt:selected.publishedAt||null,image:imageUrl(selected),instagramImage:INSTAGRAM_SOCIAL_IMAGE,facebookPreview:facebookText(selected),instagramPreview:instagramText(selected),xPreview:xText(selected)}:null,recentEligibility:sample};
}
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
  try{
    const isCron=String(req.headers['user-agent']||'').toLowerCase().includes('vercel-cron');
    if(isCron||String(req.query?.run||'')==='1')return res.status(200).json(await syncPublish());
    return res.status(200).json(await diagnostics());
  }catch(error){
    console.error('Buffer connection failed',error);
    return res.status(502).json({ok:false,error:'Buffer connection unavailable',detail:String(error.message||error)});
  }
};
