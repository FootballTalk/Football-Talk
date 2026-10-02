const SOURCES = {
  grammarians: {
    name: 'Wellingborough Old Grammarians',
    competition: 'Northants Combination League',
    url: 'https://fulltime.thefa.com/displayTeam.html?divisionseason=140849173&teamID=906916334',
    source: 'FA Full-Time'
  },
  whitworths: {
    name: 'Wellingborough Whitworth Reserves',
    competition: 'United Counties League',
    url: 'https://fulltime.thefa.com/displayTeam.html?id=724541063',
    source: 'FA Full-Time'
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

function fullTimeFixtures(html, teamMatcher) {
  const section = html.match(/Upcoming Fixtures[\s\S]*?(?:Team Season|Player Season Totals|Team Season Totals|Players|$)/i)?.[0] || html;
  const fixtures = rows(section).map(r => {
    const dateIndex = r.findIndex(v => /\b\d{1,2}\/\d{1,2}\/\d{2}\b/.test(v));
    if (dateIndex < 0) return null;

    const dateTime = r[dateIndex];
    const after = r.slice(dateIndex + 1).filter(v => !/^(VS|v)$/i.test(v));
    if (after.length < 2) return null;

    const home = after[0];
    const away = after[1];
    const venue = after[2] || '';
    if (!teamMatcher.test(home + ' ' + away)) return null;

    return { dateTime, home, away, venue };
  }).filter(Boolean);

  return fixtures.filter((f, i, all) =>
    i === all.findIndex(x => x.dateTime === f.dateTime && x.home === f.home && x.away === f.away)
  );
}

async function get(source, teamMatcher) {
  try {
    const response = await fetch(source.url, {
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; FootballTalk/1.0; +https://www.footballtalk.uk/)'
      },
      redirect: 'follow'
    });
    if (!response.ok) throw new Error(String(response.status));
    const html = await response.text();
    return { ...source, fixtures: fullTimeFixtures(html, teamMatcher), ok: true };
  } catch (error) {
    return { ...source, fixtures: [], ok: false };
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
  const [grammarians, whitworths] = await Promise.all([
    get(SOURCES.grammarians, /Old Grammarians/i),
    get(SOURCES.whitworths, /Whitworth/i)
  ]);

  res.status(200).json({
    updatedAt: new Date().toISOString(),
    clubs: [grammarians, whitworths]
  });
}
