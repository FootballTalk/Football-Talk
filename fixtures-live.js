(() => {
  const REFRESH_MS = 60000;
  const LIVE_STATUSES = new Set(['1H','2H','ET','BT','P','LIVE']);
  const FINISHED_STATUSES = new Set(['FT','AET','PEN']);
  const aliases = {
    'brighton hove albion': 'brighton',
    'brighton': 'brighton',
    'tottenham hotspur': 'tottenham',
    'tottenham': 'tottenham',
    'wolverhampton wanderers': 'wolves',
    'wolves': 'wolves',
    'queens park rangers': 'qpr',
    'qpr': 'qpr',
    'west bromwich albion': 'west brom',
    'west brom': 'west brom',
    'manchester city': 'man city',
    'man city': 'man city',
    'manchester united': 'man utd',
    'man utd': 'man utd',
    'nottingham forest': 'nottingham forest',
    'nottm forest': 'nottingham forest'
  };

  function normalise(name = '') {
    const cleaned = String(name)
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/football club|\bfc\b|\bafc\b/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
    return aliases[cleaned] || cleaned;
  }

  function matchFixture(home, away, apiFixture) {
    return normalise(home) === normalise(apiFixture.home) && normalise(away) === normalise(apiFixture.away);
  }

  function parseFixtureDay(label = '') {
    const cleaned = String(label).replace(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+/i, '').trim();
    const now = new Date();
    const candidates = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]
      .map(year => new Date(`${cleaned} ${year} 12:00:00`))
      .filter(date => !Number.isNaN(date.getTime()));
    if (!candidates.length) return null;
    return candidates.sort((a, b) => Math.abs(a - now) - Math.abs(b - now))[0];
  }

  function sortFixtureDays() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    document.querySelectorAll('.league-panel').forEach(panel => {
      const days = [...panel.querySelectorAll(':scope > .day')];
      if (days.length < 2) return;

      const sorted = days.sort((a, b) => {
        const dateA = parseFixtureDay(a.querySelector('h3')?.textContent || '');
        const dateB = parseFixtureDay(b.querySelector('h3')?.textContent || '');
        if (!dateA || !dateB) return 0;

        const aPast = dateA < today;
        const bPast = dateB < today;
        if (aPast !== bPast) return aPast ? 1 : -1;

        return aPast ? dateB - dateA : dateA - dateB;
      });

      sorted.forEach(day => panel.appendChild(day));
    });
  }

  function displayStatus(fixture) {
    const scoreReady = fixture.homeGoals != null && fixture.awayGoals != null;
    const score = scoreReady ? `${fixture.homeGoals}-${fixture.awayGoals}` : '0-0';
    const status = fixture.status || 'NS';

    if (LIVE_STATUSES.has(status)) {
      const minute = fixture.elapsed ? `${fixture.elapsed}'` : '';
      return { score, sub: `LIVE${minute ? ` · ${minute}` : ''}`, live: true, finished: false };
    }
    if (status === 'HT') return { score, sub: 'HT', live: true, finished: false };
    if (FINISHED_STATUSES.has(status)) return { score, sub: 'FT', live: false, finished: true };
    if (status === 'PST') return { score: 'POSTPONED', sub: '', live: false, finished: false };
    if (status === 'CANC') return { score: 'CANCELLED', sub: '', live: false, finished: false };
    if (status === 'SUSP') return { score, sub: 'SUSP', live: false, finished: false };
    if (status === 'ABD') return { score, sub: 'ABD', live: false, finished: false };
    return null;
  }

  function addLiveStyles() {
    if (document.getElementById('ft-live-score-styles')) return;
    const style = document.createElement('style');
    style.id = 'ft-live-score-styles';
    style.textContent = `
      .time.is-live{background:#d80000!important;color:#fff!important;box-shadow:0 0 0 2px rgba(216,0,0,.14);animation:ftLivePulse 1.8s ease-in-out infinite;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.05;padding-top:5px;padding-bottom:5px}
      .time.is-finished{background:#111!important;color:#fff!important;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.05;padding-top:5px;padding-bottom:5px}
      .ft-score-main{font-weight:900;font-size:1.08em;white-space:nowrap}
      .ft-score-sub{display:block;margin-top:3px;font-size:.62em;font-weight:800;letter-spacing:.04em;white-space:nowrap}
      .fixture-live{background:#fff9d9}
      @keyframes ftLivePulse{0%,100%{opacity:1}50%{opacity:.78}}
    `;
    document.head.appendChild(style);
  }

  function applyData(data) {
    const apiFixtures = (data.leagues || []).flatMap((league) => league.fixtures || []);
    document.querySelectorAll('.fixture').forEach((row) => {
      const home = row.querySelector('.team.home')?.textContent?.trim();
      const away = row.querySelector('.team.away')?.textContent?.trim();
      const box = row.querySelector('.time');
      if (!home || !away || !box) return;

      const match = apiFixtures.find((fixture) => matchFixture(home, away, fixture));
      if (!match) return;
      const display = displayStatus(match);
      if (!display) return;

      if (!box.dataset.kickoff) box.dataset.kickoff = box.textContent.trim();
      box.replaceChildren();
      const scoreLine = document.createElement('span');
      scoreLine.className = 'ft-score-main';
      scoreLine.textContent = display.score;
      box.appendChild(scoreLine);
      if (display.sub) {
        const subLine = document.createElement('span');
        subLine.className = 'ft-score-sub';
        subLine.textContent = display.sub;
        box.appendChild(subLine);
      }
      box.classList.toggle('is-live', display.live);
      box.classList.toggle('is-finished', display.finished);
      row.classList.toggle('fixture-live', display.live);
    });
  }

  async function fetchScores(mode = 'fixtures') {
    try {
      const query = mode === 'live' ? '?live=1' : mode === 'results' ? '?results=1' : '';
      const joiner = query ? '&' : '?';
      const response = await fetch(`/api/fixtures${query}${joiner}t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) return;
      applyData(await response.json());
    } catch (error) {
      console.warn('Football Talk score refresh failed:', error);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    sortFixtureDays();
    addLiveStyles();
    fetchScores('fixtures');
    fetchScores('results');
    fetchScores('live');
    window.setInterval(() => fetchScores('live'), REFRESH_MS);
    window.setInterval(() => fetchScores('results'), 2 * 60 * 1000);
    window.setInterval(() => fetchScores('fixtures'), 15 * 60 * 1000);
  });
})();
