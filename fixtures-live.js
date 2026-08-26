(() => {
  const REFRESH_MS = 60000;
  const LIVE_STATUSES = new Set(['1H','2H','ET','BT','P','LIVE']);
  const FINISHED_STATUSES = new Set(['FT','AET','PEN']);

  // Official Premier League UK broadcast selections currently announced.
  // Key format: YYYY-MM-DD|home|away. Names are normalised below so API naming variants still match.
  const PL_UK_TV = new Map([
    ['2026-08-28|crystal palace|manchester city','Sky Sports'],
    ['2026-08-29|liverpool|nottingham forest','TNT Sports'],
    ['2026-08-29|tottenham hotspur|newcastle united','Sky Sports'],
    ['2026-08-30|chelsea|brighton hove albion','Sky Sports'],
    ['2026-08-30|leeds united|brentford','Sky Sports'],
    ['2026-08-30|sunderland|fulham','Sky Sports'],
    ['2026-08-30|manchester united|ipswich town','Sky Sports'],
    ['2026-08-31|aston villa|arsenal','Sky Sports'],
    ['2026-09-04|ipswich town|liverpool','Sky Sports'],
    ['2026-09-05|newcastle united|bournemouth','TNT Sports'],
    ['2026-09-05|hull city|aston villa','Sky Sports'],
    ['2026-09-06|everton|manchester united','Sky Sports'],
    ['2026-09-06|arsenal|chelsea','Sky Sports'],
    ['2026-09-12|tottenham hotspur|everton','Sky Sports'],
    ['2026-09-12|sunderland|arsenal','TNT Sports'],
    ['2026-09-13|coventry city|brighton hove albion','Sky Sports'],
    ['2026-09-13|manchester united|manchester city','Sky Sports'],
    ['2026-09-14|leeds united|newcastle united','Sky Sports'],
    ['2026-09-18|brentford|chelsea','Sky Sports'],
    ['2026-09-19|tottenham hotspur|aston villa','TNT Sports'],
    ['2026-09-19|nottingham forest|coventry city','Sky Sports'],
    ['2026-09-20|bournemouth|liverpool','Sky Sports'],
    ['2026-09-20|fulham|manchester united','Sky Sports'],
    ['2026-10-10|arsenal|leeds united','TNT Sports'],
    ['2026-10-10|manchester united|tottenham hotspur','Sky Sports'],
    ['2026-10-11|crystal palace|nottingham forest','Sky Sports'],
    ['2026-10-11|hull city|everton','Sky Sports'],
    ['2026-10-11|liverpool|manchester city','Sky Sports'],
    ['2026-10-12|coventry city|newcastle united','Sky Sports'],
    ['2026-10-17|everton|chelsea','TNT Sports'],
    ['2026-10-17|newcastle united|aston villa','Sky Sports'],
    ['2026-10-18|bournemouth|sunderland','Sky Sports'],
    ['2026-10-18|brighton hove albion|crystal palace','Sky Sports'],
    ['2026-10-18|leeds united|manchester united','Sky Sports'],
    ['2026-10-18|nottingham forest|arsenal','Sky Sports'],
    ['2026-10-19|tottenham hotspur|coventry city','Sky Sports'],
    ['2026-10-23|ipswich town|nottingham forest','Sky Sports'],
    ['2026-10-24|aston villa|manchester city','TNT Sports'],
    ['2026-10-24|chelsea|tottenham hotspur','Sky Sports'],
    ['2026-10-25|crystal palace|newcastle united','Sky Sports'],
    ['2026-10-25|hull city|brentford','Sky Sports'],
    ['2026-10-25|manchester united|bournemouth','Sky Sports'],
    ['2026-10-25|sunderland|leeds united','Sky Sports'],
    ['2026-10-31|chelsea|manchester united','TNT Sports'],
    ['2026-10-31|tottenham hotspur|crystal palace','Sky Sports'],
    ['2026-11-01|aston villa|fulham','Sky Sports'],
    ['2026-11-01|liverpool|arsenal','Sky Sports'],
    ['2026-11-02|newcastle united|everton','Sky Sports']
  ]);

  function addLiveStyles() {
    if (document.getElementById('ft-live-score-styles')) return;
    const style = document.createElement('style');
    style.id = 'ft-live-score-styles';
    style.textContent = `
      .time.is-live{background:#d80000!important;color:#fff!important;box-shadow:0 0 0 2px rgba(216,0,0,.14);animation:ftLivePulse 1.8s ease-in-out infinite;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.05;padding-top:5px;padding-bottom:5px}
      .time.is-finished{background:#111!important;color:#fff!important;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.05;padding-top:5px;padding-bottom:5px}
      .ft-score-main{font-weight:900;font-size:1.08em;white-space:nowrap}
      .ft-score-sub{display:block;margin-top:3px;font-size:.62em;font-weight:800;letter-spacing:.04em;white-space:nowrap}
      .fixture-live{background:#fff9d9}
      .fixtures-loading{padding:20px;background:#fff;border-top:5px solid #f7c600;font-weight:800}
      .ft-tv-badge{grid-column:1/-1;justify-self:center;margin-top:-5px;margin-bottom:1px;background:#111;color:#f7c600;padding:5px 9px;font-size:10px;font-weight:1000;letter-spacing:.04em;border-radius:3px;white-space:nowrap}
      @keyframes ftLivePulse{0%,100%{opacity:1}50%{opacity:.78}}
    `;
    document.head.appendChild(style);
  }

  function leaguePanelId(name='') {
    return String(name).toLowerCase().includes('championship') ? 'fixtures-ch' : 'fixtures-pl';
  }

  function londonDateKey(value) {
    return new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
  }

  function dayLabel(value) {
    return new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/London',weekday:'long',day:'numeric',month:'long'}).format(new Date(value));
  }

  function kickOff(value) {
    return new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value));
  }

  function normalTeam(name='') {
    return String(name).toLowerCase().replace(/afc/g,'').replace(/&/g,' ').replace(/[^a-z0-9 ]/g,' ').replace(/\b(spurs)\b/g,'tottenham hotspur').replace(/\bman utd\b/g,'manchester united').replace(/\bman city\b/g,'manchester city').replace(/\bnott m forest\b/g,'nottingham forest').replace(/\bbrighton and hove albion\b/g,'brighton hove albion').replace(/\s+/g,' ').trim();
  }

  function tvChannel(fixture) {
    const key = `${londonDateKey(fixture.date)}|${normalTeam(fixture.home)}|${normalTeam(fixture.away)}`;
    return PL_UK_TV.get(key) || '';
  }

  function previousFridayStart() {
    const now=new Date(); const london=new Date(now.toLocaleString('en-US',{timeZone:'Europe/London'}));
    const day=london.getDay(); const daysBack=(day+2)%7||7; london.setHours(0,0,0,0); london.setDate(london.getDate()-daysBack); return london.getTime();
  }

  function displayStatus(fixture) {
    const scoreReady=fixture.homeGoals!=null&&fixture.awayGoals!=null; const score=scoreReady?`${fixture.homeGoals}-${fixture.awayGoals}`:'0-0'; const status=fixture.status||'NS';
    if(LIVE_STATUSES.has(status)){const minute=fixture.elapsed?`${fixture.elapsed}'`:'';return{main:score,sub:`LIVE${minute?` · ${minute}`:''}`,live:true,finished:false};}
    if(status==='HT')return{main:score,sub:'HT',live:true,finished:false};
    if(FINISHED_STATUSES.has(status))return{main:score,sub:'FT',live:false,finished:true};
    if(status==='PST')return{main:'POSTPONED',sub:'',live:false,finished:false};
    if(status==='CANC')return{main:'CANCELLED',sub:'',live:false,finished:false};
    if(status==='SUSP')return{main:score,sub:'SUSP',live:false,finished:false};
    if(status==='ABD')return{main:score,sub:'ABD',live:false,finished:false};
    return{main:kickOff(fixture.date),sub:'',live:false,finished:false};
  }

  function fixtureRow(fixture,isPremierLeague=false) {
    const display=displayStatus(fixture); const row=document.createElement('div'); row.className=`fixture${display.live?' fixture-live':''}`; row.dataset.fixtureId=fixture.id||''; row.dataset.premierLeague=isPremierLeague?'1':'0';
    const home=document.createElement('div');home.className='team home';home.textContent=fixture.home||'';
    const box=document.createElement('div');box.className=`time${display.live?' is-live':''}${display.finished?' is-finished':''}`;
    const main=document.createElement('span');main.className='ft-score-main';main.textContent=display.main;box.appendChild(main);
    if(display.sub){const sub=document.createElement('span');sub.className='ft-score-sub';sub.textContent=display.sub;box.appendChild(sub);}
    const away=document.createElement('div');away.className='team away';away.textContent=fixture.away||'';row.append(home,box,away);
    if(isPremierLeague){const channel=tvChannel(fixture);if(channel){const tv=document.createElement('div');tv.className='ft-tv-badge';tv.textContent=`📺 LIVE — ${channel}`;row.appendChild(tv);}}
    return row;
  }

  function renderLeague(panel,fixtures,isPremierLeague=false) {
    panel.replaceChildren(); if(!fixtures.length){const empty=document.createElement('div');empty.className='fixtures-loading';empty.textContent='No fixtures found for this period.';panel.appendChild(empty);return;}
    const groups=new Map(); fixtures.forEach(fixture=>{const key=londonDateKey(fixture.date);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(fixture);});
    groups.forEach(games=>{games.sort((a,b)=>(a.timestamp||0)-(b.timestamp||0));const day=document.createElement('div');day.className='day';const heading=document.createElement('h3');heading.textContent=dayLabel(games[0].date);day.appendChild(heading);games.forEach(game=>day.appendChild(fixtureRow(game,isPremierLeague)));panel.appendChild(day);});
  }

  function mergeLeagueData(fixturesData,resultsData) {
    const cutoff=previousFridayStart(),nowTs=Date.now(),output={};
    (fixturesData.leagues||[]).forEach(league=>{output[league.name]=[...(league.fixtures||[])];});
    (resultsData.leagues||[]).forEach(league=>{const recent=(league.fixtures||[]).filter(f=>(f.timestamp||0)*1000>=cutoff&&(f.timestamp||0)*1000<=nowTs);const current=output[league.name]||[];const ids=new Set(current.map(f=>f.id));recent.forEach(f=>{if(!ids.has(f.id))current.push(f);});output[league.name]=current;});
    Object.keys(output).forEach(name=>{const now=Date.now()/1000;output[name].sort((a,b)=>{const aPast=(a.timestamp||0)<now&&FINISHED_STATUSES.has(a.status),bPast=(b.timestamp||0)<now&&FINISHED_STATUSES.has(b.status);if(aPast!==bPast)return aPast?1:-1;return aPast?(b.timestamp||0)-(a.timestamp||0):(a.timestamp||0)-(b.timestamp||0);});}); return output;
  }

  async function loadFullSchedule() {
    try {const stamp=Date.now();const[fixturesRes,resultsRes]=await Promise.all([fetch(`/api/fixtures?t=${stamp}`,{cache:'no-store'}),fetch(`/api/fixtures?results=1&t=${stamp}`,{cache:'no-store'})]);if(!fixturesRes.ok||!resultsRes.ok)return;const fixturesData=await fixturesRes.json(),resultsData=await resultsRes.json(),merged=mergeLeagueData(fixturesData,resultsData);Object.entries(merged).forEach(([name,fixtures])=>{const panel=document.getElementById(leaguePanelId(name));if(panel)renderLeague(panel,fixtures,!String(name).toLowerCase().includes('championship'));});}catch(error){console.warn('Football Talk fixtures load failed:',error);}
  }

  async function refreshLive() {
    try {const response=await fetch(`/api/fixtures?live=1&t=${Date.now()}`,{cache:'no-store'});if(!response.ok)return;const data=await response.json();const byId=new Map((data.leagues||[]).flatMap(l=>(l.fixtures||[]).map(f=>[String(f.id),{fixture:f,isPremierLeague:!String(l.name).toLowerCase().includes('championship')}])));document.querySelectorAll('.fixture[data-fixture-id]').forEach(row=>{const item=byId.get(row.dataset.fixtureId);if(!item)return;row.replaceWith(fixtureRow(item.fixture,item.isPremierLeague));});}catch(_){}
  }

  document.addEventListener('DOMContentLoaded',()=>{addLiveStyles();const eyebrow=document.querySelector('.eyebrow');if(eyebrow)eyebrow.textContent='NEXT 14 DAYS';const sub=document.querySelector('.sub');if(sub)sub.textContent='Premier League and EFL Championship fixtures for the next 14 days, plus recent completed matches. Premier League UK TV selections are labelled. All kick-off times shown in UK time.';document.querySelectorAll('.league-panel').forEach(panel=>{panel.innerHTML='<div class="fixtures-loading">Loading fixtures…</div>';});loadFullSchedule();window.setInterval(refreshLive,REFRESH_MS);window.setInterval(loadFullSchedule,2*60*1000);});
})();
