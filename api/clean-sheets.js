const SOURCE='https://www.fotmob.com/api/data/leagueseasondeepstats?id=47&season=36781&type=players&stat=clean_sheet';
const LEAGUE_SOURCE='https://www.fotmob.com/api/leagues?id=47&ccode3=GBR&season=36781';
const HEADERS={accept:'application/json','user-agent':'Mozilla/5.0 FootballTalk/1.0'};

function collectTeamNames(node,targetIds,map=new Map()){
  if(Array.isArray(node)){
    node.forEach(item=>collectTeamNames(item,targetIds,map));
  }else if(node&&typeof node==='object'){
    const id=Number(node.id??node.teamId??node.team?.id);
    const name=node.name??node.teamName??node.team?.name??node.shortName;
    if(targetIds.has(id)&&typeof name==='string'&&name.trim()) map.set(id,name.trim());
    Object.values(node).forEach(value=>collectTeamNames(value,targetIds,map));
  }
  return map;
}

async function getTeamNames(teamIds){
  try{
    const r=await fetch(LEAGUE_SOURCE,{headers:HEADERS});
    if(!r.ok) return new Map();
    return collectTeamNames(await r.json(),teamIds);
  }catch{return new Map();}
}

export default async function handler(req,res){
  if(req.method!=='GET') return res.status(405).json({error:'Method not allowed'});
  try{
    const r=await fetch(SOURCE,{headers:HEADERS});
    if(!r.ok) throw new Error(`FotMob returned ${r.status}`);
    const data=await r.json();
    const list=Array.isArray(data.statsData)?data.statsData:[];
    const teamIds=new Set(list.map(item=>Number(item.teamId)).filter(Boolean));
    const teamNames=await getTeamNames(teamIds);
    const players=list.map((item,index)=>({
      rank:Number(item.rank)||index+1,
      id:item.id||'',
      name:item.name||'Goalkeeper',
      team:teamNames.get(Number(item.teamId))||'',
      teamId:Number(item.teamId)||null,
      photo:'',
      teamLogo:'',
      cleanSheets:Number(item.statValue?.value)||0,
      appearances:0
    })).filter(p=>p.name).sort((a,b)=>b.cleanSheets-a.cleanSheets||a.rank-b.rank||a.name.localeCompare(b.name)).slice(0,20).map((p,i)=>({...p,rank:i+1}));
    if(!players.length) throw new Error('No clean-sheet data returned');
    res.setHeader('Cache-Control','public, s-maxage=1800, stale-while-revalidate=1800');
    return res.status(200).json({season:data.seasons?.find(s=>String(s.id)===String(data.currentSeasonId))?.name||'2026/2027',updatedAt:new Date().toISOString(),source:'FotMob',players,note:'Goalkeeper clean sheets for the current Premier League season.'});
  }catch(error){
    res.setHeader('Cache-Control','no-store');
    return res.status(502).json({error:'Unable to load goalkeeper clean sheets',detail:String(error)});
  }
}
