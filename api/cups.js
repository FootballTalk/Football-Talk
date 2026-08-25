const CUPS = [
  { id: 133, name: 'Carabao Cup' },
  { id: 132, name: 'FA Cup' },
];

function seasonLabel(now) {
  const year = Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric'}).format(now));
  const month = Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',month:'numeric'}).format(now));
  const startYear = month >= 7 ? year : year - 1;
  return { season: startYear, label: `${startYear}/${startYear + 1}` };
}

function num(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function scoreFromString(value) {
  const m = String(value || '').match(/(\d+)\s*[-–]\s*(\d+)/);
  return m ? [Number(m[1]), Number(m[2])] : [null, null];
}

function statusOf(match) {
  const s = match?.status || {};
  const reason = String(s.reason?.short || s.reason?.long || s.reason || '').toUpperCase();
  if (s.cancelled === true || reason.includes('CANCEL')) return 'CANC';
  if (reason.includes('POSTPON')) return 'PST';
  if (s.finished === true) {
    if (reason.includes('PEN')) return 'PEN';
    if (reason.includes('EXTRA') || reason.includes('AET')) return 'AET';
    return 'FT';
  }
  if (s.started === true) {
    if (reason === 'HT' || reason.includes('HALF')) return 'HT';
    return 'LIVE';
  }
  return 'NS';
}

function mapMatch(match) {
  const s = match?.status || {};
  const date = s.utcTime || match?.utcTime || match?.date || match?.time || null;
  const scoreStr = s.scoreStr || match?.scoreStr || '';
  const [scoreHome, scoreAway] = scoreFromString(scoreStr);
  const homeGoals = num(match?.home?.score ?? match?.home?.goals ?? scoreHome);
  const awayGoals = num(match?.away?.score ?? match?.away?.goals ?? scoreAway);
  const minuteText = String(s.liveTime?.short || s.liveTime?.long || s.liveTime || s.reason?.short || '');
  const minute = minuteText.match(/(\d+)/);
  return {
    id: match?.id || match?.matchId || match?.pageUrl || `${date}-${match?.home?.name}-${match?.away?.name}`,
    date,
    timestamp: date ? Math.floor(new Date(date).getTime()/1000) : 0,
    status: statusOf(match),
    elapsed: minute ? Number(minute[1]) : null,
    round: match?.roundName || match?.round || match?.stage || '',
    home: match?.home?.name || match?.home?.longName || '',
    away: match?.away?.name || match?.away?.longName || '',
    homeLogo: match?.home?.id ? `https://images.fotmob.com/image_resources/logo/teamlogo/${match.home.id}.png` : '',
    awayLogo: match?.away?.id ? `https://images.fotmob.com/image_resources/logo/teamlogo/${match.away.id}.png` : '',
    homeGoals,
    awayGoals,
  };
}

function extractMatches(data) {
  const candidates = [
    data?.fixtures?.allMatches,
    data?.matches?.allMatches,
    data?.fixtures?.matches,
    data?.matches?.matches,
    data?.allMatches,
  ];
  return candidates.find(Array.isArray) || [];
}

async function fetchCup(cup, season) {
  const url = new URL('https://www.fotmob.com/api/leagues');
  url.searchParams.set('id', String(cup.id));
  url.searchParams.set('season', season);
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      'user-agent': 'Mozilla/5.0 FootballTalk/1.0',
      referer: `https://www.fotmob.com/leagues/${cup.id}/overview`,
    },
  });
  if (!response.ok) throw new Error(`${cup.name}: FotMob returned HTTP ${response.status}`);
  const data = await response.json();
  const fixtures = extractMatches(data).map(mapMatch).filter(f => f.date && f.home && f.away);
  return { id: cup.id, name: cup.name, fixtures };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const now = new Date();
  const { season, label } = seasonLabel(now);
  const liveOnly = String(req.query?.live || '') === '1';
  try {
    const cups = await Promise.all(CUPS.map(cup => fetchCup(cup, label)));
    const filtered = liveOnly
      ? cups.map(cup => ({ ...cup, fixtures: cup.fixtures.filter(f => ['LIVE','HT'].includes(f.status)) }))
      : cups;
    res.setHeader('Cache-Control', liveOnly ? 'public, s-maxage=30, stale-while-revalidate=30' : 'public, s-maxage=900, stale-while-revalidate=1800');
    return res.status(200).json({ season, live: liveOnly, provider: 'FotMob', cups: filtered });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Cup fixtures feed error:', message);
    res.setHeader('Cache-Control','no-store');
    return res.status(502).json({ error: 'Unable to load cup fixtures right now', detail: message });
  }
}
