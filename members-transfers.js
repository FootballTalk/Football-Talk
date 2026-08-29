(() => {
  const feed = document.getElementById('members-transfer-feed');
  const updated = document.getElementById('members-transfer-updated');
  if (!feed) return;
  const KEY = 'football-talk-member-session';
  let timer;

  function session() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (_) { return null; }
  }
  function save(value) {
    try { localStorage.setItem(KEY, JSON.stringify(value)); } catch (_) {}
  }
  function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = String(value || '');
    return div.innerHTML;
  }
  function status(message) {
    feed.innerHTML = '<div class="itsago-status">' + escapeHtml(message) + '</div>';
  }
  function addStyles() {
    if (document.getElementById('itsago-live-css')) return;
    const style = document.createElement('style');
    style.id = 'itsago-live-css';
    style.textContent = `
      .transfer-feed{padding:14px!important}
      .transfer-feed-head{margin-bottom:10px!important}
      .itsago-live{display:flex;align-items:center;overflow:hidden;min-height:48px;background:#08080a;border:1px solid #39393f;border-radius:10px}
      .itsago-live-label{align-self:stretch;display:flex;align-items:center;flex:0 0 auto;padding:0 12px;background:#b11219;color:#fff;font-weight:1000;font-size:12px;z-index:2}
      .itsago-live-window{flex:1;overflow:hidden;white-space:nowrap}
      .itsago-live-track{display:inline-flex;width:max-content;animation:ftItsAGo var(--ticker-duration,120s) linear infinite;will-change:transform}
      .itsago-live-item{display:inline-flex;align-items:center;padding:0 22px;color:#fff;font-weight:900;font-size:14px;white-space:nowrap}
      .itsago-live-item:after{content:'◆';color:#f7c600;font-size:8px;margin-left:28px}
      .itsago-live-time{margin-left:9px;color:#999;font-size:11px;font-weight:700}
      .itsago-status{padding:13px 15px;border:1px dashed #444;border-radius:9px;background:#101013;color:#ddd;font-weight:800}
      @keyframes ftItsAGo{from{transform:translateX(0)}to{transform:translateX(-50%)}}
      @media(max-width:700px){.itsago-live-label{font-size:10px;padding:0 9px}.itsago-live-item{font-size:13px;padding:0 16px}}
    `;
    document.head.appendChild(style);
  }
  function setReadableSpeed() {
    const track = feed.querySelector('.itsago-live-track');
    if (!track) return;
    requestAnimationFrame(() => {
      const distance = track.scrollWidth / 2;
      const mobile = window.matchMedia('(max-width:700px)').matches;
      const pixelsPerSecond = mobile ? 22 : 28;
      const minimumSeconds = mobile ? 110 : 95;
      const duration = Math.max(minimumSeconds, distance / pixelsPerSecond);
      track.style.setProperty('--ticker-duration', duration.toFixed(1) + 's');
    });
  }
  function render(items) {
    addStyles();
    if (!items.length) {
      status('No fresh IT’S A GO! confirmations right now — watching live for the next confirmed transfer.');
      return;
    }
    const parts = items.slice(0, 20).map(item => {
      const when = item.publishedAt ? new Date(item.publishedAt).toLocaleString('en-GB', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '';
      return '<span class="itsago-live-item">🚨 ' + escapeHtml(item.text) + (when ? '<span class="itsago-live-time">' + escapeHtml(when) + '</span>' : '') + '</span>';
    }).join('');
    feed.innerHTML = '<div class="itsago-live"><div class="itsago-live-label">IT’S A GO!</div><div class="itsago-live-window"><div class="itsago-live-track">' + parts + parts + '</div></div></div>';
    setReadableSpeed();
    if (updated) updated.textContent = 'Live · ' + new Date().toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'});
  }
  async function refreshToken(current) {
    const cfg = window.FT_CONFIG || {};
    if (!current?.refresh_token || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return null;
    try {
      const response = await fetch(cfg.SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {
        method:'POST',
        headers:{apikey:cfg.SUPABASE_ANON_KEY,'Content-Type':'application/json'},
        body:JSON.stringify({refresh_token:current.refresh_token}),
        cache:'no-store'
      });
      if (!response.ok) return null;
      const fresh = await response.json();
      if (!fresh.access_token) return null;
      const merged = {...current, ...fresh, refresh_token:fresh.refresh_token || current.refresh_token};
      save(merged);
      return merged;
    } catch (_) { return null; }
  }
  async function request(current) {
    return fetch('/api/members-transfers?ts=' + Date.now(), {
      headers:{Authorization:'Bearer ' + current.access_token},
      cache:'no-store'
    });
  }
  async function load() {
    clearTimeout(timer);
    addStyles();
    let current = session();
    if (!current?.access_token) {
      status('Connecting to the live IT’S A GO! ticker…');
      timer = setTimeout(load, 1500);
      return;
    }
    try {
      let response = await request(current);
      if (response.status === 401 || response.status === 403) {
        status('Refreshing the live ticker…');
        const fresh = await refreshToken(current);
        if (!fresh) { timer = setTimeout(load, 5000); return; }
        current = fresh;
        response = await request(current);
      }
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      render(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      console.warn('IT’S A GO ticker:', error);
      status('Live ticker reconnecting…');
      timer = setTimeout(load, 8000);
    }
  }

  addStyles();
  status('Connecting to the live IT’S A GO! ticker…');
  load();
  setInterval(load, 120000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
  window.addEventListener('resize', setReadableSpeed);
})();