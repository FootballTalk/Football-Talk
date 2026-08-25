const API_BASE='https://v3.football.api-sports.io';
const FINISHED=new Set(['FT','AET','PEN']);

function seasonFor(date){
  const year=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric'}).format(date));
  const month=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',month:'numeric'}).format(date));
  return month>=7?year:year-1;
}

async function apiGet(path,params,apiKey){
  const url=new URL(`${API_BASE}/${path}`);
  Object.entries(params||{}).forEach(([k,v])=>url.searchParams.set(k,String(v)));
  const r=await fetch(url,{headers:{'x-apisports-key':apiKey.trim(),accept:'application/json'}});
  const data=await r.json();
  if(!r.ok || (data.errors && Object.keys(data.errors).length)) throw new Error(`${path} request failed`);
  return data;
}

export default async function handler(req,res){
  if(req.method!=='GET') return res.status(405).json({error:'Method not allowed'});
  const apiKey=process.env.API_FOOTBALL_KEY;
  if(!apiKey) return res.status(500).json({error:'API_FOOTBALL_KEY is not configured'});
  const season=seasonFor(new Date());
  try{
    const fixturesData=await apiGet('fixtures',{league:39,season},apiKey);
    const cleanByTeam=new Map();
    for(const item of fixturesData.response||[]){
      if(!FINISHED.has(item.fixture?.status?.short)) continue;
      const hg=item.goals?.home;
      const ag=item.goals?.away;
      if(hg==null || ag==null) continue;
      if(ag===0){
        const id=item.teams?.home?.id;
        if(id) cleanByTeam.set(id,{team:item.teams.home.name,teamLogo:item.teams.home.logo,cleanSheets:(cleanByTeam.get(id)?.cleanSheets||0)+1});
      }
      if(hg===0){
        const id=item.teams?.away?.id;
        if(id) cleanByTeam.set(id,{team:item.teams.away.name,teamLogo:item.teams.away.logo,cleanSheets:(cleanByTeam.get(id)?.cleanSheets||0)+1});
      }
    }

    const keepersByTeam=new Map();
    let page=1,totalPages=1;
    do{
      const data=await apiGet('players',{league:39,season,page},apiKey);
      totalPages=Number(data.paging?.total||1);
      for(const item of data.response||[]){
        const stat=(item.statistics||[]).find(s=>Number(s.league?.id)===39)||item.statistics?.[0];
        if(!stat || String(stat.games?.position||'').toLowerCase()!=='goalkeeper') continue;
        const teamId=stat.team?.id;
        if(!teamId || !cleanByTeam.has(teamId)) continue;
        const minutes=Number(stat.games?.minutes||0);
        const current=keepersByTeam.get(teamId);
        if(!current || minutes>current.minutes){
          keepersByTeam.set(teamId,{
            id:item.player?.id,
            name:item.player?.name||'Goalkeeper',
            photo:item.player?.photo||'',
            team:stat.team?.name||cleanByTeam.get(teamId).team,
            teamLogo:stat.team?.logo||cleanByTeam.get(teamId).teamLogo,
            minutes,
            appearances:Number(stat.games?.appearences||0),
            cleanSheets:cleanByTeam.get(teamId).cleanSheets
          });
        }
      }
      page+=1;
    }while(page<=totalPages);

    const players=[...keepersByTeam.values()]
      .sort((a,b)=>b.cleanSheets-a.cleanSheets || b.minutes-a.minutes || a.name.localeCompare(b.name))
      .map((p,index)=>({...p,rank:index+1}));

    res.setHeader('Cache-Control','public, s-maxage=43200, stale-while-revalidate=43200');
    return res.status(200).json({season,updatedAt:new Date().toISOString(),players,note:'Clean sheets are matched to each club’s most-used Premier League goalkeeper.'});
  }catch(error){
    res.setHeader('Cache-Control','no-store');
    return res.status(502).json({error:'Unable to load goalkeeper clean sheets',detail:String(error)});
  }
}
