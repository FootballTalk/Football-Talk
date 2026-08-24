const API_BASE = 'https://v3.football.api-sports.io';
const LEAGUES = [
  { id: 39, name: 'Premier League' },
  { id: 40, name: 'EFL Championship' },
];

// Build refresh marker: 2026-08-24 production environment refresh.
function londonDateString(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function seasonFor(date) {
  const year = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
  }).format(date));
  const month = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    month: 'numeric',
  }).format(date));
  return month >= 7 ? year : year - 1;
}

function apiErrors(data) {
  if (!data || !data.errors) return [];
  if (Array.isArray(data.errors)) return data.errors.filter(Boolean).map(String);
  if (typeof data.errors === 'object') return Object.entries(data.errors).map(([key, value]) => `${key}: ${value}`);
  return [String(data.errors)];
}

function mapFixture(item) {
  return {
    id: item.fixture?.id,
    date: item.fixture?.date,
    timestamp: item.fixture?.timestamp,
    status: item.fixture?.status?.short,
    elapsed: item.fixture?.status?.elapsed,
    home: item.teams?.home?.name,
    away: item.teams?.away?.name,
    homeLogo: item.teams?.home?.logo,
    awayLogo: item.teams?.away?.logo,
    homeGoals: item.goals?.home,
    awayGoals: item.goals?.away,
  };
}

async function readApi(url, apiKey, label) {
  const response = await fetch(url, {
    headers: {
      'x-apisports-key': apiKey,
      accept: 'application/json',
    },
  });

  let data;
  try {
    data = await response.json();
  } catch {
    const text = await response.text().catch(() => '');
    throw new Error(`${label}: API-Football returned HTTP ${response.status}${text ? ` - ${text.slice(0, 200)}` : ''}`);
  }

  const errors = apiErrors(data);
  if (!response.ok || errors.length) {
    const detail = errors.length ? errors.join('; ') : `HTTP ${response.status}`;
    throw new Error(`${label}: ${detail}`);
  }
  return data.response || [];
}

async function fetchLeague({ id, name }, apiKey, from, to, season) {
  const url = new URL(`${API_BASE}/fixtures`);
  url.searchParams.set('league', String(id));
  url.searchParams.set('season', String(season));
  url.searchParams.set('from', from);
  url.searchParams.set('to', to);
  url.searchParams.set('timezone', 'Europe/London');
  const response = await readApi(url, apiKey, name);
  return { id, name, fixtures: response.map(mapFixture) };
}

async function fetchLive(apiKey) {
  const url = new URL(`${API_BASE}/fixtures`);
  url.searchParams.set('live', 'all');
  url.searchParams.set('timezone', 'Europe/London');
  const response = await readApi(url, apiKey, 'Live scores');

  return LEAGUES.map((league) => ({
    ...league,
    fixtures: response
      .filter((item) => Number(item.league?.id) === league.id)
      .map(mapFixture),
  }));
}

async function fetchResults(apiKey, now, season) {
  const fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const from = londonDateString(fromDate);
  const to = londonDateString(now);
  const finished = new Set(['FT', 'AET', 'PEN']);

  const leagues = await Promise.all(
    LEAGUES.map(async (league) => {
      const result = await fetchLeague(league, apiKey, from, to, season);
      return {
        ...result,
        fixtures: result.fixtures
          .filter((fixture) => finished.has(fixture.status))
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)),
      };
    })
  );

  return { from, to, leagues };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API_FOOTBALL_KEY is not configured' });
  }

  const now = new Date();
  const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const from = londonDateString(now);
  const to = londonDateString(end);
  const season = seasonFor(now);
  const liveOnly = String(req.query?.live || '') === '1';
  const resultsOnly = String(req.query?.results || '') === '1';

  try {
    if (resultsOnly) {
      const resultData = await fetchResults(apiKey.trim(), now, season);
      res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=120');
      return res.status(200).json({
        from: resultData.from,
        to: resultData.to,
        season,
        results: true,
        leagues: resultData.leagues,
      });
    }

    const results = liveOnly
      ? await fetchLive(apiKey.trim())
      : await Promise.all(LEAGUES.map((league) => fetchLeague(league, apiKey.trim(), from, to, season)));

    res.setHeader(
      'Cache-Control',
      liveOnly
        ? 'public, s-maxage=60, stale-while-revalidate=60'
        : 'public, s-maxage=900, stale-while-revalidate=1800'
    );
    return res.status(200).json({ from, to, season, live: liveOnly, leagues: results });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('API-Football fixtures error:', message);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({
      error: 'Unable to load fixtures right now',
      detail: message,
      season,
      from,
      to,
    });
  }
}
