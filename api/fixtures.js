const API_BASE = 'https://v3.football.api-sports.io';
const LEAGUES = [
  { id: 39, name: 'Premier League' },
  { id: 40, name: 'EFL Championship' },
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

  try {
    const results = await Promise.all(LEAGUES.map(async (league) => {
      const url = new URL(`${API_BASE}/fixtures`);
      url.searchParams.set('league', String(league.id));
      url.searchParams.set('season', String(season));
      url.searchParams.set('from', from);
      url.searchParams.set('to', to);
      url.searchParams.set('timezone', 'Europe/London');

      const response = await fetch(url, {
        headers: { 'x-apisports-key': apiKey },
      });

      const data = await response.json();
      if (!response.ok || data.errors?.length || (data.errors && Object.keys(data.errors).length)) {
        throw new Error(`API-Football request failed for ${league.name}`);
      }

      const fixtures = (data.response || []).map((item) => ({
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
      }));

      return { ...league, fixtures };
    }));

    // Fixtures change much less often than live scores. Six-hour edge caching
    // keeps the free API plan practical while still updating the page automatically.
    res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=43200');
    return res.status(200).json({ from, to, season, leagues: results });
  } catch (error) {
    console.error(error);
    return res.status(502).json({ error: 'Unable to load fixtures right now' });
  }
}
