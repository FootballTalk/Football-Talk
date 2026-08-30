const zlib=require('zlib');

const W=1080,H=1080;

function crc32(buf){
  let c=0xffffffff;
  for(const b of buf){
    c^=b;
    for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);
  }
  return (c^0xffffffff)>>>0;
}
function chunk(type,data){
  const t=Buffer.from(type);
  const len=Buffer.alloc(4);len.writeUInt32BE(data.length);
  const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(Buffer.concat([t,data])));
  return Buffer.concat([len,t,data,crc]);
}
function makePng(){
  const raw=Buffer.alloc((W*3+1)*H);
  for(let y=0;y<H;y++){
    const row=y*(W*3+1);raw[row]=0;
    for(let x=0;x<W;x++){
      const i=row+1+x*3;
      const band=y<150||y>=930;
      const frame=(x>=40&&x<50&&y>=190&&y<920)||(x>=1030&&x<1040&&y>=190&&y<920)||(y>=190&&y<200&&x>=40&&x<1040)||(y>=910&&y<920&&x>=40&&x<1040);
      const center=(y>=420&&y<660&&x>=140&&x<940);
      const yellow=band||frame||center;
      raw[i]=yellow?255:10;
      raw[i+1]=yellow?214:10;
      raw[i+2]=yellow?0:10;
    }
  }
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(W,0);ihdr.writeUInt32BE(H,4);ihdr[8]=8;ihdr[9]=2;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}

const PNG=makePng();
module.exports=(req,res)=>{res.setHeader('Content-Type','image/png');res.setHeader('Cache-Control','public, max-age=86400, immutable');res.status(200).send(PNG);};
