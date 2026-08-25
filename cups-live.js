(() => {
  const LIVE_REFRESH_MS = 30000;
  const FULL_REFRESH_MS = 60000;
  const LIVE = new Set(['1H','2H','ET','BT','P','LIVE','HT','INT']);
  const FINISHED = new Set(['FT','AET','PEN']);

  const panelId = name => String(name).toLowerCase().includes('carabao') ? 'cup-carabao' : 'cup-fa';
  const dateKey = value => new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
  const dayLabel = value => new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',weekday:'long',day:'numeric',month:'long'}).format(new Date(value));
  const kickOff = value => new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value));

  function display(f) {
    const hasScore = f.homeGoals != null && f.awayGoals != null;
    const score = hasScore ? `${f.homeGoals}-${f.awayGoals}` : '0-0';

    if (LIVE.has(f.status)) {
      if (f.status === 'HT') return { main: score, sub: 'HT', live: true, finished: false };
      if (f.status === 'INT') return { main: score, sub: 'INTERVAL', live: true, finished: false };
      if (f.status === 'ET') {
        const minute = f.elapsed ? `${f.elapsed}'` : '';
        return { main: score, sub: `ET${minute ? ` · ${minute}` : ''}`, live: true, finished: false };
      }
      if (f.status === 'P') return { main: score, sub: 'PENALTIES', live: true, finished: false };
      const minute = f.elapsed ? `${f.elapsed}'` : '';
      return { main: score, sub: `LIVE${minute ? ` · ${minute}` : ''}`, live: true, finished: false };
    }

    if (FINISHED.has(f.status)) {
      const label = f.status === 'FT' ? 'FT' : f.status;
      return { main: score, sub: label, live: false, finished: true };
    }
    if (f.status === 'PST') return { main: 'POSTPONED', sub: '', live: false, finished: false };
    if (f.status === 'CANC') return { main: 'CANCELLED', sub: '', live: false, finished: false };
    if (f.status === 'ABD') return { main: 'ABANDONED', sub: '', live: false, finished: false };
    if (f.status === 'SUSP') return { main: score, sub: 'SUSPENDED', live: false, finished: false };
    return { main: kickOff(f.date), sub: '', live: false, finished: false };
  }

  function row(f) {
    const d = display(f);
    const el = document.createElement('div');
    el.className = `fixture${d.live ? ' fixture-live' : ''}`;
    el.dataset.fixtureId = f.id || '';
    const home = document.createElement('div'); home.className='team home'; home.textContent=f.home||'';
    const box = document.createElement('div'); box.className=`time${d.live?' is-live':''}${d.finished?' is-finished':''}`;
    const main = document.createElement('span'); main.className='ft-score-main'; main.textContent=d.main; box.appendChild(main);
    if (d.sub) { const sub=document.createElement('span'); sub.className='ft-score-sub'; sub.textContent=d.sub; box.appendChild(sub); }
    const away = document.createElement('div'); away.className='team away'; away.textContent=f.away||'';
    el.append(home,box,away); return el;
  }

  function render(panel, fixtures) {
    panel.replaceChildren();
    if (!fixtures.length) {
      const empty=document.createElement('div'); empty.className='fixtures-loading'; empty.textContent='No cup fixtures found for this period.'; panel.appendChild(empty); return;
    }
    const now = Date.now()/1000;
    fixtures.sort((a,b)=>{
      const af=(a.timestamp||0)<now && FINISHED.has(a.status);
      const bf=(b.timestamp||0)<now && FINISHED.has(b.status);
      if (af!==bf) return af?1:-1;
      return af ? (b.timestamp||0)-(a.timestamp||0) : (a.timestamp||0)-(b.timestamp||0);
    });
    const groups=new Map();
    fixtures.forEach(f=>{const key=dateKey(f.date); if(!groups.has(key))groups.set(key,[]); groups.get(key).push(f);});
    groups.forEach(games=>{
      const day=document.createElement('div'); day.className='day';
      const h=document.createElement('h3'); h.textContent=dayLabel(games[0].date); day.appendChild(h);
      games.sort((a,b)=>(a.timestamp||0)-(b.timestamp||0));
      games.forEach(f=>day.appendChild(row(f))); panel.appendChild(day);
    });
  }

  function showError(message) {
    ['cup-carabao','cup-fa'].forEach(id=>{
      const panel=document.getElementById(id);
      if(!panel) return;
      panel.replaceChildren();
      const error=document.createElement('div');
      error.className='fixtures-loading';
      error.textContent=message || 'Cup fixtures are temporarily unavailable. Please try again shortly.';
      panel.appendChild(error);
    });
  }

  async function load() {
    try {
      const r=await fetch(`/api/cups?t=${Date.now()}`,{cache:'no-store'});
      if(!r.ok) {
        let detail='';
        try { const body=await r.json(); detail=body.detail || body.error || ''; } catch(_) {}
        showError(detail ? `Cup feed error: ${detail}` : `Cup feed error: HTTP ${r.status}`);
        return;
      }
      const data=await r.json();
      (data.cups||[]).forEach(c=>{const panel=document.getElementById(panelId(c.name)); if(panel)render(panel,c.fixtures||[]);});
    } catch(e){
      console.warn('Cup fixtures load failed',e);
      showError('Cup fixtures are temporarily unavailable. Please try again shortly.');
    }
  }

  async function refreshLive() {
    try {
      const r=await fetch(`/api/cups?live=1&t=${Date.now()}`,{cache:'no-store'}); if(!r.ok)return;
      const data=await r.json();
      const byId=new Map((data.cups||[]).flatMap(c=>c.fixtures||[]).map(f=>[String(f.id),f]));
      document.querySelectorAll('.fixture[data-fixture-id]').forEach(el=>{const f=byId.get(el.dataset.fixtureId); if(f)el.replaceWith(row(f));});
    } catch(_) {}
  }

  function start() {
    load();
    setInterval(refreshLive,LIVE_REFRESH_MS);
    setInterval(load,FULL_REFRESH_MS);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
