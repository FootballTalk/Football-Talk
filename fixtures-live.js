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

  function displayStatus(fixture) {
    const scoreReady = fixture.homeGoals != null && fixture.awayGoals != null;
    const score = scoreReady ? `${fixture.homeGoals}-${fixture.awayGoals}` : '0-0';
    const status = fixture.status || 'NS';

    if (LIVE_STATUSES.has(status)) {
      const minute = fixture.elapsed ? `${fixture.elapsed}'` : 'LIVE';
      return { text: `${score} ${minute}`, live: true, finished: false };
    }
    if (status === 'HT') return { text: `${score} HT`, live: true, finished: false };
    if (FINISHED_STATUSES.has(status)) return { text: `${score} FT`, live: false, finished: true };
    if (status === 'PST') return { text: 'POSTPONED', live: false, finished: false };
    if (status === 'CANC') return { text: 'CANCELLED', live: false, finished: false };
    if (status === 'SUSP') return { text: `${score} SUSP`, live: false, finished: false };
    if (status === 'ABD') return { text: `${score} ABD`, live: false, finished: false };
    return null;
  }

  function addLiveStyles() {
    if (document.getElementById('ft-live-score-styles')) return;
    const style = document.createElement('style');
    style.id = 'ft-live-score-styles';
    style.textContent = `
      .time.is-live{background:#d80000!important;color:#fff!important;box-shadow:0 0 0 2px rgba(216,0,0,.14);animation:ftLivePulse 1.8s ease-in-out infinite}
      .time.is-finished{background:#111!important;color:#fff!important}
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
      box.textContent = display.text;
      box.classList.toggle('is-live', display.live);
      box.classList.toggle('is-finished', display.finished);
      row.classList.toggle('fixture-live', display.live);
    });
  }

  async function fetchScores(liveOnly) {
    try {
      const liveQuery = liveOnly ? '?live=1' : '';
      const joiner = liveQuery ? '&' : '?';
      const response = await fetch(`/api/fixtures${liveQuery}${joiner}t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) return;
      applyData(await response.json());
    } catch (error) {
      console.warn('Football Talk score refresh failed:', error);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    addLiveStyles();
    fetchScores(false);
    fetchScores(true);
    window.setInterval(() => fetchScores(true), REFRESH_MS);
    window.setInterval(() => fetchScores(false), 15 * 60 * 1000);
  });
})();
