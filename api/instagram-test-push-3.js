const BUFFER_ENDPOINT='https://api.buffer.com';
const SITE='https://www.footballtalk.uk/';
const TITLE='Glasner and Williams dispute VAR call over Forest handball';
const SRC='https://ichef.bbci.co.uk/ace/standard/240/cpsprodpb/f944/live/118243a0-a955-11f1-adf0-6d46cbf5ba37.jpg';

async function gql(query,variables={}){
  const key=process.env.BUFFER_API_KEY;
  if(!key)throw new Error('BUFFER_API_KEY is not configured');
  const r=await fetch(BUFFER_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify({query,variables}),cache:'no-store'});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(`Buffer HTTP ${r.status}`);
  if(data.errors?.length)throw new Error(data.errors.map(e=>e.message).join('; '));
  return data.data;
}
async function instagramChannel(){
  const a=await gql(`query { account { organizations { id name } } }`);
  const o=a?.account?.organizations?.[0];
  if(!o)throw new Error('Buffer organization not found');
  const c=await gql(`query C($organizationId: OrganizationId!) { channels(input:{organizationId:$organizationId,filter:{isLocked:false}}) { id name displayName service } }`,{organizationId:o.id});
  const ch=(c?.channels||[]).find(x=>String(x.service||'').toLowerCase()==='instagram');
  if(!ch)throw new Error('Instagram channel not found');
  return ch;
}
module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(String(req.query?.run||'')!=='1')return res.status(200).json({ok:true,mode:'armed',note:'Add ?run=1 to publish the one-off Instagram test.'});
  try{
    const ch=await instagramChannel();
    const image=`${SITE}api/instagram-story-image?src=${encodeURIComponent(SRC)}&title=${encodeURIComponent(TITLE)}&v=4&t=${Date.now()}`;
    const text=`⚽ FOOTBALL TALK\n\n${TITLE}\n\nControlled image-quality test using the latest Football Talk Instagram renderer.\n\n💬 What’s your verdict? Have your say 👇\n\nfootballtalk.uk\n\n#FootballTalk #WhereFansHaveTheirSay`;
    const q=`mutation P($channelId: ChannelId!,$text: String,$image: String!) { createPost(input:{text:$text,channelId:$channelId,schedulingType:automatic,mode:shareNow,saveToDraft:false,assets:[{image:{url:$image}}],metadata:{instagram:{type:post,shouldShareToFeed:true}}}) { ... on PostActionSuccess { post { id text dueAt } } ... on MutationError { message } } }`;
    const d=await gql(q,{channelId:ch.id,text,image});
    const p=d?.createPost;
    if(!p?.post)throw new Error(p?.message||'Buffer did not create Instagram test post');
    return res.status(200).json({ok:true,published:true,title:TITLE,postId:p.post.id,image,channel:ch.displayName||ch.name});
  }catch(e){console.error('Instagram test push 3 failed',e);return res.status(502).json({ok:false,error:String(e.message||e)});}
};
