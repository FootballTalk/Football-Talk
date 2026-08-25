const CUPS = [
  { id: 'eng.league_cup', name: 'Carabao Cup' },
  { id: 'eng.fa', name: 'FA Cup' },
];

function seasonBounds(now) {
  const year = Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric'}).format(now));
  const month = Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',month:'numeric'}).format(now));
  const startYear = month >= 7 ? year : year - 1;
  return { season: startYear, from: `${startYear}0801`, to: `${startYear + 1}0531` };
}

function competitor(comp, side) {
  return (comp?.competitors || []).find(c => c.homeAway === side) || {};
}

function mapStatus(type={}) {
  const state = String(type.state || '').toLowerCase();
  const name = String(type.name || '').toUpperCase();
  const detail = String(type.detail || '').toUpperCase();
  if (state === 'post') {
    if (name.includes('PEN') || detail.includes('PEN')) return 'PEN';
    if (name.includes('AET') || detail.includes('AET') || detail.includes('EXTRA TIME')) return 'AET';
    return 'FT';
  }
  if (state === 'in') {
    if (name.includes('HALFTIME') || detail === 'HT') return 'HT';
    return 'LIVE';
  }
  if (name.includes('POSTPON')) return 'PST';
  if (name.includes('CANCEL')) return 'CANC';
  return 'NS';
}

function mapEvent(event) {
  const comp = event.competitions?.[0] || {};
  const home = competitor(comp,'home');
  const away = competitor(comp,'away');
  const date = comp.date || event.date;
  const statusType = event.status?.type || comp.status?.type || {};
  const clock = event.status?.displayClock || comp.status?.displayClock || '';
  const elapsedMatch = String(clock).match(/^(\d+)/);
  return {
    id: event.id,
    date,
    timestamp: date ? Math.floor(new Date(date).getTime()/1000) : 0,
    status: mapStatus(statusType),
    elapsed: elapsedMatch ? Number(elapsedMatch[1]) : null,
    round: event.season?.type?.name || comp?.notes?.[0]?.headline || '',
    home: home.team?.displayName || home.team?.shortDisplayName || '',
    away: away.team?.displayName || away.team?.shortDisplayName || '',
    homeLogo: home.team?.logo || '',
    awayLogo: away.team?.logo || '',
    homeGoals: home.score == null || home.score === '' ? null : Number(home.score),
    awayGoals: away.score == null || away.score === '' ? null : Number(away.score),
  };
}

async function fetchCup(cup, from, to) {
  const url = new URL(`https://site.api.espn.com/apis/site/v2/sports/soccer/${cup.id}/scoreboard`);
  url.searchParams.set('dates', `${from}-${to}`);
  url.searchParams.set('limit', '1000');
  const response = await fetch(url, { headers: { accept: 'application/json', 'user-agent': 'FootballTalk/1.0' } });
  if (!response.ok) throw new Error(`${cup.name}: ESPN returned HTTP ${response.status}`);
  const data = await response.json();
  return { ...cup, fixtures: (data.events || []).map(mapEvent).filter(f => f.date) };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const now = new Date();
  const { season, from, to } = seasonBounds(now);
  const liveOnly = String(req.query?.live || '') === '1';
  try {
    const cups = await Promise.all(CUPS.map(cup => fetchCup(cup, from, to)));
    const filtered = liveOnly
      ? cups.map(cup => ({ ...cup, fixtures: cup.fixtures.filter(f => ['LIVE','HT'].includes(f.status)) }))
      : cups;
    res.setHeader('Cache-Control', liveOnly ? 'public, s-maxage=30, stale-while-revalidate=30' : 'public, s-maxage=900, stale-while-revalidate=1800');
    return res.status(200).json({ season, live: liveOnly, cups: filtered });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Cup fixtures feed error:', message);
    res.setHeader('Cache-Control','no-store');
    return res.status(502).json({ error: 'Unable to load cup fixtures right now', detail: message });
  }
}
