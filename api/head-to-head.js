import {getFotmobTeamMatches} from '../lib/fotmob.js';
const finished=new Set(['FT','AET','PEN']);
function validId(v){return /^\d{1,12}$/.test(String(v||''));}
function shape(f){return {date:f.date,home:f.home,away:f.away,homeGoals:f.homeGoals,awayGoals:f.awayGoals,homeId:f.homeId,awayId:f.awayId};}
export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 const home=String(req.query.homeId||''),away=String(req.query.awayId||''),provider=String(req.query.provider||'');
 if(!validId(home)||!validId(away)||home===away)return res.status(400).json({error:'Invalid teams'});
 try{
  let matches=[];
  if(provider==='FotMob'||!process.env.API_FOOTBALL_KEY){
   const games=await getFotmobTeamMatches(home);
   matches=games.filter(f=>String(f.homeId)===away||String(f.awayId)===away).filter(f=>finished.has(String(f.status||'').toUpperCase())).map(shape);
  }else{
   const url=new URL('https://v3.football.api-sports.io/fixtures/headtohead');
   url.searchParams.set('h2h',home+'-'+away);url.searchParams.set('last','20');
   const response=await fetch(url,{headers:{'x-apisports-key':process.env.API_FOOTBALL_KEY,accept:'application/json'}});
   if(!response.ok)throw new Error('Head-to-head service unavailable');
   const data=await response.json();
   if(data.errors&&(Array.isArray(data.errors)?data.errors.length:Object.keys(data.errors).length))throw new Error('Head-to-head service unavailable');
   matches=(data.response||[]).filter(f=>finished.has(f.fixture?.status?.short)).map(f=>({date:f.fixture?.date,home:f.teams?.home?.name,away:f.teams?.away?.name,homeId:f.teams?.home?.id,awayId:f.teams?.away?.id,homeGoals:f.goals?.home,awayGoals:f.goals?.away}));
  }
  matches=matches.filter(f=>f.date&&f.homeGoals!=null&&f.awayGoals!=null).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,20);
  res.setHeader('Cache-Control','public, s-maxage=1800, stale-while-revalidate=3600');
  return res.status(200).json({matches,provider:provider==='FotMob'||!process.env.API_FOOTBALL_KEY?'FotMob':'API-Football'});
 }catch(e){res.setHeader('Cache-Control','no-store');return res.status(502).json({error:'Previous meetings are temporarily unavailable'});}
}