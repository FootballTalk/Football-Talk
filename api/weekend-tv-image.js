const fs=require('fs');
const path=require('path');
const sharp=require('sharp');

const SITE_URL='https://www.footballtalk.uk/';
const W=1080,H=1350;
const FONT=fs.readFileSync(path.join(process.cwd(),'assets','ft-social-bold.ttf')).toString('base64');
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
function allowed(match){return ALLOWED_COMPETITIONS.some(re=>re.test(String(match.competition||'')));}
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

function svg(start,matches){
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
  let y=top,body='';
  for(const row of visible){
    if(row.kind==='day'){
      body+=`<rect x="54" y="${y-28}" width="972" height="38" rx="8" fill="#f7c600"/><text x="75" y="${y}" class="day">${esc(row.label)}</text>`;y+=step;
    }else if(row.kind==='empty'){
      body+=`<text x="78" y="${y}" class="empty">${esc(row.label)}</text>`;y+=step;
    }else{
      const fixture=wrap(`${row.home} v ${row.away}`,44)[0]||'';
      const channel=wrap(row.channel||'TV details confirmed',34)[0]||'';
      body+=`<text x="74" y="${y}" class="time">${esc(row.time)}</text><text x="188" y="${y}" class="fixture">${esc(fixture)}</text><text x="1010" y="${y}" text-anchor="end" class="channel">${esc(channel)}</text>`;y+=step;
    }
  }
  if(trimmed>0)body+=`<text x="540" y="1215" text-anchor="middle" class="more">+ ${trimmed} more listing${trimmed===1?'':'s'} at FootballTalk.uk</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="1080" height="1350" fill="#090909"/><rect width="1080" height="18" fill="#f7c600"/><rect y="1288" width="1080" height="62" fill="#f7c600"/>
  <style>@font-face{font-family:FTSans;src:url("data:font/ttf;base64,${FONT}") format("truetype");font-weight:700}.brand{font:700 64px FTSans,sans-serif;fill:#fff}.brand2{fill:#f7c600}.strap{font:700 19px FTSans,sans-serif;fill:#ddd;letter-spacing:5px}.title{font:700 42px FTSans,sans-serif;fill:#f7c600}.range{font:700 22px FTSans,sans-serif;fill:#fff}.day{font:700 23px FTSans,sans-serif;fill:#090909}.time{font:700 23px FTSans,sans-serif;fill:#f7c600}.fixture{font:700 22px FTSans,sans-serif;fill:#fff}.channel{font:700 19px FTSans,sans-serif;fill:#ddd}.empty{font:700 18px FTSans,sans-serif;fill:#888}.more{font:700 21px FTSans,sans-serif;fill:#f7c600}.footer{font:700 25px FTSans,sans-serif;fill:#090909}</style>
  <text x="54" y="92" class="brand">FOOTBALL <tspan class="brand2">TALK</tspan></text><text x="56" y="126" class="strap">WHERE FANS HAVE THEIR SAY</text>
  <text x="54" y="192" class="title">WEEKEND TV GUIDE</text><text x="1026" y="192" text-anchor="end" class="range">FRIDAY - MONDAY</text>
  ${body}<text x="540" y="1328" text-anchor="middle" class="footer">FULL 7-DAY GUIDE: FOOTBALLTALK.UK</text></svg>`;
}

module.exports=async function handler(req,res){
  try{
    const start=String(req.query?.start||'');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(start))return res.status(400).json({error:'A valid Friday start date is required'});
    const matches=await matchesFor(start);
    const image=await sharp(Buffer.from(svg(start,matches))).png({compressionLevel:9}).toBuffer();
    res.setHeader('Content-Type','image/png');res.setHeader('Cache-Control','public, max-age=300, s-maxage=21600');
    return res.status(200).send(image);
  }catch(error){console.error('Weekend TV image failed',error);return res.status(502).json({error:'Weekend TV image unavailable',detail:String(error.message||error)});}
};
