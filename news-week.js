// The News hub uses dated live reports; archive articles are never pinned as current news.
(() => {
  const grid = document.getElementById('weekly-news-grid');
  const status = document.getElementById('weekly-news-status');
  if (!grid || !status) return;
  const WEEK = 7 * 24 * 60 * 60 * 1000;
  const REFRESH = 3 * 60 * 1000;
  const dateFormat = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false
  });
  let items = [];
  let loading = false;
  let lastUpdated = 0;

  function currentStories(input, now) {
    const seen = new Set();
    return input.filter(item => {
      if (!item || !String(item.title || '').trim()) return false;
      const published = new Date(item.publishedAt || item.published).getTime();
      if (!Number.isFinite(published) || published > now || now - published >= WEEK) return false;
      try { if (new URL(item.link).protocol !== 'https:') return false; } catch (_) { return false; }
      const key = String(item.title).trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a, b) => new Date(b.publishedAt || b.published) - new Date(a.publishedAt || a.published)).slice(0, 12);
  }

  function render(failed = false) {
    const now = Date.now();
    items = currentStories(items, now);
    const cards = items.map(item => {
      const card = document.createElement('a');
      card.className = 'original-card';
      card.href = '/football-talk-story.html?source=' + encodeURIComponent(item.link);
      const label = document.createElement('small');
      label.textContent = item.type === 'TRANSFER' ? 'TRANSFER REPORT' : 'LATEST FOOTBALL NEWS';
      const title = document.createElement('h2');
      title.textContent = item.title;
      const summary = document.createElement('p');
      summary.textContent = String(item.description || '').slice(0, 260);
      const meta = document.createElement('p');
      const time = document.createElement('time');
      time.dateTime = new Date(item.publishedAt || item.published).toISOString();
      time.textContent = dateFormat.format(new Date(time.dateTime));
      meta.append(document.createTextNode((item.source || 'Football source') + ' · Published '), time);
      const read = document.createElement('strong');
      read.textContent = 'Read on Football Talk →';
      read.style.fontSize = '15px';
      card.append(label, title, summary, meta, read);
      return card;
    });
    grid.replaceChildren(...cards);
    if (items.length) {
      status.textContent = failed
        ? 'The live feed could not refresh. Showing recent reports from the last successful update; retrying automatically.'
        : 'Latest reports · Updated ' + dateFormat.format(new Date(lastUpdated)) + ' · Refreshes automatically';
    } else {
      status.textContent = failed
        ? 'This week’s news could not be loaded. Retrying automatically; older articles remain in the archive.'
        : 'No reports from the past seven days are available right now. Checking again automatically.';
    }
  }

  async function refresh() {
    if (loading) return;
    loading = true;
    try {
      const response = await fetch('/api/news', { cache: 'no-store', signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error('News unavailable');
      const data = await response.json();
      if (!Array.isArray(data.items)) throw new Error('Invalid news feed');
      items = data.items;
      lastUpdated = Date.now();
      render();
    } catch (_) {
      render(true); // Reapply the seven-day cutoff even during an outage.
    } finally {
      loading = false;
    }
  }
  refresh();
  setInterval(() => { if (!document.hidden) refresh(); }, REFRESH);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  window.addEventListener('pageshow', refresh);
})();
