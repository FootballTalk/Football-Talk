const API_BASE = 'https://v3.football.api-sports.io';
const COMPETITIONS = [
  { id: 2, name: 'UEFA Champions League' },
  { id: 3, name: 'UEFA Europa League' },
];

function londonDateString(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function seasonFor(date) {
  const year = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric' }).format(date));
  const month = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', month: 'numeric' }).format(date));
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
    round: item.league?.round || '',
    home: item.teams?.home?.name,
    away: item.teams?.away?.name,
    homeLogo: item.teams?.home?.logo,
    awayLogo: item.teams?.away?.logo,
    homeGoals: item.goals?.home,
    awayGoals: item.goals?.away,
  };
}

async function readApi(url, apiKey, label) {
  const response = await fetch(url, { headers: { 'x-apisports-key': apiKey, accept: 'application/json' } });
  const data = await response.json().catch(() => null);
  const errors = apiErrors(data);
  if (!response.ok || errors.length) {
    const detail = errors.length ? errors.join('; ') : `HTTP ${response.status}`;
    throw new Error(`${label}: ${detail}`);
  }
  return data?.response || [];
}

async function fetchCompetition(comp, apiKey, from, to, season) {
  const url = new URL(`${API_BASE}/fixtures`);
  url.searchParams.set('league', String(comp.id));
  url.searchParams.set('season', String(season));
  url.searchParams.set('from', from);
  url.searchParams.set('to', to);
  url.searchParams.set('timezone', 'Europe/London');
  const response = await readApi(url, apiKey, comp.name);
  return { ...comp, fixtures: response.map(mapFixture) };
}

async function fetchLive(apiKey) {
  const url = new URL(`${API_BASE}/fixtures`);
  url.searchParams.set('live', 'all');
  url.searchParams.set('timezone', 'Europe/London');
  const response = await readApi(url, apiKey, 'European live scores');
  return COMPETITIONS.map(comp => ({
    ...comp,
    fixtures: response.filter(item => Number(item.league?.id) === comp.id).map(mapFixture)
  }));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API_FOOTBALL_KEY is not configured' });

  const now = new Date();
  const season = seasonFor(now);
  const liveOnly = String(req.query?.live || '') === '1';
  const historyOnly = String(req.query?.results || '') === '1';
  const start = historyOnly ? new Date(now.getTime() - 30 * 86400000) : now;
  const end = historyOnly ? now : new Date(now.getTime() + 30 * 86400000);
  const from = londonDateString(start);
  const to = londonDateString(end);

  try {
    let competitions;
    if (liveOnly) {
      competitions = await fetchLive(apiKey.trim());
    } else {
      competitions = await Promise.all(COMPETITIONS.map(comp => fetchCompetition(comp, apiKey.trim(), from, to, season)));
      if (historyOnly) {
        const finished = new Set(['FT','AET','PEN']);
        competitions = competitions.map(comp => ({
          ...comp,
          fixtures: comp.fixtures.filter(f => finished.has(f.status)).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0))
        }));
      }
    }
    res.setHeader('Cache-Control', liveOnly ? 'public, s-maxage=30, stale-while-revalidate=30' : 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ from, to, season, live: liveOnly, results: historyOnly, competitions });
  } catch (error) {
    console.error('European football API error:', error);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ error: 'Unable to load European fixtures right now', detail: String(error?.message || error) });
  }
}
