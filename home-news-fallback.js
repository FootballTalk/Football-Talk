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
    if (!needsFallback()) return;
    const useful = (items || [])
      .filter(item => clean(item.title) && Number(item.relevance ?? 1) > 0)
      .slice(0, 12);
    if (!useful.length) return;

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
        <div class="post-card-content">
          <p class="eyebrow dark">${esc(label)}</p>
          <h3>${title}</h3>
          ${description ? `<p>${description}</p>` : ''}
          <div class="post-meta">${source}${time ? ` · ${time}` : ''}</div>
          ${link ? `<a class="read-story" href="${esc(link)}" target="_blank" rel="noopener noreferrer">Read story →</a>` : ''}
        </div>
      </article>`;
    }).join('');
  }

  async function recover() {
    if (!needsFallback()) return;
    try {
      const response = await fetch(`/api/news?t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      render(data.items || []);
    } catch (_) {}
  }

  // Let the normal Supabase-backed homepage loader go first. If it fails,
  // recover from Football Talk's own public news endpoint instead.
  setTimeout(recover, 1200);
  setTimeout(recover, 4000);
})();