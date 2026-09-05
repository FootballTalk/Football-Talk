const sharp=require('sharp');

const W=1080,H=1350;
const FALLBACK='https://www.footballtalk.uk/api/social-card-image';

function escapeXml(s=''){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&apos;"}[c]));}

module.exports=async(req,res)=>{
  try{
    const src=String(req.query?.src||FALLBACK);
    if(!/^https:\/\//i.test(src)) throw new Error('Invalid image URL');
    const r=await fetch(src,{cache:'no-store'});
    if(!r.ok) throw new Error(`Image fetch failed: ${r.status}`);
    const input=Buffer.from(await r.arrayBuffer());

    const brand=Buffer.from(`
      <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="${W}" height="18" fill="#ffd600"/>
        <rect x="0" y="1232" width="${W}" height="118" fill="#090909" fill-opacity="0.92"/>
        <rect x="0" y="1232" width="${W}" height="8" fill="#ffd600"/>
        <text x="54" y="1295" font-family="Arial,Helvetica,sans-serif" font-size="38" font-weight="800" fill="#ffd600">FOOTBALL TALK</text>
        <text x="54" y="1330" font-family="Arial,Helvetica,sans-serif" font-size="24" font-weight="700" fill="#ffffff">WHERE FANS HAVE THEIR SAY</text>
        <text x="1026" y="1310" text-anchor="end" font-family="Arial,Helvetica,sans-serif" font-size="24" font-weight="700" fill="#ffffff">footballtalk.uk</text>
      </svg>`);

    const out=await sharp(input)
      .rotate()
      .resize(W,H,{fit:'cover',position:'attention'})
      .composite([{input:brand,top:0,left:0}])
      .jpeg({quality:88,mozjpeg:true})
      .toBuffer();

    res.setHeader('Content-Type','image/jpeg');
    res.setHeader('Cache-Control','public, max-age=3600, s-maxage=3600');
    res.status(200).send(out);
  }catch(e){
    console.error('Instagram image format failed',e);
    res.status(302).setHeader('Location',FALLBACK).end();
  }
};
