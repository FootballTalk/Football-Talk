function seasonFor(date){
  const year=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric'}).format(date));
  const month=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',month:'numeric'}).format(date));
  return month>=7?year:year-1;
}

function findCategory(data,names){
  const cats=data?.leaders?.categories||data?.categories||[];
  return cats.find(c=>names.includes(String(c.name||'').toLowerCase())||names.includes(String(c.displayName||'').toLowerCase()));
}

export default async function handler(req,res){
  if(req.method!=='GET') return res.status(405).json({error:'Method not allowed'});
  const season=seasonFor(new Date());
  try{
    const url=`https://site.api.espn.com/apis/site/v3/sports/soccer/eng.1/leaders?season=${season}`;
    const r=await fetch(url,{headers:{accept:'application/json','user-agent':'FootballTalk/1.0'}});
    const data=await r.json();
    if(!r.ok) throw new Error(`ESPN returned ${r.status}`);
    const category=findCategory(data,['goals','goals scored','goalsscored','totalgoals','scoring']);
    const leaders=category?.leaders||[];
    const players=leaders.slice(0,20).map((item,index)=>({
      rank:index+1,
      id:item.athlete?.id||'',
      name:item.athlete?.displayName||item.athlete?.fullName||'Unknown player',
      photo:item.athlete?.headshot?.href||'',
      team:item.team?.displayName||item.team?.name||'',
      teamLogo:item.team?.logos?.[0]?.href||item.team?.logo||'',
      goals:Number(item.value||item.displayValue||0),
      appearances:Number(item.statistics?.find?.(s=>String(s.name||'').toLowerCase().includes('appear'))?.value||0)
    }));
    if(!players.length) throw new Error('No scorer leaderboard returned');
    res.setHeader('Cache-Control','public, s-maxage=1800, stale-while-revalidate=1800');
    return res.status(200).json({season,updatedAt:new Date().toISOString(),source:'ESPN',players});
  }catch(error){
    res.setHeader('Cache-Control','no-store');
    return res.status(502).json({error:'Unable to load top scorers',detail:String(error)});
  }
}
