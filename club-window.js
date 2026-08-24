(() => {
  const style = document.createElement('style');
  style.textContent = `
    body.ft-club-open{overflow:hidden}
    .ft-club-modal{position:fixed;inset:0;z-index:9999;background:#f4f4f4;display:none;flex-direction:column}
    .ft-club-modal.open{display:flex}
    .ft-club-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;background:#0b0b0e;color:#fff;border-bottom:4px solid #f7c600;padding:10px 12px 10px 16px;min-height:68px}
    .ft-club-brand{display:flex;align-items:center;gap:10px;min-width:0}
    .ft-club-mark{display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;flex:0 0 42px;background:#f7c600;color:#000;font-family:'Archivo Black',Inter,Arial,sans-serif;font-size:20px;font-weight:900;transform:skew(-8deg)}
    .ft-club-copy{min-width:0}
    .ft-club-copy strong{display:block;font-family:'Archivo Black',Inter,Arial,sans-serif;font-size:15px;white-space:nowrap}
    .ft-club-copy span{display:block;margin-top:3px;color:#ccc;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:58vw}
    .ft-club-close{appearance:none;border:0;width:48px;height:48px;flex:0 0 48px;border-radius:50%;background:#f7c600;color:#000;font-size:34px;font-weight:900;line-height:1;cursor:pointer}
    .ft-club-frame-wrap{position:relative;flex:1;min-height:0;background:#fff}
    .ft-club-frame{display:block;width:100%;height:100%;border:0;background:#fff}
    .ft-club-fallback{position:absolute;left:0;right:0;bottom:0;z-index:2;display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;padding:8px 12px;background:rgba(11,11,14,.94);color:#fff;font-size:12px;text-align:center}
    .ft-club-fallback a{background:#f7c600;color:#000;padding:8px 10px;font-weight:900;text-decoration:none}
    @media(max-width:600px){.ft-club-copy strong{font-size:13px}.ft-club-copy span{max-width:52vw}.ft-club-bar{padding-left:10px}}
  `;
  document.head.appendChild(style);

  const modal = document.createElement('div');
  modal.className = 'ft-club-modal';
  modal.setAttribute('aria-hidden','true');
  modal.innerHTML = `
    <div class="ft-club-bar">
      <div class="ft-club-brand">
        <span class="ft-club-mark">FT</span>
        <span class="ft-club-copy"><strong>FOOTBALL TALK</strong><span id="ft-club-title">Official club website</span></span>
      </div>
      <button class="ft-club-close" type="button" aria-label="Close club website">×</button>
    </div>
    <div class="ft-club-frame-wrap">
      <iframe class="ft-club-frame" title="Official club website" referrerpolicy="strict-origin-when-cross-origin"></iframe>
      <div class="ft-club-fallback">If the club blocks this in-app view, use <a class="ft-club-external" href="#" target="_blank" rel="noopener noreferrer">Open official site ↗</a></div>
    </div>`;
  document.body.appendChild(modal);

  const frame = modal.querySelector('.ft-club-frame');
  const closeBtn = modal.querySelector('.ft-club-close');
  const title = modal.querySelector('#ft-club-title');
  const external = modal.querySelector('.ft-club-external');

  function openViewer(url, clubName) {
    title.textContent = clubName ? `${clubName} — Official Website` : 'Official club website';
    external.href = url;
    frame.src = url;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    document.body.classList.add('ft-club-open');
    closeBtn.focus();
  }

  function closeViewer() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
    document.body.classList.remove('ft-club-open');
    frame.src = 'about:blank';
  }

  closeBtn.addEventListener('click', closeViewer);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('open')) closeViewer(); });

  document.addEventListener('click', e => {
    const link = e.target.closest('.team-link');
    if (!link || !link.href) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const clubName = link.querySelector('span:not(.external-mark)')?.textContent?.trim() || '';
    openViewer(link.href, clubName);
  }, true);
})();
