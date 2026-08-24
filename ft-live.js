(() => {
  const track = document.querySelector('.ticker-track');
  const viewport = document.querySelector('.ticker-viewport');
  const ticker = document.querySelector('.ticker');
  if (!track || !viewport) return;

  const LIVE_STATUSES = new Set(['1H','2H','ET','BT','P','LIVE','HT']);
  const FINISHED_STATUSES = new Set(['FT','AET','PEN']);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let liveItems = [];
  let resultItems = [];
  let lastLine = '';
  let firstSegmentWidth = 0;
  let rafId = null;
  let lastFrame = 0;
  let paused = false;
  const SPEED = 48; // pixels per second

  // Never use the old transform/keyframe ticker on mobile browsers.
  track.style.animation = 'none';
  track.style.transform = 'none';
  viewport.style.scrollBehavior = 'auto';

  function clean(text = '') {
    return String(text).replace(/\s+/g, ' ').trim();
  }

  function latestNewsItems() {
    const items = [];
    document.querySelectorAll('#dynamic-posts .post-card').forEach((card) => {
      const title = clean(card.querySelector('h3')?.textContent);
      if (title) items.push(`NEWS: ${title}`);
    });
    return [...new Set(items)].slice(0, 3);
  }

  function latestTransferItems() {
    const items = [];
    document.querySelectorAll('.transfer-live .transfer-update').forEach((card) => {
      const title = clean(card.querySelector('h4')?.textContent);
      const status = clean(card.querySelector('.transfer-status')?.textContent);
      if (title) items.push(`TRANSFER${status ? ` — ${status}` : ''}: ${title}`);
    });
    return [...new Set(items)].slice(0, 3);
  }

  function stopTicker() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    lastFrame = 0;
  }

  function tick(now) {
    if (!lastFrame) lastFrame = now;
    const delta = Math.min(50, now - lastFrame);
    lastFrame = now;

    if (!paused && firstSegmentWidth > 0) {
      viewport.scrollLeft += (SPEED * delta) / 1000;
      if (viewport.scrollLeft >= firstSegmentWidth) {
        viewport.scrollLeft -= firstSegmentWidth;
      }
    }
    rafId = requestAnimationFrame(tick);
  }

  function startTicker() {
    stopTicker();
    viewport.scrollLeft = 0;
    if (reducedMotion) return;

    requestAnimationFrame(() => {
      const first = track.firstElementChild;
      firstSegmentWidth = first ? first.getBoundingClientRect().width : 0;
      if (firstSegmentWidth > 0) rafId = requestAnimationFrame(tick);
    });
  }

  function buildSegment(line, hidden) {
    const segment = document.createElement('span');
    segment.textContent = line;
    segment.style.display = 'block';
    segment.style.flex = '0 0 auto';
    segment.style.whiteSpace = 'nowrap';
    segment.setAttribute('aria-hidden', hidden ? 'true' : 'false');
    return segment;
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

    // Keep the moving line compact. Extremely long transformed strips are a
    // known source of clipping in some iPhone in-app browsers.
    const finalItems = items.length ? [...new Set(items)].slice(0, 9) : fallback;
    const line = `⚽ ${finalItems.join('   •   ')}   •   `;
    if (line === lastLine && track.children.length === 2) return;
    lastLine = line;

    track.replaceChildren(buildSegment(line, false), buildSegment(line, true));
    startTicker();
  }

  async function loadLiveScores() {
    try {
      const response = await fetch(`/api/fixtures?live=1&t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      const matches = (data.leagues || []).flatMap((league) =>
        (league.fixtures || []).map((fixture) => ({ ...fixture, leagueName: league.name }))
      ).filter((fixture) => LIVE_STATUSES.has(fixture.status));

      liveItems = matches.slice(0, 4).map((fixture) => {
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

  if (ticker && !reducedMotion) {
    ticker.addEventListener('mouseenter', () => { paused = true; });
    ticker.addEventListener('mouseleave', () => { paused = false; lastFrame = performance.now(); });
  }

  window.addEventListener('resize', () => {
    if (lastLine) startTicker();
  });

  render();
  loadLiveScores();
  loadLatestResult();
  window.setInterval(loadLiveScores, 30 * 1000);
  window.setInterval(loadLatestResult, 2 * 60 * 1000);
})();
