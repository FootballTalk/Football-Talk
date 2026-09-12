const sharp=require('sharp');

const W=1080,H=1350,INSET=14;
const GENERIC_RE=/\/api\/(?:social-card-image|instagram-card-image)(?:\?|$)/i;

function bestSource(url=''){
  let u=String(url||'');
  if(/ichef\.bbci\.co\.uk/i.test(u))u=u.replace(/\/ace\/standard\/\d+\//i,'/ace/standard/1536/').replace(/\/standard\/\d+\//i,'/standard/1536/');
  if(/i\.guim\.co\.uk/i.test(u))u=u.replace(/([?&])width=\d+/i,'$1width=1600');
  return u;
}

async function fetchImage(url){
  if(!/^https:\/\//i.test(String(url||''))||GENERIC_RE.test(String(url||'')))return null;
  for(const candidate of [...new Set([bestSource(url),String(url)])]){
    try{
      const r=await fetch(candidate,{cache:'no-store',headers:{'User-Agent':'FootballTalk Instagram Artwork/3.0'}});
      if(!r.ok)continue;
      const type=String(r.headers.get('content-type')||'');
      if(type&&!/^image\//i.test(type))continue;
      const b=Buffer.from(await r.arrayBuffer()),m=await sharp(b).metadata();
      if((m.width||0)>=500&&(m.height||0)>=300)return b;
    }catch(e){console.warn('Instagram source image failed',{url:candidate,detail:String(e.message||e)});}
  }
  return null;
}

function decodeHtml(s=''){return String(s).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'");}
async function articleImage(article){
  if(!/^https:\/\//i.test(String(article||'')))return null;
  try{
    const r=await fetch(article,{cache:'no-store',headers:{'User-Agent':'Mozilla/5.0 FootballTalk/3.0'}});
    if(!r.ok)return null;
    const html=await r.text();
    const patterns=[/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image(?::src)?)["'][^>]+content=["']([^"']+)["']/gi,/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image(?::src)?)["']/gi];
    for(const pattern of patterns)for(const m of html.matchAll(pattern)){const img=await fetchImage(decodeHtml(m[1]));if(img)return img;}
  }catch(e){console.warn('Instagram article image lookup failed',{article,detail:String(e.message||e)});}
  return null;
}

module.exports=async function handler(req,res){
  try{
    const src=String(req.query?.src||'').trim(),article=String(req.query?.article||'').trim();
    const input=await fetchImage(src)||await articleImage(article);
    if(!input){
      res.setHeader('Cache-Control','no-store');
      res.setHeader('X-FT-Instagram-Image-Mode','missing-story-image');
      return res.status(404).json({ok:false,error:'No valid story-specific image'});
    }

    const photo=await sharp(input).rotate().resize(W-INSET*2,H-INSET*2,{fit:'cover',position:'attention',kernel:sharp.kernel.lanczos3,fastShrinkOnLoad:false}).sharpen({sigma:0.55,m1:0.45,m2:1}).jpeg({quality:94,mozjpeg:true,chromaSubsampling:'4:4:4'}).toBuffer();
    const frame=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#f7c600"/><rect x="${INSET}" y="${INSET}" width="${W-INSET*2}" height="${H-INSET*2}" fill="#080808"/></svg>`);
    const out=await sharp(frame).composite([{input:photo,left:INSET,top:INSET}]).jpeg({quality:94,mozjpeg:true,chromaSubsampling:'4:4:4'}).toBuffer();
    res.setHeader('Content-Type','image/jpeg');
    res.setHeader('Cache-Control','public, max-age=31536000, immutable');
    res.setHeader('X-FT-Instagram-Renderer','v13-photo-only');
    res.setHeader('X-FT-Instagram-Image-Mode',src?'story-image':'article-image');
    return res.status(200).send(out);
  }catch(e){
    console.error('Instagram artwork failed',{detail:String(e.message||e),stack:e?.stack||null});
    res.setHeader('Cache-Control','no-store');
    return res.status(500).json({ok:false,error:'Instagram artwork unavailable'});
  }
};
