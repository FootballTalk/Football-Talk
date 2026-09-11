const fs=require('fs');
const path=require('path');
const sharp=require('sharp');

const W=1080,H=1350,PHOTO_H=1090;
const FONT_FILE=path.join(process.cwd(),'assets','ft-social-bold.ttf');

function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));}
function cleanTitle(v=''){return String(v).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/Ø/g,'O').replace(/ø/g,'o').replace(/[\u2018\u2019]/g,"'").replace(/[\u201C\u201D]/g,'"').replace(/\s+/g,' ').trim();}
function wrap(v='',max=34){const words=cleanTitle(v).split(/\s+/).filter(Boolean),out=[];let line='';for(const w of words){const n=line?`${line} ${w}`:w;if(n.length<=max||!line)line=n;else{out.push(line);line=w;if(out.length===2)break;}}if(line&&out.length<3)out.push(line);if(out.join(' ').split(/\s+/).length<words.length&&out.length)out[out.length-1]=out[out.length-1].replace(/[.…]*$/,'')+'…';return out.slice(0,3);}
function bestSource(url=''){let u=String(url||'');if(/ichef\.bbci\.co\.uk/i.test(u))u=u.replace(/\/ace\/standard\/\d+\//i,'/ace/standard/1536/').replace(/\/standard\/\d+\//i,'/standard/1536/');return u;}
async function fetchImage(url){if(!/^https:\/\//i.test(String(url||'')))return null;for(const candidate of [...new Set([bestSource(url),url])]){try{const r=await fetch(candidate,{cache:'no-store',headers:{'User-Agent':'FootballTalk Instagram Artwork/2.0'}});if(!r.ok)continue;const type=String(r.headers.get('content-type')||'');if(type&&!/^image\//i.test(type))continue;const b=Buffer.from(await r.arrayBuffer());const m=await sharp(b).metadata();if(m.width>=500&&m.height>=300)return b;}catch(e){console.warn('Image candidate failed',e.message);}}return null;}
function decodeHtml(s=''){return String(s).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'");}
async function articleImage(article){if(!/^https:\/\//i.test(String(article||'')))return null;try{const r=await fetch(article,{cache:'no-store',headers:{'User-Agent':'Mozilla/5.0 FootballTalk/2.0'}});if(!r.ok)return null;const html=await r.text();const matches=[...html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image(?::src)?)["'][^>]+content=["']([^"']+)["']/gi),...html.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image(?::src)?)["']/gi)];for(const m of matches){const url=decodeHtml(m[1]);const img=await fetchImage(url);if(img)return img;}}catch(e){console.warn('Article image lookup failed',e.message);}return null;}
function textInput(value,size,color,width,align='left'){
  return {text:{text:`<span foreground="${color}" size="${size*1024}">${esc(value)}</span>`,font:'NimbusSans-Bold',fontfile:FONT_FILE,width,align,rgba:true,dpi:72,wrap:'none'}};
}
async function brandedFallback(){
  const bg=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${PHOTO_H}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#070707"/><stop offset="1" stop-color="#181818"/></linearGradient></defs><rect width="1080" height="1090" fill="url(#g)"/><rect width="1080" height="16" fill="#f7c600"/><circle cx="540" cy="430" r="150" fill="none" stroke="#f7c600" stroke-width="12"/><text x="540" y="475" text-anchor="middle" font-family="Arial,sans-serif" font-size="132" font-weight="900" fill="#f7c600">FT</text><rect x="180" y="680" width="720" height="4" fill="#f7c600"/></svg>`);
  return sharp(bg).composite([
    {input:textInput('FOOTBALL TALK',64,'#ffffff',800,'center'),left:140,top:730},
    {input:textInput('WHERE FANS HAVE THEIR SAY',25,'#f7c600',800,'center'),left:140,top:815},
    {input:textInput('BREAKING FOOTBALL NEWS',28,'#bdbdbd',800,'center'),left:140,top:900}
  ]).jpeg({quality:96,mozjpeg:true,chromaSubsampling:'4:4:4'}).toBuffer();
}
module.exports=async(req,res)=>{
  try{
    const title=cleanTitle(req.query?.title||'FOOTBALL TALK');
    const src=String(req.query?.src||'').trim();
    const article=String(req.query?.article||'').trim();
    let input=await fetchImage(src),mode='story-image';
    if(!input&&article){input=await articleImage(article);mode=input?'article-image':'branded-fallback';}
    let photo;
    if(input){photo=await sharp(input).rotate().resize(W,PHOTO_H,{fit:'cover',position:'attention',kernel:sharp.kernel.lanczos3,fastShrinkOnLoad:false}).sharpen({sigma:0.65,m1:0.55,m2:1.1}).jpeg({quality:96,mozjpeg:true,chromaSubsampling:'4:4:4'}).toBuffer();}
    else{photo=await brandedFallback();mode='branded-fallback';}

    const lines=wrap(title,34);
    const headlineLayers=lines.map((line,i)=>({input:textInput(line.toUpperCase(),42,'#ffffff',950),left:54,top:1120+i*58}));
    const frame=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="1080" height="1350" fill="#080808"/><rect width="1080" height="12" fill="#f7c600"/><rect y="${PHOTO_H-8}" width="1080" height="8" fill="#f7c600"/><rect y="1338" width="1080" height="12" fill="#f7c600"/></svg>`);
    const out=await sharp(frame).composite([{input:photo,top:0,left:0},...headlineLayers]).jpeg({quality:96,mozjpeg:true,chromaSubsampling:'4:4:4'}).toBuffer();
    res.setHeader('Content-Type','image/jpeg');
    res.setHeader('Cache-Control','no-store, max-age=0');
    res.setHeader('X-FT-Instagram-Renderer','v12-bundled-font');
    res.setHeader('X-FT-Instagram-Image-Mode',mode);
    return res.status(200).send(out);
  }catch(e){
    console.error('Instagram artwork failed',e);
    return res.status(500).json({ok:false,error:'Instagram artwork unavailable'});
  }
};
