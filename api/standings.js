const API_BASE = 'https://v3.football.api-sports.io';
const LEAGUES = [
  { id: 39, name: 'Premier League' },
  { id: 40, name: 'EFL Championship' },
];

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

async function fetchStandings(league, apiKey, season) {
  const url = new URL(`${API_BASE}/standings`);
  url.searchParams.set('league', String(league.id));
  url.searchParams.set('season', String(season));

  const response = await fetch(url, {
    headers: {
      'x-apisports-key': apiKey,
      accept: 'application/json',
    },
  });

  const data = await response.json();
  const errors = apiErrors(data);
  if (!response.ok || errors.length) {
    const detail = errors.length ? errors.join('; ') : `HTTP ${response.status}`;
    throw new Error(`${league.name}: ${detail}`);
  }

  const table = data.response?.[0]?.league?.standings?.[0] || [];
  return {
    id: league.id,
    name: league.name,
    standings: table.map((row) => ({
      rank: row.rank,
      team: row.team?.name,
      logo: row.team?.logo,
      played: row.all?.played,
      win: row.all?.win,
      draw: row.all?.draw,
      lose: row.all?.lose,
      goalsFor: row.all?.goals?.for,
      goalsAgainst: row.all?.goals?.against,
      goalsDiff: row.goalsDiff,
      points: row.points,
      form: row.form,
      description: row.description,
    })),
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API_FOOTBALL_KEY is not configured' });

  const season = seasonFor(new Date());
  try {
    const leagues = await Promise.all(LEAGUES.map((league) => fetchStandings(league, apiKey.trim(), season)));
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ season, updatedAt: new Date().toISOString(), leagues });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ error: 'Unable to load standings right now', detail, season });
  }
}
