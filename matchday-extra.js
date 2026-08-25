const seededMatchdayStories=[{type:'Matchday',published_at:'2026-08-24T15:45:00+01:00',title:'Fulham v Chelsea: West London derby under the lights',summary:'Fulham host Chelsea at Craven Cottage tonight at 8pm as the Premier League opening round concludes.',body:'Fulham and Chelsea meet at Craven Cottage tonight in a West London derby to close out the opening round of Premier League fixtures.\n\nKick-off is at 8pm, with the game shown live on Sky Sports in the UK.\n\nBoth clubs begin the new league campaign with new managers in the dugout, adding another layer to an already fierce local rivalry. Chelsea make the short trip across West London looking to start strongly, while Fulham will be hoping home advantage can give them an early-season lift.\n\nThe derby has produced plenty of tight contests in recent meetings, so this one has all the ingredients for a lively Monday-night finish to the weekend.\n\nFootball Talk question: who are you backing tonight — Fulham, Chelsea or the draw?'}];
(function addSeededMatchdayStories(){let tries=0;const timer=setInterval(()=>{tries++;try{if(typeof loadedPosts==='undefined'||typeof renderFeed==='undefined')return;const published=loadedPosts.filter(p=>['matchday','full time'].includes(String(p.type||'').toLowerCase()));seededMatchdayStories.forEach(s=>{if(!loadedPosts.some(p=>p.title===s.title))loadedPosts.push(s)});const combined=[...published,...seededMatchdayStories].filter((p,i,a)=>a.findIndex(x=>x.title===p.title)===i).sort((a,b)=>new Date(b.published_at)-new Date(a.published_at)).slice(0,6);renderFeed('matchday-posts',combined,'No matchday stories published yet.');clearInterval(timer)}catch(e){}if(tries>=12)clearInterval(timer)},500)})();

(function setupLiveMatchdayCentre(){
  const matchday=document.getElementById('matchday');
  if(!matchday||document.getElementById('ft-matchday-live'))return;

  const styles=document.createElement('style');
  styles.textContent=`
  #ft-matchday-live{margin:26px 0 34px;background:#0b0b0e;color:#fff;border-top:6px solid #f7c600;box-shadow:0 10px 28px rgba(0,0,0,.16)}
  .ft-md-head{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:18px 20px;border-bottom:1px solid #2a2a30}
  .ft-md-head h3{font-family:'Archivo Black',sans-serif;margin:0;font-size:28px}.ft-md-head p{margin:5px 0 0;color:#b8b8c2;font-size:13px}
  .ft-md-refresh{flex:0 0 auto;background:#f7c600;color:#000;padding:7px 10px;font-size:11px;font-weight:1000;letter-spacing:.5px}
  .ft-md-body{padding:16px}.ft-md-league{margin-bottom:22px}.ft-md-league:last-child{margin-bottom:0}.ft-md-league h4{margin:0 0 10px;font-size:16px;color:#f7c600}
  .ft-md-game{background:#fff;color:#111;margin-bottom:10px;border-left:5px solid #f7c600}.ft-md-scoreline{display:grid;grid-template-columns:minmax(0,1fr) 78px minmax(0,1fr);gap:8px;align-items:center;padding:13px}
  .ft-md-team{font-weight:900}.ft-md-home{text-align:right}.ft-md-away{text-align:left}.ft-md-score{text-align:center;background:#111;color:#fff;font-family:'Archivo Black',sans-serif;font-size:18px;padding:8px 5px}
  .ft-md-status{text-align:center;font-size:11px;font-weight:1000;color:#666;padding:0 12px 11px}.ft-md-status.live{color:#c40000}.ft-md-events{border-top:1px solid #ececec;padding:9px 13px 11px;font-size:12px;color:#444}.ft-md-event{margin:4px 0}.ft-md-empty{background:#fff;color:#555;padding:18px;text-align:center}
  @media(max-width:600px){.ft-md-head{align-items:flex-start;flex-direction:column}.ft-md-scoreline{grid-template-columns:minmax(0,1fr) 64px minmax(0,1fr);padding:11px 8px}.ft-md-team{font-size:12px}.ft-md-score{font-size:16px}.ft-md-head h3{font-size:24px}}
  `;
  document.head.appendChild(styles);

  const live=document.createElement('section');
  live.id='ft-matchday-live';
  live.innerHTML=`<div class="ft-md-head"><div><h3>FT LIVE Matchday Centre</h3><p>Premier League, Championship, Carabao Cup & FA Cup coverage for today's matches.</p></div><div id="ft-md-refresh" class="ft-md-refresh">UPDATES EVERY 30 SEC</div></div><div id="ft-md-body" class="ft-md-body"><div class="ft-md-empty">Loading today's matches…</div></div>`;
  const stories=matchday.querySelector('.category-feed');
  matchday.insertBefore(live,stories||null);

  const body=document.getElementById('ft-md-body');
  const refresh=document.getElementById('ft-md-refresh');
  const LIVE=new Set(['1H','2H','ET','BT','P','LIVE','HT']);
  const FINISHED=new Set(['FT','AET','PEN']);
  let todayLeagues=[];
  let liveLeagues=[];
  let todayCups=[];
  let liveCups=[];

  function ukDateKey(value){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));}
  function kickOff(value){return new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value));}
  function eventLabel(e){const minute=e.elapsed?`${e.elapsed}${e.extra?`+${e.extra}`:''}'`:'';const who=e.player||e.team||'';if(e.type==='Goal')return `⚽ ${minute} ${who}${e.detail?` — ${e.detail}`:''}`;if(e.type==='Card')return `🟨 ${minute} ${who}${e.detail?` — ${e.detail}`:''}`;if(e.type==='subst')return `🔁 ${minute} ${who}`;return `${minute} ${who}${e.detail?` — ${e.detail}`:''}`.trim();}

  function mergeCollection(base,live){
    return base.map(comp=>{
      const liveComp=live.find(l=>Number(l.id)===Number(comp.id));
      const liveMap=new Map((liveComp?.fixtures||[]).map(f=>[String(f.id),f]));
      return {...comp,fixtures:(comp.fixtures||[]).map(f=>liveMap.get(String(f.id))||f)};
    });
  }

  function mergedLeagues(){
    return [
      ...mergeCollection(todayLeagues,liveLeagues),
      ...mergeCollection(todayCups,liveCups)
    ];
  }

  function statusText(f){
    if(FINISHED.has(f.status))return f.status==='PEN'?'FULL TIME · PENALTIES':f.status==='AET'?'FULL TIME · AET':'FULL TIME';
    if(f.status==='HT')return 'HALF TIME';
    if(f.status==='ET')return f.elapsed?`EXTRA TIME · ${f.elapsed}'`:'EXTRA TIME';
    if(f.status==='P')return 'PENALTIES';
    if(LIVE.has(f.status))return f.elapsed?`LIVE · ${f.elapsed}'`:'LIVE';
    return `KICK-OFF ${kickOff(f.date)}`;
  }

  function render(){
    const leagues=mergedLeagues().map(l=>({...l,fixtures:(l.fixtures||[]).sort((a,b)=>(a.timestamp||0)-(b.timestamp||0))})).filter(l=>l.fixtures.length);
    body.replaceChildren();
    if(!leagues.length){const empty=document.createElement('div');empty.className='ft-md-empty';empty.textContent='No Premier League, Championship, Carabao Cup or FA Cup matches are scheduled today.';body.appendChild(empty);return;}
    leagues.forEach(league=>{
      const section=document.createElement('div');section.className='ft-md-league';const h=document.createElement('h4');h.textContent=league.name;section.appendChild(h);
      league.fixtures.forEach(f=>{
        const game=document.createElement('article');game.className='ft-md-game';
        const row=document.createElement('div');row.className='ft-md-scoreline';
        const home=document.createElement('div');home.className='ft-md-team ft-md-home';home.textContent=f.home||'';
        const score=document.createElement('div');score.className='ft-md-score';score.textContent=(LIVE.has(f.status)||FINISHED.has(f.status))?`${f.homeGoals??0}–${f.awayGoals??0}`:kickOff(f.date);
        const away=document.createElement('div');away.className='ft-md-team ft-md-away';away.textContent=f.away||'';row.append(home,score,away);game.appendChild(row);
        const st=document.createElement('div');st.className=`ft-md-status${LIVE.has(f.status)?' live':''}`;st.textContent=statusText(f);game.appendChild(st);
        const events=(f.events||[]).filter(e=>['Goal','Card','subst'].includes(e.type)).slice(-4).reverse();
        if(events.length){const box=document.createElement('div');box.className='ft-md-events';events.forEach(e=>{const line=document.createElement('div');line.className='ft-md-event';line.textContent=eventLabel(e);box.appendChild(line)});game.appendChild(box)}
        section.appendChild(game);
      });body.appendChild(section);
    });
    refresh.textContent=`UPDATED ${new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date())} · 30 SEC`;
  }

  async function loadToday(){
    const today=ukDateKey(new Date());
    try{const r=await fetch('/api/fixtures',{cache:'no-store'});if(r.ok){const data=await r.json();todayLeagues=(data.leagues||[]).map(l=>({...l,fixtures:(l.fixtures||[]).filter(f=>ukDateKey(f.date)===today)}));}}catch(_){}
    try{const r=await fetch('/api/cups',{cache:'no-store'});if(r.ok){const data=await r.json();todayCups=(data.cups||[]).map(c=>({...c,fixtures:(c.fixtures||[]).filter(f=>ukDateKey(f.date)===today)}));}}catch(_){}
    render();
  }

  async function loadLive(){
    try{const r=await fetch('/api/fixtures?live=1',{cache:'no-store'});if(r.ok){const data=await r.json();liveLeagues=data.leagues||[];}}catch(_){}
    try{const r=await fetch('/api/cups?live=1',{cache:'no-store'});if(r.ok){const data=await r.json();liveCups=data.cups||[];}}catch(_){}
    render();
  }

  loadToday();loadLive();
  setInterval(loadLive,30000);
  setInterval(loadToday,5*60*1000);
})();
