const sharp=require('sharp');

const W=1200,H=630;
const FALLBACK='https://www.footballtalk.uk/api/social-card-image';

function bestSource(url=''){
  let u=String(url);
  if(/ichef\.bbci\.co\.uk/i.test(u))u=u.replace(/\/ace\/standard\/\d+\//i,'/ace/standard/1024/').replace(/\/standard\/\d+\//i,'/standard/1024/');
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

    let out;
    if(sourceW>=700&&sourceH>=400){
      out=await sharp(input)
        .rotate()
        .resize(W,H,{fit:'cover',position:'attention',kernel:sharp.kernel.lanczos3})
        .sharpen({sigma:0.45,m1:0.35,m2:0.9})
        .jpeg({quality:95,mozjpeg:true,chromaSubsampling:'4:4:4'})
        .toBuffer();
    }else{
      const bg=await sharp(input).rotate().resize(W,H,{fit:'cover',position:'attention',kernel:sharp.kernel.lanczos3}).blur(16).modulate({brightness:0.72}).jpeg({quality:90,mozjpeg:true,chromaSubsampling:'4:4:4'}).toBuffer();
      const fg=await sharp(input).rotate().resize({width:W,height:H,fit:'inside',withoutEnlargement:false,kernel:sharp.kernel.lanczos3}).sharpen({sigma:0.4,m1:0.3,m2:0.8}).jpeg({quality:95,mozjpeg:true,chromaSubsampling:'4:4:4'}).toBuffer();
      const fm=await sharp(fg).metadata();
      out=await sharp(bg).composite([{input:fg,left:Math.max(0,Math.round((W-(fm.width||W))/2)),top:Math.max(0,Math.round((H-(fm.height||H))/2))}]).jpeg({quality:95,mozjpeg:true,chromaSubsampling:'4:4:4'}).toBuffer();
    }

    res.setHeader('Content-Type','image/jpeg');
    res.setHeader('Cache-Control','public, max-age=300, s-maxage=86400');
    res.setHeader('X-FT-Facebook-Renderer','facebook-hq-v1');
    return res.status(200).send(out);
  }catch(e){
    console.error('Facebook image format failed',e);
    return res.status(302).setHeader('Location',FALLBACK).end();
  }
};
