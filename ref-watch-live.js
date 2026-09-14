(() => {
  const section = document.querySelector('.ref-card');
  const title = document.getElementById('latest-ref-watch');
  const note = section && section.querySelector('.edition-note');
  if (!section || !title || !note) return;

  const esc = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dateLabel = iso => {
    const d = new Date(`${iso}T12:00:00Z`);
    return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/London'}).format(d);
  };
  const currentEdition = () => {
    const m = title.textContent.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
    if (!m) return '';
    const d = new Date(`${m[1]} ${m[2]} ${m[3]} 12:00:00 UTC`);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0,10);
  };

  fetch('/api/ref-watch', { cache: 'no-store' })
    .then(r => r.ok ? r.json() : Promise.reject(new Error('Ref Watch unavailable')))
    .then(data => {
      const items = Array.isArray(data.items) ? data.items : [];
      if (!items.length || currentEdition() === data.editionKey) return;

      title.textContent = `Ref Watch — ${dateLabel(data.editionDate)}`;
      note.textContent = `${items.length} major refereeing and VAR talking point${items.length===1?'':'s'} from the Premier League weekend.`;

      section.querySelectorAll(':scope > article.incident').forEach(el => el.remove());
      const anchor = section.querySelector('.ref-steps');
      const html = items.map(item => `
        <article class="incident">
          <div class="incident-head">
            <small>${esc(item.source || 'REF WATCH')}</small>
            <h3>${esc(item.title)}</h3>
          </div>
          <div class="incident-body">
            <div class="incident-section"><strong>The Incident</strong><p>${esc(item.incident)}</p></div>
            <div class="incident-section"><strong>The Professional / Reported View</strong><p>${esc(item.professionalView)}</p></div>
            <div class="incident-section"><strong>Football Talk Verdict</strong><p>${esc(item.footballTalkVerdict)}</p><span class="verdict ${esc(item.verdict?.className || 'debate')}">${esc(item.verdict?.label || 'DEBATABLE')}</span></div>
            <div class="incident-section"><strong>Your Verdict</strong><p>${esc(item.yourVerdict)}</p></div>
            <div class="source-links"><a href="${esc(item.link)}" target="_blank" rel="noopener">${esc(item.source || 'Source')} report ↗</a></div>
          </div>
        </article>`).join('');
      if (anchor) anchor.insertAdjacentHTML('beforebegin', html);
    })
    .catch(() => {});
})();
