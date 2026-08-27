(() => {
  const mount=document.getElementById('section-page-content');
  if(!mount)return;
  mount.innerHTML=`<section class="section stats-section"><div class="section-heading"><div><p class="eyebrow dark">PREMIER LEAGUE</p><h2>Stats Zone</h2></div><span class="section-rule"></span></div><p class="stats-sub">Current-season Premier League leaderboards, refreshed automatically.</p><div class="stats-tabs"><button class="stats-tab active" type="button" data-target="stats-scorers">Top Scorers</button><button class="stats-tab" type="button" data-target="stats-cleans">Clean Sheets</button></div><div id="stats-status" class="stats-status">Loading latest stats…</div><section id="stats-scorers" class="stats-panel active"><div class="stats-board" id="stats-scorers-board"></div></section><section id="stats-cleans" class="stats-panel"><div class="stats-board" id="stats-cleans-board"></div></section></section>`;

  if(!document.getElementById('stats-section-style')){
    const style=document.createElement('style');
    style.id='stats-section-style';
    style.textContent=`.stats-section{background:#f4f4f4!important;color:#111!important}.stats-sub{color:#666;margin:0 0 18px}.stats-tabs{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}.stats-tab{appearance:none;border:2px solid #111;background:#fff;color:#111;padding:12px 10px;font-weight:900;border-radius:8px}.stats-tab.active{background:#f7c600;border-color:#f7c600}.stats-status{font-size:13px;font-weight:800;margin-bottom:14px}.stats-panel{display:none}.stats-panel.active{display:block}.stats-board{background:#fff;border-top:5px solid #f7c600;box-shadow:0 8px 20px rgba(0,0,0,.06);overflow:hidden}.stats-row{display:grid;grid-template-columns:42px minmax(0,1fr) 90px;align-items:center;gap:10px;padding:13px 14px;border-bottom:1px solid #eee}.stats-row:last-child{border-bottom:0}.stats-rank{font-family:'Archivo Black';font-size:20px;text-align:center}.stats-name{font-weight:800}.stats-value{text-align:center}.stats-value strong{display:block;font-family:'Archivo Black';font-size:22px}.stats-value span{display:block;font-size:10px;font-weight:900;letter-spacing:.06em;color:#666}.stats-empty{padding:22px;font-weight:800}@media(max-width:600px){.stats-row{grid-template-columns:34px minmax(0,1fr) 64px;padding:11px 9px}.stats-name{font-size:13px}.stats-value strong{font-size:18px}.stats-tab{font-size:13px}}`;
    document.head.appendChild(style);
  }

  const buttons=[...document.querySelectorAll('.stats-tab')];
  buttons.forEach(btn=>btn.addEventListener('click',()=>{
    buttons.forEach(b=>b.classList.toggle('active',b===btn));
    document.querySelectorAll('.stats-panel').forEach(p=>p.classList.toggle('active',p.id===btn.dataset.target));
  }));

  const row=(p,label)=>`<div class="stats-row"><div class="stats-rank">${p.rank}</div><div class="stats-name">${String(p.name||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}</div><div class="stats-value"><strong>${p.value}</strong><span>${label}</span></div></div>`;
  const render=(id,items,label)=>{document.getElementById(id).innerHTML=items?.length?items.map(p=>row(p,label)).join(''):'<div class="stats-empty">No stats available yet.</div>';};
  async function load(){
    try{
      const r=await fetch(`/api/stats-data?t=${Date.now()}`,{cache:'no-store'});
      if(!r.ok)throw new Error();
      const data=await r.json();
      render('stats-scorers-board',data.scorers,'GOALS');
      render('stats-cleans-board',data.keepers,'CLEAN SHEETS');
      document.getElementById('stats-status').textContent='Premier League stats · automatic';
    }catch(_){document.getElementById('stats-status').textContent='Stats are temporarily unavailable.';}
  }
  load();
})();
