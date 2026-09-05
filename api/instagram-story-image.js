const sharp=require('sharp');

const W=1080,H=1350,PHOTO_H=1210;
const FALLBACK='https://www.footballtalk.uk/api/social-card-image';

function bestSource(url=''){
  let u=String(url);
  if(/ichef\.bbci\.co\.uk/i.test(u))u=u.replace(/\/ace\/standard\/\d+\//i,'/ace/standard/976/').replace(/\/standard\/\d+\//i,'/standard/976/');
  return u;
}

module.exports=async(req,res)=>{
  try{
    const requested=String(req.query?.src||FALLBACK);
    const src=bestSource(requested);
    if(!/^https:\/\//i.test(src))throw new Error('Invalid image URL');
    let r=await fetch(src,{cache:'no-store'});
    if(!r.ok&&src!==requested)r=await fetch(requested,{cache:'no-store'});
    if(!r.ok)throw new Error(`Image fetch failed: ${r.status}`);
    const input=Buffer.from(await r.arrayBuffer());
    const meta=await sharp(input).metadata();
    const sourceW=meta.width||0,sourceH=meta.height||0;

    // Build the photograph first. Never place an opaque full-canvas SVG over it.
    // For normal news images, request the provider's large rendition and let it fill
    // almost the whole Instagram card. For genuinely small sources, contain them on
    // black rather than stretching them into a blur.
    let photo,photoTop=0,photoLeft=0;
    if(sourceW>=700&&sourceH>=450){
      photo=await sharp(input).rotate().resize(W,PHOTO_H,{fit:'cover',position:'attention',kernel:sharp.kernel.lanczos3}).sharpen({sigma:0.45,m1:0.35,m2:0.9}).jpeg({quality:94,mozjpeg:true,chromaSubsampling:'4:4:4'}).toBuffer();
    }else{
      photo=await sharp(input).rotate().resize({width:Math.min(W,Math.max(sourceW*2,sourceW)),height:PHOTO_H,fit:'inside',withoutEnlargement:false,kernel:sharp.kernel.lanczos3}).jpeg({quality:94,mozjpeg:true,chromaSubsampling:'4:4:4'}).toBuffer();
      const pm=await sharp(photo).metadata();
      photoLeft=Math.max(0,Math.round((W-(pm.width||W))/2));
      photoTop=Math.max(0,Math.round((PHOTO_H-(pm.height||PHOTO_H))/2));
    }

    // Deliberately use shape-only branding here. Server-side SVG font substitution was
    // producing square glyphs in production. The post caption already carries the full
    // headline, Football Talk name, CTA and URL, so the image stays clean and reliable.
    const frame=Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${W}" height="12" fill="#ffd600"/>
      <rect x="0" y="${PHOTO_H-8}" width="${W}" height="8" fill="#ffd600"/>
      <rect x="0" y="${PHOTO_H}" width="${W}" height="${H-PHOTO_H}" fill="#080808"/>
      <rect x="0" y="${H-12}" width="${W}" height="12" fill="#ffd600"/>
      <rect x="54" y="1258" width="280" height="12" rx="6" fill="#ffd600"/>
      <rect x="54" y="1290" width="520" height="8" rx="4" fill="#ffffff" opacity="0.9"/>
      <rect x="846" y="1258" width="180" height="40" rx="20" fill="#ffd600"/>
    </svg>`);

    const out=await sharp({create:{width:W,height:H,channels:3,background:'#080808'}})
      .composite([{input:photo,top:photoTop,left:photoLeft},{input:frame,top:0,left:0,blend:'over'}])
      .jpeg({quality:94,mozjpeg:true,chromaSubsampling:'4:4:4'}).toBuffer();
    res.setHeader('Content-Type','image/jpeg');
    res.setHeader('Cache-Control','no-store, max-age=0');
    res.setHeader('X-FT-Instagram-Renderer','photo-first-v4');
    return res.status(200).send(out);
  }catch(e){console.error('Instagram image format failed',e);return res.status(302).setHeader('Location',FALLBACK).end();}
};
