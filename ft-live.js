(() => {
  const track = document.querySelector('.ticker-track');
  const viewport = document.querySelector('.ticker-viewport');
  if (!track || !viewport) return;

  const LIVE_STATUSES = new Set(['1H','2H','ET','BT','P','LIVE','HT']);
  const FINISHED_STATUSES = new Set(['FT','AET','PEN']);
  let liveItems = [];
  let resultItems = [];
  let lastLine = '';

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
    if (line === lastLine && track.firstElementChild) return;
    lastLine = line;

    // A native marquee gives the classic TV-news continuous crawl and is
    // particularly reliable in mobile/in-app browsers where very wide CSS
    // transformed ticker strips can clip text at the viewport edge.
    const marquee = document.createElement('marquee');
    marquee.setAttribute('direction', 'left');
    marquee.setAttribute('behavior', 'scroll');
    marquee.setAttribute('scrollamount', '4');
    marquee.setAttribute('scrolldelay', '20');
    marquee.setAttribute('truespeed', '');
    marquee.setAttribute('aria-label', 'Football Talk live updates');
    marquee.textContent = line;
    marquee.style.display = 'block';
    marquee.style.width = '100%';
    marquee.style.padding = '11px 0';
    marquee.style.whiteSpace = 'nowrap';
    marquee.style.fontWeight = '800';
    marquee.style.lineHeight = '1.35';

    track.style.animation = 'none';
    track.style.transform = 'none';
    track.style.width = '100%';
    track.style.maxWidth = '100%';
    track.style.display = 'block';
    viewport.style.overflow = 'hidden';
    viewport.scrollLeft = 0;
    track.replaceChildren(marquee);
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
