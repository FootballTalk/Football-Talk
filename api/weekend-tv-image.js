const fs=require('fs');
const path=require('path');
const sharp=require('sharp');

const SITE_URL='https://www.footballtalk.uk/';
const W=1080,H=1350;
const FONT_FILE=path.join(process.cwd(),'assets','ft-social-bold.ttf');
const ALLOWED_COMPETITIONS=[
  /premier league/i,
  /championship/i,
  /scottish premiership/i,
  /fa cup/i,
  /carabao cup|league cup/i,
  /champions league|european cup/i,
  /europa league|uefa cup/i
];

function esc(value){return String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));}
function addDays(iso,days){const d=new Date(`${iso}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
function dateLabel(iso){return new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(`${iso}T12:00:00Z`));}
function allowed(match){const label=`${match.home||''} ${match.away||''} ${match.competition||''}`;if(/\bU(?:18|19|20|21|23)\b|academy|reserves|premier league 2/i.test(label))return false;return ALLOWED_COMPETITIONS.some(re=>re.test(String(match.competition||'')));}
function primaryChannel(value){
  const parts=[...new Set(String(value||'TV details confirmed').split(',').map(x=>x.trim()).filter(Boolean))];
  const preferred=['Sky Sports Main Event','Sky Sports Premier League','Sky Sports Football','Sky Sports+','TNT Sports 1','TNT Sports 2','BBC One','BBC Two','ITV1','ITV4','Premier Sports 1','Premier Sports 2'];
  return preferred.find(name=>parts.some(x=>x.toLowerCase()===name.toLowerCase()))||parts[0]||'TV details confirmed';
}
function wrap(value,max){
  const words=String(value||'').split(/\s+/),lines=[];let line='';
  for(const word of words){const next=line?`${line} ${word}`:word;if(next.length>max&&line){lines.push(line);line=word;}else line=next;}
  if(line)lines.push(line);return lines;
}

async function matchesFor(start){
  const end=addDays(start,3);
  const r=await fetch(`${SITE_URL}api/tv-guide`,{headers:{'User-Agent':'FootballTalk Weekend TV Image/1.0'},cache:'no-store'});
  if(!r.ok)throw new Error(`TV guide ${r.status}`);
  const data=await r.json();
  return (data.matches||[]).filter(x=>x.date>=start&&x.date<=end&&allowed(x));
}

function textInput(value,size,color,width,align='left'){
  return {text:{text:`<span foreground="${color}" size="${size*1024}">${esc(value)}</span>`,font:'NimbusSans-Bold',fontfile:FONT_FILE,width,align,rgba:true,dpi:72,wrap:'none'}};
}
function layout(start,matches){
  const grouped=new Map();
  for(const m of matches){if(!grouped.has(m.date))grouped.set(m.date,[]);grouped.get(m.date).push(m);}
  const rows=[];
  for(let i=0;i<4;i++){
    const date=addDays(start,i),items=grouped.get(date)||[];
    rows.push({kind:'day',label:dateLabel(date)});
    if(!items.length)rows.push({kind:'empty',label:'No confirmed televised fixtures'});
    for(const item of items)rows.push({kind:'match',...item});
  }
  const maxRows=22,visible=rows.slice(0,maxRows),trimmed=rows.length-visible.length;
  const top=250,bottom=1180,step=Math.max(37,Math.min(54,(bottom-top)/Math.max(1,visible.length)));
  let y=top,bars='',layers=[];
  for(const row of visible){
    if(row.kind==='day'){
      bars+=`<rect x="54" y="${y-28}" width="972" height="38" rx="8" fill="#f7c600"/>`;
      layers.push({input:textInput(row.label,23,'#090909',910),left:75,top:Math.round(y-27)});y+=step;
    }else if(row.kind==='empty'){
      layers.push({input:textInput(row.label,18,'#888888',900),left:78,top:Math.round(y-22)});y+=step;
    }else{
      const fixture=wrap(`${row.home} v ${row.away}`,44)[0]||'';
      const channel=wrap(primaryChannel(row.channel),25)[0]||'';
      layers.push({input:textInput(row.time,23,'#f7c600',100),left:74,top:Math.round(y-26)});
      layers.push({input:textInput(fixture,22,'#ffffff',575),left:188,top:Math.round(y-25)});
      layers.push({input:textInput(channel,19,'#dddddd',245,'right'),left:765,top:Math.round(y-23)});y+=step;
    }
  }
  if(trimmed>0)layers.push({input:textInput(`+ ${trimmed} more listing${trimmed===1?'':'s'} at FootballTalk.uk`,21,'#f7c600',900,'center'),left:90,top:1185});
  const background=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="1080" height="1350" fill="#090909"/><rect width="1080" height="18" fill="#f7c600"/><rect y="1288" width="1080" height="62" fill="#f7c600"/>${bars}</svg>`);
  layers.unshift(
    {input:textInput('FOOTBALL',64,'#ffffff',390),left:54,top:40},
    {input:textInput('TALK',64,'#f7c600',260),left:450,top:40},
    {input:textInput('W H E R E   F A N S   H A V E   T H E I R   S A Y',19,'#dddddd',700),left:56,top:108},
    {input:textInput('WEEKEND TV GUIDE',42,'#f7c600',650),left:54,top:154},
    {input:textInput('FRIDAY - MONDAY',22,'#ffffff',280,'right'),left:746,top:170}
  );
  layers.push({input:textInput('FULL 7-DAY GUIDE: FOOTBALLTALK.UK',25,'#090909',920,'center'),left:80,top:1303});
  return {background,layers};
}

module.exports=async function handler(req,res){
  try{
    const start=String(req.query?.start||'');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(start))return res.status(400).json({error:'A valid Friday start date is required'});
    const matches=await matchesFor(start);
    const card=layout(start,matches);
    const image=await sharp(card.background).composite(card.layers).png({compressionLevel:9}).toBuffer();
    res.setHeader('Content-Type','image/png');res.setHeader('Cache-Control','public, max-age=300, s-maxage=21600');
    return res.status(200).send(image);
  }catch(error){console.error('Weekend TV image failed',error);return res.status(502).json({error:'Weekend TV image unavailable',detail:String(error.message||error)});}
};
