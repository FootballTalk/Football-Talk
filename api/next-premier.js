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

export default async function handler(req,res){
  if(req.method!=='GET'){
    res.setHeader('Allow','GET');
    return res.status(405).json({error:'Method not allowed'});
  }

  const apiKey=process.env.API_FOOTBALL_KEY;
  if(!apiKey)return res.status(500).json({error:'API_FOOTBALL_KEY is not configured'});

  const now=new Date();
  const from=londonDateString(now);
  const end=new Date(now.getTime()+60*24*60*60*1000);
  const to=londonDateString(end);
  const season=seasonFor(now);

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

    res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=900');
    return res.status(200).json({from,to,season,next:first,group});
  }catch(error){
    const message=error instanceof Error?error.message:String(error);
    console.error('Next Premier League fixture error:',message);
    res.setHeader('Cache-Control','no-store');
    return res.status(502).json({error:'Unable to load next Premier League fixture',detail:message});
  }
}
