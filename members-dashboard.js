(() => {
  const cfg=window.FT_CONFIG||{};
  const sessionKey='football-talk-member-session';
  const prefKey='football-talk-member-preferences';
  const predPrefix='member-prediction:';
  const finished=new Set(['FT','AET','PEN']);
  const clubs=['Arsenal','Aston Villa','Bournemouth','Brentford','Brighton','Burnley','Chelsea','Crystal Palace','Everton','Fulham','Leeds United','Liverpool','Manchester City','Manchester United','Newcastle United','Nottingham Forest','Sunderland','Tottenham Hotspur','West Ham United','Wolverhampton Wanderers'];
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const readJSON=(k,fallback)=>{try{return JSON.parse(localStorage.getItem(k)||'null')||fallback}catch{return fallback}};
  const session=()=>readJSON(sessionKey,null);
  const member=()=>session()?.user||null;
  const username=()=>member()?.user_metadata?.username||member()?.user_metadata?.display_name||member()?.email?.split('@')[0]||'Football fan';
  const prefs=()=>readJSON(prefKey,{club:''});
  const savePrefs=p=>localStorage.setItem(prefKey,JSON.stringify({...prefs(),...p}));
  const headers=()=>({apikey:cfg.SUPABASE_ANON_KEY,Authorization:`Bearer ${cfg.SUPABASE_ANON_KEY}`});

  function styles(){
    if(document.getElementById('member-dashboard-styles'))return;
    const s=document.createElement('style');s.id='member-dashboard-styles';s.textContent=`
      .member-hub{margin:24px 0;display:grid;gap:18px}.hub-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.hub-stat,.hub-panel{background:#151518;border:1px solid #2c2c31;border-radius:14px;padding:18px}.hub-stat strong{display:block;color:#f7c600;font-family:'Archivo Black',sans-serif;font-size:28px}.hub-stat span{font-size:12px;color:#aaa;font-weight:800}.hub-panel h2,.hub-panel h3{margin:0 0 12px}.hub-panels{display:grid;grid-template-columns:1.05fr .95fr;gap:18px}.badge-row{display:flex;gap:9px;flex-wrap:wrap}.member-badge{padding:8px 10px;border-radius:999px;background:#242429;border:1px solid #3b3b42;font-size:12px;font-weight:900}.member-badge.earned{background:#2a2407;border-color:#f7c600;color:#ffe062}.hub-setting{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 0;border-bottom:1px solid #2b2b31}.hub-setting select{max-width:210px;background:#0f0f12;color:#fff;border:1px solid #4a4a51;border-radius:8px;padding:9px}.personal-feed{display:grid;gap:10px}.personal-item{padding:13px;border-radius:10px;background:#101013;border-left:4px solid #f7c600}.personal-item b{display:block;margin-bottom:5px}.personal-item small{color:#999}.history-table{width:100%;border-collapse:collapse}.history-table th,.history-table td{padding:9px 7px;border-bottom:1px solid #2b2b31;font-size:13px;text-align:left}.history-table th{color:#999;font-size:11px;text-transform:uppercase}.history-points{font-weight:1000;color:#f7c600}.hub-note{font-size:12px;color:#999;line-height:1.5}.my-matchday{margin:15px 0 20px;padding:14px;border:1px solid #34343a;border-left:4px solid #f7c600;border-radius:11px;background:#0f0f12}.my-matchday-title{font-weight:1000;font-size:16px;margin-bottom:10px}.my-matchday-teams{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px}.my-matchday-team{text-align:center;font-weight:900;font-size:13px}.my-matchday-team img{display:block;width:38px;height:38px;object-fit:contain;margin:0 auto 6px}.my-matchday-v{color:#f7c600;font-family:'Archivo Black',sans-serif}.my-matchday-meta{text-align:center;margin-top:10px;color:#b7b7bd;font-size:12px;line-height:1.5}.my-matchday-stats{display:flex;justify-content:center;gap:14px;flex-wrap:wrap;margin-top:10px;font-size:11px;font-weight:800}.my-matchday-stat{background:#1c1c20;border-radius:999px;padding:6px 9px}.form-dots{letter-spacing:2px}.form-W{color:#55d67a}.form-D{color:#f7c600}.form-L{color:#e35b63}@media(max-width:850px){.hub-grid{grid-template-columns:repeat(2,1fr)}.hub-panels{grid-template-columns:1fr}}`;
    document.head.appendChild(s);
  }

  async function predictionRows(){
    if(!cfg.SUPABASE_URL||!cfg.SUPABASE_ANON_KEY)return [];
    const url=`${cfg.SUPABASE_URL}/rest/v1/poll_responses?select=poll_id,answer&poll_id=like.${encodeURIComponent(predPrefix+'*')}&limit=5000`;
    const r=await fetch(url,{headers:headers(),cache:'no-store'});if(!r.ok)return [];
    return (await r.json()).map(x=>{try{return JSON.parse(x.answer)}catch{return null}}).filter(x=>x?.kind==='member-prediction');
  }
  function latest(items){const m=new Map();items.forEach(p=>{const k=`${p.userId}:${p.fixtureId}`,o=m.get(k);if(!o||new Date(p.updatedAt)>new Date(o.updatedAt))m.set(k,p)});return [...m.values()]}
  function result(h,a){return h===a?'D':h>a?'H':'A'}
  function points(p,f){if(!f||!finished.has(f.status)||f.homeGoals==null||f.awayGoals==null)return null;const ph=+p.predHome,pa=+p.predAway,ah=+f.homeGoals,aa=+f.awayGoals;if(ph===ah&&pa===aa)return 3;return result(ph,pa)===result(ah,aa)?1:0}
  async function resultsMap(){try{const d=await fetch('/api/fixtures?results=1',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject());const m=new Map();(d.leagues||[]).forEach(l=>(l.fixtures||[]).forEach(f=>m.set(String(f.id),f)));return m}catch{return new Map()}}
  function streakOf(scored){let n=0;for(const x of scored){if((x.pts??0)>0)n++;else break}return n}
  function badges(stats){return [['🎯 First Pick',stats.picks>=1],['🔥 On Fire',stats.streak>=3],['🧠 Oracle',stats.exact>=3],['🏆 Century Club',stats.points>=100],['⚽ Regular',stats.picks>=10],['💛 Loyal Fan',!!prefs().club]]}

  function formHtml(form=''){
    return String(form).slice(-5).split('').map(x=>`<span class="form-${esc(x)}">${esc(x)}</span>`).join('');
  }

  async function myMatchday(club){
    const el=document.getElementById('my-matchday');if(!el)return;
    if(!club){el.innerHTML='<div class="my-matchday-title">🏟️ My Matchday</div><div class="hub-note">Choose your favourite club above to see their next match.</div>';return}
    el.innerHTML='<div class="my-matchday-title">🏟️ My Matchday</div><div class="hub-note">Loading your next match…</div>';
    try{
      const [fx,st]=await Promise.all([
        fetch('/api/fixtures',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()),
        fetch('/api/standings',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject())
      ]);
      const matches=(fx.leagues||[]).flatMap(l=>(l.fixtures||[]).map(f=>({...f,competition:l.name}))).filter(f=>f.home===club||f.away===club).sort((a,b)=>(a.timestamp||0)-(b.timestamp||0));
      const next=matches[0];
      const row=(st.leagues||[]).flatMap(l=>(l.standings||[]).map(r=>({...r,competition:l.name}))).find(r=>r.team===club);
      if(!next){el.innerHTML=`<div class="my-matchday-title">🏟️ My Matchday</div><div class="hub-note">No ${esc(club)} fixture is showing in the next 14 days.</div>`;return}
      const d=new Date(next.date||((next.timestamp||0)*1000));
      const when=d.toLocaleString('en-GB',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
      const venue=next.home===club?'Home':'Away';
      el.innerHTML=`<div class="my-matchday-title">🏟️ My Matchday</div><div class="my-matchday-teams"><div class="my-matchday-team">${next.homeLogo?`<img src="${esc(next.homeLogo)}" alt="">`:''}${esc(next.home)}</div><div class="my-matchday-v">V</div><div class="my-matchday-team">${next.awayLogo?`<img src="${esc(next.awayLogo)}" alt="">`:''}${esc(next.away)}</div></div><div class="my-matchday-meta"><b>${esc(next.competition||'Next fixture')}</b><br>${esc(when)} · ${venue}</div>${row?`<div class="my-matchday-stats"><span class="my-matchday-stat">#${esc(row.rank)} in table</span><span class="my-matchday-stat">${esc(row.points)} pts</span>${row.form?`<span class="my-matchday-stat form-dots">Form ${formHtml(row.form)}</span>`:''}</div>`:''}`;
    }catch(_){el.innerHTML='<div class="my-matchday-title">🏟️ My Matchday</div><div class="hub-note">Matchday information is temporarily unavailable.</div>'}
  }

  async function newsFeed(club){
    const el=document.getElementById('personal-feed');if(!el)return;
    if(!club){el.innerHTML='<div class="personal-item"><b>Choose your favourite club</b><small>Your personalised stories will appear here.</small></div>';return}
    try{
      const d=await fetch('/api/news',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject());
      const pool=[...(d.items||[]),...(d.news||[]),...(d.transfers||[])];
      const hits=pool.filter(x=>JSON.stringify(x).toLowerCase().includes(club.toLowerCase())).slice(0,5);
      el.innerHTML=hits.length?hits.map(x=>`<div class="personal-item"><b>${esc(x.title||x.text||x.headline||'Club update')}</b><small>${esc(x.source||x.stage||'Football Talk')}</small></div>`).join(''):`<div class="personal-item"><b>No fresh ${esc(club)} stories right now</b><small>We’ll keep this feed focused on your club as new updates arrive.</small></div>`;
    }catch{el.innerHTML='<div class="personal-item"><b>Personal feed temporarily unavailable</b><small>Your favourite club has still been saved.</small></div>'}
  }

  function renderShell(){
    const main=document.querySelector('.members-main');const pred=document.getElementById('members-predictions');if(!main||!pred||document.getElementById('member-hub'))return;
    const p=prefs();const hub=document.createElement('section');hub.id='member-hub';hub.className='member-hub';
    hub.innerHTML=`<div class="hub-grid"><div class="hub-stat"><strong id="hub-points">—</strong><span>TOTAL POINTS</span></div><div class="hub-stat"><strong id="hub-rank">—</strong><span>LEADERBOARD RANK</span></div><div class="hub-stat"><strong id="hub-streak">—</strong><span>CURRENT STREAK</span></div><div class="hub-stat"><strong id="hub-exact">—</strong><span>EXACT SCORES</span></div></div><div class="hub-panels"><div class="hub-panel"><h2>👋 ${esc(username())}'s Member Hub</h2><div id="badge-row" class="badge-row"></div><p class="hub-note">Badges unlock automatically from your Football Talk prediction activity and member preferences.</p><h3 style="margin-top:20px">📜 Prediction History</h3><div style="overflow:auto"><table class="history-table"><thead><tr><th>Match</th><th>Your pick</th><th>Result</th><th>Pts</th></tr></thead><tbody id="history-body"><tr><td colspan="4">Loading…</td></tr></tbody></table></div></div><div class="hub-panel" id="member-settings"><h2>💛 My Football Talk</h2><div class="hub-setting"><label for="fav-club"><b>Favourite club</b></label><select id="fav-club"><option value="">Choose club…</option>${clubs.map(c=>`<option ${p.club===c?'selected':''}>${esc(c)}</option>`).join('')}</select></div><div id="my-matchday" class="my-matchday"></div><h3>📰 My Club Feed</h3><div id="personal-feed" class="personal-feed"></div></div></div>`;
    main.insertBefore(hub,pred);
    document.getElementById('fav-club')?.addEventListener('change',e=>{const club=e.target.value;savePrefs({club});myMatchday(club);newsFeed(club);refreshStats()});
    myMatchday(p.club);newsFeed(p.club);
  }

  async function refreshStats(){
    const uid=member()?.id;if(!uid)return;
    const rows=latest(await predictionRows());const map=await resultsMap();
    const mine=rows.filter(x=>x.userId===uid).map(p=>({p,f:map.get(String(p.fixtureId)),pts:points(p,map.get(String(p.fixtureId)))})).filter(x=>x.pts!==null).sort((a,b)=>new Date(b.f?.date||0)-new Date(a.f?.date||0));
    const memberTotals=new Map();rows.forEach(p=>{const pts=points(p,map.get(String(p.fixtureId)));if(pts===null)return;const x=memberTotals.get(p.userId)||{points:0,exact:0};x.points+=pts;x.exact+=pts===3?1:0;memberTotals.set(p.userId,x)});
    const ranked=[...memberTotals.entries()].sort((a,b)=>b[1].points-a[1].points||b[1].exact-a[1].exact);const rankIndex=ranked.findIndex(([id])=>id===uid);
    const stats={points:mine.reduce((s,x)=>s+x.pts,0),exact:mine.filter(x=>x.pts===3).length,picks:mine.length,streak:streakOf(mine)};
    document.getElementById('hub-points').textContent=stats.points;document.getElementById('hub-rank').textContent=rankIndex>=0?`#${rankIndex+1}`:'—';document.getElementById('hub-streak').textContent=stats.streak;document.getElementById('hub-exact').textContent=stats.exact;
    document.getElementById('badge-row').innerHTML=badges(stats).map(([name,on])=>`<span class="member-badge ${on?'earned':''}">${on?'✓ ':''}${esc(name)}</span>`).join('');
    const body=document.getElementById('history-body');body.innerHTML=mine.length?mine.slice(0,20).map(x=>`<tr><td>${esc(x.p.home)} v ${esc(x.p.away)}</td><td>${x.p.predHome}-${x.p.predAway}</td><td>${x.f.homeGoals}-${x.f.awayGoals}</td><td class="history-points">+${x.pts}</td></tr>`).join(''):'<tr><td colspan="4">No completed predictions yet.</td></tr>';
  }

  styles();
  const boot=()=>{if(!member()){setTimeout(boot,350);return}renderShell();refreshStats()};
  boot();setInterval(refreshStats,300000);
})();