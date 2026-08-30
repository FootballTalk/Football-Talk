const API_BASE='https://v3.football.api-sports.io';

function londonDateString(date){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const map=Object.fromEntries(parts.map(({type,value})=>[type,value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function seasonFor(date){
  const year=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric'}).format(date));
  const month=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',month:'numeric'}).format(date));
  return month>=7?year:year-1;
}

function apiErrors(data){
  if(!data||!data.errors)return[];
  if(Array.isArray(data.errors))return data.errors.filter(Boolean).map(String);
  if(typeof data.errors==='object')return Object.entries(data.errors).map(([key,value])=>`${key}: ${value}`);
  return[String(data.errors)];
}

function mapFixture(item){
  return{
    id:item.fixture?.id,
    date:item.fixture?.date,
    timestamp:item.fixture?.timestamp,
    status:item.fixture?.status?.short,
    home:item.teams?.home?.name,
    away:item.teams?.away?.name,
  };
}

const emergencyFixtures=[
  ['2026-08-30T14:00:00+01:00','Chelsea','Brighton & Hove Albion'],
  ['2026-08-30T14:00:00+01:00','Leeds United','Brentford'],
  ['2026-08-30T14:00:00+01:00','Sunderland','Fulham'],
  ['2026-08-30T16:30:00+01:00','Manchester United','Ipswich Town'],
  ['2026-08-31T20:00:00+01:00','Aston Villa','Arsenal'],
  ['2026-09-04T20:00:00+01:00','Ipswich Town','Liverpool'],
  ['2026-09-05T12:30:00+01:00','Newcastle United','AFC Bournemouth'],
  ['2026-09-05T15:00:00+01:00','Brentford','Sunderland'],
  ['2026-09-05T15:00:00+01:00','Brighton & Hove Albion','Leeds United'],
  ['2026-09-05T15:00:00+01:00','Fulham','Crystal Palace'],
  ['2026-09-05T15:00:00+01:00','Manchester City','Coventry City'],
  ['2026-09-05T15:00:00+01:00','Nottingham Forest','Tottenham Hotspur'],
  ['2026-09-05T17:30:00+01:00','Hull City','Aston Villa'],
  ['2026-09-06T14:00:00+01:00','Everton','Manchester United'],
  ['2026-09-06T16:30:00+01:00','Arsenal','Chelsea'],
  ['2026-09-12T15:00:00+01:00','AFC Bournemouth','Brentford'],
  ['2026-09-12T15:00:00+01:00','Aston Villa','Nottingham Forest'],
  ['2026-09-12T15:00:00+01:00','Chelsea','Hull City'],
  ['2026-09-12T15:00:00+01:00','Crystal Palace','Ipswich Town'],
  ['2026-09-12T15:00:00+01:00','Liverpool','Fulham'],
  ['2026-09-12T17:30:00+01:00','Tottenham Hotspur','Everton'],
  ['2026-09-12T20:00:00+01:00','Sunderland','Arsenal'],
  ['2026-09-13T14:00:00+01:00','Coventry City','Brighton & Hove Albion'],
  ['2026-09-13T16:30:00+01:00','Manchester United','Manchester City'],
  ['2026-09-14T20:00:00+01:00','Leeds United','Newcastle United'],
  ['2026-09-18T20:00:00+01:00','Brentford','Chelsea'],
  ['2026-09-19T12:30:00+01:00','Tottenham Hotspur','Aston Villa'],
  ['2026-09-19T15:00:00+01:00','Brighton & Hove Albion','Arsenal'],
  ['2026-09-19T15:00:00+01:00','Everton','Ipswich Town'],
  ['2026-09-19T15:00:00+01:00','Leeds United','Crystal Palace'],
  ['2026-09-19T15:00:00+01:00','Newcastle United','Hull City'],
  ['2026-09-19T17:30:00+01:00','Nottingham Forest','Coventry City'],
  ['2026-09-20T14:00:00+01:00','AFC Bournemouth','Liverpool'],
  ['2026-09-20T14:00:00+01:00','Manchester City','Sunderland'],
  ['2026-09-20T16:30:00+01:00','Fulham','Manchester United']
].map(([date,home,away],i)=>({id:`fallback-${i+1}`,date,timestamp:Math.floor(Date.parse(date)/1000),status:'NS',home,away}));

function fallbackPayload(now,from,to,season,reason){
  const fixtures=emergencyFixtures.filter(f=>Number(f.timestamp)*1000>now.getTime()+1000).sort((a,b)=>a.timestamp-b.timestamp);
  const first=fixtures[0]||null;
  const target=first?.timestamp||0;
  const group=target?fixtures.filter(f=>Math.abs(f.timestamp-target)<60):[];
  return {from,to,season,next:first,group,source:'premier-league-verified-fallback',fallback:true,reason};
}

export default async function handler(req,res){
  if(req.method!=='GET'){
    res.setHeader('Allow','GET');
    return res.status(405).json({error:'Method not allowed'});
  }

  const now=new Date();
  const from=londonDateString(now);
  const end=new Date(now.getTime()+60*24*60*60*1000);
  const to=londonDateString(end);
  const season=seasonFor(now);
  const apiKey=process.env.API_FOOTBALL_KEY;

  if(!apiKey){
    res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=900');
    return res.status(200).json(fallbackPayload(now,from,to,season,'API_FOOTBALL_KEY is not configured'));
  }

  try{
    const url=new URL(`${API_BASE}/fixtures`);
    url.searchParams.set('league','39');
    url.searchParams.set('season',String(season));
    url.searchParams.set('from',from);
    url.searchParams.set('to',to);
    url.searchParams.set('timezone','Europe/London');

    const response=await fetch(url,{headers:{'x-apisports-key':apiKey.trim(),accept:'application/json'}});
    const data=await response.json();
    const errors=apiErrors(data);
    if(!response.ok||errors.length)throw new Error(errors.join('; ')||`HTTP ${response.status}`);

    const fixtures=(data.response||[]).map(mapFixture).filter(f=>Number(f.timestamp||0)*1000>Date.now()+1000).sort((a,b)=>(a.timestamp||0)-(b.timestamp||0));
    const first=fixtures[0]||null;
    const target=first?.timestamp||0;
    const group=target?fixtures.filter(f=>Math.abs((f.timestamp||0)-target)<60):[];

    if(!first){
      res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=900');
      return res.status(200).json(fallbackPayload(now,from,to,season,'Primary fixture feed returned no future fixtures'));
    }

    res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=900');
    return res.status(200).json({from,to,season,next:first,group,source:'api-football',fallback:false});
  }catch(error){
    const message=error instanceof Error?error.message:String(error);
    console.error('Next Premier League fixture primary feed error:',message);
    res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=900');
    return res.status(200).json(fallbackPayload(now,from,to,season,message));
  }
}
