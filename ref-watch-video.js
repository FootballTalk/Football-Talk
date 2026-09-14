(() => {
  const host = document.getElementById('ref-watch-video');
  if (!host) return;

  const esc = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  fetch('/api/ref-watch-video', { cache: 'no-store' })
    .then(r => r.ok ? r.json() : Promise.reject(new Error('Video unavailable')))
    .then(data => {
      if (!data.available || !data.embedUrl) {
        host.hidden = true;
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
    .catch(() => { host.hidden = true; });
})();
