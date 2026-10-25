(() => {
  const feed = document.getElementById('dynamic-posts');
  if (!feed) return;

  const CACHE_KEY = 'ft-home-news-cache-v2';
  const MAX_CACHE_AGE = 12 * 60 * 60 * 1000;
  const esc = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  const clean = (value = '') => String(value).replace(/\s+/g, ' ').trim();
  let inFlight = false;
  let lastAttempt = 0;

  function failedState() {
    return [...feed.querySelectorAll('.empty-state')].some(el => /could not|unavailable|connect supabase|no published stories/i.test(el.textContent || ''));
  }
  function isStale(card) {
    const raw = card.dataset.publishedAt || card.querySelector('time[datetime]')?.getAttribute('datetime');
    if (raw) {
      const t = Date.parse(raw);
      return !Number.isFinite(t) || t > Date.now() + 3600000 || Date.now() - t > 36 * 3600000;
    }
    const meta = (card.querySelector('.card-meta')?.textContent || '').trim();
    const match = meta.match(/(\d{1,2})\s+([A-Za-z]{3,9})(?:\s+(\d{4}))?/);
    if (!match) return true; // undated cards cannot be represented as breaking news
    const year = match[3] || new Date().getFullYear();
    const t = Date.parse(match[1] + ' ' + match[2] + ' ' + year);
    return !Number.isFinite(t) || t > Date.now() + 86400000 || Date.now() - t > 36 * 3600000;
  }
  function needsFallback() {
    const cards = [...feed.querySelectorAll('.post-card')];
    return !cards.length || failedState() || cards.every(isStale);
  }
  function formatTime(item) {
    const raw = item.publishedAt || item.published_at || item.published;
    if (!raw) return '';
    const date = new Date(typeof raw === 'number' ? raw : String(raw));
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('en-GB', {timeZone:'Europe/London',day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit',hour12:false});
  }
  function usefulItems(items) {
    return (items || []).filter(item => { const raw=item.publishedAt||item.published_at||item.published; const time=Date.parse(String(raw||'')); return clean(item.title) && Number(item.relevance ?? 1)>0 && Number.isFinite(time) && Date.now()-time>=0 && Date.now()-time<36*60*60*1000; }).slice(0, 12);
  }
  function saveCache(items) {
    const useful = usefulItems(items);
    if (!useful.length) return;
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({savedAt:Date.now(), items:useful})); } catch (_) {}
  }
  function readCache() {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (!cached || !Array.isArray(cached.items) || !cached.items.length) return [];
      if (!cached.savedAt || Date.now() - Number(cached.savedAt) > MAX_CACHE_AGE) return [];
      return cached.items;
    } catch (_) { return []; }
  }
  function render(items) {
    if (!needsFallback()) return false;
    const useful = usefulItems(items);
    if (!useful.length) return false;
    feed.innerHTML = useful.map(item => {
      const title = esc(clean(item.title));
      const description = esc(clean(item.description || item.summary || '').slice(0, 260));
      const source = esc(item.source || 'Source not supplied');
      const time = esc(formatTime(item));
      const link = clean(item.link || item.url || '');
      const type = clean(item.type || 'NEWS');
      const stage = clean(item.stage || '');
      const label = type === 'TRANSFER' ? (stage === 'OFFICIAL' ? 'REPORTED SIGNING' : stage === 'DEVELOPING' ? 'TRANSFER UPDATE' : 'TRANSFER') : 'LATEST NEWS';
      const image = clean(item.image || '');
      return `<article class="post-card home-api-fallback">${image ? `<img src="${esc(image)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}<div class="post-card-body"><span class="tag">${esc(label)}</span><p class="card-meta">${source}${time ? ` · Published ${time}` : ''}</p><h3>${title}</h3>${description ? `<p>${description}</p>` : ''}${link ? `<a class="read-story" href="/football-talk-story.html?source=${encodeURIComponent(link)}">Read on Football Talk →</a>` : ''}</div></article>`;
    }).join('');
    return true;
  }
  function neutralState() {
    if (!needsFallback()) return;
    feed.innerHTML = '<div class="empty-state"><strong>Latest football updates are refreshing.</strong><br>Please check back shortly.</div>';
  }
  async function recover(force = false) {
    if (!needsFallback() || inFlight) return;
    const now = Date.now();
    if (!force && now - lastAttempt < 1500) return;
    lastAttempt = now;
    inFlight = true;
    try {
      const response = await (window.ftFetchNews ? window.ftFetchNews() : fetch(`/api/news?t=${now}`, {cache:'no-store'}));
      if (!response.ok) throw new Error('news unavailable');
      const data = await response.json();
      const items = data.items || [];
      saveCache(items);
      if (render(items)) return;
      if (render(readCache())) return;
      neutralState();
    } catch (_) {
      if (!render(readCache())) neutralState();
    } finally { inFlight = false; }
  }

  // Three-step resilience: live API -> recent local cache -> neutral refresh message.
  // Keep watching because the asynchronous primary loader can overwrite the fallback.
  const observer = new MutationObserver(() => {
    if (needsFallback()) recover(true);
  });
  observer.observe(feed, {childList:true, subtree:true});
  queueMicrotask(() => recover(true));
  setTimeout(() => recover(true), 1000);
  setTimeout(() => recover(true), 3000);
  setTimeout(() => recover(true), 7000);
  window.addEventListener('pageshow', () => recover(true));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) recover(true); });
})();