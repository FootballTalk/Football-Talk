function seasonFor(date){
  const year=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric'}).format(date));
  const month=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',month:'numeric'}).format(date));
  return month>=7?year:year-1;
}

function normalise(s=''){return String(s).toLowerCase().replace(/[^a-z]/g,'');}

export default async function handler(req,res){
  if(req.method!=='GET') return res.status(405).json({error:'Method not allowed'});
  const season=seasonFor(new Date());
  try{
    const url=`https://site.api.espn.com/apis/site/v3/sports/soccer/eng.1/leaders?season=${season}`;
    const r=await fetch(url,{headers:{accept:'application/json','user-agent':'FootballTalk/1.0'}});
    const data=await r.json();
    if(!r.ok) throw new Error(`ESPN returned ${r.status}`);
    const cats=data?.leaders?.categories||data?.categories||[];
    const category=cats.find(c=>{
      const key=normalise(`${c.name||''} ${c.displayName||''}`);
      return key.includes('cleansheet')||key.includes('shutout');
    });
    const leaders=category?.leaders||[];
    const players=leaders.slice(0,20).map((item,index)=>({
      rank:index+1,
      id:item.athlete?.id||'',
      name:item.athlete?.displayName||item.athlete?.fullName||'Goalkeeper',
      photo:item.athlete?.headshot?.href||'',
      team:item.team?.displayName||item.team?.name||'',
      teamLogo:item.team?.logos?.[0]?.href||item.team?.logo||'',
      cleanSheets:Number(item.value||item.displayValue||0)
    }));
    if(!players.length) throw new Error('No clean-sheet leaderboard returned');
    res.setHeader('Cache-Control','public, s-maxage=1800, stale-while-revalidate=1800');
    return res.status(200).json({season,updatedAt:new Date().toISOString(),source:'ESPN',players});
  }catch(error){
    res.setHeader('Cache-Control','no-store');
    return res.status(502).json({error:'Unable to load goalkeeper clean sheets',detail:String(error)});
  }
}
