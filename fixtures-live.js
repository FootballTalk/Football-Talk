(() => {
  const REFRESH_MS = 60000;
  const PAST_DAYS = 14;
  const FUTURE_DAYS = 120;
  const LIVE_STATUSES = new Set(['1H','2H','ET','BT','P','LIVE','HT']);
  const FINISHED_STATUSES = new Set(['FT','AET','PEN']);
  const strip = document.getElementById('date-strip');
  const content = document.getElementById('fixtures-content');
  const selectedDateTitle = document.getElementById('selected-date');
  const monthLabel = document.getElementById('month-label');
  const filter = document.getElementById('competition-filter');
  const picker = document.getElementById('date-picker');
  let selectedDate = londonDateKey(new Date());
  let latestLeagues = [];
  let refreshTimer = null;

  function londonDateKey(value) {
    return new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
  }

  function localDateFromKey(key) {
    const [y,m,d] = key.split('-').map(Number);
    return new Date(Date.UTC(y,m-1,d,12,0,0));
  }

  function shiftDate(key, days) {
    const date = localDateFromKey(key);
    date.setUTCDate(date.getUTCDate()+days);
    return date.toISOString().slice(0,10);
  }

  function longDate(key) {
    return new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(localDateFromKey(key));
  }

  function monthName(key) {
    return new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric',timeZone:'UTC'}).format(localDateFromKey(key));
  }

  function shortParts(key) {
    const date = localDateFromKey(key);
    return {
      dow: new Intl.DateTimeFormat('en-GB',{weekday:'short',timeZone:'UTC'}).format(date).toUpperCase(),
      dom: String(date.getUTCDate()),
      mon: new Intl.DateTimeFormat('en-GB',{month:'short',timeZone:'UTC'}).format(date).toUpperCase(),
    };
  }

  function kickOff(value) {
    return new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value));
  }

  function normalText(value='') {
    return String(value).toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  }

  function isFeaturedCompetition(league) {
    const id = Number(league?.id || 0);
    const name = normalText(league?.name);
    const country = normalText(league?.country);
    const knownIds = new Set([1,2,3,4,5,39,40,41,42,45,48,848]);
    if (knownIds.has(id)) return true;

    if (country === 'england') {
      return /^(premier league|championship|league one|league two|fa cup|efl cup|league cup|carabao cup)$/.test(name);
    }

    if (/^(uefa )?champions league$/.test(name)) return true;
    if (/^(uefa )?europa league$/.test(name)) return true;
    if (/^(uefa )?(europa )?conference league$/.test(name)) return true;

    return /^(fifa )?world cup$/.test(name)
      || /world cup qualification/.test(name)
      || /^(uefa )?european championship$/.test(name)
      || /^euro /.test(name)
      || /uefa nations league/.test(name)
      || /copa america/.test(name);
  }

  function featuredPriority(league) {
    const id = Number(league?.id || 0);
    const name = normalText(league?.name);
    const priorities = new Map([
      [39,10],[40,20],[41,30],[42,40],[2,50],[3,60],[848,70],[48,80],[45,90],[1,100],[4,110],[5,120]
    ]);
    if (priorities.has(id)) return priorities.get(id);
    if (name === 'premier league') return 10;
    if (name === 'championship') return 20;
    if (name === 'league one') return 30;
    if (name === 'league two') return 40;
    if (name.includes('champions league')) return 50;
    if (name.includes('europa league')) return 60;
    if (name.includes('conference league')) return 70;
    if (/(carabao|efl cup|league cup)/.test(name)) return 80;
    if (name === 'fa cup') return 90;
    return 100;
  }

  function featuredLeagues() {
    return latestLeagues.filter(isFeaturedCompetition).sort((a,b)=>featuredPriority(a)-featuredPriority(b));
  }

  function buildRail() {
    if (!strip) return;
    strip.replaceChildren();
    const today = londonDateKey(new Date());
    for (let offset=-PAST_DAYS; offset<=FUTURE_DAYS; offset++) {
      const key = shiftDate(today, offset);
      const parts = shortParts(key);
      const button = document.createElement('button');
      button.type='button';
      button.className='date-btn';
      button.dataset.date=key;
      button.setAttribute('role','tab');
      button.setAttribute('aria-label', longDate(key));
      button.innerHTML=`<span class="dow">${parts.dow}</span><span class="dom">${parts.dom}</span><span class="mon">${parts.mon}</span>`;
      if (key===today) button.classList.add('today');
      button.addEventListener('click',()=>selectDate(key,true));
      strip.appendChild(button);
    }
  }

  function updateRailSelection(scroll=true) {
    const today = londonDateKey(new Date());
    let selectedButton = null;
    strip?.querySelectorAll('.date-btn').forEach(button=>{
      const active=button.dataset.date===selectedDate;
      button.classList.toggle('selected',active);
      button.setAttribute('aria-selected',String(active));
      if(active) selectedButton=button;
    });
    if(selectedDateTitle) selectedDateTitle.textContent=selectedDate===today?`Today — ${longDate(selectedDate)}`:longDate(selectedDate);
    if(monthLabel) monthLabel.textContent=monthName(selectedDate);
    if(picker) picker.value=selectedDate;
    if(scroll&&selectedButton) selectedButton.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'});
  }

  function displayStatus(fixture) {
    const scoreReady=fixture.homeGoals!=null&&fixture.awayGoals!=null;
    const score=scoreReady?`${fixture.homeGoals}-${fixture.awayGoals}`:'0-0';
    const status=fixture.status||'NS';
    if(LIVE_STATUSES.has(status)){
      const minute=fixture.elapsed?`${fixture.elapsed}'`:'';
      return{main:score,sub:status==='HT'?'HT':`LIVE${minute?` · ${minute}`:''}`,className:'live'};
    }
    if(FINISHED_STATUSES.has(status))return{main:score,sub:status==='FT'?'FT':status,className:'finished'};
    if(status==='PST')return{main:'P-P',sub:'POSTPONED',className:''};
    if(status==='CANC')return{main:'—',sub:'CANCELLED',className:''};
    if(status==='SUSP')return{main:score,sub:'SUSP',className:''};
    if(status==='ABD')return{main:score,sub:'ABD',className:''};
    if(status==='TBD')return{main:'TBC',sub:'',className:''};
    return{main:kickOff(fixture.date),sub:'',className:''};
  }

  function safeLogo(src, alt, className) {
    if(!src) return null;
    const img=document.createElement('img');
    img.src=src; img.alt=alt; img.className=className; img.loading='lazy'; img.referrerPolicy='no-referrer';
    img.addEventListener('error',()=>img.remove());
    return img;
  }

  function teamNode(name, logo, side) {
    const node=document.createElement('div');node.className=`team ${side}`;
    const label=document.createElement('span');label.className='team-name';label.textContent=name||'';
    const image=safeLogo(logo,`${name||'Team'} badge`,'team-logo');
    if(side==='home'){node.appendChild(label);if(image)node.appendChild(image);}else{if(image)node.appendChild(image);node.appendChild(label);}
    return node;
  }

  function fixtureRow(fixture) {
    const row=document.createElement('div');row.className='fixture';row.dataset.fixtureId=fixture.id||'';
    const status=displayStatus(fixture);
    const score=document.createElement('div');score.className=`scorebox ${status.className}`.trim();
    const main=document.createElement('span');main.className='score-main';main.textContent=status.main;score.appendChild(main);
    if(status.sub){const sub=document.createElement('span');sub.className='score-sub';sub.textContent=status.sub;score.appendChild(sub);}
    row.append(teamNode(fixture.home,fixture.homeLogo,'home'),score,teamNode(fixture.away,fixture.awayLogo,'away'));
    return row;
  }

  function competitionKey(league) { return `${league.id||0}|${league.country||''}|${league.name||''}`; }

  function render() {
    if(!content) return;
    const chosen=filter?.value||'featured';
    let leagues;
    if(chosen==='featured') leagues=featuredLeagues();
    else if(chosen==='all') leagues=latestLeagues;
    else leagues=latestLeagues.filter(league=>competitionKey(league)===chosen);

    content.replaceChildren();
    if(!leagues.length){
      const empty=document.createElement('div');empty.className='empty';
      empty.textContent=chosen==='featured'
        ? 'No Football Talk priority fixtures are currently listed for this date. Choose All competitions to see the full worldwide schedule.'
        : 'No fixtures are currently listed for this date.';
      content.appendChild(empty);return;
    }
    leagues.forEach(league=>{
      const section=document.createElement('section');section.className='competition';
      const head=document.createElement('div');head.className='competition-head';
      const logo=safeLogo(league.logo,`${league.name} logo`,'competition-logo'); if(logo) head.appendChild(logo);
      const copy=document.createElement('div');copy.className='competition-head-copy';
      const country=document.createElement('span');country.className='competition-country';country.textContent=league.country||'International';
      const name=document.createElement('span');name.className='competition-name';name.textContent=league.name||'Other';copy.append(country,name);head.appendChild(copy);section.appendChild(head);
      (league.fixtures||[]).forEach(fixture=>section.appendChild(fixtureRow(fixture)));
      content.appendChild(section);
    });
  }

  function rebuildFilter() {
    if(!filter) return;
    const old=filter.value || 'featured';
    const featured=featuredLeagues();
    filter.replaceChildren();

    const preferred=document.createElement('option');
    preferred.value='featured';
    preferred.textContent=`Football Talk favourites (${featured.length})`;
    filter.appendChild(preferred);

    const all=document.createElement('option');
    all.value='all';
    all.textContent=`All competitions (${latestLeagues.length})`;
    filter.appendChild(all);

    latestLeagues.forEach(league=>{
      const option=document.createElement('option');option.value=competitionKey(league);option.textContent=`${league.country||'International'} — ${league.name||'Other'}`;filter.appendChild(option);
    });
    filter.value=[...filter.options].some(o=>o.value===old)?old:'featured';
  }

  async function loadDate({silent=false}={}) {
    if(!content) return;
    if(!silent){content.innerHTML='<div class="loading">Loading fixtures…</div>';}
    try{
      const response=await fetch(`/api/fixtures?date=${encodeURIComponent(selectedDate)}&t=${Date.now()}`,{cache:'no-store'});
      const data=await response.json();
      if(!response.ok) throw new Error(data.detail||data.error||'Unable to load fixtures');
      latestLeagues=Array.isArray(data.leagues)?data.leagues:[];
      rebuildFilter();
      render();
    }catch(error){
      if(!silent){content.innerHTML=`<div class="error">Fixtures could not be loaded right now. ${String(error.message||'Please try again shortly.')}</div>`;}
    }
  }

  async function selectDate(key, scroll=true) {
    selectedDate=key;
    updateRailSelection(scroll);
    if(filter) filter.value='featured';
    await loadDate();
    scheduleRefresh();
  }

  function scheduleRefresh() {
    if(refreshTimer) window.clearInterval(refreshTimer);
    refreshTimer=window.setInterval(()=>{
      const today=londonDateKey(new Date());
      if(selectedDate===today) loadDate({silent:true});
    },REFRESH_MS);
  }

  document.addEventListener('DOMContentLoaded',()=>{
    buildRail();
    updateRailSelection(false);
    setTimeout(()=>updateRailSelection(true),50);
    if(filter) filter.value='featured';
    loadDate();
    scheduleRefresh();
    filter?.addEventListener('change',render);
    picker?.addEventListener('change',()=>{if(picker.value)selectDate(picker.value,true);});
    document.getElementById('today-btn')?.addEventListener('click',()=>selectDate(londonDateKey(new Date()),true));
    document.getElementById('prev-day')?.addEventListener('click',()=>selectDate(shiftDate(selectedDate,-1),true));
    document.getElementById('next-day')?.addEventListener('click',()=>selectDate(shiftDate(selectedDate,1),true));
    document.getElementById('rail-left')?.addEventListener('click',()=>strip?.scrollBy({left:-420,behavior:'smooth'}));
    document.getElementById('rail-right')?.addEventListener('click',()=>strip?.scrollBy({left:420,behavior:'smooth'}));
  });
})();
