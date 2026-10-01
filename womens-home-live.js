(() => {
  const ticker = document.getElementById('wf-home-ticker');
  const track = document.getElementById('wf-live-track');
  const label = document.getElementById('wf-live-label');
  const more = document.getElementById('wf-live-more');
  if (!ticker || !track || !label || !more) return;

  const LIVE = new Set(['1H', '2H', 'HT', 'ET', 'P', 'LIVE', 'INT', 'BT']);
  const DONE = new Set(['FT', 'AET', 'PEN']);
  let mode = '';
  let lastNewsLoad = 0;

  const londonYmd = value => {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date(value));
    const map = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${map.year}-${map.month}-${map.day}`;
  };
  const kickoff = value => new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit'
  }).format(new Date(value));

  function setRunning(itemCount, characterCount = 0) {
    track.classList.remove('running');
    const speed = Math.max(34, Math.min(80, characterCount ? characterCount * .2 : itemCount * 9));
    track.style.setProperty('--wf-speed', `${speed}s`);
    requestAnimationFrame(() => track.classList.add('running'));
  }

  function separator() {
    const span = document.createElement('span');
    span.className = 'wf-live-sep';
    span.textContent = ' • ';
    return span;
  }

  function newsItem(item) {
    const link = document.createElement('a');
    link.className = 'wf-live-news';
    link.href = item.link || 'womens-news.html';
    if (item.link) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
    const title = document.createElement('span');
    title.textContent = item.title || 'Women’s football news';
    link.appendChild(title);
    if (item.source) {
      const source = document.createElement('span');
      source.className = 'wf-live-source';
      source.textContent = item.source;
      link.appendChild(source);
    }
    link.appendChild(separator());
    return link;
  }

  function scoreItem(fixture) {
    const wrap = document.createElement('span');
    wrap.className = 'wf-live-score';
    const status = String(fixture.status || 'NS').toUpperCase();
    const home = document.createElement('span');
    home.textContent = fixture.home || '';
    const centre = document.createElement('b');
    centre.textContent = LIVE.has(status) || DONE.has(status)
      ? `${fixture.homeGoals ?? 0} – ${fixture.awayGoals ?? 0}`
      : 'v';
    const away = document.createElement('span');
    away.textContent = fixture.away || '';
    const state = document.createElement('span');
    state.className = LIVE.has(status) ? 'wf-live-status' : 'wf-live-kickoff';
    state.textContent = LIVE.has(status)
      ? (fixture.elapsed ? `${fixture.elapsed}′` : 'LIVE')
      : DONE.has(status)
        ? status
        : kickoff(fixture.date);
    wrap.append(home, centre, away, state, separator());
    return wrap;
  }

  function renderNews(items) {
    const news = (items || []).filter(item => item && item.title).slice(0, 10);
    mode = 'news';
    label.textContent = 'WOMEN’S LATEST NEWS';
    more.textContent = 'NEWS';
    more.href = 'womens-news.html';
    track.replaceChildren();
    track.classList.remove('running');
    if (!news.length) {
      track.textContent = 'Latest women’s football news is temporarily unavailable.';
      return;
    }
    const fragment = document.createDocumentFragment();
    [...news, ...news].forEach(item => fragment.appendChild(newsItem(item)));
    track.appendChild(fragment);
    setRunning(news.length, news.reduce((sum, item) => sum + String(item.title || '').length, 0));
  }

  function renderMatchday(fixtures) {
    const games = [...fixtures].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    const live = games.some(fixture => LIVE.has(String(fixture.status || '').toUpperCase()));
    const complete = games.length && games.every(fixture => DONE.has(String(fixture.status || '').toUpperCase()));
    mode = 'scores';
    label.textContent = live ? 'WOMEN’S LIVE SCORES' : complete ? 'WOMEN’S RESULTS' : 'WOMEN’S MATCHDAY';
    more.textContent = 'MATCH CENTRE';
    more.href = 'womens-match-centre.html';
    track.replaceChildren();
    track.classList.remove('running');
    const fragment = document.createDocumentFragment();
    [...games, ...games].forEach(fixture => fragment.appendChild(scoreItem(fixture)));
    track.appendChild(fragment);
    setRunning(games.length);
  }

  async function loadNews(force = false) {
    if (!force && mode === 'news' && Date.now() - lastNewsLoad < 90000) return;
    try {
      const response = await fetch(`/api/news?game=women&t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('News unavailable');
      const data = await response.json();
      lastNewsLoad = Date.now();
      renderNews(data.items || []);
    } catch {
      if (!track.children.length || mode !== 'news') renderNews([]);
    }
  }

  async function refresh() {
    try {
      const response = await fetch(`/api/womens?view=fixtures&t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Fixtures unavailable');
      const data = await response.json();
      const today = londonYmd(new Date());
      const games = (data.leagues || []).flatMap(league => (league.fixtures || [])
        .filter(fixture => fixture.date && londonYmd(fixture.date) === today)
        .map(fixture => ({ ...fixture, leagueName: league.name })));
      if (games.length) renderMatchday(games);
      else await loadNews(mode !== 'news');
    } catch {
      await loadNews(mode !== 'news');
    }
  }

  refresh();
  setInterval(refresh, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
})();
