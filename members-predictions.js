(() => {
  const cfg=window.FT_CONFIG||{};
  const mount=document.getElementById('members-predictions');
  if(!mount||!cfg.SUPABASE_URL||!cfg.SUPABASE_ANON_KEY)return;

  const PREFIX='member-prediction:';
  const headers={apikey:cfg.SUPABASE_ANON_KEY,Authorization:`Bearer ${cfg.SUPABASE_ANON_KEY}`};
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const readSession=()=>{try{return JSON.parse(localStorage.getItem('football-talk-member-session')||'null')}catch{return null}};
  const user=()=>readSession()?.user||null;
  const username=()=>user()?.user_metadata?.username||user()?.user_metadata?.display_name||user()?.email?.split('@')[0]||'Football fan';
  const fmt=v=>new Date(v).toLocaleString('en-GB',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  const finished=new Set(['FT','AET','PEN']);
  let fixtures=[];
  let predictions=[];

  function addStyles(){
    if(document.getElementById('members-prediction-styles'))return;
    const s=document.createElement('style');s.id='members-prediction-styles';s.textContent=`
      .pred-wrap{margin-top:24px;background:#151518;border:1px solid #2c2c31;border-radius:14px;padding:24px}.pred-head{display:flex;justify-content:space-between;gap:15px;align-items:end;margin-bottom:16px}.pred-head h2{margin:0;font-size:22px}.pred-head p{margin:5px 0 0;color:#b7b7bd}.pred-rules{font-size:12px;color:#f7c600;font-weight:900}.pred-grid{display:grid;gap:10px}.pred-card{background:#101013;border:1px solid #34343a;border-left:5px solid #f7c600;border-radius:12px;padding:15px}.pred-time{font-size:11px;color:#999;margin-bottom:9px}.pred-match{display:grid;grid-template-columns:minmax(0,1fr) 52px 22px 52px minmax(0,1fr);gap:8px;align-items:center}.pred-home{text-align:right;font-weight:900}.pred-away{font-weight:900}.pred-score{width:52px;border:2px solid #555;background:#fff;color:#111;padding:8px 4px;text-align:center;font-size:18px;font-weight:1000}.pred-v{font-weight:900;text-align:center;color:#777}.pred-save{margin-top:14px;border:0;background:#f7c600;color:#09090b;font-weight:1000;padding:12px 17px;border-radius:8px;cursor:pointer}.pred-save:disabled{opacity:.6}.pred-status{margin-left:10px;font-size:12px;color:#b7b7bd}.pred-locked{font-size:12px;color:#ffcf40;font-weight:800;margin-top:8px}.leaderboard{margin-top:24px}.leaderboard h3{margin:0 0 10px}.leader-table{width:100%;border-collapse:collapse;background:#101013}.leader-table th,.leader-table td{padding:11px 10px;border-bottom:1px solid #2b2b31;text-align:left}.leader-table th{font-size:11px;text-transform:uppercase;color:#aaa}.leader-table td:last-child,.leader-table th:last-child{text-align:right;font-weight:1000}.leader-you{background:#211d08}.pred-empty{padding:18px;border:1px dashed #444;border-radius:10px;color:#bbb}.points-key{display:flex;gap:12px;flex-wrap:wrap;margin:10px 0 0;font-size:12px;color:#bbb}@media(max-width:700px){.pred-wrap{padding:17px}.pred-head{align-items:flex-start;flex-direction:column}.pred-match{grid-template-columns:1fr 44px 16px 44px 1fr;gap:5px}.pred-score{width:44px}.pred-home,.pred-away{font-size:13px}.leader-table th,.leader-table td{padding:9px 6px;font-size:13px}}
    `;document.head.appendChild(s);
  }

  function predictionKey(fixtureId){return `${PREFIX}${fixtureId}`;}
  async function getRows(){
    const url=`${cfg.SUPABASE_URL}/rest/v1/poll_responses?select=poll_id,answer&poll_id=like.${encodeURIComponent(PREFIX+'*')}&limit=5000`;
    const r=await fetch(url,{headers,cache:'no-store'});if(!r.ok)throw new Error('leaderboard unavailable');return r.json();
  }
  function parseRows(rows){
    return rows.map(row=>{try{return JSON.parse(row.answer)}catch{return null}}).filter(x=>x&&x.kind==='member-prediction'&&x.fixtureId&&x.userId);
  }
  function latestByUserFixture(items){
    const map=new Map();
    items.forEach(p=>{const key=`${p.userId}:${p.fixtureId}`;const old=map.get(key);if(!old||new Date(p.updatedAt)>new Date(old.updatedAt))map.set(key,p)});
    return [...map.values()];
  }
  async function savePrediction(fixture,home,away){
    const u=user();if(!u)throw new Error('Sign in required');
    const payload={kind:'member-prediction',fixtureId:String(fixture.id),home:fixture.home,away:fixture.away,kickoff:fixture.date,predHome:home,predAway:away,userId:u.id,username:username(),updatedAt:new Date().toISOString()};
    const r=await fetch(`${cfg.SUPABASE_URL}/rest/v1/poll_responses`,{method:'POST',headers:{...headers,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({poll_id:predictionKey(fixture.id),answer:JSON.stringify(payload)})});
    if(!r.ok)throw new Error('Could not save prediction');
  }
  function pointsFor(p,fixture){
    if(!fixture||!finished.has(fixture.status)||fixture.homeGoals==null||fixture.awayGoals==null)return 0;
    const ph=Number(p.predHome),pa=Number(p.predAway),ah=Number(fixture.homeGoals),aa=Number(fixture.awayGoals);
    if(ph===ah&&pa===aa)return 3;
    const result=(h,a)=>h===a?'D':h>a?'H':'A';
    return result(ph,pa)===result(ah,aa)?1:0;
  }
  function renderFixtures(){
    const list=mount.querySelector('#pred-list');
    const mine=new Map(predictions.filter(p=>p.userId===user()?.id).map(p=>[String(p.fixtureId),p]));
    if(!fixtures.length){list.innerHTML='<div class="pred-empty">No Premier League fixtures are available to predict right now. Check back when the next matchweek is loaded.</div>';return;}
    list.innerHTML=fixtures.map(f=>{const p=mine.get(String(f.id));const locked=Date.now()>=new Date(f.date).getTime();return `<div class="pred-card" data-fixture="${esc(f.id)}"><div class="pred-time">${esc(fmt(f.date))}</div><div class="pred-match"><span class="pred-home">${esc(f.home)}</span><input class="pred-score home" type="number" min="0" max="20" inputmode="numeric" value="${p?.predHome??''}" ${locked?'disabled':''} aria-label="${esc(f.home)} score"><span class="pred-v">v</span><input class="pred-score away" type="number" min="0" max="20" inputmode="numeric" value="${p?.predAway??''}" ${locked?'disabled':''} aria-label="${esc(f.away)} score"><span class="pred-away">${esc(f.away)}</span></div>${locked?'<div class="pred-locked">🔒 Prediction locked at kick-off</div>':''}</div>`}).join('');
  }
  async function renderLeaderboard(){
    const body=mount.querySelector('#leader-body');
    const allFixtures=[...fixtures];
    try{
      const results=await fetch('/api/fixtures?results=1',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject());
      (results.leagues||[]).forEach(l=>(l.fixtures||[]).forEach(f=>allFixtures.push(f)));
    }catch(_){ }
    const fixtureMap=new Map(allFixtures.map(f=>[String(f.id),f]));
    const totals=new Map();
    latestByUserFixture(predictions).forEach(p=>{if(!totals.has(p.userId))totals.set(p.userId,{name:p.username||'Football fan',points:0,exact:0,picks:0});const row=totals.get(p.userId);const pts=pointsFor(p,fixtureMap.get(String(p.fixtureId)));row.points+=pts;row.exact+=pts===3?1:0;row.picks+=1;});
    const rows=[...totals.entries()].map(([id,x])=>({id,...x})).sort((a,b)=>b.points-a.points||b.exact-a.exact||a.name.localeCompare(b.name));
    body.innerHTML=rows.length?rows.slice(0,50).map((r,i)=>`<tr class="${r.id===user()?.id?'leader-you':''}"><td>${i+1}</td><td>${esc(r.name)}${r.id===user()?.id?' · YOU':''}</td><td>${r.exact}</td><td>${r.points}</td></tr>`).join(''):'<tr><td colspan="4">No scores yet — the table will come alive as members make predictions.</td></tr>';
  }
  async function load(){
    const list=mount.querySelector('#pred-list');
    const leader=mount.querySelector('#leader-body');

    try{
      predictions=latestByUserFixture(parseRows(await getRows()));
      await renderLeaderboard();
    }catch(err){
      console.warn('Members leaderboard load failed',err);
      leader.innerHTML='<tr><td colspan="4">Leaderboard temporarily unavailable. Please refresh shortly.</td></tr>';
    }

    try{
      const data=await fetch('/api/fixtures',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject());
      const pl=(data.leagues||[]).find(l=>Number(l.id)===39);
      fixtures=(pl?.fixtures||[]).filter(f=>!finished.has(f.status)).sort((a,b)=>(a.timestamp||0)-(b.timestamp||0)).slice(0,10);
      renderFixtures();
      if(predictions.length)await renderLeaderboard();
    }catch(err){
      console.warn('Members prediction fixtures load failed',err);
      list.innerHTML='<div class="pred-empty">Predictions are temporarily unavailable. Please try again shortly.</div>';
    }
  }
  async function saveAll(){
    const button=mount.querySelector('#pred-save');const status=mount.querySelector('#pred-status');const cards=[...mount.querySelectorAll('.pred-card')];
    button.disabled=true;button.textContent='Saving…';status.textContent='';
    try{
      let saved=0;
      for(const card of cards){const f=fixtures.find(x=>String(x.id)===card.dataset.fixture);if(!f||Date.now()>=new Date(f.date).getTime())continue;const h=card.querySelector('.home').value,a=card.querySelector('.away').value;if(h===''||a==='')continue;await savePrediction(f,Number(h),Number(a));saved++;}
      status.textContent=saved?`${saved} prediction${saved===1?'':'s'} saved.`:'Enter at least one score to save.';await load();
    }catch(_){status.textContent='Could not save those predictions just now.';}finally{button.disabled=false;button.textContent='SAVE MY PREDICTIONS';}
  }
  addStyles();
  mount.innerHTML=`<div class="pred-head"><div><h2>🎯 Members Match Predictions</h2><p>Predict the next Premier League fixtures and climb the Football Talk table.</p><div class="points-key"><span>🎯 Exact score = 3 pts</span><span>✅ Correct result = 1 pt</span><span>❌ Wrong = 0 pts</span></div></div><div class="pred-rules">LOCKS AT KICK-OFF</div></div><div id="pred-list"><div class="pred-empty">Loading the next fixtures…</div></div><button class="pred-save" id="pred-save" type="button">SAVE MY PREDICTIONS</button><span class="pred-status" id="pred-status" aria-live="polite"></span><div class="leaderboard"><h3>🏆 Football Talk Members Leaderboard</h3><table class="leader-table"><thead><tr><th>#</th><th>Member</th><th>Exact</th><th>Points</th></tr></thead><tbody id="leader-body"><tr><td colspan="4">Loading leaderboard…</td></tr></tbody></table></div>`;
  mount.querySelector('#pred-save').addEventListener('click',saveAll);
  load();setInterval(load,180000);
})();