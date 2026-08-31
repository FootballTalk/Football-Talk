const seededMatchdayStories=[{type:'Matchday',published_at:'2026-08-24T15:45:00+01:00',title:'Fulham v Chelsea: West London derby under the lights',summary:'Fulham host Chelsea at Craven Cottage tonight at 8pm as the Premier League opening round concludes.',body:'Fulham and Chelsea meet at Craven Cottage tonight in a West London derby to close out the opening round of Premier League fixtures.\n\nKick-off is at 8pm, with the game shown live on Sky Sports in the UK.\n\nBoth clubs begin the new league campaign with new managers in the dugout, adding another layer to an already fierce local rivalry. Chelsea make the short trip across West London looking to start strongly, while Fulham will be hoping home advantage can give them an early-season lift.\n\nThe derby has produced plenty of tight contests in recent meetings, so this one has all the ingredients for a lively Monday-night finish to the weekend.\n\nFootball Talk question: who are you backing tonight — Fulham, Chelsea or the draw?'}];
(function addSeededMatchdayStories(){let tries=0;const timer=setInterval(()=>{tries++;try{if(typeof loadedPosts==='undefined'||typeof renderFeed==='undefined')return;const published=loadedPosts.filter(p=>['matchday','full time'].includes(String(p.type||'').toLowerCase()));seededMatchdayStories.forEach(s=>{if(!loadedPosts.some(p=>p.title===s.title))loadedPosts.push(s)});const combined=[...published,...seededMatchdayStories].filter((p,i,a)=>a.findIndex(x=>x.title===p.title)===i).sort((a,b)=>new Date(b.published_at)-new Date(a.published_at)).slice(0,6);renderFeed('matchday-posts',combined,'No matchday stories published yet.');clearInterval(timer)}catch(e){}if(tries>=12)clearInterval(timer)},500)})();

(function setupLiveNow(){
  const latest=document.getElementById('latest');
  if(!latest||document.getElementById('ft-live-now'))return;
  const LIVE=new Set(['1H','2H','ET','BT','P','LIVE','HT','INT']);
  const FINISHED=new Set(['FT','AET','PEN']);
  const approvedNames=new Map([
    [39,/^premier league$/i],[40,/^(efl )?championship$/i],[41,/^(efl )?league one$/i],[42,/^(efl )?league two$/i],
    [45,/^fa cup$/i],[48,/^(carabao cup|efl cup)$/i],[2,/^(uefa )?champions league$/i],[3,/^(uefa )?europa league$/i],[848,/^(uefa )?conference league$/i],
    [61,/^ligue 1$/i],[71,/^serie a$/i],[87,/^laliga$/i],[78,/^bundesliga$/i],[55,/^liga portugal$/i],[135,/^serie a$/i]
  ]);
  let loading=false;

  const styles=document.createElement('style');
  styles.textContent=`
  #ft-live-now{max-width:1180px;margin:18px auto 8px;padding:0 20px}.ft-ln-shell{background:#0b0b0e;color:#fff;border-radius:18px;overflow:hidden;border-top:6px solid #f7c600;box-shadow:0 14px 34px rgba(0,0,0,.18)}
  .ft-ln-head{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:18px 20px;border-bottom:1px solid #29292f}.ft-ln-kicker{font-size:12px;font-weight:1000;letter-spacing:.12em;color:#f7c600}.ft-ln-head h2{margin:2px 0 4px;font-size:clamp(25px,4vw,38px)}.ft-ln-sub{margin:0;color:#b8b8c2;font-size:13px}.ft-ln-link{background:#f7c600;color:#090909!important;text-decoration:none;font-weight:1000;padding:11px 14px;border-radius:9px;white-space:nowrap}.ft-ln-list{padding:14px 16px 16px}.ft-ln-league{margin-bottom:16px}.ft-ln-league:last-child{margin-bottom:0}.ft-ln-league-title{color:#f7c600;font-size:12px;font-weight:1000;letter-spacing:.06em;margin:0 0 7px}.ft-ln-game{display:grid;grid-template-columns:minmax(0,1fr) 92px minmax(0,1fr);align-items:center;gap:9px;background:#fff;color:#111;padding:11px 12px;margin-bottom:8px;border-radius:10px}.ft-ln-team{font-weight:900}.ft-ln-home{text-align:right}.ft-ln-away{text-align:left}.ft-ln-centre{text-align:center}.ft-ln-score{display:block;font-family:'Archivo Black',sans-serif;background:#111;color:#fff;padding:7px 5px;border-radius:7px;font-size:16px}.ft-ln-status{display:block;font-size:10px;font-weight:1000;margin-top:4px;color:#777}.ft-ln-status.live{color:#c80000}.ft-ln-empty{background:#fff;color:#555;padding:18px;border-radius:10px;text-align:center}.ft-ln-footer{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:0 16px 16px;color:#aaa;font-size:11px}.ft-ln-live-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#d90000;margin-right:6px;box-shadow:0 0 0 4px rgba(217,0,0,.15)}
  @media(max-width:650px){#ft-live-now{padding:0 14px}.ft-ln-head{align-items:flex-start;flex-direction:column}.ft-ln-link{width:100%;text-align:center}.ft-ln-game{grid-template-columns:minmax(0,1fr) 68px minmax(0,1fr);padding:10px 7px}.ft-ln-team{font-size:12px}.ft-ln-score{font-size:14px}}
  `;
  document.head.appendChild(styles);

  const section=document.createElement('section');section.id='ft-live-now';
  section.innerHTML=`<div class="ft-ln-shell"><div class="ft-ln-head"><div><div id="ft-ln-kicker" class="ft-ln-kicker">FT LIVE</div><h2 id="ft-ln-title">LIVE NOW</h2><p id="ft-ln-sub" class="ft-ln-sub">Checking today's football…</p></div><a class="ft-ln-link" href="match-centre.html">OPEN MATCH CENTRE →</a></div><div id="ft-ln-list" class="ft-ln-list"><div class="ft-ln-empty">Loading today’s matches…</div></div><div class="ft-ln-footer"><span id="ft-ln-state">Live match state drives this section automatically.</span><span id="ft-ln-updated"></span></div></div>`;
  latest.parentNode.insertBefore(section,latest);

  const list=document.getElementById('ft-ln-list'),title=document.getElementById('ft-ln-title'),sub=document.getElementById('ft-ln-sub'),kicker=document.getElementById('ft-ln-kicker'),state=document.getElementById('ft-ln-state'),updated=document.getElementById('ft-ln-updated');
  const londonDate=d=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
  const kickOff=v=>new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(v));
  const leagueWanted=l=>{const rule=approvedNames.get(Number(l.id));return Boolean(rule&&rule.test(String(l.name||'').trim()))};
  const statusText=f=>{const s=String(f.status||'NS').toUpperCase();if(s==='HT')return'HT';if(LIVE.has(s))return f.elapsed?`LIVE · ${f.elapsed}′`:'LIVE';if(FINISHED.has(s))return s==='FT'?'FT':s;return kickOff(f.date)};
  const scoreText=f=>{const s=String(f.status||'NS').toUpperCase();return (LIVE.has(s)||FINISHED.has(s))?`${f.homeGoals??0}–${f.awayGoals??0}`:kickOff(f.date)};
  const mergeLeagues=(...sets)=>{const map=new Map();sets.flat().forEach(l=>{if(!l)return;const key=`${Number(l.id)||0}:${String(l.name||'').toLowerCase()}`;if(!map.has(key))map.set(key,{...l,fixtures:[]});const out=map.get(key),seen=new Set(out.fixtures.map(f=>String(f.id||`${f.date}-${f.home}-${f.away}`)));(l.fixtures||[]).forEach(f=>{const fk=String(f.id||`${f.date}-${f.home}-${f.away}`);if(!seen.has(fk)){seen.add(fk);out.fixtures.push(f)}})});return[...map.values()]};

  function render(leagues){
    const now=Date.now();
    const filtered=(leagues||[]).filter(leagueWanted).map(l=>({...l,fixtures:(l.fixtures||[]).filter(f=>f.date)})).filter(l=>l.fixtures.length);
    const live=filtered.map(l=>({...l,fixtures:l.fixtures.filter(f=>LIVE.has(String(f.status||'').toUpperCase()))})).filter(l=>l.fixtures.length);
    const upcoming=filtered.map(l=>({...l,fixtures:l.fixtures.filter(f=>!LIVE.has(String(f.status||'').toUpperCase())&&!FINISHED.has(String(f.status||'').toUpperCase())&&new Date(f.date).getTime()>=now).sort((a,b)=>(a.timestamp||new Date(a.date).getTime()/1000)-(b.timestamp||new Date(b.date).getTime()/1000)).slice(0,4)})).filter(l=>l.fixtures.length);
    const finished=filtered.map(l=>({...l,fixtures:l.fixtures.filter(f=>FINISHED.has(String(f.status||'').toUpperCase())).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0)).slice(0,3)})).filter(l=>l.fixtures.length);
    let showing=[];
    if(live.length){showing=live;kicker.innerHTML='<span class="ft-ln-live-dot"></span>FT LIVE';title.textContent='LIVE NOW';sub.textContent='Football is live — scores and match status update automatically.';state.textContent='LIVE NOW stays on top while relevant football is being played.';}
    else if(upcoming.length){showing=upcoming;kicker.textContent='COMING UP';title.textContent='COMING UP';sub.textContent='No featured match is live right now. Here are the next featured kick-offs.';state.textContent='This automatically switches to LIVE NOW as soon as a featured match starts.';}
    else if(finished.length){showing=finished;kicker.textContent='RESULTS & REACTION';title.textContent='TODAY’S RESULTS';sub.textContent='Today’s featured programme has finished.';state.textContent='The live programme is complete — results now take priority.';}
    else{showing=[];kicker.textContent='COMING UP';title.textContent='COMING UP';sub.textContent='No featured match is live right now.';state.textContent='The next featured fixtures will appear here automatically.';}
    list.replaceChildren();
    if(!showing.length){const e=document.createElement('div');e.className='ft-ln-empty';e.textContent='No featured fixtures are currently available. Open the Match Centre for the full schedule.';list.appendChild(e);}
    showing.slice(0,6).forEach(l=>{const box=document.createElement('div');box.className='ft-ln-league';const h=document.createElement('div');h.className='ft-ln-league-title';h.textContent=l.name||'Football';box.appendChild(h);l.fixtures.slice(0,6).forEach(f=>{const s=String(f.status||'NS').toUpperCase();const row=document.createElement('div');row.className='ft-ln-game';row.innerHTML=`<div class="ft-ln-team ft-ln-home"></div><div class="ft-ln-centre"><span class="ft-ln-score"></span><span class="ft-ln-status${LIVE.has(s)?' live':''}"></span></div><div class="ft-ln-team ft-ln-away"></div>`;row.children[0].textContent=f.home||'';row.querySelector('.ft-ln-score').textContent=scoreText(f);row.querySelector('.ft-ln-status').textContent=statusText(f);row.children[2].textContent=f.away||'';box.appendChild(row)});list.appendChild(box)});
    updated.textContent=`UPDATED ${new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date())}`;
  }

  async function getJson(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json()}
  async function load(){if(loading)return;loading=true;try{const today=londonDate(new Date());const results=await Promise.allSettled([getJson(`/api/fixtures?date=${today}`),getJson('/api/fixtures'),getJson('/api/fixtures?predictions=1')]);const leagues=[];results.forEach(r=>{if(r.status==='fulfilled')leagues.push(...(r.value.leagues||[]))});if(!leagues.length)throw new Error('No fixture data');render(mergeLeagues(leagues));}catch(e){if(!list.querySelector('.ft-ln-game')){list.innerHTML='<div class="ft-ln-empty">Live match data is temporarily unavailable. The full Fixtures page remains available.</div>';}}finally{loading=false}}
  load();setInterval(load,30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)load()});
})();
