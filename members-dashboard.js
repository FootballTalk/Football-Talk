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
  const prefs=()=>readJSON(prefKey,{club:'',notifyTransfers:true,notifyMatches:true,notifyPredictions:true});
  const savePrefs=p=>localStorage.setItem(prefKey,JSON.stringify(p));
  const headers=()=>({apikey:cfg.SUPABASE_ANON_KEY,Authorization:`Bearer ${cfg.SUPABASE_ANON_KEY}`});

  function styles(){
    if(document.getElementById('member-dashboard-styles'))return;
    const s=document.createElement('style');s.id='member-dashboard-styles';s.textContent=`
    .member-hub{margin:24px 0;display:grid;gap:18px}.hub-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.hub-stat,.hub-panel{background:#151518;border:1px solid #2c2c31;border-radius:14px;padding:18px}.hub-stat strong{display:block;color:#f7c600;font-family:'Archivo Black',sans-serif;font-size:28px}.hub-stat span{font-size:12px;color:#aaa;font-weight:800}.hub-panel h2,.hub-panel h3{margin:0 0 12px}.hub-panels{display:grid;grid-template-columns:1.05fr .95fr;gap:18px}.badge-row{display:flex;gap:9px;flex-wrap:wrap}.member-badge{padding:8px 10px;border-radius:999px;background:#242429;border:1px solid #3b3b42;font-size:12px;font-weight:900}.member-badge.earned{background:#2a2407;border-color:#f7c600;color:#ffe062}.hub-setting{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 0;border-bottom:1px solid #2b2b31}.hub-setting:last-child{border-bottom:0}.hub-setting select{max-width:210px;background:#0f0f12;color:#fff;border:1px solid #4a4a51;border-radius:8px;padding:9px}.hub-setting input{width:20px;height:20px}.notify-btn{border:0;border-radius:8px;background:#f7c600;color:#09090b;font-weight:1000;padding:10px 13px;cursor:pointer}.personal-feed{display:grid;gap:10px}.personal-item{padding:13px;border-radius:10px;background:#101013;border-left:4px solid #f7c600}.personal-item b{display:block;margin-bottom:5px}.personal-item small{color:#999}.history-table{width:100%;border-collapse:collapse}.history-table th,.history-table td{padding:9px 7px;border-bottom:1px solid #2b2b31;font-size:13px;text-align:left}.history-table th{color:#999;font-size:11px;text-transform:uppercase}.history-points{font-weight:1000;color:#f7c600}.hub-note{font-size:12px;color:#999;line-height:1.5}@media(max-width:850px){.hub-grid{grid-template-columns:repeat(2,1fr)}.hub-panels{grid-template-columns:1fr}}`;
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
  async function resultsMap(){
    try{const d=await fetch('/api/fixtures?results=1',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject());const m=new Map();(d.leagues||[]).forEach(l=>(l.fixtures||[]).forEach(f=>m.set(String(f.id),f)));return m}catch{return new Map()}
  }
  function streakOf(scored){let n=0;for(const x of scored){if((x.pts??0)>0)n++;else break}return n}
  function badges(stats){return [
    ['🎯 First Pick',stats.picks>=1],['🔥 On Fire',stats.streak>=3],['🧠 Oracle',stats.exact>=3],['🏆 Century Club',stats.points>=100],['⚽ Regular',stats.picks>=10],['💛 Loyal Fan',!!prefs().club]
  ]}
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
  function notifyTest(){
    if(!('Notification' in window)){alert('Notifications are not supported in this browser.');return}
    Notification.requestPermission().then(p=>{if(p==='granted')new Notification('Football Talk',{body:'Member notifications are switched on. ⚽'});});
  }
  function renderShell(){
    const main=document.querySelector('.members-main');const pred=document.getElementById('members-predictions');if(!main||!pred||document.getElementById('member-hub'))return;
    const p=prefs();const hub=document.createElement('section');hub.id='member-hub';hub.className='member-hub';
    hub.innerHTML=`<div class="hub-grid"><div class="hub-stat"><strong id="hub-points">—</strong><span>TOTAL POINTS</span></div><div class="hub-stat"><strong id="hub-rank">—</strong><span>LEADERBOARD RANK</span></div><div class="hub-stat"><strong id="hub-streak">—</strong><span>CURRENT STREAK</span></div><div class="hub-stat"><strong id="hub-exact">—</strong><span>EXACT SCORES</span></div></div><div class="hub-panels"><div class="hub-panel"><h2>👋 ${esc(username())}'s Member Hub</h2><div id="badge-row" class="badge-row"></div><p class="hub-note">Badges unlock automatically from your Football Talk prediction activity and member preferences.</p><h3 style="margin-top:20px">📜 Prediction History</h3><div style="overflow:auto"><table class="history-table"><thead><tr><th>Match</th><th>Your pick</th><th>Result</th><th>Pts</th></tr></thead><tbody id="history-body"><tr><td colspan="4">Loading…</td></tr></tbody></table></div></div><div class="hub-panel" id="member-settings"><h2>💛 My Football Talk</h2><div class="hub-setting"><label for="fav-club"><b>Favourite club</b></label><select id="fav-club"><option value="">Choose club…</option>${clubs.map(c=>`<option ${p.club===c?'selected':''}>${esc(c)}</option>`).join('')}</select></div><div class="hub-setting"><span><b>IT’S A GO! alerts</b></span><input id="pref-transfer" type="checkbox" ${p.notifyTransfers?'checked':''}></div><div class="hub-setting"><span><b>Match alerts</b></span><input id="pref-match" type="checkbox" ${p.notifyMatches?'checked':''}></div><div class="hub-setting"><span><b>Prediction reminders</b></span><input id="pref-pred" type="checkbox" ${p.notifyPredictions?'checked':''}></div><div class="hub-setting"><span><b>Browser notifications</b></span><button class="notify-btn" id="enable-notify">ENABLE</button></div><h3 style="margin-top:20px">📰 My Club Feed</h3><div id="personal-feed" class="personal-feed"></div></div></div>`;
    main.insertBefore(hub,pred);
    const save=()=>{const x={club:document.getElementById('fav-club').value,notifyTransfers:document.getElementById('pref-transfer').checked,notifyMatches:document.getElementById('pref-match').checked,notifyPredictions:document.getElementById('pref-pred').checked};savePrefs(x);newsFeed(x.club);refreshStats()};
    ['fav-club','pref-transfer','pref-match','pref-pred'].forEach(id=>document.getElementById(id)?.addEventListener('change',save));
    document.getElementById('enable-notify')?.addEventListener('click',notifyTest);
    newsFeed(p.club);
  }
  async function refreshStats(){
    const uid=member()?.id;if(!uid)return;
    const rows=latest(await predictionRows());const map=await resultsMap();
    const mine=rows.filter(x=>x.userId===uid).map(p=>({p,f:map.get(String(p.fixtureId)),pts:points(p,map.get(String(p.fixtureId)))})).filter(x=>x.pts!==null).sort((a,b)=>new Date(b.f?.date||0)-new Date(a.f?.date||0));
    const memberTotals=new Map();rows.forEach(p=>{const pts=points(p,map.get(String(p.fixtureId)));if(pts===null)return;const x=memberTotals.get(p.userId)||{points:0,exact:0};x.points+=pts;x.exact+=pts===3?1:0;memberTotals.set(p.userId,x)});
    const ranked=[...memberTotals.entries()].sort((a,b)=>b[1].points-a[1].points||b[1].exact-a[1].exact);const rank=Math.max(1,ranked.findIndex(([id])=>id===uid)+1);
    const stats={points:mine.reduce((s,x)=>s+x.pts,0),exact:mine.filter(x=>x.pts===3).length,picks:mine.length,streak:streakOf(mine)};
    document.getElementById('hub-points').textContent=stats.points;document.getElementById('hub-rank').textContent=ranked.length?`#${rank}`:'—';document.getElementById('hub-streak').textContent=stats.streak;document.getElementById('hub-exact').textContent=stats.exact;
    document.getElementById('badge-row').innerHTML=badges(stats).map(([name,on])=>`<span class="member-badge ${on?'earned':''}">${on?'✓ ':''}${esc(name)}</span>`).join('');
    const body=document.getElementById('history-body');body.innerHTML=mine.length?mine.slice(0,20).map(x=>`<tr><td>${esc(x.p.home)} v ${esc(x.p.away)}</td><td>${x.p.predHome}-${x.p.predAway}</td><td>${x.f.homeGoals}-${x.f.awayGoals}</td><td class="history-points">+${x.pts}</td></tr>`).join(''):'<tr><td colspan="4">No completed predictions yet.</td></tr>';
  }
  function wireTransferAlerts(){
    let known='';const observer=new MutationObserver(()=>{const p=prefs();if(!p.notifyTransfers||Notification.permission!=='granted')return;const card=document.querySelector('#members-transfer-feed .press-card');if(!card)return;const text=card.textContent.trim();if(known&&text!==known)new Notification('🚨 IT’S A GO!',{body:text.slice(0,180)});known=text;});
    const feed=document.getElementById('members-transfer-feed');if(feed)observer.observe(feed,{childList:true,subtree:true});
  }
  styles();
  const boot=()=>{if(!member()){setTimeout(boot,350);return}renderShell();refreshStats();wireTransferAlerts()};
  boot();setInterval(refreshStats,300000);
})();