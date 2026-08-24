(() => {
  const track = document.querySelector('.ticker-track');
  const viewport = document.querySelector('.ticker-viewport');
  if (!track || !viewport) return;

  const LIVE_STATUSES = new Set(['1H','2H','ET','BT','P','LIVE','HT']);
  const FINISHED_STATUSES = new Set(['FT','AET','PEN']);
  const SPEED = 46;
  const GAP = 56;

  let liveItems = [];
  let resultItems = [];
  let lastLine = '';
  let rafId = null;
  let lastTime = 0;
  let stripA = null;
  let stripB = null;
  let xA = 0;
  let xB = 0;
  let stripWidth = 0;

  track.style.animation = 'none';
  track.style.transform = 'none';
  track.style.position = 'relative';
  track.style.display = 'block';
  track.style.width = '100%';
  track.style.height = '42px';
  track.style.overflow = 'visible';
  viewport.style.position = 'relative';
  viewport.style.overflow = 'hidden';
  viewport.style.height = '42px';
  viewport.scrollLeft = 0;

  function clean(text = '') {
    return String(text).replace(/\s+/g, ' ').trim();
  }

  function latestNewsItems() {
    const items = [];
    document.querySelectorAll('#dynamic-posts .post-card').forEach((card) => {
      const title = clean(card.querySelector('h3')?.textContent);
      if (title) items.push(`NEWS: ${title}`);
    });
    return [...new Set(items)].slice(0, 4);
  }

  function latestTransferItems() {
    const items = [];
    document.querySelectorAll('.transfer-live .transfer-update').forEach((card) => {
      const title = clean(card.querySelector('h4')?.textContent);
      const status = clean(card.querySelector('.transfer-status')?.textContent);
      if (title) items.push(`TRANSFER${status ? ` — ${status}` : ''}: ${title}`);
    });
    return [...new Set(items)].slice(0, 4);
  }

  function makeStrip(text) {
    const el = document.createElement('span');
    el.textContent = text;
    el.style.position = 'absolute';
    el.style.top = '0';
    el.style.left = '0';
    el.style.display = 'block';
    el.style.width = 'max-content';
    el.style.maxWidth = 'none';
    el.style.whiteSpace = 'nowrap';
    el.style.padding = '11px 0';
    el.style.fontWeight = '800';
    el.style.lineHeight = '20px';
    el.style.willChange = 'left';
    return el;
  }

  function stopCrawl() {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
    lastTime = 0;
  }

  function placeStrips() {
    if (!stripA || !stripB) return;
    stripA.style.left = `${Math.round(xA)}px`;
    stripB.style.left = `${Math.round(xB)}px`;
  }

  function tick(now) {
    if (!lastTime) lastTime = now;
    const delta = Math.min(64, now - lastTime);
    lastTime = now;
    const move = SPEED * delta / 1000;

    xA -= move;
    xB -= move;

    if (xA + stripWidth < 0) xA = xB + stripWidth + GAP;
    if (xB + stripWidth < 0) xB = xA + stripWidth + GAP;

    placeStrips();
    rafId = requestAnimationFrame(tick);
  }

  function startCrawl() {
    stopCrawl();
    requestAnimationFrame(() => {
      if (!stripA || !stripB) return;
      stripWidth = Math.ceil(stripA.getBoundingClientRect().width);
      if (!stripWidth) return;

      // Start with the first strip visible and the second following directly behind.
      xA = 0;
      xB = stripWidth + GAP;
      placeStrips();
      rafId = requestAnimationFrame(tick);
    });
  }

  function render() {
    const newsItems = latestNewsItems();
    const transferItems = latestTransferItems();
    const items = [...liveItems, ...resultItems, ...newsItems, ...transferItems];
    const fallback = [
      'NEWS: Latest football updates from Football Talk',
      'TRANSFER: Latest moves and rumours in the Transfer Centre',
      'SCORES: Fixtures, live scores and results update automatically'
    ];

    const finalItems = items.length ? [...new Set(items)].slice(0, 12) : fallback;
    const line = `⚽ ${finalItems.join('     •     ')}     •     `;
    if (line === lastLine && stripA && stripB) return;
    lastLine = line;

    stripA = makeStrip(line);
    stripB = makeStrip(line);
    stripA.setAttribute('aria-hidden', 'false');
    stripB.setAttribute('aria-hidden', 'true');
    track.replaceChildren(stripA, stripB);
    startCrawl();
  }

  async function loadLiveScores() {
    try {
      const response = await fetch(`/api/fixtures?live=1&t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      const matches = (data.leagues || []).flatMap((league) =>
        (league.fixtures || []).map((fixture) => ({ ...fixture, leagueName: league.name }))
      ).filter((fixture) => LIVE_STATUSES.has(fixture.status));

      liveItems = matches.slice(0, 6).map((fixture) => {
        const score = `${fixture.homeGoals ?? 0}-${fixture.awayGoals ?? 0}`;
        const matchStatus = fixture.status === 'HT' ? 'HT' : fixture.elapsed ? `LIVE ${fixture.elapsed}'` : 'LIVE';
        return `${matchStatus}: ${fixture.home} ${score} ${fixture.away} (${fixture.leagueName})`;
      });
      render();
    } catch (_) {}
  }

  async function loadLatestResult() {
    try {
      const response = await fetch(`/api/fixtures?results=1&t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      const results = (data.leagues || []).flatMap((league) =>
        (league.fixtures || []).map((fixture) => ({ ...fixture, leagueName: league.name }))
      ).filter((fixture) => FINISHED_STATUSES.has(fixture.status))
       .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      resultItems = results.length ? [
        `LATEST RESULT: ${results[0].home} ${results[0].homeGoals ?? '-'}-${results[0].awayGoals ?? '-'} ${results[0].away} (${results[0].leagueName})`
      ] : [];
      render();
    } catch (_) {}
  }

  const posts = document.getElementById('dynamic-posts');
  if (posts) new MutationObserver(render).observe(posts, { childList: true, subtree: true });

  window.addEventListener('resize', () => {
    if (lastLine) startCrawl();
  });

  render();
  loadLiveScores();
  loadLatestResult();
  window.setInterval(loadLiveScores, 30 * 1000);
  window.setInterval(loadLatestResult, 2 * 60 * 1000);
})();
