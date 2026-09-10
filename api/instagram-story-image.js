const sharp=require('sharp');

const W=1080,H=1350,PHOTO_H=1110;
const FALLBACK='https://www.footballtalk.uk/api/social-card-image';

function bestSource(url=''){
  let u=String(url);
  if(/ichef\.bbci\.co\.uk/i.test(u))u=u.replace(/\/ace\/standard\/\d+\//i,'/ace/standard/1536/').replace(/\/standard\/\d+\//i,'/standard/1536/');
  return u;
}
function cleanTitle(s=''){
  return String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/Ø/g,'O').replace(/ø/g,'o').replace(/[\u2018\u2019]/g,"'").replace(/[\u201C\u201D]/g,'"').replace(/[^A-Za-z0-9 &'"!?.,:\-]/g,'').replace(/\s+/g,' ').trim();
}
function wrap(s='',max=30){
  const words=cleanTitle(s).split(/\s+/).filter(Boolean),lines=[];let line='';
  for(const word of words){const next=line?line+' '+word:word;if(next.length<=max||!line)line=next;else{lines.push(line);line=word;if(lines.length===2)break;}}
  if(line&&lines.length<3)lines.push(line);
  const used=lines.join(' ').split(/\s+/).filter(Boolean).length;
  if(used<words.length&&lines.length)lines[lines.length-1]=lines[lines.length-1].replace(/[.…]*$/,'')+'...';
  return lines.slice(0,3);
}

// Font-independent 5x7 vector glyphs. This avoids Vercel/librsvg font failures entirely.
const G={
 A:['01110','10001','10001','11111','10001','10001','10001'],B:['11110','10001','10001','11110','10001','10001','11110'],C:['01111','10000','10000','10000','10000','10000','01111'],D:['11110','10001','10001','10001','10001','10001','11110'],E:['11111','10000','10000','11110','10000','10000','11111'],F:['11111','10000','10000','11110','10000','10000','10000'],G:['01111','10000','10000','10111','10001','10001','01111'],H:['10001','10001','10001','11111','10001','10001','10001'],I:['11111','00100','00100','00100','00100','00100','11111'],J:['00111','00010','00010','00010','10010','10010','01100'],K:['10001','10010','10100','11000','10100','10010','10001'],L:['10000','10000','10000','10000','10000','10000','11111'],M:['10001','11011','10101','10101','10001','10001','10001'],N:['10001','11001','10101','10011','10001','10001','10001'],O:['01110','10001','10001','10001','10001','10001','01110'],P:['11110','10001','10001','11110','10000','10000','10000'],Q:['01110','10001','10001','10001','10101','10010','01101'],R:['11110','10001','10001','11110','10100','10010','10001'],S:['01111','10000','10000','01110','00001','00001','11110'],T:['11111','00100','00100','00100','00100','00100','00100'],U:['10001','10001','10001','10001','10001','10001','01110'],V:['10001','10001','10001','10001','10001','01010','00100'],W:['10001','10001','10001','10101','10101','11011','10001'],X:['10001','10001','01010','00100','01010','10001','10001'],Y:['10001','10001','01010','00100','00100','00100','00100'],Z:['11111','00001','00010','00100','01000','10000','11111'],
 '0':['01110','10001','10011','10101','11001','10001','01110'],'1':['00100','01100','00100','00100','00100','00100','01110'],'2':['01110','10001','00001','00010','00100','01000','11111'],'3':['11110','00001','00001','01110','00001','00001','11110'],'4':['00010','00110','01010','10010','11111','00010','00010'],'5':['11111','10000','10000','11110','00001','00001','11110'],'6':['01110','10000','10000','11110','10001','10001','01110'],'7':['11111','00001','00010','00100','01000','01000','01000'],'8':['01110','10001','10001','01110','10001','10001','01110'],'9':['01110','10001','10001','01111','00001','00001','01110'],
 "'":['00100','00100','00000','00000','00000','00000','00000'],'!':['00100','00100','00100','00100','00100','00000','00100'],'?':['01110','10001','00001','00010','00100','00000','00100'],'.':['00000','00000','00000','00000','00000','00100','00100'],',':['00000','00000','00000','00000','00100','00100','01000'],':':['00000','00100','00100','00000','00100','00100','00000'],'-':['00000','00000','00000','11111','00000','00000','00000'],'&':['01100','10010','10100','01000','10101','10010','01101']
};
function lineWidth(s,scale){let n=0;for(const ch of s)n+=(ch===' '?4:6)*scale;return Math.max(0,n-scale);}
function headlineSvg(lines){
  const scale=7,maxW=976,lineH=64,startX=52,startY=1142;let rects='';
  lines.forEach((raw,li)=>{let s=raw.toUpperCase(),sc=scale;while(lineWidth(s,sc)>maxW&&sc>4)sc--;let x=startX,y=startY+li*lineH;
    for(const ch of s){if(ch===' '){x+=4*sc;continue;}const glyph=G[ch]||G['?'];for(let r=0;r<7;r++)for(let c=0;c<5;c++)if(glyph[r][c]==='1')rects+=`<rect x="${x+c*sc}" y="${y+r*sc}" width="${sc}" height="${sc}" rx="1"/>`;x+=6*sc;}
  });
  return Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><g fill="#fff">${rects}</g></svg>`);
}
module.exports=async(req,res)=>{
  try{
    const requested=String(req.query?.src||'').trim(),title=String(req.query?.title||'FOOTBALL TALK');
    // Permanent guard: Instagram must always use a real story-specific image.
    // Never silently substitute the generic Football Talk social card.
    if(!requested||requested===FALLBACK||/\/api\/social-card-image(?:\?|$)/i.test(requested)){
      res.setHeader('Cache-Control','no-store, max-age=0');
      res.setHeader('X-FT-Instagram-Renderer','headline-vector-v10-story-only');
      return res.status(422).json({ok:false,error:'Story-specific image required'});
    }
    const src=bestSource(requested);if(!/^https:\/\//i.test(src))throw new Error('Invalid image URL');
    let r=await fetch(src,{cache:'no-store'});if(!r.ok&&src!==requested)r=await fetch(requested,{cache:'no-store'});if(!r.ok)throw new Error(`Image fetch failed: ${r.status}`);
    const type=String(r.headers.get('content-type')||'');if(type&&!/^image\//i.test(type))throw new Error(`Unexpected content type: ${type}`);
    const input=Buffer.from(await r.arrayBuffer());
    const meta=await sharp(input).metadata();if(!meta.width||!meta.height||meta.width<500||meta.height<300)throw new Error('Story image too small');
    const photo=await sharp(input).rotate().resize(W,PHOTO_H,{fit:'cover',position:'attention',kernel:sharp.kernel.lanczos3,fastShrinkOnLoad:false}).sharpen({sigma:0.65,m1:0.55,m2:1.1}).jpeg({quality:96,mozjpeg:true,chromaSubsampling:'4:4:4'}).toBuffer();
    const lines=wrap(title,30);
    const frame=Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><rect width="${W}" height="${H}" fill="none"/><rect x="0" y="0" width="${W}" height="12" fill="#ffd600"/><rect x="0" y="${PHOTO_H-8}" width="${W}" height="8" fill="#ffd600"/><rect x="0" y="${PHOTO_H}" width="${W}" height="${H-PHOTO_H}" fill="#080808"/><rect x="0" y="${H-12}" width="${W}" height="12" fill="#ffd600"/></svg>`);
    const out=await sharp({create:{width:W,height:H,channels:3,background:'#080808'}}).composite([{input:photo,top:0,left:0},{input:frame,top:0,left:0,blend:'over'},{input:headlineSvg(lines),top:0,left:0,blend:'over'}]).jpeg({quality:96,mozjpeg:true,chromaSubsampling:'4:4:4'}).toBuffer();
    res.setHeader('Content-Type','image/jpeg');res.setHeader('Cache-Control','no-store, max-age=0');res.setHeader('X-FT-Instagram-Renderer','headline-vector-v10-story-only');return res.status(200).send(out);
  }catch(e){
    console.error('Instagram image format failed',e);
    // Fail closed. A bad image must never become a generic or broken Instagram post.
    res.setHeader('Cache-Control','no-store, max-age=0');
    res.setHeader('X-FT-Instagram-Renderer','headline-vector-v10-story-only');
    return res.status(502).json({ok:false,error:'Unable to build story-specific Instagram image'});
  }
};
