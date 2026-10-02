const SOURCES = {
  grammarians: {
    name: 'Wellingborough Old Grammarians',
    competition: 'Northants Combination League',
    url: 'https://fulltime.thefa.com/displayTeam.html?id=906916334',
    source: 'FA Full-Time'
  },
  whitworths: {
    name: 'Wellingborough Whitworths Reserves',
    competition: 'United Counties League',
    url: 'https://theucl.co.uk/fixtures/',
    source: 'United Counties Football League'
  }
};

const clean = (s = '') => s
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;/g, "'")
  .replace(/&quot;/gi, '"')
  .replace(/\s+/g, ' ')
  .trim();

const rows = html => [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
  .map(m => [...m[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c => clean(c[1])).filter(Boolean))
  .filter(r => r.length >= 3);

function fullTimeFixtures(html, teamName) {
  const section = html.match(/Upcoming Fixtures[\s\S]*?(?:Team Season|Player Season Totals|Team Season Totals|$)/i)?.[0] || html;
  return rows(section).map(r => {
    const dateIndex = r.findIndex(v => /\b\d{1,2}\/\d{1,2}\/\d{2}\b/.test(v));
    if (dateIndex < 0) return null;
    const dateTime = r[dateIndex];
    const after = r.slice(dateIndex + 1).filter(v => !/^(VS|v)$/i.test(v));
    if (after.length < 2) return null;
    const home = after[0];
    const away = after.find((v, i) => i > 0 && v !== home && !/^venue$/i.test(v)) || after[1];
    const venue = after[after.length - 1] !== away ? after[after.length - 1] : '';
    if (!new RegExp(teamName.split(' ').slice(-2).join('|'), 'i').test(home + ' ' + away)) return null;
    return { dateTime, home, away, venue };
  }).filter(Boolean);
}

function uclFixtures(html) {
  const wanted = /Whitworth/i;
  return rows(html).map(r => {
    const joined = r.join(' | ');
    if (!wanted.test(joined)) return null;
    const dateIndex = r.findIndex(v => /\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b|\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/i.test(v));
    const dateTime = dateIndex >= 0 ? r[dateIndex] : r[0];
    const candidates = r.filter((v, i) => i !== dateIndex && !/^(VS|v|-)$|fixture|division|competition/i.test(v));
    const teamCells = candidates.filter(v => /[A-Za-z]/.test(v));
    if (teamCells.length < 2) return null;
    return { dateTime, home: teamCells[0], away: teamCells[1], venue: teamCells[2] || '' };
  }).filter(Boolean);
}

async function get(source, parser) {
  try {
    const response = await fetch(source.url, {
      headers: { 'user-agent': 'Mozilla/5.0 FootballTalk/1.0' },
      redirect: 'follow'
    });
    if (!response.ok) throw new Error(String(response.status));
    const html = await response.text();
    return { ...source, fixtures: parser(html), ok: true };
  } catch (error) {
    return { ...source, fixtures: [], ok: false };
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=21600');
  const [grammarians, whitworths] = await Promise.all([
    get(SOURCES.grammarians, html => fullTimeFixtures(html, SOURCES.grammarians.name)),
    get(SOURCES.whitworths, uclFixtures)
  ]);
  res.status(200).json({ updatedAt: new Date().toISOString(), clubs: [grammarians, whitworths] });
}
