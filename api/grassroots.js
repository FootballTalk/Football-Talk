const clubs = [
  {
    name: 'Wellingborough Old Grammarians',
    competition: 'Northants Combination League',
    url: 'https://fulltime.thefa.com/displayTeam.html?divisionseason=140849173&teamID=906916334',
    source: 'FA Full-Time',
    fixtures: [],
    results: [],
    ok: true,
    note: 'No current-season upcoming fixtures are published on the verified source.',
    resultsNote: 'No current-season verified results are available from the published source yet.'
  },
  {
    name: 'Wellingborough Whitworth Reserves',
    competition: 'United Counties League',
    url: 'https://fulltime.thefa.com/displayTeam.html?divisionseason=679659509&teamID=724541063',
    source: 'FA Full-Time',
    ok: true,
    verifiedAt: '2026-10-02',
    fixtures: [
      { dateTime: '03/10/26 15:00', home: 'Rugby Borough Reserves', away: 'Wellingborough Whitworth Reserves', venue: 'Kilsby Lane' },
      { dateTime: '10/10/26 15:00', home: 'Godmanchester Rovers Reserves', away: 'Wellingborough Whitworth Reserves', venue: 'Godmanchester Rovers FC' },
      { dateTime: '13/10/26 19:45', home: 'Wellingborough Whitworth Reserves', away: 'Irchester United Reserves', venue: 'Victoria Mill Ground' },
      { dateTime: '17/10/26 15:00', home: 'Wellingborough Whitworth Reserves', away: 'Kempston Rovers Reserves', venue: 'Victoria Mill Ground' },
      { dateTime: '24/10/26 14:00', home: 'Huntingdon Town Reserves', away: 'Wellingborough Whitworth Reserves', venue: 'Long Buckby AFC' },
      { dateTime: '27/10/26 19:45', home: 'Wellingborough Town Development', away: 'Wellingborough Whitworth Reserves', venue: 'Dog and Duck Ground' },
      { dateTime: '31/10/26 15:00', home: 'Wellingborough Whitworth Reserves', away: 'Bugbrooke St.Michael Reserves', venue: 'Victoria Mill Ground' }
    ],
    results: [
      { dateTime: '25/04/26 15:00', home: 'Bugbrooke St.Michaels Reserves', away: 'Wellingborough Whitworth Reserves', homeGoals: 8, awayGoals: 3, note: 'HT 6-1' },
      { dateTime: '21/04/26 19:45', home: 'Godmanchester Rovers Reserves', away: 'Wellingborough Whitworth Reserves', homeGoals: 3, awayGoals: 0, note: 'HT 1-0' },
      { dateTime: '18/04/26 15:00', home: 'Wellingborough Whitworth Reserves', away: 'Buckingham Development', homeGoals: 1, awayGoals: 1, note: 'HT 0-1' },
      { dateTime: '11/04/26 15:00', home: 'Wellingborough Whitworth Reserves', away: 'Rothwell Corinthians Reserves', homeGoals: 3, awayGoals: 1, note: 'HT 3-0' },
      { dateTime: '08/04/26 19:45', home: 'St Ives Town FC Reserves', away: 'Wellingborough Whitworth Reserves', homeGoals: 2, awayGoals: 3, note: 'HT 1-1' }
    ]
  }
];

function fixtureDate(value) {
  const m = String(value).match(/^(\d{2})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})$/);
  if (!m) return 0;
  return Date.UTC(2000 + Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4]), Number(m[5]));
}

export default function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
  const now = Date.now() - 6 * 60 * 60 * 1000;
  res.status(200).json({
    updatedAt: new Date().toISOString(),
    clubs: clubs.map(club => ({
      ...club,
      fixtures: (club.fixtures || []).filter(f => fixtureDate(f.dateTime) >= now),
      results: [...(club.results || [])].sort((a,b) => fixtureDate(b.dateTime) - fixtureDate(a.dateTime))
    }))
  });
}
