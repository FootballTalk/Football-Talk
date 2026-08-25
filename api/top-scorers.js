const API_BASE='https://v3.football.api-sports.io';

function seasonFor(date){
  const year=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric'}).format(date));
  const month=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',month:'numeric'}).format(date));
  return month>=7?year:year-1;
}

export default async function handler(req,res){
  if(req.method!=='GET') return res.status(405).json({error:'Method not allowed'});
  const apiKey=process.env.API_FOOTBALL_KEY;
  if(!apiKey) return res.status(500).json({error:'API_FOOTBALL_KEY is not configured'});
  const season=seasonFor(new Date());
  try{
    const url=new URL(`${API_BASE}/players/topscorers`);
    url.searchParams.set('league','39');
    url.searchParams.set('season',String(season));
    const r=await fetch(url,{headers:{'x-apisports-key':apiKey.trim(),accept:'application/json'}});
    const data=await r.json();
    if(!r.ok || (data.errors && Object.keys(data.errors).length)) throw new Error('API-Football top scorers request failed');
    const players=(data.response||[]).slice(0,20).map((item,index)=>{
      const stat=(item.statistics||[])[0]||{};
      return {
        rank:index+1,
        id:item.player?.id,
        name:item.player?.name||'Unknown player',
        photo:item.player?.photo||'',
        team:stat.team?.name||'',
        teamLogo:stat.team?.logo||'',
        goals:stat.goals?.total||0,
        assists:stat.goals?.assists||0,
        appearances:stat.games?.appearences||0,
        minutes:stat.games?.minutes||0
      };
    });
    res.setHeader('Cache-Control','public, s-maxage=3600, stale-while-revalidate=1800');
    return res.status(200).json({season,updatedAt:new Date().toISOString(),players});
  }catch(error){
    res.setHeader('Cache-Control','no-store');
    return res.status(502).json({error:'Unable to load top scorers',detail:String(error)});
  }
}
