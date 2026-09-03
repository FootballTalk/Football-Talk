(function setupAlwaysOpenHomeMatchday(){
  const LIVE=new Set(['1H','2H','ET','BT','P','LIVE','HT','INT']);
  const FINISHED=new Set(['FT','AET','PEN']);
  const approvedNames=new Map([[39,/^premier league$/i],[40,/^(efl )?championship$/i],[41,/^(efl )?league one$/i],[42,/^(efl )?league two$/i],[179,/^(scottish )?premiership$/i],[45,/^fa cup$/i],[48,/^(carabao cup|efl cup)$/i],[2,/^(uefa )?champions league$/i],[3,/^(uefa )?europa league$/i],[848,/^(uefa )?conference league$/i],[61,/^ligue 1$/i],[71,/^serie a$/i],[87,/^laliga$/i],[78,/^bundesliga$/i],[55,/^liga portugal$/i],[135,/^serie a$/i]]);
  let loading=false;

  function londonDate(d){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(d)}
  function kickOff(v){return new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(v))}
  function leagueWanted(l){const rule=approvedNames.get(Number(l.id));return Boolean(rule&&rule.test(String(l.name||'').trim()))}
  function statusText(f){const s=String(f.status||'NS').toUpperCase();if(s==='HT')return'HT';if(LIVE.has(s))return f.elapsed?`${f.elapsed}′`:'LIVE';if(FINISHED.has(s))return s==='FT'?'FT':s;return kickOff(f.date)}
  function scoreText(f){const s=String(f.status||'NS').toUpperCase();return(LIVE.has(s)||FINISHED.has(s))?`${f.homeGoals??0}–${f.awayGoals??0}`:kickOff(f.date)}
  function mergeLeagues(...sets){const map=new Map();sets.flat().forEach(l=>{if(!l)return;const key=`${Number(l.id)||0}:${String(l.name||'').toLowerCase()}`;if(!map.has(key))map.set(key,{...l,fixtures:[]});const out=map.get(key),seen=new Set(out.fixtures.map(f=>String(f.id||`${f.date}-${f.home}-${f.away}`)));(l.fixtures||[]).forEach(f=>{const fk=String(f.id||`${f.date}-${f.home}-${f.away}`);if(!seen.has(fk)){seen.add(fk);out.fixtures.push(f)}})});return[...map.values()]}

  function ensureShell(){
    let section=document.getElementById('ft-live-now');
    if(!section){
      section=document.createElement('section');section.id='ft-live-now';
      const hero=document.querySelector('.hero');
      if(hero&&hero.parentNode)hero.parentNode.insertBefore(section,hero.nextSibling);
    }
    section.innerHTML=`<div class="ft-ln-shell"><div class="ft-ln-head"><div><div id="ft-ln-kicker" class="ft-ln-kicker">● FT LIVE Matchday Centre</div><h2 id="ft-ln-title">Live scores, match status & results</h2><p id="ft-ln-sub" class="ft-ln-sub">Live coverage updated automatically throughout matchdays.</p></div><a class="ft-ln-link" href="match-centre.html">FULL MATCH CENTRE →</a></div><div id="ft-ln-list" class="ft-ln-list"><div class="ft-ln-empty">Loading today’s matches…</div></div><div class="ft-ln-footer"><span id="ft-ln-state">Scores refresh automatically every 30 seconds.</span><span id="ft-ln-updated"></span></div></div>`;
    return section;
  }

  function addStyles(){if(document.getElementById('ft-home-open-styles'))return;const styles=document.createElement('style');styles.id='ft-home-open-styles';styles.textContent=`#ft-live-now{max-width:1180px;margin:18px auto 8px;padding:0 20px}.ft-ln-shell{background:#fff;color:#111;border-radius:0;overflow:hidden;border-top:6px solid #f7c600;box-shadow:0 10px 28px rgba(0,0,0,.08)}.ft-ln-head{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:22px 20px;border-bottom:1px solid #ececec}.ft-ln-kicker{font-size:18px;font-weight:1000;letter-spacing:0;color:#111}.ft-ln-kicker::first-letter{color:#e51616}.ft-ln-head h2{margin:18px 0 10px;font-size:clamp(24px,4vw,34px)}.ft-ln-sub{margin:0;color:#222;font-size:16px}.ft-ln-link{background:#111;color:#fff!important;text-decoration:none;font-weight:1000;padding:11px 14px;border-radius:9px;white-space:nowrap}.ft-ln-list{padding:14px 16px 16px}.ft-ln-league{margin-bottom:16px}.ft-ln-league-title{color:#8b6f00;font-size:12px;font-weight:1000;letter-spacing:.06em;margin:0 0 7px}.ft-ln-game{display:grid;grid-template-columns:minmax(0,1fr) 92px minmax(0,1fr);align-items:center;gap:9px;background:#f5f5f5;color:#111;padding:11px 12px;margin-bottom:8px;border-radius:10px}.ft-ln-team{font-weight:900}.ft-ln-home{text-align:right}.ft-ln-centre{text-align:center}.ft-ln-score{display:block;font-family:'Archivo Black',sans-serif;background:#111;color:#fff;padding:7px 5px;border-radius:7px;font-size:16px}.ft-ln-status{display:block;font-size:10px;font-weight:1000;margin-top:4px;color:#777}.ft-ln-status.live{color:#c80000}.ft-ln-empty{background:#f5f5f5;color:#555;padding:18px;border-radius:10px;text-align:center}.ft-ln-footer{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:0 16px 16px;color:#777;font-size:11px}.ft-ln-live-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#d90000;margin-right:6px;box-shadow:0 0 0 4px rgba(217,0,0,.15)}@media(max-width:650px){#ft-live-now{padding:0 14px}.ft-ln-head{align-items:flex-start;flex-direction:column}.ft-ln-link{width:100%;text-align:center}.ft-ln-game{grid-template-columns:minmax(0,1fr) 68px minmax(0,1fr);padding:10px 7px}.ft-ln-team{font-size:12px}.ft-ln-footer{align-items:flex-start;flex-direction:column}}`;document.head.appendChild(styles)}

  function render(leagues){
    ensureShell();
    const list=document.getElementById('ft-ln-list'),title=document.getElementById('ft-ln-title'),kicker=document.getElementById('ft-ln-kicker'),sub=document.getElementById('ft-ln-sub'),state=document.getElementById('ft-ln-state'),updated=document.getElementById('ft-ln-updated');
    const today=londonDate(new Date());
    const wanted=(leagues||[]).filter(leagueWanted).map(l=>({...l,fixtures:(l.fixtures||[]).filter(f=>f.date&&londonDate(new Date(f.date))===today).sort((a,b)=>new Date(a.date)-new Date(b.date))})).filter(l=>l.fixtures.length);
    const liveCount=wanted.flatMap(l=>l.fixtures).filter(f=>LIVE.has(String(f.status||'').toUpperCase())).length;
    if(liveCount){kicker.innerHTML='<span class="ft-ln-live-dot"></span>FT LIVE Matchday Centre';title.textContent='Live scores, match status & results';sub.textContent='Live coverage updated automatically throughout matchdays.';state.textContent=`${liveCount} match${liveCount===1?'':'es'} live now · refreshing every 30 seconds.`}
    else{kicker.textContent='● FT LIVE Matchday Centre';title.textContent='Live scores, match status & results';sub.textContent='Live coverage updated automatically throughout matchdays.';state.textContent='Scores refresh automatically every 30 seconds.'}
    list.replaceChildren();
    if(!wanted.length){const e=document.createElement('div');e.className='ft-ln-empty';e.textContent='No featured fixtures are scheduled today. The live board stays open ready for the next matchday.';list.appendChild(e)}
    wanted.forEach(l=>{const box=document.createElement('div');box.className='ft-ln-league';const h=document.createElement('div');h.className='ft-ln-league-title';h.textContent=l.name||'Football';box.appendChild(h);l.fixtures.forEach(f=>{const s=String(f.status||'NS').toUpperCase(),row=document.createElement('div');row.className='ft-ln-game';row.innerHTML=`<div class="ft-ln-team ft-ln-home"></div><div class="ft-ln-centre"><span class="ft-ln-score"></span><span class="ft-ln-status${LIVE.has(s)?' live':''}"></span></div><div class="ft-ln-team ft-ln-away"></div>`;row.children[0].textContent=f.home||'';row.querySelector('.ft-ln-score').textContent=scoreText(f);row.querySelector('.ft-ln-status').textContent=statusText(f);row.children[2].textContent=f.away||'';box.appendChild(row)});list.appendChild(box)});
    updated.textContent=`UPDATED ${new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date())}`;
  }

  async function getJson(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json()}
  async function load(){if(loading)return;loading=true;try{ensureShell();const today=londonDate(new Date());const results=await Promise.allSettled([getJson(`/api/fixtures?date=${today}`),getJson('/api/fixtures'),getJson('/api/fixtures?predictions=1')]);const leagues=[];results.forEach(r=>{if(r.status==='fulfilled')leagues.push(...(r.value.leagues||[]))});if(!leagues.length)throw new Error('No fixture data');render(mergeLeagues(leagues))}catch(e){ensureShell();const list=document.getElementById('ft-ln-list');if(list&&!list.querySelector('.ft-ln-game'))list.innerHTML='<div class="ft-ln-empty">Live match data is temporarily unavailable. This board will retry automatically.</div>'}finally{loading=false}}

  addStyles();ensureShell();setTimeout(load,50);setInterval(load,30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)load()});
})();
