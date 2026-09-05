const sharp=require('sharp');

const W=1080,H=1350,PHOTO_H=940;
const FALLBACK='https://www.footballtalk.uk/api/social-card-image';

function escapeXml(s=''){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&apos;"}[c]));}
function ascii(s=''){return String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[\u2018\u2019]/g,"'").replace(/[\u201C\u201D]/g,'"').replace(/[\u2013\u2014]/g,'-').replace(/[^\x20-\x7E]/g,'').replace(/\s+/g,' ').trim();}
function wrap(text,max=35,maxLines=3){
  const words=ascii(text).split(' ').filter(Boolean),lines=[];let line='';
  for(const word of words){const next=line?`${line} ${word}`:word;if(next.length>max&&line){lines.push(line);line=word;}else line=next;if(lines.length===maxLines-1)break;}
  if(line&&lines.length<maxLines)lines.push(line);
  const used=lines.join(' ').split(' ').filter(Boolean).length;
  if(used<words.length&&lines.length)lines[lines.length-1]=lines[lines.length-1].replace(/[.,;:!?-]*$/,'')+'...';
  return lines;
}
function bestSource(url=''){
  let u=String(url);
  // BBC story feeds often hand us a 240px thumbnail. Ask iChef for the large rendition
  // before we ever upscale it for Instagram.
  if(/ichef\.bbci\.co\.uk/i.test(u))u=u.replace(/\/standard\/\d+\//i,'/standard/976/').replace(/\/ace\/standard\/\d+\//i,'/ace/standard/976/');
  return u;
}

module.exports=async(req,res)=>{
  try{
    const requested=String(req.query?.src||FALLBACK),title=ascii(req.query?.title||'Football Talk');
    const src=bestSource(requested);
    if(!/^https:\/\//i.test(src))throw new Error('Invalid image URL');
    let r=await fetch(src,{cache:'no-store'});
    // If a provider rejects the higher-resolution rendition, fall back to its original URL.
    if(!r.ok&&src!==requested)r=await fetch(requested,{cache:'no-store'});
    if(!r.ok)throw new Error(`Image fetch failed: ${r.status}`);
    const input=Buffer.from(await r.arrayBuffer());
    const meta=await sharp(input).metadata();

    // Use the photograph as the hero image, but never enlarge tiny thumbnails blindly.
    // Large sources fill the frame. Smaller sources get a restrained upscale and a clean
    // dark surround instead of becoming a giant blur.
    let photo,photoTop=0,photoLeft=0;
    const sourceW=meta.width||0,sourceH=meta.height||0;
    if(sourceW>=700&&sourceH>=450){
      photo=await sharp(input).rotate().resize(W,PHOTO_H,{fit:'cover',position:'attention',kernel:sharp.kernel.lanczos3}).sharpen({sigma:0.55,m1:0.45,m2:1.0}).jpeg({quality:95,mozjpeg:true,chromaSubsampling:'4:4:4'}).toBuffer();
    }else{
      photo=await sharp(input).rotate().resize({width:Math.min(960,Math.max(sourceW*2,sourceW)),height:820,fit:'inside',withoutEnlargement:false,kernel:sharp.kernel.lanczos3}).sharpen({sigma:0.8,m1:0.6,m2:1.2}).jpeg({quality:95,mozjpeg:true,chromaSubsampling:'4:4:4'}).toBuffer();
      const pm=await sharp(photo).metadata();
      photoLeft=Math.round((W-(pm.width||W))/2);
      photoTop=Math.round((PHOTO_H-(pm.height||PHOTO_H))/2);
    }

    const lines=wrap(title,35,3);
    const headline=lines.map((line,i)=>`<text x="54" y="${1032+i*66}" font-family="DejaVu Sans, sans-serif" font-size="52" font-weight="700" fill="#ffffff">${escapeXml(line)}</text>`).join('');
    const overlay=Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${W}" height="${H}" fill="#080808"/>
      <rect x="0" y="0" width="${W}" height="16" fill="#ffd600"/>
      <rect x="0" y="${PHOTO_H-8}" width="${W}" height="8" fill="#ffd600"/>
      <rect x="0" y="${PHOTO_H}" width="${W}" height="410" fill="#080808"/>
      <text x="54" y="985" font-family="DejaVu Sans, sans-serif" font-size="27" font-weight="700" fill="#ffd600">FOOTBALL TALK</text>
      ${headline}
      <rect x="0" y="1260" width="${W}" height="90" fill="#030303"/>
      <rect x="0" y="1260" width="${W}" height="6" fill="#ffd600"/>
      <text x="54" y="1315" font-family="DejaVu Sans, sans-serif" font-size="25" font-weight="700" fill="#ffd600">WHERE FANS HAVE THEIR SAY</text>
      <text x="1026" y="1315" text-anchor="end" font-family="DejaVu Sans, sans-serif" font-size="23" font-weight="700" fill="#ffffff">footballtalk.uk</text>
    </svg>`);
    const out=await sharp({create:{width:W,height:H,channels:3,background:'#080808'}}).composite([{input:photo,top:photoTop,left:photoLeft},{input:overlay,top:0,left:0,blend:'over'}]).jpeg({quality:95,mozjpeg:true,chromaSubsampling:'4:4:4'}).toBuffer();
    res.setHeader('Content-Type','image/jpeg');res.setHeader('Cache-Control','public, max-age=300, s-maxage=300');return res.status(200).send(out);
  }catch(e){console.error('Instagram image format failed',e);return res.status(302).setHeader('Location',FALLBACK).end();}
};
