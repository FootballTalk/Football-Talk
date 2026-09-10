const sharp=require('sharp');

const W=1080,H=1350,PHOTO_H=1110;
const FALLBACK='https://www.footballtalk.uk/api/social-card-image';

function bestSource(url=''){
  let u=String(url);
  // Ask BBC iChef for a larger source before we crop to Instagram size.
  if(/ichef\.bbci\.co\.uk/i.test(u))u=u.replace(/\/ace\/standard\/\d+\//i,'/ace/standard/1536/').replace(/\/standard\/\d+\//i,'/standard/1536/');
  return u;
}
function esc(s=''){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');}
function cleanTitle(s=''){
  return String(s)
    .replace(/[\u2018\u2019]/g,"'")
    .replace(/[\u201C\u201D]/g,'"')
    .replace(/\s+/g,' ')
    .trim();
}
function wrap(s='',max=30){
  const words=cleanTitle(s).split(/\s+/).filter(Boolean),lines=[];let line='';
  for(const word of words){
    const next=line?line+' '+word:word;
    if(next.length<=max||!line)line=next;
    else{lines.push(line);line=word;if(lines.length===2)break;}
  }
  if(line&&lines.length<3)lines.push(line);
  const used=lines.join(' ').split(/\s+/).filter(Boolean).length;
  if(used<words.length&&lines.length)lines[lines.length-1]=lines[lines.length-1].replace(/[.…]*$/,'')+'…';
  return lines.slice(0,3);
}
function headlineSvg(lines){
  const fontSize=54,lineHeight=63,x=52,y=1169;
  const tspans=lines.map((line,i)=>`<tspan x="${x}" y="${y+i*lineHeight}">${esc(line.toUpperCase())}</tspan>`).join('');
  // Sharp/librsvg reliably renders the generic sans-serif family in Vercel's runtime.
  // Avoid naming a font that may not be installed: that caused otherwise valid text
  // elements to disappear completely in generated Instagram cards.
  return Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><text x="0" y="0" fill="#fff" font-family="sans-serif" font-size="${fontSize}" font-weight="bold" letter-spacing="0.6">${tspans}</text></svg>`);
}
module.exports=async(req,res)=>{
  try{
    const requested=String(req.query?.src||FALLBACK),title=String(req.query?.title||'FOOTBALL TALK');
    const src=bestSource(requested);if(!/^https:\/\//i.test(src))throw new Error('Invalid image URL');
    let r=await fetch(src,{cache:'no-store'});if(!r.ok&&src!==requested)r=await fetch(requested,{cache:'no-store'});if(!r.ok)throw new Error(`Image fetch failed: ${r.status}`);
    const input=Buffer.from(await r.arrayBuffer());
    const photo=await sharp(input).rotate().resize(W,PHOTO_H,{fit:'cover',position:'attention',kernel:sharp.kernel.lanczos3,fastShrinkOnLoad:false}).sharpen({sigma:0.65,m1:0.55,m2:1.1}).jpeg({quality:96,mozjpeg:true,chromaSubsampling:'4:4:4'}).toBuffer();
    const lines=wrap(title,30);
    const frame=Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><rect width="${W}" height="${H}" fill="none"/><rect x="0" y="0" width="${W}" height="12" fill="#ffd600"/><rect x="0" y="${PHOTO_H-8}" width="${W}" height="8" fill="#ffd600"/><rect x="0" y="${PHOTO_H}" width="${W}" height="${H-PHOTO_H}" fill="#080808"/><rect x="0" y="${H-12}" width="${W}" height="12" fill="#ffd600"/></svg>`);
    const out=await sharp({create:{width:W,height:H,channels:3,background:'#080808'}}).composite([{input:photo,top:0,left:0},{input:frame,top:0,left:0,blend:'over'},{input:headlineSvg(lines),top:0,left:0,blend:'over'}]).jpeg({quality:96,mozjpeg:true,chromaSubsampling:'4:4:4'}).toBuffer();
    res.setHeader('Content-Type','image/jpeg');res.setHeader('Cache-Control','no-store, max-age=0');res.setHeader('X-FT-Instagram-Renderer','headline-vector-v8-reliable');return res.status(200).send(out);
  }catch(e){console.error('Instagram image format failed',e);return res.status(302).setHeader('Location',FALLBACK).end();}
};
