const GRAPH_VERSION='v26.0';
const BUSINESS_ID='1028244990024733';

function env(){return{pageId:process.env.FACEBOOK_PAGE_ID,token:process.env.FACEBOOK_PAGE_ACCESS_TOKEN};}
async function json(r){const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d?.error?.message||d?.message||`HTTP ${r.status}`);return d;}
async function tokenIdentity(token){const u=new URL(`https://graph.facebook.com/${GRAPH_VERSION}/me`);u.searchParams.set('fields','id,name');u.searchParams.set('access_token',token);return json(await fetch(u,{cache:'no-store'}));}
async function resolvePageToken(pageId,token){
  const me=await tokenIdentity(token);
  if(String(me.id)===String(pageId))return{token,identity:me,derived:false};
  const u=new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${BUSINESS_ID}/owned_pages`);
  u.searchParams.set('fields','id,name,access_token');
  u.searchParams.set('access_token',token);
  const d=await json(await fetch(u,{cache:'no-store'}));
  const p=(d.data||[]).find(x=>String(x.id)===String(pageId));
  if(!p?.access_token)throw new Error('Could not derive Football Talk Page access token');
  const identity=await tokenIdentity(p.access_token);
  if(String(identity.id)!==String(pageId))throw new Error('Derived token is not the Football Talk Page token');
  return{token:p.access_token,identity,derived:true};
}
async function pageCheck(pageId,token){const u=new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(pageId)}`);u.searchParams.set('fields','id,name');u.searchParams.set('access_token',token);const d=await json(await fetch(u,{cache:'no-store'}));return{id:d.id||null,name:d.name||null};}
async function start(pageId,token){const u=new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(pageId)}/video_reels`);u.searchParams.set('upload_phase','start');u.searchParams.set('access_token',token);return json(await fetch(u,{method:'POST',cache:'no-store'}));}
async function upload(uploadUrl,token,videoUrl){return json(await fetch(uploadUrl,{method:'POST',headers:{Authorization:`OAuth ${token}`,file_url:videoUrl},cache:'no-store'}));}
async function finish(pageId,token,videoId,description,title){const u=new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(pageId)}/video_reels`);u.searchParams.set('upload_phase','finish');u.searchParams.set('video_id',videoId);u.searchParams.set('video_state','PUBLISHED');if(description)u.searchParams.set('description',description);if(title)u.searchParams.set('title',title);u.searchParams.set('access_token',token);return json(await fetch(u,{method:'POST',cache:'no-store'}));}

module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 const {pageId,token}=env();
 if(!pageId||!token)return res.status(503).json({ok:false,configured:false});
 try{
  const resolved=await resolvePageToken(pageId,token);
  const page=await pageCheck(pageId,resolved.token);
  if(req.method==='GET'&&req.query?.testSource==='faceless'&&req.query?.confirm==='publish'){const videoUrl='https://cdn.facelessreels.com/videos/6ab14a9b2f4d7c9d33633691-1790028635874-bb25d342-1392-4d31-8014-95bfbc45337e.mp4';const session=await start(pageId,resolved.token);if(!session.video_id||!session.upload_url)throw new Error('Meta did not return a Reel upload session');const uploaded=await upload(session.upload_url,resolved.token,videoUrl);if(uploaded.success!==true)throw new Error('Meta did not confirm Reel upload');const published=await finish(pageId,resolved.token,session.video_id,'Football Talk: From a Dream to Reality — Daily','Football Talk');return res.status(200).json({ok:true,published:published.success===true,videoId:session.video_id,page,source:'facelessreels-cdn'});} if(req.method==='GET')return res.status(200).json({ok:true,configured:true,mode:'facebook-reels-direct',page,tokenIdentity:resolved.identity,pageTokenDerived:resolved.derived,publishing:{ready:true,requires:'POST with videoUrl and confirm=publish'}});
  if(req.method!=='POST')return res.status(405).json({ok:false,error:'Method not allowed'});
  const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
  const videoUrl=String(body.videoUrl||'').trim();
  if(!videoUrl)return res.status(400).json({ok:false,error:'videoUrl is required'});
  if(body.confirm!=='publish')return res.status(400).json({ok:false,error:'confirm must equal publish; nothing was published'});
  const session=await start(pageId,resolved.token);
  if(!session.video_id||!session.upload_url)throw new Error('Meta did not return a Reel upload session');
  const uploaded=await upload(session.upload_url,resolved.token,videoUrl);
  if(uploaded.success!==true)throw new Error('Meta did not confirm Reel upload');
  const published=await finish(pageId,resolved.token,session.video_id,String(body.description||''),String(body.title||''));
  return res.status(200).json({ok:true,published:published.success===true,videoId:session.video_id,page,source:videoUrl.startsWith('https://cdn.facelessreels.com/')?'facelessreels-cdn':'external'});
 }catch(e){console.error('Facebook Reels publishing failed',e);return res.status(502).json({ok:false,error:String(e?.message||e)});}
};