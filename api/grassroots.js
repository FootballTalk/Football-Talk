const clubs = [
  {
    name: 'Wellingborough Old Grammarians',
    competition: 'Northants Combination League',
    url: 'https://fulltime.thefa.com/displayTeam.html?divisionseason=140849173&teamID=906916334',
    source: 'FA Full-Time',
    fixtures: [],
    ok: true,
    note: 'FA Full-Time currently publishes no upcoming fixtures for this team.'
  },
  {
    name: 'Wellingborough Whitworth Reserves',
    competition: 'United Counties League',
    url: 'https://fulltime.thefa.com/displayTeam.html?id=724541063',
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
      fixtures: (club.fixtures || []).filter(f => fixtureDate(f.dateTime) >= now)
    }))
  });
}
