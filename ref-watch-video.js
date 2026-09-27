(() => {
  const host = document.getElementById('ref-watch-video');
  if (!host) return;

  const esc = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  fetch('/api/ref-watch-video', { cache: 'no-store' })
    .then(r => r.ok ? r.json() : Promise.reject(new Error('Video unavailable')))
    .then(data => {
      if (!data.available || !data.embedUrl) {
        host.hidden = false;
        host.innerHTML = `
          <div class="ref-video-head">
            <span class="ref-badge">LATEST REF WATCH • SKY SPORTS</span>
            <h2>Dermot Gallagher — Ref Watch</h2>
            <p>Sky Sports has not exposed an embeddable player for this edition.</p>
          </div>
          <div class="ref-video-credit">
            <strong>Video: Sky Sports</strong>
            <span>No dead player: Football Talk will automatically show the official player here when Sky exposes an embeddable version.</span>
          </div>`;
        return;
      }

      host.hidden = false;
      host.innerHTML = `
        <div class="ref-video-head">
          <span class="ref-badge">OFFICIAL SKY SPORTS VIDEO</span>
          <h2>Watch Ref Watch</h2>
          <p>${esc(data.title || 'Dermot Gallagher reviews the weekend\'s biggest refereeing decisions.')}</p>
        </div>
        <div class="ref-video-frame">
          <iframe src="${esc(data.embedUrl)}" title="${esc(data.title || 'Sky Sports Ref Watch')}" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
        </div>
        <div class="ref-video-credit">
          <strong>Video: Sky Sports</strong>
          <span>Streamed directly from Sky Sports. Football Talk does not host or re-upload this footage.</span>
          ${data.articleUrl ? `<a href="${esc(data.articleUrl)}" target="_blank" rel="noopener">View on Sky Sports ↗</a>` : ''}
        </div>`;
    })
    .catch(() => {
      host.hidden = false;
      host.innerHTML = `<div class="ref-video-head"><span class="ref-badge">REF WATCH • SKY SPORTS</span><h2>Player temporarily unavailable</h2><p>Football Talk will retry the official Sky Sports player automatically.</p></div>`;
    });
})();
