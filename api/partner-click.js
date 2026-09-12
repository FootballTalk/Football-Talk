const fs=require('fs');
const path=require('path');
const crypto=require('crypto');

function siteConfig(){
  const text=fs.readFileSync(path.join(process.cwd(),'config.js'),'utf8');
  const url=(text.match(/SUPABASE_URL:\s*'([^']+)'/)||[])[1];
  const key=(text.match(/SUPABASE_ANON_KEY:\s*'([^']+)'/)||[])[1];
  if(!url||!key)throw new Error('Missing site config');
  return{url,key};
}
function headers(c,e={}){return{apikey:c.key,Authorization:`Bearer ${c.key}`,...e};}
function clean(v,max=80){return String(v||'').trim().toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,max);}
function host(v){try{return new URL(String(v||'')).hostname.slice(0,120)}catch{return'unknown'}}

module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({ok:false,error:'Method not allowed'});
  try{
    const partner=clean(req.body?.partner,50);
    if(!partner)return res.status(400).json({ok:false,error:'Missing partner'});
    const placement=clean(req.body?.placement||'unspecified',80)||'unspecified';
    const destinationHost=host(req.body?.destination);
    const now=new Date().toISOString();
    const id=`partner-click:${partner}:${Date.now()}:${crypto.randomBytes(5).toString('hex')}`;
    const cfg=siteConfig();
    const r=await fetch(`${cfg.url}/rest/v1/poll_responses`,{
      method:'POST',
      headers:headers(cfg,{'Content-Type':'application/json',Prefer:'return=minimal'}),
      body:JSON.stringify({poll_id:id,answer:JSON.stringify({partner,placement,destinationHost,createdAt:now})})
    });
    if(!r.ok)throw new Error(`Storage HTTP ${r.status}`);
    return res.status(200).json({ok:true});
  }catch(e){
    console.error('Partner click storage failed',e);
    return res.status(502).json({ok:false,error:'Unable to record partner click'});
  }
};
