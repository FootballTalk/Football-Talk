(() => {
  const root = document.getElementById('womens-content');
  if (!root) return;
  const view = root.dataset.view || 'home';
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const safeUrl = value => {
    try {
      const url = new URL(value, location.origin);
      return url.protocol === 'https:' || url.origin === location.origin ? url.href : '#';
    } catch {
      return '#';
    }
  };
  const when = value => new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
  const score = fixture => ['FT', 'AET', 'PEN'].includes(fixture.status)
    ? `${fixture.homeGoals ?? 0}–${fixture.awayGoals ?? 0}`
    : fixture.status === 'NS'
      ? when(fixture.date)
      : fixture.elapsed
        ? `${fixture.elapsed}'`
        : (fixture.status || 'LIVE');
  const match = fixture => `<article class="wf-match"><div class="wf-match-meta">${escapeHtml(fixture.leagueName || fixture.competition || 'Women\'s Football')}<br>${escapeHtml(when(fixture.date))}</div><div class="wf-teams"><span class="wf-team"><img src="${safeUrl(fixture.homeLogo)}" alt="">${escapeHtml(fixture.home)}</span><span class="wf-team"><img src="${safeUrl(fixture.awayLogo)}" alt="">${escapeHtml(fixture.away)}</span></div><div class="wf-score${fixture.status !== 'NS' && !['FT', 'AET', 'PEN'].includes(fixture.status) ? ' live' : ''}">${escapeHtml(score(fixture))}</div></article>`;
  const table = (league, index = 0) => `<section class="wf-table-panel" data-table="${index}"${index ? ' hidden' : ''}><div class="wf-table-wrap"><table class="wf-table"><thead><tr><th>Pos</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead><tbody>${(league.standings || []).map(row => `<tr><td>${escapeHtml(row.rank)}</td><td>${row.logo ? `<img src="${safeUrl(row.logo)}" alt="">` : ''}${escapeHtml(row.team)}</td><td>${escapeHtml(row.played)}</td><td>${escapeHtml(row.win)}</td><td>${escapeHtml(row.draw)}</td><td>${escapeHtml(row.lose)}</td><td>${Number(row.goalsDiff) > 0 ? '+' : ''}${escapeHtml(row.goalsDiff)}</td><td><strong>${escapeHtml(row.points)}</strong></td></tr>`).join('')}</tbody></table></div></section>`;
  const tableBlock = leagues => `<div class="wf-tabs" role="tablist">${leagues.map((league, index) => `<button class="wf-tab${index === 0 ? ' active' : ''}" data-table-tab="${index}" role="tab" aria-selected="${index === 0}">${escapeHtml(league.name)}</button>`).join('')}</div><div class="wf-panel">${leagues.map(table).join('')}</div>`;
  const stats = groups => `<div class="wf-stat-grid">${groups.map(group => `<section class="wf-stat"><h3>${escapeHtml(group.title)}</h3>${(group.players || []).map((player, index) => `<div class="wf-player"><span class="wf-rank">${index + 1}</span><span><strong>${escapeHtml(player.name)}</strong><small>${escapeHtml(player.team)}</small></span><span class="wf-value">${escapeHtml(player.value)}</span></div>`).join('')}</section>`).join('')}</div>`;
  const newsCards = items => `<div class="wf-news-list">${items.map(item => `<article class="wf-news">${item.image ? `<img src="${safeUrl(item.image)}" alt="">` : ''}<div class="wf-news-body"><small>${escapeHtml(item.source)} · ${escapeHtml(item.type)}</small><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(String(item.description || '').slice(0, 260))}</p><a href="${safeUrl(item.link)}" target="_blank" rel="noopener noreferrer">Read the sourced report</a></div></article>`).join('')}</div>`;

  function bindTabs() {
    document.querySelectorAll('[data-table-tab]').forEach(button => button.addEventListener('click', () => {
      const index = button.dataset.tableTab;
      document.querySelectorAll('[data-table-tab]').forEach(tab => {
        const selected = tab === button;
        tab.classList.toggle('active', selected);
        tab.setAttribute('aria-selected', String(selected));
      });
      document.querySelectorAll('[data-table]').forEach(panel => { panel.hidden = panel.dataset.table !== index; });
    }));
  }

  async function json(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Request failed');
    return response.json();
  }

  async function load() {
    try {
      if (view === 'home') {
        const [data, news] = await Promise.all([json('/api/womens?view=summary'), json('/api/news?game=women')]);
        root.innerHTML = `<section class="wf-grid"><a class="wf-card" href="womens-matches.html"><small>LIVE & UPCOMING</small><strong>Women’s Matches</strong><p>WSL and WSL2 fixtures, scores and recent results.</p></a><a class="wf-card" href="womens-tables.html"><small>STANDINGS</small><strong>Women’s Tables</strong><p>Current positions across the top two English divisions.</p></a><a class="wf-card" href="womens-stats.html"><small>NUMBERS</small><strong>Women’s Stats</strong><p>Leading scorers, assists, ratings and performance data.</p></a><a class="wf-card" href="womens-transfers.html"><small>PLAYER MOVEMENT</small><strong>Women’s Transfers</strong><p>Reported moves and confirmed deals from attributed sources.</p></a><a class="wf-card" href="womens-news.html"><small>LATEST</small><strong>Women’s News</strong><p>WSL, WSL2, Lionesses and European competition coverage.</p></a><a class="wf-card" href="fan-debate.html"><small>WHERE FANS HAVE THEIR SAY</small><strong>Fan Debate</strong><p>Talking points, opinions and the stories supporters are discussing.</p></a></section><section class="wf-section"><div class="wf-section-head"><h2>Next matches</h2><a href="womens-matches.html">All matches</a></div><div class="wf-match-list">${(data.next || []).map(match).join('') || '<div class="wf-empty">The next WSL and WSL2 fixtures will appear here.</div>'}</div></section><section class="wf-section"><div class="wf-section-head"><h2>Latest women’s football</h2><a href="womens-news.html">All news</a></div>${newsCards((news.items || []).slice(0, 4))}</section>`;
      } else if (view === 'matches') {
        const data = await json('/api/womens?view=fixtures');
        root.innerHTML = (data.leagues || []).map(league => `<section class="wf-section"><div class="wf-section-head"><h2>${escapeHtml(league.name)}</h2></div><div class="wf-match-list">${(league.fixtures || []).map(fixture => match({ ...fixture, leagueName: league.name })).join('') || '<div class="wf-empty">No fixtures are listed in the current window.</div>'}</div></section>`).join('');
      } else if (view === 'tables') {
        const data = await json('/api/womens?view=standings');
        root.innerHTML = tableBlock(data.leagues || []);
        bindTabs();
      } else if (view === 'stats') {
        const data = await json('/api/womens?view=stats');
        root.innerHTML = stats(data.groups || []);
      } else {
        const data = await json('/api/news?game=women');
        let items = data.items || [];
        if (view === 'transfers') items = items.filter(item => item.type === 'TRANSFER');
        root.innerHTML = items.length
          ? newsCards(items.slice(0, 30))
          : `<div class="wf-empty">No new women’s ${view === 'transfers' ? 'transfer reports' : 'football stories'} are available right now. This page will update automatically when trusted sources publish them.</div>`;
      }
      root.insertAdjacentHTML('beforeend', '<p class="wf-source-note">Live competition data is refreshed automatically. News links open the original attributed publisher. Football Talk distinguishes confirmed developments from reports and opinion.</p>');
    } catch {
      root.innerHTML = '<div class="wf-empty">This women’s football section is temporarily unavailable. Please try again shortly.</div>';
    }
  }

  load();
})();
