const SOURCE='https://www.fotmob.com/api/data/leagueseasondeepstats?id=47&season=36781&type=players&stat=goals';

function findStatList(node){
  if(Array.isArray(node)){
    if(node.length && node.every(x=>x&&typeof x==='object') && node.some(x=>('ParticipantName'in x)||('participantName'in x)||('playerName'in x))) return node;
    for(const item of node){const hit=findStatList(item);if(hit) return hit;}
  }else if(node&&typeof node==='object'){
    for(const value of Object.values(node)){const hit=findStatList(value);if(hit) return hit;}
  }
  return null;
}

const val=(o,...keys)=>{for(const k of keys){if(o?.[k]!=null)return o[k];}return'';};

export default async function handler(req,res){
  if(req.method!=='GET') return res.status(405).json({error:'Method not allowed'});
  try{
    const r=await fetch(SOURCE,{headers:{accept:'application/json','user-agent':'Mozilla/5.0 FootballTalk/1.0'}});
    const text=await r.text();
    if(!r.ok) throw new Error(`FotMob returned ${r.status}`);
    const data=JSON.parse(text);
    const list=findStatList(data)||[];
    const players=list.map((item,index)=>({
      rank:Number(val(item,'Rank','rank'))||index+1,
      id:val(item,'ParticipantId','participantId','playerId'),
      name:val(item,'ParticipantName','participantName','playerName','name')||'Unknown player',
      team:val(item,'TeamName','teamName','team')||'',
      photo:'',
      teamLogo:'',
      goals:Number(val(item,'StatValue','statValue','value'))||0,
      appearances:Number(val(item,'MatchesPlayed','matchesPlayed','played'))||0
    })).filter(p=>p.name).sort((a,b)=>b.goals-a.goals||a.rank-b.rank).slice(0,20).map((p,i)=>({...p,rank:i+1}));
    if(!players.length) throw new Error('No scorer data returned');
    res.setHeader('Cache-Control','public, s-maxage=1800, stale-while-revalidate=1800');
    return res.status(200).json({season:'2026/27',updatedAt:new Date().toISOString(),source:'FotMob',players});
  }catch(error){
    res.setHeader('Cache-Control','no-store');
    return res.status(502).json({error:'Unable to load top scorers',detail:String(error)});
  }
}
