const ESPN_BASE='https://site.api.espn.com/apis/site/v2/sports/soccer';

const COMPETITIONS=[
  {slug:'eng.1',name:'Premier League'},
  {slug:'eng.fa',name:'FA Cup'},
  {slug:'eng.league_cup',name:'Carabao Cup'},
  {slug:'uefa.champions',name:'Champions League'},
  {slug:'uefa.europa',name:'Europa League'},
];

function ymd(date){
  const y=date.getUTCFullYear();
  const m=String(date.getUTCMonth()+1).padStart(2,'0');
  const d=String(date.getUTCDate()).padStart(2,'0');
  return `${y}${m}${d}`;
}

function scoreOf(competitor){
  const raw=competitor?.score;
  if(raw==null||raw==='')return null;
  const n=Number(raw);
  return Number.isFinite(n)?n:null;
}

function mapEvent(event,competition){
  const contest=event?.competitions?.[0]||{};
  const competitors=contest.competitors||[];
  const home=competitors.find(c=>c.homeAway==='home')||competitors[0]||{};
  const away=competitors.find(c=>c.homeAway==='away')||competitors[1]||{};
  const type=event?.status?.type||contest?.status?.type||{};
  const completed=type.completed===true||type.state==='post';
  const live=type.state==='in';
  return {
    id:`espn:${competition.slug}:${event.id}`,
    date:event.date||contest.date,
    timestamp:Math.floor(new Date(event.date||contest.date).getTime()/1000),
    status:completed?'FT':live?'LIVE':'NS',
    elapsed:type.detail||type.shortDetail||'',
    home:home?.team?.displayName||home?.team?.name||'Home',
    away:away?.team?.displayName||away?.team?.name||'Away',
    homeLogo:home?.team?.logo||'',
    awayLogo:away?.team?.logo||'',
    homeGoals:scoreOf(home),
    awayGoals:scoreOf(away),
    competition:competition.name,
    source:'espn-public-scoreboard',
  };
}

async function fetchCompetition(competition,from,to){
  const url=new URL(`${ESPN_BASE}/${competition.slug}/scoreboard`);
  url.searchParams.set('dates',`${ymd(from)}-${ymd(to)}`);
  url.searchParams.set('limit','1000');
  const response=await fetch(url,{headers:{accept:'application/json','user-agent':'FootballTalk/1.0'}});
  if(!response.ok)throw new Error(`${competition.name}: HTTP ${response.status}`);
  const data=await response.json();
  return (data.events||[]).map(event=>mapEvent(event,competition)).filter(f=>f.date&&f.home&&f.away);
}

export async function getPredictionFallback(results=false){
  const now=new Date();
  const from=results?new Date(now.getTime()-40*24*60*60*1000):new Date(now.getTime()-6*60*60*1000);
  const to=results?new Date(now.getTime()+24*60*60*1000):new Date(now.getTime()+28*24*60*60*1000);
  const settled=await Promise.allSettled(COMPETITIONS.map(c=>fetchCompetition(c,from,to)));
  const leagues=[];
  const errors=[];

  settled.forEach((result,index)=>{
    const comp=COMPETITIONS[index];
    if(result.status==='fulfilled'){
      const fixtures=result.value
        .filter(f=>results?f.status==='FT':f.status!=='FT')
        .sort((a,b)=>(results?b.timestamp-a.timestamp:a.timestamp-b.timestamp));
      leagues.push({id:comp.slug,name:comp.name,fixtures});
    }else{
      errors.push(`${comp.name}: ${String(result.reason?.message||result.reason)}`);
      leagues.push({id:comp.slug,name:comp.name,fixtures:[]});
    }
  });

  return {
    source:'public-fallback',
    results,
    from:from.toISOString(),
    to:to.toISOString(),
    leagues,
    errors,
  };
}

export default async function handler(req,res){
  if(req.method!=='GET'){
    res.setHeader('Allow','GET');
    return res.status(405).json({error:'Method not allowed'});
  }

  const results=String(req.query?.results||'')==='1';
  const payload=await getPredictionFallback(results);
  const total=payload.leagues.reduce((n,l)=>n+l.fixtures.length,0);
  res.setHeader('Cache-Control',results?'public, s-maxage=120, stale-while-revalidate=300':'public, s-maxage=60, stale-while-revalidate=120');
  return res.status(total?200:502).json(payload);
}
