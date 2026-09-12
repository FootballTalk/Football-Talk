const fs=require('fs');
const path=require('path');

function siteConfig(){
  const text=fs.readFileSync(path.join(process.cwd(),'config.js'),'utf8');
  const url=(text.match(/SUPABASE_URL:\s*'([^']+)'/)||[])[1];
  const key=(text.match(/SUPABASE_ANON_KEY:\s*'([^']+)'/)||[])[1];
  if(!url||!key)throw new Error('Missing site config');
  return{url,key};
}
function headers(c){return{apikey:c.key,Authorization:`Bearer ${c.key}`};}
function clean(v,max=50){return String(v||'').trim().toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,max);}

module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET')return res.status(405).json({ok:false,error:'Method not allowed'});
  try{
    const partner=clean(req.query?.partner||'');
    const cfg=siteConfig();
    const filter=partner?`partner-click:${partner}:`:'partner-click:';
    const url=`${cfg.url}/rest/v1/poll_responses?select=poll_id,answer&poll_id=like.${encodeURIComponent(filter+'*')}&order=poll_id.desc&limit=5000`;
    const r=await fetch(url,{headers:headers(cfg),cache:'no-store'});
    if(!r.ok)throw new Error(`Storage HTTP ${r.status}`);
    const rows=await r.json();
    const events=[];
    for(const row of rows||[]){
      try{const data=JSON.parse(row.answer||'{}');if(data&&data.partner)events.push(data)}catch{}
    }
    const byPartner={};
    const byPlacement={};
    events.forEach(e=>{
      byPartner[e.partner]=(byPartner[e.partner]||0)+1;
      const k=`${e.partner}:${e.placement||'unspecified'}`;
      byPlacement[k]=(byPlacement[k]||0)+1;
    });
    return res.status(200).json({
      ok:true,
      partner:partner||null,
      totalClicks:events.length,
      byPartner,
      byPlacement,
      latest:events.slice(0,20)
    });
  }catch(e){
    console.error('Partner click summary failed',e);
    return res.status(502).json({ok:false,error:'Unable to read partner clicks'});
  }
};
