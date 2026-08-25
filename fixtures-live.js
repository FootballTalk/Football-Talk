(() => {
  const REFRESH_MS = 60000;
  const LIVE_STATUSES = new Set(['1H','2H','ET','BT','P','LIVE']);
  const FINISHED_STATUSES = new Set(['FT','AET','PEN']);

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
      @keyframes ftLivePulse{0%,100%{opacity:1}50%{opacity:.78}}
    `;
    document.head.appendChild(style);
  }

  function leaguePanelId(name='') {
    return String(name).toLowerCase().includes('championship') ? 'fixtures-ch' : 'fixtures-pl';
  }

  function londonDateKey(value) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date(value));
  }

  function dayLabel(value) {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London', weekday: 'long', day: 'numeric', month: 'long'
    }).format(new Date(value));
  }

  function kickOff(value) {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hour12: false
    }).format(new Date(value));
  }

  function previousFridayStart() {
    const now = new Date();
    const london = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
    const day = london.getDay();
    const daysBack = (day + 2) % 7 || 7;
    london.setHours(0,0,0,0);
    london.setDate(london.getDate() - daysBack);
    return london.getTime();
  }

  function displayStatus(fixture) {
    const scoreReady = fixture.homeGoals != null && fixture.awayGoals != null;
    const score = scoreReady ? `${fixture.homeGoals}-${fixture.awayGoals}` : '0-0';
    const status = fixture.status || 'NS';
    if (LIVE_STATUSES.has(status)) {
      const minute = fixture.elapsed ? `${fixture.elapsed}'` : '';
      return { main: score, sub: `LIVE${minute ? ` · ${minute}` : ''}`, live: true, finished: false };
    }
    if (status === 'HT') return { main: score, sub: 'HT', live: true, finished: false };
    if (FINISHED_STATUSES.has(status)) return { main: score, sub: 'FT', live: false, finished: true };
    if (status === 'PST') return { main: 'POSTPONED', sub: '', live: false, finished: false };
    if (status === 'CANC') return { main: 'CANCELLED', sub: '', live: false, finished: false };
    if (status === 'SUSP') return { main: score, sub: 'SUSP', live: false, finished: false };
    if (status === 'ABD') return { main: score, sub: 'ABD', live: false, finished: false };
    return { main: kickOff(fixture.date), sub: '', live: false, finished: false };
  }

  function fixtureRow(fixture) {
    const display = displayStatus(fixture);
    const row = document.createElement('div');
    row.className = `fixture${display.live ? ' fixture-live' : ''}`;
    row.dataset.fixtureId = fixture.id || '';

    const home = document.createElement('div');
    home.className = 'team home';
    home.textContent = fixture.home || '';

    const box = document.createElement('div');
    box.className = `time${display.live ? ' is-live' : ''}${display.finished ? ' is-finished' : ''}`;
    const main = document.createElement('span');
    main.className = 'ft-score-main';
    main.textContent = display.main;
    box.appendChild(main);
    if (display.sub) {
      const sub = document.createElement('span');
      sub.className = 'ft-score-sub';
      sub.textContent = display.sub;
      box.appendChild(sub);
    }

    const away = document.createElement('div');
    away.className = 'team away';
    away.textContent = fixture.away || '';
    row.append(home, box, away);
    return row;
  }

  function renderLeague(panel, fixtures) {
    panel.replaceChildren();
    if (!fixtures.length) {
      const empty = document.createElement('div');
      empty.className = 'fixtures-loading';
      empty.textContent = 'No fixtures found for this period.';
      panel.appendChild(empty);
      return;
    }

    const groups = new Map();
    fixtures.forEach(fixture => {
      const key = londonDateKey(fixture.date);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(fixture);
    });

    groups.forEach((games) => {
      games.sort((a,b)=>(a.timestamp||0)-(b.timestamp||0));
      const day = document.createElement('div');
      day.className = 'day';
      const heading = document.createElement('h3');
      heading.textContent = dayLabel(games[0].date);
      day.appendChild(heading);
      games.forEach(game => day.appendChild(fixtureRow(game)));
      panel.appendChild(day);
    });
  }

  function mergeLeagueData(fixturesData, resultsData) {
    const cutoff = previousFridayStart();
    const nowTs = Date.now();
    const output = {};

    (fixturesData.leagues || []).forEach(league => {
      output[league.name] = [...(league.fixtures || [])];
    });

    (resultsData.leagues || []).forEach(league => {
      const recent = (league.fixtures || []).filter(f => (f.timestamp || 0) * 1000 >= cutoff && (f.timestamp || 0) * 1000 <= nowTs);
      const current = output[league.name] || [];
      const ids = new Set(current.map(f => f.id));
      recent.forEach(f => { if (!ids.has(f.id)) current.push(f); });
      output[league.name] = current;
    });

    Object.keys(output).forEach(name => {
      const now = Date.now() / 1000;
      output[name].sort((a,b) => {
        const aPast = (a.timestamp || 0) < now && FINISHED_STATUSES.has(a.status);
        const bPast = (b.timestamp || 0) < now && FINISHED_STATUSES.has(b.status);
        if (aPast !== bPast) return aPast ? 1 : -1;
        return aPast ? (b.timestamp||0)-(a.timestamp||0) : (a.timestamp||0)-(b.timestamp||0);
      });
    });
    return output;
  }

  async function loadFullSchedule() {
    try {
      const stamp = Date.now();
      const [fixturesRes, resultsRes] = await Promise.all([
        fetch(`/api/fixtures?t=${stamp}`, { cache: 'no-store' }),
        fetch(`/api/fixtures?results=1&t=${stamp}`, { cache: 'no-store' })
      ]);
      if (!fixturesRes.ok || !resultsRes.ok) return;
      const fixturesData = await fixturesRes.json();
      const resultsData = await resultsRes.json();
      const merged = mergeLeagueData(fixturesData, resultsData);
      Object.entries(merged).forEach(([name, fixtures]) => {
        const panel = document.getElementById(leaguePanelId(name));
        if (panel) renderLeague(panel, fixtures);
      });
    } catch (error) {
      console.warn('Football Talk fixtures load failed:', error);
    }
  }

  async function refreshLive() {
    try {
      const response = await fetch(`/api/fixtures?live=1&t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      const byId = new Map((data.leagues || []).flatMap(l => l.fixtures || []).map(f => [String(f.id), f]));
      document.querySelectorAll('.fixture[data-fixture-id]').forEach(row => {
        const fixture = byId.get(row.dataset.fixtureId);
        if (!fixture) return;
        const replacement = fixtureRow(fixture);
        row.replaceWith(replacement);
      });
    } catch (_) {}
  }

  document.addEventListener('DOMContentLoaded', () => {
    addLiveStyles();
    const eyebrow = document.querySelector('.eyebrow');
    if (eyebrow) eyebrow.textContent = 'NEXT 14 DAYS';
    const sub = document.querySelector('.sub');
    if (sub) sub.textContent = 'Premier League and EFL Championship fixtures for the next 14 days, plus recent completed matches. All kick-off times shown in UK time.';
    document.querySelectorAll('.league-panel').forEach(panel => {
      panel.innerHTML = '<div class="fixtures-loading">Loading fixtures…</div>';
    });
    loadFullSchedule();
    window.setInterval(refreshLive, REFRESH_MS);
    window.setInterval(loadFullSchedule, 2 * 60 * 1000);
  });
})();
