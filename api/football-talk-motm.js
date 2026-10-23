import {getFotmobMatchDetails} from '../lib/fotmob.js';
const numeric=v=>/^\d{1,12}$/.test(String(v||''));
function pick(rows){return rows.filter(x=>x.name&&Number.isFinite(x.rating)&&x.rating>0&&x.rating<=10).sort((a,b)=>b.rating-a.rating)[0]||null;}
function fotmobRatings(raw){
 const content=raw?.content||{};
 const teams=raw?.header?.teams||[];
 const teamNames=teams.map(t=>String(t?.name||'').trim().toLowerCase()).filter(Boolean);
 const out=[];
 const ratingValue=v=>{
  if(v&&typeof v==='object')return ratingValue(v.num??v.rating??v.value??v.score);
  if(v==null||v==='')return NaN;
  const n=Number(String(v).replace(',','.'));
  return Number.isFinite(n)?n:NaN;
 };
 function visit(node,team='',depth=0,playerContext=false){
  if(!node||depth>12)return;
  if(Array.isArray(node)){node.forEach(x=>visit(x,team,depth+1,playerContext));return;}
  if(typeof node!=='object')return;
  const embedded=node.player&&typeof node.player==='object'?node.player:null;
  const name=embedded?.name||node.playerName||node.name||'';
  const id=embedded?.id??node.playerId??node.id;
  const rating=ratingValue(node.rating??node.ratingProps??node.playerRating??embedded?.rating);
  const hasPlayerMarkers=Boolean(embedded||node.playerId!=null||node.playerName||node.shirtNumber!=null||node.positionId!=null||node.position!=null||node.usualPlayingPositionId!=null||node.isCaptain!=null||node.role==='player'||playerContext);
  if(id!=null&&hasPlayerMarkers&&name&&!teamNames.includes(String(name).trim().toLowerCase())&&rating>=1&&rating<=10)out.push({name,team:team||node.teamName||'',rating});
  for(const [key,value] of Object.entries(node)){
   if(!value||typeof value!=='object')continue;
   const nextTeam=key==='homeTeam'?teams[0]?.name||team:key==='awayTeam'?teams[1]?.name||team:team;
   const nextContext=playerContext||['players','starters','subs','substitutes','bench','startXI','startingXI'].includes(key);
   visit(value,nextTeam,depth+1,nextContext);
  }
 }
 visit(content.lineup||content.lineups||{});
 // Some FotMob match payloads expose player ratings separately from lineups.
 visit(content.playerStats||content.playerRatings||{});
 return pick(out);
}

export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 const id=String(req.query.id||''),provider=String(req.query.provider||'');
 if(!numeric(id))return res.status(400).json({error:'Invalid match'});
 try{
  let winner=null;
  if(provider==='FotMob'||!process.env.API_FOOTBALL_KEY){
   winner=fotmobRatings(await getFotmobMatchDetails(id));
  }else{
   const response=await fetch('https://v3.football.api-sports.io/fixtures/players?fixture='+encodeURIComponent(id),{headers:{'x-apisports-key':process.env.API_FOOTBALL_KEY,accept:'application/json'}});
   if(!response.ok)throw Error('Ratings unavailable');
   const data=await response.json();
   if(data.errors&&(Array.isArray(data.errors)?data.errors.length:Object.keys(data.errors).length))throw Error('Ratings unavailable');
   const players=(data.response||[]).flatMap(t=>(t.players||[]).map(p=>({name:p.player?.name,team:t.team?.name,rating:Number(p.statistics?.[0]?.games?.rating)})));
   winner=pick(players);
  }
  res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=300');
  return res.status(200).json({winner});
 }catch(e){res.setHeader('Cache-Control','no-store');return res.status(200).json({winner:null});}
}
