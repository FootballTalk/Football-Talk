(() => {
  const track = document.querySelector('.ticker-track');
  const viewport = document.querySelector('.ticker-viewport');
  if (!track || !viewport) return;

  const LIVE_STATUSES = new Set(['1H','2H','ET','BT','P','LIVE','HT']);
  const FINISHED_STATUSES = new Set(['FT','AET','PEN']);
  let liveItems = [];
  let resultItems = [];
  let currentItems = [];
  let currentIndex = 0;
  let rotateTimer = null;

  // Use a single rotating headline instead of a continuously scrolling strip.
  // This avoids clipping in iPhone/Google in-app browsers.
  track.style.animation = 'none';
  track.style.transform = 'none';
  track.style.width = '100%';
  track.style.maxWidth = '100%';
  track.style.display = 'flex';
  track.style.justifyContent = 'center';
  viewport.style.overflow = 'hidden';
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

  function showItem(index) {
    if (!currentItems.length) return;
    currentIndex = ((index % currentItems.length) + currentItems.length) % currentItems.length;

    const item = document.createElement('span');
    item.textContent = `⚽ ${currentItems[currentIndex]}`;
    item.style.display = 'block';
    item.style.width = '100%';
    item.style.maxWidth = '100%';
    item.style.padding = '11px 18px';
    item.style.whiteSpace = 'normal';
    item.style.overflowWrap = 'anywhere';
    item.style.textAlign = 'center';
    item.style.fontWeight = '800';
    item.style.lineHeight = '1.35';
    item.style.opacity = '0';
    item.style.transition = 'opacity .25s ease';

    track.replaceChildren(item);
    requestAnimationFrame(() => { item.style.opacity = '1'; });
  }

  function restartRotation() {
    if (rotateTimer) clearInterval(rotateTimer);
    rotateTimer = null;
    showItem(currentIndex);
    if (currentItems.length > 1) {
      rotateTimer = window.setInterval(() => showItem(currentIndex + 1), 5000);
    }
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

    const nextItems = items.length ? [...new Set(items)].slice(0, 12) : fallback;
    const changed = JSON.stringify(nextItems) !== JSON.stringify(currentItems);
    currentItems = nextItems;
    if (!changed && track.firstElementChild) return;
    currentIndex = 0;
    restartRotation();
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

  render();
  loadLiveScores();
  loadLatestResult();
  window.setInterval(loadLiveScores, 30 * 1000);
  window.setInterval(loadLatestResult, 2 * 60 * 1000);
})();
