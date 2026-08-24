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
  let activeAnimation = null;
  let animationToken = 0;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // One complete headline moves across the viewport at a time. This keeps the
  // traditional scrolling ticker look without creating an extremely wide strip.
  track.style.animation = 'none';
  track.style.transform = 'none';
  track.style.width = '100%';
  track.style.maxWidth = '100%';
  track.style.display = 'block';
  track.style.position = 'relative';
  track.style.overflow = 'visible';
  viewport.style.overflow = 'hidden';
  viewport.style.position = 'relative';
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

  function stopAnimation() {
    animationToken += 1;
    if (activeAnimation) {
      activeAnimation.cancel();
      activeAnimation = null;
    }
  }

  function showStaticItem(text) {
    stopAnimation();
    const item = document.createElement('span');
    item.textContent = `⚽ ${text}`;
    item.style.display = 'block';
    item.style.width = '100%';
    item.style.padding = '11px 18px';
    item.style.whiteSpace = 'normal';
    item.style.textAlign = 'center';
    item.style.fontWeight = '800';
    item.style.lineHeight = '1.35';
    track.replaceChildren(item);
  }

  function scrollCurrentItem() {
    if (!currentItems.length) return;
    if (reducedMotion) {
      showStaticItem(currentItems[currentIndex]);
      return;
    }

    stopAnimation();
    const myToken = animationToken;
    const text = currentItems[currentIndex];
    const item = document.createElement('span');
    item.textContent = `⚽ ${text}`;
    item.style.position = 'absolute';
    item.style.left = '0';
    item.style.top = '0';
    item.style.display = 'block';
    item.style.width = 'max-content';
    item.style.maxWidth = 'none';
    item.style.padding = '11px 24px';
    item.style.whiteSpace = 'nowrap';
    item.style.fontWeight = '800';
    item.style.lineHeight = '1.35';
    item.style.willChange = 'transform';
    track.replaceChildren(item);

    requestAnimationFrame(() => {
      if (myToken !== animationToken) return;
      const viewportWidth = viewport.clientWidth;
      const itemWidth = Math.ceil(item.getBoundingClientRect().width);
      if (!viewportWidth || !itemWidth) return;

      // Start fully beyond the right edge and finish fully beyond the left edge.
      const startX = viewportWidth + 16;
      const endX = -(itemWidth + 16);
      const distance = startX - endX;
      const speed = 52; // pixels per second
      const duration = Math.max(7000, Math.round((distance / speed) * 1000));

      item.style.transform = `translate3d(${startX}px,0,0)`;
      activeAnimation = item.animate(
        [
          { transform: `translate3d(${startX}px,0,0)` },
          { transform: `translate3d(${endX}px,0,0)` }
        ],
        { duration, easing: 'linear', fill: 'forwards' }
      );

      activeAnimation.onfinish = () => {
        if (myToken !== animationToken) return;
        activeAnimation = null;
        currentIndex = (currentIndex + 1) % currentItems.length;
        scrollCurrentItem();
      };
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

    const nextItems = items.length ? [...new Set(items)].slice(0, 12) : fallback;
    const changed = JSON.stringify(nextItems) !== JSON.stringify(currentItems);
    currentItems = nextItems;
    if (!changed && track.firstElementChild) return;
    currentIndex = 0;
    scrollCurrentItem();
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
    if (currentItems.length) scrollCurrentItem();
  });

  render();
  loadLiveScores();
  loadLatestResult();
  window.setInterval(loadLiveScores, 30 * 1000);
  window.setInterval(loadLatestResult, 2 * 60 * 1000);
})();
