document.addEventListener('DOMContentLoaded',async()=>{
  const path=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  if(path!==''&&path!=='index.html')return;
  if(document.getElementById('ft-home-dashboard'))return;

  const style=document.createElement('style');
  style.textContent=`
  .ft-home-dashboard{max-width:1180px;margin:18px auto 8px;padding:0 20px}.ft-home-panel{background:#0b0b0e;color:#fff;border-radius:18px;border:1px solid #2b2b31;overflow:hidden;box-shadow:0 14px 35px rgba(0,0,0,.16)}.ft-home-head{display:flex;align-items:end;justify-content:space-between;gap:20px;padding:22px 24px;border-bottom:1px solid #29292f}.ft-home-kicker{margin:0 0 5px;color:#f7c600;font-size:12px;font-weight:1000;letter-spacing:.09em}.ft-home-head h2{margin:0;font-size:clamp(22px,3vw,32px)}.ft-home-head a{color:#f7c600;font-weight:900;text-decoration:none}.ft-match-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;background:#29292f}.ft-match{background:#111217;padding:16px 18px;display:grid;grid-template-columns:74px 1fr auto;align-items:center;gap:12px}.ft-match-time{font-size:13px;font-weight:1000;color:#f7c600}.ft-match-time.live{color:#48df83}.ft-match-teams{font-weight:850;line-height:1.35}.ft-match-league{font-size:11px;color:#999;margin-top:4px}.ft-match-score{font-size:22px;font-weight:1000;white-space:nowrap}.ft-empty{padding:24px;color:#bbb}.ft-home-actions{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;padding:14px;background:#0b0b0e}.ft-home-actions a{display:flex;align-items:center;justify-content:center;text-align:center;min-height:48px;padding:9px;border-radius:10px;background:#1a1a1f;color:#fff!important;text-decoration:none;font-weight:900;font-size:13px}.ft-home-actions a:hover{background:#f7c600;color:#080808!important}@media(max-width:760px){.ft-home-dashboard{padding:0 12px}.ft-home-head{padding:18px 16px}.ft-match-grid{grid-template-columns:1fr}.ft-match{grid-template-columns:62px 1fr auto;padding:13px 14px}.ft-home-actions{grid-template-columns:repeat(2,minmax(0,1fr))}.ft-home-actions a:last-child{grid-column:1/-1}}
  `;
  document.head.appendChild(style);

  const wrap=document.createElement('section');wrap.id='ft-home-dashboard';wrap.className='ft-home-dashboard';
  wrap.innerHTML=`<div class="ft-home-panel"><div class="ft-home-head"><div><p class="ft-home-kicker">MATCH CENTRE</p><h2>Today’s Football</h2></div><a href="match-centre.html">Open Match Centre →</a></div><div id="ft-today-games" class="ft-match-grid"><div class="ft-empty">Loading today’s matches…</div></div><div class="ft-home-actions"><a href="news.html">Latest News</a><a href="match-centre.html">Match Centre</a><a href="tables-stats.html">Tables & Stats</a><a href="members.html">Members</a><a href="more.html">More Football Talk</a></div></div>`;
  const ticker=document.querySelector('.ticker');
  if(ticker) ticker.insertAdjacentElement('afterend',wrap); else document.body.prepend(wrap);

  const box=wrap.querySelector('#ft-today-games');
  const londonDate=d=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
  const today=londonDate(new Date());
  const liveCodes=new Set(['1H','2H','HT','ET','P','LIVE','INT','BT']);
  try{
    const r=await fetch('/api/fixtures',{cache:'no-store'});if(!r.ok)throw new Error('Fixtures unavailable');const data=await r.json();
    const games=(data.leagues||[]).flatMap(l=>(l.fixtures||[]).map(f=>({...f,leagueName:f.leagueName||l.name}))).filter(f=>londonDate(new Date(f.date))===today).sort((a,b)=>a.timestamp-b.timestamp);
    if(!games.length){box.innerHTML='<div class="ft-empty">No Premier League or Championship matches are listed for today. Open Match Centre for upcoming games and cup football.</div>';return;}
    const hasLive=games.some(g=>liveCodes.has(String(g.status||'').toUpperCase()));
    wrap.querySelector('.ft-home-kicker').textContent=hasLive?'● LIVE NOW':'MATCH CENTRE';
    box.innerHTML=games.slice(0,8).map(g=>{
      const status=String(g.status||'NS').toUpperCase();const live=liveCodes.has(status);const finished=['FT','AET','PEN'].includes(status);
      const time=live?(g.elapsed?`${g.elapsed}′`:'LIVE'):finished?'FT':new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(g.date));
      const score=(live||finished)&&g.homeGoals!=null&&g.awayGoals!=null?`${g.homeGoals} – ${g.awayGoals}`:'—';
      return `<div class="ft-match"><div class="ft-match-time ${live?'live':''}">${time}</div><div><div class="ft-match-teams">${g.home}<br>${g.away}</div><div class="ft-match-league">${g.leagueName||''}</div></div><div class="ft-match-score">${score}</div></div>`;
    }).join('');
  }catch(e){box.innerHTML='<div class="ft-empty">Today’s match panel is temporarily unavailable. Fixtures and Match Centre remain accessible from the navigation.</div>';}
});
