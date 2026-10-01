import { FOTMOB_LEAGUES, fotmobJson, getFotmobLeagueMatches, getFotmobStandings, withinRange } from '../lib/fotmob.js';

const COMPETITIONS = [FOTMOB_LEAGUES.wsl, FOTMOB_LEAGUES.wsl2];
const FINISHED = new Set(['FT', 'AET', 'PEN']);

function playerPhoto(id) {
  return id ? `https://images.fotmob.com/image_resources/logo/playerphotos/${id}.png` : '';
}

async function leagueStats(league) {
  const data = await fotmobJson('leagues', { id: league.id, ccode3: 'GBR' });
  const wanted = new Set(['goals', 'goal_assist', '_goals_and_goal_assist', 'rating', 'expected_goals', 'big_chance_created', 'clean_sheet']);
  const groups = (data?.stats?.players || []).filter(group => wanted.has(group?.name)).slice(0, 7);
  return groups.map(group => ({
    key: group.name,
    title: group.header || group.name,
    players: (group.topThree || [group.participant]).filter(Boolean).map(player => ({
      id: player.id,
      name: player.name || '',
      team: player.teamName || '',
      value: player.value ?? player.stat?.value ?? null,
      rank: player.rank ?? null,
      photo: playerPhoto(player.id)
    }))
  }));
}

async function allFixtures() {
  const now = Date.now();
  const from = now - 21 * 24 * 60 * 60 * 1000;
  const to = now + 35 * 24 * 60 * 60 * 1000;
  return Promise.all(COMPETITIONS.map(async league => ({
    id: league.siteId,
    name: league.name,
    fixtures: withinRange(await getFotmobLeagueMatches(league), from, to)
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
  })));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const view = String(req.query?.view || 'summary').toLowerCase();
  try {
    if (view === 'standings') {
      const leagues = await Promise.all(COMPETITIONS.map(getFotmobStandings));
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
      return res.status(200).json({ updatedAt: new Date().toISOString(), leagues });
    }
    if (view === 'stats') {
      const groups = await leagueStats(FOTMOB_LEAGUES.wsl);
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
      return res.status(200).json({ updatedAt: new Date().toISOString(), league: 'Barclays WSL', groups });
    }
    if (view === 'fixtures') {
      const leagues = await allFixtures();
      res.setHeader('Cache-Control', 'public, s-maxage=180, stale-while-revalidate=600');
      return res.status(200).json({ updatedAt: new Date().toISOString(), leagues });
    }
    const [leagues, tables, leaders] = await Promise.all([
      allFixtures(),
      Promise.all(COMPETITIONS.map(getFotmobStandings)),
      leagueStats(FOTMOB_LEAGUES.wsl)
    ]);
    const now = Date.now();
    const fixtures = leagues.flatMap(league => league.fixtures.map(fixture => ({ ...fixture, leagueName: league.name })));
    const next = fixtures
      .filter(fixture => !FINISHED.has(fixture.status) && Number(fixture.timestamp || 0) * 1000 >= now - 2 * 60 * 60 * 1000)
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
      .slice(0, 8);
    const recent = fixtures
      .filter(fixture => FINISHED.has(fixture.status))
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, 8);
    res.setHeader('Cache-Control', 'public, s-maxage=180, stale-while-revalidate=600');
    return res.status(200).json({ updatedAt: new Date().toISOString(), next, recent, tables, leaders: leaders.slice(0, 3) });
  } catch (error) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ error: 'Women\'s football data is temporarily unavailable', detail: String(error.message || error) });
  }
}
