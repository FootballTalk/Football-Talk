const API_BASE = 'https://v3.football.api-sports.io';
const CUPS = [
  { id: 48, name: 'Carabao Cup' },
  { id: 45, name: 'FA Cup' },
];

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
    status: item.fixture?.status?.short || 'NS',
    elapsed: item.fixture?.status?.elapsed ?? null,
    round: item.league?.round || '',
    home: item.teams?.home?.name || '',
    away: item.teams?.away?.name || '',
    homeLogo: item.teams?.home?.logo || '',
    awayLogo: item.teams?.away?.logo || '',
    homeGoals: item.goals?.home ?? null,
    awayGoals: item.goals?.away ?? null,
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
    throw new Error(`${label}: API-Football returned HTTP ${response.status}${text ? ` - ${text.slice(0, 160)}` : ''}`);
  }

  const errors = apiErrors(data);
  if (!response.ok || errors.length) {
    const detail = errors.length ? errors.join('; ') : `HTTP ${response.status}`;
    throw new Error(`${label}: ${detail}`);
  }
  return data.response || [];
}

async function fetchCup(cup, apiKey, season, from, to) {
  const url = new URL(`${API_BASE}/fixtures`);
  url.searchParams.set('league', String(cup.id));
  url.searchParams.set('season', String(season));
  url.searchParams.set('from', from);
  url.searchParams.set('to', to);
  url.searchParams.set('timezone', 'Europe/London');
  const rows = await readApi(url, apiKey, cup.name);
  return {
    id: cup.id,
    name: cup.name,
    fixtures: rows
      .map(mapFixture)
      .filter(f => f.date && f.home && f.away)
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)),
  };
}

async function fetchLive(apiKey) {
  const url = new URL(`${API_BASE}/fixtures`);
  url.searchParams.set('live', 'all');
  url.searchParams.set('timezone', 'Europe/London');
  const rows = await readApi(url, apiKey, 'Live cup scores');
  return CUPS.map(cup => ({
    ...cup,
    fixtures: rows
      .filter(item => Number(item.league?.id) === cup.id)
      .map(mapFixture),
  }));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(500).json({ error: 'API_FOOTBALL_KEY is not configured' });
  }

  const now = new Date();
  const fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const toDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const from = londonDateString(fromDate);
  const to = londonDateString(toDate);
  const season = seasonFor(now);
  const liveOnly = String(req.query?.live || '') === '1';

  try {
    const cups = liveOnly
      ? await fetchLive(apiKey.trim())
      : await Promise.all(CUPS.map(cup => fetchCup(cup, apiKey.trim(), season, from, to)));

    res.setHeader(
      'Cache-Control',
      liveOnly
        ? 'public, s-maxage=30, stale-while-revalidate=30'
        : 'public, s-maxage=900, stale-while-revalidate=1800'
    );
    return res.status(200).json({ from, to, season, live: liveOnly, provider: 'API-Football', cups });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Cup fixtures feed error:', message);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({
      error: 'Unable to load cup fixtures right now',
      detail: message,
      season,
      from,
      to,
    });
  }
}
