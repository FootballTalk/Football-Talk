// Football Talk Stats Zone — server-rendered production page
const BASE='https://www.fotmob.com/api/data/leagueseasondeepstats';
const LEAGUE='47';
const SEASON='36781';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

async function loadStat(stat){
  const url=new URL(BASE);
  url.searchParams.set('id',LEAGUE);
  url.searchParams.set('season',SEASON);
  url.searchParams.set('type','players');
  url.searchParams.set('stat',stat);
  const r=await fetch(url,{headers:{accept:'application/json','user-agent':'Mozilla/5.0 FootballTalk/1.0'}});
  if(!r.ok) throw new Error(`FotMob ${stat} returned ${r.status}`);
  const data=await r.json();
  const rows=Array.isArray(data.statsData)?data.statsData:[];
  return rows.map((p,i)=>({
    rank:Number(p.rank)||i+1,
    id:p.id,
    name:p.name||'Unknown player',
    teamId:p.teamId,
    value:Number(p.statValue?.value??0)
  })).sort((a,b)=>b.value-a.value||a.rank-b.rank);
}

function rowsHtml(players,label){
  if(!players.length) return '<div class="empty">No stats available yet.</div>';
  return players.slice(0,20).map((p,i)=>`<div class="row"><div class="rank">${i+1}</div><div class="badge">FT</div><div class="who"><strong>${esc(p.name)}</strong></div><div class="stat"><strong>${p.value}</strong><span>${label}</span></div></div>`).join('');
}

function page(scorers,keepers){
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f7c600"><meta http-equiv="refresh" content="1800"><title>Stats Zone | Football Talk</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet"><style>:root{--yellow:#f7c600;--black:#0b0b0e;--grey:#f3f3f3}*{box-sizing:border-box}body{margin:0;font-family:Inter,Arial,sans-serif;background:var(--grey);color:#111}.top{position:sticky;top:0;z-index:5;display:flex;align-items:center;justify-content:space-between;background:var(--black);color:#fff;border-bottom:4px solid var(--yellow);padding:14px 18px}.brand{display:flex;align-items:center;gap:12px}.mark{display:flex;align-items:center;justify-content:center;width:46px;height:46px;background:var(--yellow);color:#000;font-family:'Archivo Black';font-size:23px;transform:skew(-8deg)}.brand strong{font-family:'Archivo Black';display:block}.brand small{font-size:10px;letter-spacing:1.2px;color:#ccc}.close{width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--yellow);color:#000;font-size:34px;font-weight:900;text-decoration:none}.wrap{max-width:1000px;margin:auto;padding:34px 18px 70px}.eyebrow{font-size:12px;font-weight:900;letter-spacing:2px;color:#8a6e00}.title{font-family:'Archivo Black';font-size:clamp(38px,7vw,70px);margin:4px 0 8px}.sub{color:#666;margin:0 0 18px;line-height:1.5}.tabs{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:0 0 18px}.tab-btn{appearance:none;border:2px solid #111;background:#fff;color:#111;padding:12px 10px;font-weight:900;border-radius:8px;cursor:pointer}.tab-btn.active{background:var(--yellow);border-color:var(--yellow)}.panel{display:none}.panel.active{display:block}.leaderboard{background:#fff;border-top:5px solid var(--yellow);box-shadow:0 8px 20px rgba(0,0,0,.06);overflow:hidden}.row{display:grid;grid-template-columns:42px 46px minmax(0,1fr) 80px;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid #eee}.row:last-child{border-bottom:0}.rank{font-family:'Archivo Black';font-size:20px;text-align:center}.badge{width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--yellow);font-family:'Archivo Black';font-size:13px}.who strong{display:block;font-size:14px}.stat{text-align:center}.stat strong{display:block;font-family:'Archivo Black';font-size:22px}.stat span{font-size:10px;font-weight:900;letter-spacing:.8px;color:#666}.note{font-size:12px;color:#666;line-height:1.5;margin-top:16px}.empty{background:#fff;padding:22px;font-weight:700}@media(max-width:600px){.wrap{padding:24px 10px 60px}.title{font-size:42px}.brand small{display:none}.row{grid-template-columns:32px 40px minmax(0,1fr) 58px;padding:11px 8px;gap:8px}.rank{font-size:17px}.badge{width:38px;height:38px}.who strong{font-size:13px}.stat strong{font-size:18px}.tab-btn{font-size:13px}}</style></head><body><header class="top"><div class="brand"><span class="mark">FT</span><span><strong>FOOTBALL TALK</strong><small>WHERE FANS HAVE THEIR SAY</small></span></div><a class="close" href="/" aria-label="Return to Football Talk">×</a></header><main class="wrap"><p class="eyebrow">PREMIER LEAGUE</p><h1 class="title">Stats Zone</h1><p class="sub">Current-season Premier League leaderboards, refreshed automatically.</p><div class="tabs"><button class="tab-btn active" data-target="scorers">Top Scorers</button><button class="tab-btn" data-target="cleans">Clean Sheets</button></div><section id="scorers" class="panel active"><div class="leaderboard">${rowsHtml(scorers,'GOALS')}</div></section><section id="cleans" class="panel"><div class="leaderboard">${rowsHtml(keepers,'CLEAN SHEETS')}</div><p class="note">Goalkeeper clean-sheet totals update automatically from current Premier League season statistics.</p></section></main><script>document.querySelectorAll('.tab-btn').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b===btn));document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p.id===btn.dataset.target));}));</script></body></html>`;
}

export default async function handler(req,res){
  if(req.method!=='GET') return res.status(405).send('Method not allowed');
  try{
    const [scorers,keepers]=await Promise.all([loadStat('goals'),loadStat('clean_sheet')]);
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Cache-Control','public, s-maxage=1800, stale-while-revalidate=1800');
    return res.status(200).send(page(scorers,keepers));
  }catch(error){
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Cache-Control','no-store');
    return res.status(502).send(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:Arial;padding:30px"><h1>Stats Zone</h1><p>Stats are temporarily unavailable. Please try again shortly.</p><p><a href="/">Back to Football Talk</a></p></body>`);
  }
}
