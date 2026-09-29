const fs=require('fs');
const path=require('path');

const SITE='https://www.footballtalk.uk';
const ARTICLE=SITE+'/manchester-city-premier-league-verdict-2026.html';
const SOCIAL_IMG=SITE+'/api/social-card-image';
const IG_IMG=SITE+'/api/instagram-card-image';
const KEY='man-city-verdict-2026-09-29';
const GRAPH_VERSION='v26.0';
const BUSINESS_ID='1028244990024733';
const BUFFER_ENDPOINT='https://api.buffer.com';

const COPY={
  facebook:`🚨 BREAKING: MANCHESTER CITY FOUND GUILTY

An independent Commission has found Manchester City guilty of all charges relating to serious breaches of the Premier League’s financial rules across nine seasons, plus three of four alleged breaches concerning co-operation.

No punishment has been imposed yet. A separate hearing will decide sanctions, while Manchester City say they will appeal.

⚽ Full Football Talk report:
${ARTICLE}

What do you think should happen next?

#FootballTalk #ManchesterCity #PremierLeague #WhereFansHaveTheirSay`,
  twitter:`🚨 BREAKING: Man City have been found guilty of all serious Premier League financial-rule charges across nine seasons, plus 3 of 4 co-operation charges. Sanctions come next; City say they will appeal.

${ARTICLE}`,
  bluesky:`🚨 BREAKING: Manchester City have been found guilty of all serious Premier League financial-rule charges across nine seasons, plus 3 of 4 co-operation charges. Sanctions will be decided separately and City say they will appeal.

${ARTICLE}`,
  instagram:`🚨 BREAKING: MANCHESTER CITY FOUND GUILTY

An independent Commission has found Manchester City guilty of all charges relating to serious Premier League financial-rule breaches across nine seasons, plus three of four alleged breaches concerning co-operation.

⚠️ Sanctions will be decided separately.
↩️ Manchester City say they will appeal.

Read the full report at FootballTalk.uk

What’s your verdict? 👇

#FootballTalk #ManchesterCity #PremierLeague #FootballNews #WhereFansHaveTheirSay`,
  tiktok:`🚨 BREAKING: Manchester City found guilty of serious Premier League financial-rule breaches across nine seasons. Sanctions will be decided separately; City say they will appeal. Full report: FootballTalk.uk #FootballTalk #ManchesterCity #PremierLeague #FootballNews`,
  threads:`🚨 BREAKING: Manchester City have been found guilty of all charges relating to serious Premier League financial-rule breaches across nine seasons, plus 3 of 4 alleged co-operation breaches.

No sanction has been imposed yet. City say they will appeal.

Full report: ${ARTICLE}

What should happen next? #FootballTalk`
};

function cfg(){
  const text=fs.readFileSync(path.join(process.cwd(),'config.js'),'utf8');
  const url=(text.match(/SUPABASE_URL:\s*'([^']+)'/)||[])[1];
  const key=(text.match(/SUPABASE_ANON_KEY:\s*'([^']+)'/)||[])[1];
  if(!url||!key)throw new Error('Missing site config');
  return{url,key};
}
function sh(c,x={}){return{apikey:c.key,Authorization:`Bearer ${c.key}`,...x};}
async function seen(c,service){
  const id=`breaking-social:${KEY}:${service}`;
  const r=await fetch(`${c.url}/rest/v1/poll_responses?select=poll_id,answer&poll_id=eq.${encodeURIComponent(id)}&limit=1`,{headers:sh(c),cache:'no-store'});
  if(!r.ok)return false;
  return (await r.json()).length>0;
}
async function remember(c,service,detail){
  const id=`breaking-social:${KEY}:${service}`;
  const r=await fetch(`${c.url}/rest/v1/poll_responses`,{method:'POST',headers:sh(c,{'Content-Type':'application/json',Prefer:'return=minimal'}),body:JSON.stringify({poll_id:id,answer:JSON.stringify({service,detail,createdAt:new Date().toISOString()})})});
  if(!r.ok)throw new Error(`Supabase record failed ${r.status}`);
}
async function gql(query,variables={}){
  const key=process.env.BUFFER_API_KEY;
  if(!key)throw new Error('BUFFER_API_KEY is not configured');
  const r=await fetch(BUFFER_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify({query,variables}),cache:'no-store'});
  const d=await r.json().catch(()=>({}));
  if(!r.ok||d.errors?.length)throw new Error(d.errors?.map(e=>e.message).join('; ')||`Buffer HTTP ${r.status}`);
  return d.data;
}
async function channels(){
  const a=await gql('query { account { organizations { id name } } }');
  const org=a?.account?.organizations?.[0]; if(!org)return[];
  const d=await gql('query C($organizationId: OrganizationId!) { channels(input:{organizationId:$organizationId,filter:{isLocked:false}}) { id name displayName service isQueuePaused } }',{organizationId:org.id});
  return d?.channels||[];
}
function pickChannel(list,service){
  return list.find(ch=>{
    const s=String(ch.service||'').toLowerCase();
    const match=service==='twitter'?(s==='twitter'||s==='x'):s===service;
    if(!match)return false;
    if(service==='facebook')return /football\s*talk/i.test(`${ch.name||''} ${ch.displayName||''}`);
    return true;
  })||null;
}
async function bufferPost(ch,service){
  const text=COPY[service];
  let query,variables;
  if(service==='bluesky'){
    query='mutation P($channelId: ChannelId!,$text: String) { createPost(input:{text:$text,channelId:$channelId,schedulingType:automatic,mode:shareNow,saveToDraft:false,assets:[]}) { ... on PostActionSuccess { post { id text dueAt } } ... on MutationError { message } } }';
    variables={channelId:ch.id,text};
  }else{
    const image=service==='tiktok'?IG_IMG:SOCIAL_IMG;
    const meta=service==='facebook'?',metadata:{facebook:{type:post}}':service==='tiktok'?',metadata:{tiktok:{title:"Manchester City financial rules verdict"}}':'';
    query=`mutation P($channelId: ChannelId!,$text: String,$image: String!) { createPost(input:{text:$text,channelId:$channelId,schedulingType:automatic,mode:shareNow,saveToDraft:false,assets:[{image:{url:$image}}]${meta}}) { ... on PostActionSuccess { post { id text dueAt } } ... on MutationError { message } } }`;
    variables={channelId:ch.id,text,image};
  }
  const d=await gql(query,variables);
  const p=d?.createPost;
  if(!p?.post)throw new Error(p?.message||`Buffer did not create ${service} post`);
  return p.post;
}
async function metaJson(r){const raw=await r.text();let d={};try{d=JSON.parse(raw)}catch{}if(!r.ok||d.error)throw new Error(d.error?.message||`Meta HTTP ${r.status}`);return d;}
async function metaIdentity(token){const u=new URL(`https://graph.facebook.com/${GRAPH_VERSION}/me`);u.searchParams.set('fields','id,name');u.searchParams.set('access_token',token);return metaJson(await fetch(u,{cache:'no-store'}));}
async function pageToken(pageId,token){
  const me=await metaIdentity(token);
  if(String(me.id)===String(pageId))return token;
  const u=new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${BUSINESS_ID}/owned_pages`);
  u.searchParams.set('fields','id,name,access_token');u.searchParams.set('access_token',token);
  const d=await metaJson(await fetch(u,{cache:'no-store'}));
  const p=(d.data||[]).find(x=>String(x.id)===String(pageId));
  if(!p?.access_token)throw new Error('Could not derive Football Talk Page token');
  return p.access_token;
}
async function igAccount(pageId,token){
  const u=new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${pageId}`);
  u.searchParams.set('fields','instagram_business_account,connected_instagram_account');u.searchParams.set('access_token',token);
  const d=await metaJson(await fetch(u,{cache:'no-store'}));
  const id=d.instagram_business_account?.id||d.connected_instagram_account?.id;
  if(!id)throw new Error('Football Talk Instagram business account is not linked');
  return id;
}
async function publishInstagram(){
  const pageId=process.env.FACEBOOK_PAGE_ID,base=process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if(!pageId||!base)throw new Error('Football Talk Meta credentials are not configured');
  const token=await pageToken(pageId,base),ig=await igAccount(pageId,token);
  const create=new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${ig}/media`);
  create.searchParams.set('image_url',IG_IMG);create.searchParams.set('caption',COPY.instagram);create.searchParams.set('access_token',token);
  const made=await metaJson(await fetch(create,{method:'POST',cache:'no-store'}));
  if(!made.id)throw new Error('Instagram did not create media container');
  let ready=false;
  for(let i=0;i<10;i++){
    if(i)await new Promise(r=>setTimeout(r,1500));
    const s=new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${made.id}`);
    s.searchParams.set('fields','status_code');s.searchParams.set('access_token',token);
    const st=await metaJson(await fetch(s,{cache:'no-store'}));
    if(st.status_code==='FINISHED'){ready=true;break;}
    if(st.status_code==='ERROR'||st.status_code==='EXPIRED')throw new Error('Instagram media container '+st.status_code);
  }
  if(!ready)throw new Error('Instagram media container not ready');
  const pub=new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${ig}/media_publish`);
  pub.searchParams.set('creation_id',made.id);pub.searchParams.set('access_token',token);
  const out=await metaJson(await fetch(pub,{method:'POST',cache:'no-store'}));
  if(!out.id)throw new Error('Instagram did not return published media id');
  return{mediaId:out.id};
}
async function threadsGraph(pathname,{method='GET',params={}}={}){
  const token=process.env.THREADS_ACCESS_TOKEN;if(!token)throw new Error('THREADS_ACCESS_TOKEN is not configured');
  const u=new URL('https://graph.threads.net/v1.0'+pathname);
  for(const[k,v]of Object.entries({...params,access_token:token}))u.searchParams.set(k,String(v));
  const r=await fetch(u,{method,cache:'no-store'});const d=await r.json().catch(()=>({}));
  if(!r.ok||d.error)throw new Error(d.error?.message||`Threads HTTP ${r.status}`);
  return d;
}
async function publishThreads(){
  const me=await threadsGraph('/me',{params:{fields:'id,username'}});
  if(!me.id)throw new Error('Threads user could not be resolved');
  const made=await threadsGraph(`/${encodeURIComponent(me.id)}/threads`,{method:'POST',params:{media_type:'TEXT',text:COPY.threads}});
  if(!made.id)throw new Error('Threads did not create container');
  let out=null;
  for(let i=0;i<4;i++){
    if(i)await new Promise(r=>setTimeout(r,1500*(i+1)));
    try{out=await threadsGraph(`/${encodeURIComponent(me.id)}/threads_publish`,{method:'POST',params:{creation_id:made.id}});if(out?.id)break;}catch(e){if(i===3)throw e;}
  }
  if(!out?.id)throw new Error('Threads did not return published post id');
  return{postId:out.id,username:me.username||null};
}
async function run(){
  const c=cfg();
  const results=[];
  let list=[];
  try{list=await channels();}catch(e){results.push({service:'buffer',posted:false,error:String(e.message||e)});}
  for(const service of ['facebook','twitter','bluesky','tiktok']){
    if(await seen(c,service)){results.push({service,posted:false,skipped:'already posted'});continue;}
    const ch=pickChannel(list,service);
    if(!ch){results.push({service,posted:false,skipped:'not connected in Buffer'});continue;}
    try{const p=await bufferPost(ch,service);await remember(c,service,{postId:p.id,channel:ch.displayName||ch.name});results.push({service,posted:true,postId:p.id,channel:ch.displayName||ch.name});}
    catch(e){results.push({service,posted:false,error:String(e.message||e)});}
  }
  if(await seen(c,'instagram'))results.push({service:'instagram',posted:false,skipped:'already posted'});
  else try{const p=await publishInstagram();await remember(c,'instagram',p);results.push({service:'instagram',posted:true,...p});}catch(e){results.push({service:'instagram',posted:false,error:String(e.message||e)});}
  if(await seen(c,'threads'))results.push({service:'threads',posted:false,skipped:'already posted'});
  else try{const p=await publishThreads();await remember(c,'threads',p);results.push({service:'threads',posted:true,...p});}catch(e){results.push({service:'threads',posted:false,error:String(e.message||e)});}
  results.push({service:'youtube',posted:false,skipped:'no connected YouTube publishing API in this project'});
  return{ok:true,key:KEY,article:ARTICLE,results};
}
module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  try{
    if(String(req.query?.confirm||'')!=='1')return res.status(200).json({ok:true,ready:true,key:KEY,article:ARTICLE,copy:COPY});
    return res.status(200).json(await run());
  }catch(e){console.error('Manchester City breaking social publish failed',e);return res.status(502).json({ok:false,error:String(e.message||e)});}
};