const GRAPH_VERSION='v26.0';

function configured(){
  return Boolean(process.env.FACEBOOK_PAGE_ID&&process.env.FACEBOOK_PAGE_ACCESS_TOKEN);
}

async function pageCheck(){
  const pageId=process.env.FACEBOOK_PAGE_ID;
  const token=process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const url=new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(pageId)}`);
  url.searchParams.set('fields','id,name');
  url.searchParams.set('access_token',token);
  const r=await fetch(url,{cache:'no-store'});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(data?.error?.message||`Facebook Graph HTTP ${r.status}`);
  return{id:data.id||null,name:data.name||null};
}

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET')return res.status(405).json({ok:false,error:'Method not allowed'});
  if(!configured())return res.status(503).json({ok:false,configured:false,pageIdConfigured:Boolean(process.env.FACEBOOK_PAGE_ID),tokenConfigured:Boolean(process.env.FACEBOOK_PAGE_ACCESS_TOKEN)});
  try{
    const page=await pageCheck();
    return res.status(200).json({ok:true,configured:true,mode:'facebook-reels-direct',page});
  }catch(error){
    console.error('Facebook Reels connection check failed',error);
    return res.status(502).json({ok:false,configured:true,error:String(error?.message||error)});
  }
};
