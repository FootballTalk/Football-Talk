(() => {
  const MAIN_LINKS = [
    ['Home', './'],
    ['Match Centre', 'match-centre.html'],
    ['Tables & Stats', 'tables-stats.html'],
    ['Transfers', 'section.html?view=transfers'],
    ['News', 'news.html'],
    ['FT Club', 'football-talk-club.html'],
    ['Ref Watch', 'ref-watch.html'],
    ['Shop', 'shop.html'],
    ['More', 'more.html']
  ];
  const WOMENS_LINKS = [
    ['Women’s Home', 'womens-football.html'],
    ['Match Centre', 'womens-match-centre.html'],
    ['Tables & Stats', 'womens-tables-stats.html'],
    ['Transfers', 'womens-transfers.html'],
    ['News', 'womens-news.html'],
    ['Ref Watch', 'womens-ref-watch.html'],
    ['Highlights', 'womens-highlights.html'],
    ['More', 'womens-more.html']
  ];

  function currentKey() {
    const path = (location.pathname.split('/').pop() || '').toLowerCase();
    const params = new URLSearchParams(location.search);
    const view = (params.get('view') || '').toLowerCase();
    if (path === 'section.html' && view === 'transfers') return 'section.html?view=transfers';
    if (path === 'section.html' && ['latest', 'debate'].includes(view)) return 'news.html';
    if (path === 'section.html' && view === 'matchday') return 'match-centre.html';
    if (['match.html', 'match-centre.html', 'fixtures.html', 'lineups.html', 'cups.html', 'european.html'].includes(path)) return 'match-centre.html';
    if (['tables.html', 'tables-stats.html'].includes(path) || location.pathname.includes('/api/stats-zone') || location.pathname.includes('/api/top-scorers')) return 'tables-stats.html';
    if (path === 'business-directory.html') return 'more.html';
    if (path === 'football-talk-club.html') return 'football-talk-club.html';
    if (['members.html', 'account.html'].includes(path) || path.startsWith('members-')) return 'members.html';
    if (['more.html', 'super-six.html', 'quiz.html', 'tv-guide.html', 'advertise.html'].includes(path)) return 'more.html';
    return path || 'index.html';
  }

  function womensKey() {
    const path = (location.pathname.split('/').pop() || '').toLowerCase();
    if (['womens-matches.html', 'womens-fixtures.html', 'womens-results.html', 'womens-lineups.html'].includes(path)) return 'womens-match-centre.html';
    if (['womens-tables.html', 'womens-stats.html'].includes(path)) return 'womens-tables-stats.html';
    return WOMENS_LINKS.some(([, href]) => href === path) ? path : '';
  }

  function addWomensTools(womensTabs, key) {
    const existing = document.querySelector('.section-tools');
    if (existing) existing.remove();
    const match = key === 'womens-match-centre.html';
    const stats = key === 'womens-tables-stats.html';
    if (!match && !stats) return;
    const bar = document.createElement('nav');
    bar.className = 'section-tools';
    bar.setAttribute('aria-label', match ? 'Women’s Match Centre tools' : 'Women’s tables and stats tools');
    const label = document.createElement('span');
    label.className = 'section-tools-label';
    label.textContent = match ? 'WOMEN’S MATCH HUB' : 'WOMEN’S STATS HUB';
    bar.appendChild(label);
    const items = match
      ? [['TODAY', 'womens-match-centre.html'], ['Fixtures', 'womens-fixtures.html'], ['Results', 'womens-results.html'], ['Lineups', 'womens-lineups.html']]
      : [['Overview', 'womens-tables-stats.html'], ['Tables', 'womens-tables.html'], ['Stats Zone', 'womens-stats.html'], ['Top Scorers', 'womens-stats.html#goals']];
    const path = (location.pathname.split('/').pop() || '').toLowerCase();
    const hash = location.hash.toLowerCase();
    items.forEach(([text, href]) => {
      const link = document.createElement('a');
      link.href = href;
      link.textContent = text;
      const targetPath = href.split('#')[0].toLowerCase();
      const targetHash = href.includes('#') ? `#${href.split('#')[1].toLowerCase()}` : '';
      const active = path === targetPath && (!targetHash || hash === targetHash);
      if (active) link.classList.add('context-active');
      bar.appendChild(link);
    });
    womensTabs.insertAdjacentElement('afterend', bar);
  }

  function addTools(womensTabs, key) {
    const existing = document.querySelector('.section-tools');
    if (existing) existing.remove();
    const match = key === 'match-centre.html';
    const stats = key === 'tables-stats.html';
    if (!match && !stats) return;
    const bar = document.createElement('nav');
    bar.className = 'section-tools';
    bar.setAttribute('aria-label', match ? 'Match Centre tools' : 'Tables and stats tools');
    const label = document.createElement('span');
    label.className = 'section-tools-label';
    label.textContent = match ? 'MATCH HUB' : 'STATS HUB';
    bar.appendChild(label);
    const items = match
      ? [['TODAY', 'match-centre.html'], ['Fixtures & Results', 'fixtures.html'], ['Lineups', 'lineups.html'], ['Domestic Cups', 'cups.html'], ['Europe', 'european.html'], ['Predictions', 'members.html']]
      : [['Tables', 'tables.html'], ['Stats Zone', '/api/stats-zone'], ['Top Scorers', '/api/stats-zone?main=leaders&stat=goals'], ['Form & Results', '/api/stats-zone?main=form']];
    const path = (location.pathname.split('/').pop() || '').toLowerCase();
    const params = new URLSearchParams(location.search);
    const main = params.get('main') || '';
    const stat = params.get('stat') || '';
    items.forEach(([text, href]) => {
      const link = document.createElement('a');
      link.href = href;
      link.textContent = text;
      const target = (href.split('?')[0].split('/').pop() || '').toLowerCase();
      const active = match
        ? path === target || (path === 'match.html' && text === 'TODAY')
        : text === 'Tables'
          ? path === 'tables.html'
          : text === 'Form & Results'
            ? main === 'form'
            : text === 'Top Scorers'
              ? main === 'leaders' && stat === 'goals'
              : location.pathname.includes('/api/stats-zone') && !main && !stat;
      if (active) link.classList.add('context-active');
      bar.appendChild(link);
    });
    womensTabs.insertAdjacentElement('afterend', bar);
  }

  function addStyles() {
    if (document.getElementById('ft-persistent-tabs-style')) return;
    const style = document.createElement('style');
    style.id = 'ft-persistent-tabs-style';
    style.textContent = `
      .ft-persistent-tabs{position:sticky!important;top:var(--ft-tabs-top,76px)!important;z-index:175!important;display:grid!important;grid-template-columns:repeat(9,minmax(0,1fr))!important;padding:0 10px!important;background:#0b0b0e!important;border-bottom:1px solid #2b2b31!important}
      .ft-persistent-tabs a{position:relative!important;display:flex!important;align-items:center!important;justify-content:center!important;color:#fff!important;padding:14px 8px 16px!important;font-size:13px!important;font-weight:900!important;text-decoration:none!important;white-space:nowrap!important}
      .ft-persistent-tabs a.active-tab{color:#f7c600!important}
      .ft-persistent-tabs a.active-tab:after{content:'';position:absolute;left:10px;right:10px;bottom:0;height:5px;background:#f7c600}
      .ft-womens-tabs{position:sticky!important;top:calc(var(--ft-tabs-top,76px) + 47px)!important;z-index:174!important;display:grid!important;grid-template-columns:repeat(8,minmax(0,1fr))!important;background:#f7c600!important;border-bottom:1px solid #cba500!important;padding:0 10px!important}
      .ft-womens-tabs a{position:relative!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:11px 8px 12px!important;color:#111!important;font-size:12px!important;font-weight:1000!important;text-decoration:none!important;white-space:nowrap!important}
      .ft-womens-tabs a:hover,.ft-womens-tabs a:focus-visible{background:rgba(255,255,255,.4)!important}
      .ft-womens-tabs a.active-tab{background:#111!important;color:#fff!important}
      .section-tools{display:flex!important;gap:8px!important;overflow-x:auto!important;padding:9px 12px!important;background:#fff!important;border-bottom:1px solid #d7d7db!important;position:sticky!important;top:calc(var(--ft-tabs-top,76px) + 88px)!important;z-index:173!important}
      .section-tools a{flex:0 0 auto!important;padding:9px 13px!important;border-radius:999px!important;background:#111!important;color:#fff!important;font-size:12px!important;font-weight:900!important;text-decoration:none!important;white-space:nowrap!important}
      .section-tools a.context-active{background:#f7c600!important;color:#111!important}
      .section-tools-label{display:flex!important;align-items:center!important;font-size:11px!important;font-weight:1000!important;letter-spacing:.08em!important}
      @media(max-width:900px){
        .ft-persistent-tabs{grid-template-columns:none!important;grid-auto-flow:column!important;grid-auto-columns:max-content!important;justify-content:start!important;overflow-x:auto!important;padding:0 8px!important}
        .ft-persistent-tabs a{min-width:92px!important;padding:11px 12px 13px!important;font-size:11px!important}
        .ft-womens-tabs{top:calc(var(--ft-tabs-top,66px) + 37px)!important;grid-template-columns:none!important;grid-auto-flow:column!important;grid-auto-columns:max-content!important;justify-content:start!important;overflow-x:auto!important;padding:0!important}
        .ft-womens-tabs a{min-width:78px!important;padding:10px 12px 11px!important;font-size:11px!important}
        .section-tools{top:calc(var(--ft-tabs-top,66px) + 76px)!important;padding:8px 10px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function build() {
    const header = document.querySelector('.site-header,.section-page-brand,header.top,.top');
    if (!header) return;
    let mainTabs = document.querySelector('.quick-nav,.ft-persistent-tabs');
    if (!mainTabs) {
      mainTabs = document.createElement('nav');
      mainTabs.className = 'ft-persistent-tabs';
      header.insertAdjacentElement('afterend', mainTabs);
    }
    mainTabs.className = 'ft-persistent-tabs';
    mainTabs.setAttribute('aria-label', 'Football Talk main sections');
    mainTabs.replaceChildren();
    const mainKey = currentKey();
    MAIN_LINKS.forEach(([label, href]) => {
      const link = document.createElement('a');
      link.href = href;
      link.textContent = label;
      if (href.toLowerCase() === mainKey.toLowerCase()) {
        link.classList.add('active-tab');
        link.setAttribute('aria-current', 'page');
      }
      mainTabs.appendChild(link);
    });

    let womensTabs = document.querySelector('.ft-womens-tabs');
    if (!womensTabs) {
      womensTabs = document.createElement('nav');
      womensTabs.className = 'ft-womens-tabs';
      mainTabs.insertAdjacentElement('afterend', womensTabs);
    }
    womensTabs.setAttribute('aria-label', 'Women’s football sections');
    womensTabs.replaceChildren();
    const activeWomen = womensKey();
    WOMENS_LINKS.forEach(([text, href]) => {
      const link = document.createElement('a');
      link.href = href;
      link.textContent = text;
      if (href === activeWomen) {
        link.classList.add('active-tab');
        link.setAttribute('aria-current', 'page');
      }
      womensTabs.appendChild(link);
    });

    addStyles();
    const setOffset = () => document.documentElement.style.setProperty('--ft-tabs-top', `${Math.ceil(header.getBoundingClientRect().height)}px`);
    setOffset();
    window.addEventListener('resize', setOffset, { passive: true });
    addTools(womensTabs, mainKey);
    if (activeWomen) addWomensTools(womensTabs, activeWomen);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build, { once: true });
  else build();
})();
