import {getFotmobMatchDetails} from '../lib/fotmob.js';
const numeric=v=>/^\d{1,12}$/.test(String(v||''));
function pick(rows){return rows.filter(x=>x.name&&Number.isFinite(x.rating)&&x.rating>0&&x.rating<=10).sort((a,b)=>b.rating-a.rating)[0]||null;}
function fotmobRatings(raw){
 const lu=raw?.content?.lineup||raw?.content?.lineups||{};
 const teams=raw?.header?.teams||[];
 const out=[];
 function visit(node,team,depth=0){
  if(!node||depth>7)return;
  if(Array.isArray(node)){node.forEach(x=>visit(x,team,depth+1));return;}
  if(typeof node!=='object')return;
  const name=node.name||node.playerName||node.player?.name;
  const rawRating=node.rating?.num??node.rating?.rating??node.rating??node.player?.rating?.num;
  const rating=Number(rawRating);
  const playerId=node.player?.id??node.playerId??node.id;
  const isPlayer=playerId!=null && (node.shirtNumber!=null||node.positionId!=null||node.position!=null||node.player!=null||node.playerName!=null||node.isCaptain!=null||node.role!=null);
  const teamNames=teams.map(t=>String(t?.name||'').trim().toLowerCase());
  if(isPlayer&&name&&!teamNames.includes(String(name).trim().toLowerCase())&&Number.isFinite(rating)&&rating>0&&rating<=10)out.push({name,team:team||node.teamName||'',rating});
  for(const [k,v] of Object.entries(node)){if(v&&typeof v==='object')visit(v,k==='homeTeam'?teams[0]?.name||team:k==='awayTeam'?teams[1]?.name||team:team,depth+1);}
 }
 visit(lu,'');
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
