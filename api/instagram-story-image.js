const sharp=require('sharp');

const W=1080,H=1350;
const FALLBACK='https://www.footballtalk.uk/api/social-card-image';

function escapeXml(s=''){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&apos;"}[c]));}
function wrap(text,max=34,maxLines=3){
  const words=String(text||'').replace(/\s+/g,' ').trim().split(' ').filter(Boolean);
  const lines=[];let line='';
  for(const word of words){
    const next=line?`${line} ${word}`:word;
    if(next.length>max&&line){lines.push(line);line=word;}else line=next;
    if(lines.length===maxLines-1)break;
  }
  if(line&&lines.length<maxLines)lines.push(line);
  const used=lines.join(' ').split(' ').length;
  if(used<words.length&&lines.length){lines[lines.length-1]=lines[lines.length-1].replace(/[.,;:!?-]*$/,'')+'…';}
  return lines;
}

module.exports=async(req,res)=>{
  try{
    const src=String(req.query?.src||FALLBACK);
    const title=String(req.query?.title||'Football Talk');
    if(!/^https:\/\//i.test(src)) throw new Error('Invalid image URL');
    const r=await fetch(src,{cache:'no-store'});
    if(!r.ok) throw new Error(`Image fetch failed: ${r.status}`);
    const input=Buffer.from(await r.arrayBuffer());
    const meta=await sharp(input).metadata();
    const lowRes=(meta.width||0)<900||(meta.height||0)<650;

    const background=await sharp(input)
      .rotate()
      .resize(W,900,{fit:'cover',position:'attention',kernel:sharp.kernel.lanczos3})
      .blur(lowRes?18:12)
      .modulate({brightness:0.55,saturation:0.9})
      .jpeg({quality:82,mozjpeg:true})
      .toBuffer();

    const foreground=await sharp(input)
      .rotate()
      .resize({width:lowRes?860:1000,height:760,fit:'inside',withoutEnlargement:lowRes})
      .sharpen({sigma:1.1,m1:0.8,m2:1.8})
      .jpeg({quality:92,mozjpeg:true})
      .toBuffer();
    const fgMeta=await sharp(foreground).metadata();
    const fgW=fgMeta.width||860,fgH=fgMeta.height||500;
    const fgLeft=Math.max(40,Math.round((W-fgW)/2));
    const fgTop=Math.max(60,Math.round((820-fgH)/2));

    const lines=wrap(title,36,3);
    const headline=lines.map((line,i)=>`<text x="54" y="${970+i*68}" font-family="Arial,Helvetica,sans-serif" font-size="54" font-weight="800" fill="#ffffff">${escapeXml(line)}</text>`).join('');
    const brand=Buffer.from(`
      <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="${W}" height="${H}" fill="#090909"/>
        <image href="data:image/jpeg;base64,${background.toString('base64')}" x="0" y="0" width="${W}" height="900" preserveAspectRatio="xMidYMid slice"/>
        <rect x="0" y="0" width="${W}" height="900" fill="#000000" fill-opacity="0.12"/>
        <rect x="0" y="0" width="${W}" height="18" fill="#ffd600"/>
        <rect x="34" y="34" width="1012" height="800" rx="22" fill="#090909" fill-opacity="0.38" stroke="#ffd600" stroke-width="4"/>
        <rect x="0" y="878" width="${W}" height="354" fill="#090909"/>
        <rect x="0" y="878" width="${W}" height="9" fill="#ffd600"/>
        <text x="54" y="938" font-family="Arial,Helvetica,sans-serif" font-size="27" font-weight="800" fill="#ffd600">FOOTBALL TALK</text>
        ${headline}
        <rect x="0" y="1232" width="${W}" height="118" fill="#050505"/>
        <rect x="0" y="1232" width="${W}" height="7" fill="#ffd600"/>
        <text x="54" y="1298" font-family="Arial,Helvetica,sans-serif" font-size="32" font-weight="800" fill="#ffd600">WHERE FANS HAVE THEIR SAY</text>
        <text x="1026" y="1298" text-anchor="end" font-family="Arial,Helvetica,sans-serif" font-size="25" font-weight="700" fill="#ffffff">footballtalk.uk</text>
      </svg>`);

    const out=await sharp(brand)
      .composite([{input:foreground,top:fgTop,left:fgLeft}])
      .jpeg({quality:91,mozjpeg:true,chromaSubsampling:'4:4:4'})
      .toBuffer();

    res.setHeader('Content-Type','image/jpeg');
    res.setHeader('Cache-Control','public, max-age=900, s-maxage=900');
    res.status(200).send(out);
  }catch(e){
    console.error('Instagram image format failed',e);
    res.status(302).setHeader('Location',FALLBACK).end();
  }
};
