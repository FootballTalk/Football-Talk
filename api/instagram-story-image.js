const sharp=require('sharp');

const W=1080,H=1350,PHOTO_H=1110;
const FALLBACK='https://www.footballtalk.uk/api/social-card-image';

function bestSource(url=''){
  let u=String(url);
  if(/ichef\.bbci\.co\.uk/i.test(u))u=u.replace(/\/ace\/standard\/\d+\//i,'/ace/standard/976/').replace(/\/standard\/\d+\//i,'/standard/976/');
  return u;
}
function esc(s=''){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function wrap(s='',max=34){
  const words=String(s).trim().split(/\s+/).filter(Boolean),lines=[];let line='';
  for(const word of words){const next=line?line+' '+word:word;if(next.length<=max||!line)line=next;else{lines.push(line);line=word;if(lines.length===2)break;}}
  if(line&&lines.length<3)lines.push(line);
  const used=lines.join(' ').split(/\s+/).length;
  if(used<words.length&&lines.length)lines[lines.length-1]=lines[lines.length-1].replace(/[.…]*$/,'')+'…';
  return lines.slice(0,3);
}
// Tiny built-in 5x7 bitmap alphabet: no system fonts, Pango or Fontconfig required.
const G={
'A':['01110','10001','10001','11111','10001','10001','10001'],'B':['11110','10001','10001','11110','10001','10001','11110'],'C':['01111','10000','10000','10000','10000','10000','01111'],'D':['11110','10001','10001','10001','10001','10001','11110'],'E':['11111','10000','10000','11110','10000','10000','11111'],'F':['11111','10000','10000','11110','10000','10000','10000'],'G':['01111','10000','10000','10111','10001','10001','01111'],'H':['10001','10001','10001','11111','10001','10001','10001'],'I':['11111','00100','00100','00100','00100','00100','11111'],'J':['00111','00010','00010','00010','10010','10010','01100'],'K':['10001','10010','10100','11000','10100','10010','10001'],'L':['10000','10000','10000','10000','10000','10000','11111'],'M':['10001','11011','10101','10101','10001','10001','10001'],'N':['10001','11001','10101','10011','10001','10001','10001'],'O':['01110','10001','10001','10001','10001','10001','01110'],'P':['11110','10001','10001','11110','10000','10000','10000'],'Q':['01110','10001','10001','10001','10101','10010','01101'],'R':['11110','10001','10001','11110','10100','10010','10001'],'S':['01111','10000','10000','01110','00001','00001','11110'],'T':['11111','00100','00100','00100','00100','00100','00100'],'U':['10001','10001','10001','10001','10001','10001','01110'],'V':['10001','10001','10001','10001','10001','01010','00100'],'W':['10001','10001','10001','10101','10101','10101','01010'],'X':['10001','10001','01010','00100','01010','10001','10001'],'Y':['10001','10001','01010','00100','00100','00100','00100'],'Z':['11111','00001','00010','00100','01000','10000','11111'],'0':['01110','10001','10011','10101','11001','10001','01110'],'1':['00100','01100','00100','00100','00100','00100','01110'],'2':['01110','10001','00001','00010','00100','01000','11111'],'3':['11110','00001','00001','01110','00001','00001','11110'],'4':['00010','00110','01010','10010','11111','00010','00010'],'5':['11111','10000','10000','11110','00001','00001','11110'],'6':['01110','10000','10000','11110','10001','10001','01110'],'7':['11111','00001','00010','00100','01000','01000','01000'],'8':['01110','10001','10001','01110','10001','10001','01110'],'9':['01110','10001','10001','01111','00001','00001','01110'],'&':['01100','10010','10100','01000','10101','10010','01101'],'-':['00000','00000','00000','11111','00000','00000','00000'],"'":['00100','00100','00000','00000','00000','00000','00000'],'.':['00000','00000','00000','00000','00000','00110','00110'],':':['00000','00110','00110','00000','00110','00110','00000'],'?':['01110','10001','00001','00010','00100','00000','00100'],'!':['00100','00100','00100','00100','00100','00000','00100'],'/':['00001','00010','00100','01000','10000','00000','00000'],' ':['00000','00000','00000','00000','00000','00000','00000']};
function bitmapText(lines){
  const scale=7,cw=6*scale,ch=8*scale,x0=54,y0=1148,rects=[];
  lines.forEach((raw,li)=>{const line=raw.toUpperCase().replace(/[^A-Z0-9 &'\-.:?!/]/g,'');[...line].forEach((c,ci)=>{const glyph=G[c]||G['?'];glyph.forEach((row,ry)=>[...row].forEach((v,rx)=>{if(v==='1')rects.push(`<rect x="${x0+ci*cw+rx*scale}" y="${y0+li*ch+ry*scale}" width="${scale}" height="${scale}" rx="1"/>`);}));});});
  return rects.join('');
}
module.exports=async(req,res)=>{
  try{
    const requested=String(req.query?.src||FALLBACK),title=String(req.query?.title||'FOOTBALL TALK');
    const src=bestSource(requested);if(!/^https:\/\//i.test(src))throw new Error('Invalid image URL');
    let r=await fetch(src,{cache:'no-store'});if(!r.ok&&src!==requested)r=await fetch(requested,{cache:'no-store'});if(!r.ok)throw new Error(`Image fetch failed: ${r.status}`);
    const input=Buffer.from(await r.arrayBuffer()),meta=await sharp(input).metadata(),sourceW=meta.width||0,sourceH=meta.height||0;
    let photo,photoTop=0,photoLeft=0;
    if(sourceW>=700&&sourceH>=450)photo=await sharp(input).rotate().resize(W,PHOTO_H,{fit:'cover',position:'attention',kernel:sharp.kernel.lanczos3}).sharpen({sigma:0.45,m1:0.35,m2:0.9}).jpeg({quality:94,mozjpeg:true,chromaSubsampling:'4:4:4'}).toBuffer();
    else{photo=await sharp(input).rotate().resize({width:Math.min(W,Math.max(sourceW*2,sourceW)),height:PHOTO_H,fit:'inside',withoutEnlargement:false,kernel:sharp.kernel.lanczos3}).jpeg({quality:94,mozjpeg:true,chromaSubsampling:'4:4:4'}).toBuffer();const pm=await sharp(photo).metadata();photoLeft=Math.max(0,Math.round((W-(pm.width||W))/2));photoTop=Math.max(0,Math.round((PHOTO_H-(pm.height||PHOTO_H))/2));}
    const lines=wrap(title,24);
    const frame=Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><rect width="${W}" height="${H}" fill="none"/><rect x="0" y="0" width="${W}" height="12" fill="#ffd600"/><rect x="0" y="${PHOTO_H-8}" width="${W}" height="8" fill="#ffd600"/><rect x="0" y="${PHOTO_H}" width="${W}" height="${H-PHOTO_H}" fill="#080808"/><rect x="0" y="${H-12}" width="${W}" height="12" fill="#ffd600"/><g fill="#fff">${bitmapText(lines)}</g></svg>`);
    const out=await sharp({create:{width:W,height:H,channels:3,background:'#080808'}}).composite([{input:photo,top:photoTop,left:photoLeft},{input:frame,top:0,left:0,blend:'over'}]).jpeg({quality:94,mozjpeg:true,chromaSubsampling:'4:4:4'}).toBuffer();
    res.setHeader('Content-Type','image/jpeg');res.setHeader('Cache-Control','no-store, max-age=0');res.setHeader('X-FT-Instagram-Renderer','headline-bitmap-v5');return res.status(200).send(out);
  }catch(e){console.error('Instagram image format failed',e);return res.status(302).setHeader('Location',FALLBACK).end();}
};
