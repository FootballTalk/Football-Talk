const BASE='https://www.fotmob.com/api/data/leagueseasondeepstats';
const LEAGUE='47';
const SEASON='36781';

async function loadStat(stat){
  const url=new URL(BASE);
  url.searchParams.set('id',LEAGUE);
  url.searchParams.set('season',SEASON);
  url.searchParams.set('type','players');
  url.searchParams.set('stat',stat);
  const r=await fetch(url,{headers:{accept:'application/json','user-agent':'Mozilla/5.0 FootballTalk/1.0'}});
  if(!r.ok) throw new Error(`FotMob ${stat} returned ${r.status}`);
  const data=await r.json();
  const rows=Array.isArray(data.statsData)?data.statsData:[];
  return rows.map((p,i)=>({rank:Number(p.rank)||i+1,id:p.id,name:p.name||'Unknown player',teamId:p.teamId,value:Number(p.statValue?.value??0)})).sort((a,b)=>b.value-a.value||a.rank-b.rank).slice(0,20);
}

module.exports=async function handler(req,res){
  if(req.method!=='GET') return res.status(405).json({error:'Method not allowed'});
  try{
    const [scorers,keepers]=await Promise.all([loadStat('goals'),loadStat('clean_sheet')]);
    res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=300');
    return res.status(200).json({updatedAt:new Date().toISOString(),scorers,keepers});
  }catch(error){
    return res.status(502).json({error:'Stats are temporarily unavailable'});
  }
};
