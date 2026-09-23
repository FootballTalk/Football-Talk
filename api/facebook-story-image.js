const sharp=require('sharp');

const W=1200,H=630;
const FALLBACK='https://www.footballtalk.uk/api/social-card-image';

function bestSource(url=''){
  let u=String(url||'');
  if(/ichef\.bbci\.co\.uk/i.test(u))u=u.replace(/\/ace\/standard\/\d+\//i,'/ace/standard/1536/').replace(/\/standard\/\d+\//i,'/standard/1536/');
  if(/i\.guim\.co\.uk/i.test(u))try{const x=new URL(u),m=x.pathname.match(/^\/img\/media\/([^/]+)\/([^/]+)\/master\/([^/]+)$/);if(m)u=`https://media.guim.co.uk/${m[1]}/${m[2]}/${m[3]}`;}catch{}
  return u;
}
function decodeHtml(s=''){return String(s).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'");}
async function fetchImage(url){
  if(!/^https:\/\//i.test(String(url||'')))return null;
  const candidates=[...new Set([bestSource(url),String(url)])];
  for(const candidate of candidates){
    for(const headers of [
      {'User-Agent':'Mozilla/5.0 (compatible; FootballTalk/3.0; +https://www.footballtalk.uk/)','Accept':'image/avif,image/webp,image/*,*/*;q=0.8'},
      {'User-Agent':'Mozilla/5.0','Accept':'image/*,*/*;q=0.8','Referer':(()=>{try{return new URL(candidate).origin+'/'}catch{return 'https://www.footballtalk.uk/'}})()}
    ]){
      try{
        const r=await fetch(candidate,{cache:'no-store',headers,redirect:'follow'});
        if(!r.ok)continue;
        const type=String(r.headers.get('content-type')||'');
        if(type&&!/^image\//i.test(type))continue;
        const b=Buffer.from(await r.arrayBuffer()),m=await sharp(b).metadata();
        if((m.width||0)>=500&&(m.height||0)>=300)return b;
      }catch{}
    }
  }
  return null;
}
async function articleImage(article){
  if(!/^https:\/\//i.test(String(article||'')))return null;
  try{
    const r=await fetch(article,{cache:'no-store',headers:{'User-Agent':'Mozilla/5.0 (compatible; FootballTalk/3.0; +https://www.footballtalk.uk/)','Accept':'text/html,application/xhtml+xml'}});
    if(!r.ok)return null;
    const html=await r.text();
    const patterns=[/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image(?::src)?)["'][^>]+content=["']([^"']+)["']/gi,/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image(?::src)?)["']/gi];
    for(const pattern of patterns)for(const m of html.matchAll(pattern)){const img=await fetchImage(decodeHtml(m[1]));if(img)return img;}
  }catch(e){console.warn('Facebook article image lookup failed',{article,detail:String(e.message||e)});}
  return null;
}
async function render(input){
  const meta=await sharp(input).metadata(),sourceW=meta.width||0,sourceH=meta.height||0;
  if(sourceW>=700&&sourceH>=400)return sharp(input).rotate().resize(W,H,{fit:'cover',position:'attention',kernel:sharp.kernel.lanczos3}).sharpen({sigma:0.45,m1:0.35,m2:0.9}).jpeg({quality:95,mozjpeg:true,chromaSubsampling:'4:4:4'}).toBuffer();
  const bg=await sharp(input).rotate().resize(W,H,{fit:'cover',position:'attention'}).blur(16).modulate({brightness:0.72}).jpeg({quality:90,mozjpeg:true}).toBuffer();
  const fg=await sharp(input).rotate().resize({width:W,height:H,fit:'inside',withoutEnlargement:false}).sharpen().jpeg({quality:95,mozjpeg:true}).toBuffer();
  const fm=await sharp(fg).metadata();
  return sharp(bg).composite([{input:fg,left:Math.max(0,Math.round((W-(fm.width||W))/2)),top:Math.max(0,Math.round((H-(fm.height||H))/2))}]).jpeg({quality:95,mozjpeg:true,chromaSubsampling:'4:4:4'}).toBuffer();
}
module.exports=async(req,res)=>{
  try{
    const requested=String(req.query?.src||'').trim(),article=String(req.query?.article||'').trim();
    let input=await fetchImage(requested);
    let mode='feed-image';
    if(!input&&article){input=await articleImage(article);mode='article-image';}
    if(!input){
      console.warn('Facebook story-specific image unavailable; using branded fallback',{host:(()=>{try{return new URL(requested).hostname}catch{return 'none'}})(),article:article||null});
      input=await fetchImage(FALLBACK);mode='branded-fallback';
    }
    if(!input)throw new Error('No usable Facebook image');
    const out=await render(input);
    res.setHeader('Content-Type','image/jpeg');
    res.setHeader('Cache-Control','public, max-age=300, s-maxage=86400');
    res.setHeader('X-FT-Facebook-Renderer','facebook-hq-v2');
    res.setHeader('X-FT-Facebook-Image-Mode',mode);
    return res.status(200).send(out);
  }catch(e){
    console.error('Facebook image format failed',e);
    return res.status(302).setHeader('Location',FALLBACK).end();
  }
};