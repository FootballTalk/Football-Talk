(() => {
  const feed = document.getElementById('dynamic-posts');
  if (!feed) return;

  const esc = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const clean = (value = '') => String(value).replace(/\s+/g, ' ').trim();
  let inFlight = false;
  let lastAttempt = 0;

  function needsFallback() {
    return !feed.querySelector('.post-card') || !!feed.querySelector('.empty-state');
  }

  function formatTime(item) {
    const raw = item.publishedAt || item.published_at || item.published;
    if (!raw) return '';
    const date = new Date(typeof raw === 'number' ? raw : String(raw));
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('en-GB', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  }

  function render(items) {
    if (!needsFallback()) return false;

    const useful = (items || [])
      .filter(item => clean(item.title) && Number(item.relevance ?? 1) > 0)
      .slice(0, 12);

    if (!useful.length) return false;

    feed.innerHTML = useful.map(item => {
      const title = esc(clean(item.title));
      const description = esc(clean(item.description || item.summary || '').slice(0, 260));
      const source = esc(clean(item.source || 'Football Talk'));
      const time = esc(formatTime(item));
      const link = clean(item.link || item.url || '');
      const type = clean(item.type || 'NEWS');
      const stage = clean(item.stage || '');
      const label = type === 'TRANSFER'
        ? (stage === 'OFFICIAL' ? 'DEAL DONE' : stage === 'DEVELOPING' ? 'TRANSFER UPDATE' : 'TRANSFER')
        : 'LATEST NEWS';
      const image = clean(item.image || '');

      return `<article class="post-card home-api-fallback">
        ${image ? `<img src="${esc(image)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}
        <div class="post-card-body">
          <span class="tag">${esc(label)}</span>
          <p class="card-meta">${source}${time ? ` · ${time}` : ''}</p>
          <h3>${title}</h3>
          ${description ? `<p>${description}</p>` : ''}
          ${link ? `<a class="read-story" href="${esc(link)}" target="_blank" rel="noopener noreferrer">Read story →</a>` : ''}
        </div>
      </article>`;
    }).join('');

    return true;
  }

  async function recover(force = false) {
    if (!needsFallback() || inFlight) return;

    const now = Date.now();
    if (!force && now - lastAttempt < 900) return;
    lastAttempt = now;
    inFlight = true;

    try {
      const response = await fetch(`/api/news?t=${now}`, { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      render(data.items || []);
    } catch (_) {
      // Keep the page usable and let the next scheduled retry handle it.
    } finally {
      inFlight = false;
    }
  }

  // Recover immediately if the normal Supabase-backed loader fails quickly.
  queueMicrotask(() => recover(true));

  // Also watch for a late failure message from the normal loader and replace it
  // with Football Talk's own /api/news feed without making visitors refresh.
  const observer = new MutationObserver(() => {
    if (feed.querySelector('.empty-state')) recover();
  });
  observer.observe(feed, { childList: true, subtree: true });

  setTimeout(() => recover(true), 1000);
  setTimeout(() => recover(true), 3000);
})();