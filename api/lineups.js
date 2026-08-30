import {getFotmobMatchDetails,getFotmobMatchesByDate,fotmobDate,FOTMOB_LEAGUES} from '../lib/fotmob.js';

const API_BASE='https://v3.football.api-sports.io';
const COMPETITIONS=[{id:39,name:'Premier League'},{id:40,name:'EFL Championship'},{id:48,name:'Carabao Cup'},{id:45,name:'FA Cup'}];
const COMPETITION_MAP=new Map(COMPETITIONS.map(c=>[c.id,c]));
const FOTMOB_COMPETITION_MAP=new Map([
  [FOTMOB_LEAGUES.premier.id,{id:39,name:'Premier League'}],
  [FOTMOB_LEAGUES.championship.id,{id:40,name:'EFL Championship'}],
  [FOTMOB_LEAGUES.carabao.id,{id:48,name:'Carabao Cup'}],
  [FOTMOB_LEAGUES.faCup.id,{id:45,name:'FA Cup'}],
]);

function londonDateString(date){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);const map=Object.fromEntries(parts.map(({type,value})=>[type,value]));return `${map.year}-${map.month}-${map.day}`;}
function seasonFor(date){const year=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric'}).format(date));const month=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',month:'numeric'}).format(date));return month>=7?year:year-1;}
function apiErrors(data){if(!data||!data.errors)return[];if(Array.isArray(data.errors))return data.errors.filter(Boolean).map(String);if(typeof data.errors==='object')return Object.entries(data.errors).map(([k,v])=>`${k}: ${v}`);return[String(data.errors)];}
async function readApi(url,key,label){const r=await fetch(url,{headers:{'x-apisports-key':key,accept:'application/json'}});let data;try{data=await r.json();}catch{throw new Error(`${label}: invalid API response (HTTP ${r.status})`);}const errors=apiErrors(data);if(!r.ok||errors.length)throw new Error(`${label}: ${errors.join('; ')||`HTTP ${r.status}`}`);return data.response||[];}
async function fixturesForToday(key,date){const url=new URL(`${API_BASE}/fixtures`);url.searchParams.set('date',date);url.searchParams.set('timezone','Europe/London');const rows=await readApi(url,key,'Today fixtures');return rows.filter(x=>COMPETITION_MAP.has(Number(x.league?.id))).map(x=>{const comp=COMPETITION_MAP.get(Number(x.league?.id));return{fixtureId:x.fixture?.id,date:x.fixture?.date,timestamp:x.fixture?.timestamp,status:x.fixture?.status?.short,elapsed:x.fixture?.status?.elapsed,leagueId:comp.id,leagueName:comp.name,home:x.teams?.home?.name,away:x.teams?.away?.name,homeLogo:x.teams?.home?.logo,awayLogo:x.teams?.away?.logo};}).filter(x=>x.fixtureId&&x.home&&x.away).sort((a,b)=>(a.timestamp||0)-(b.timestamp||0));}
function mapPlayer(x){return{id:x.player?.id,name:x.player?.name,number:x.player?.number,pos:x.player?.pos,grid:x.player?.grid};}
async function lineupForFixture(fixture,key){const url=new URL(`${API_BASE}/fixtures/lineups`);url.searchParams.set('fixture',String(fixture.fixtureId));const rows=await readApi(url,key,`${fixture.home} v ${fixture.away}`);return rows.map(x=>({teamId:x.team?.id,team:x.team?.name,logo:x.team?.logo,formation:x.formation||'',coach:x.coach?.name||'',startXI:(x.startXI||[]).map(mapPlayer),substitutes:(x.substitutes||[]).map(mapPlayer)}));}

function flatPlayers(value){
  if(!value)return[];
  if(Array.isArray(value))return value.flatMap(flatPlayers);
  if(typeof value==='object'&&Array.isArray(value.players))return flatPlayers(value.players);
  if(typeof value==='object'&&(value.name||value.playerName||value.player?.name))return[value];
  return[];
}
function fotmobPlayer(x){
  const p=x?.player||x||{};
  return{id:p.id||x?.id||null,name:p.name||x?.name||x?.playerName||'',number:p.shirtNumber??p.number??x?.shirtNumber??x?.number??'',pos:p.position||p.positionLabel||x?.position||x?.positionLabel||'',grid:''};
}
function teamLineupFromModern(team,fixtureSide){
  if(!team)return null;
  const starters=flatPlayers(team.starters||team.startingXI||team.startXI).map(fotmobPlayer).filter(p=>p.name);
  const subs=flatPlayers(team.subs||team.substitutes||team.bench).map(fotmobPlayer).filter(p=>p.name);
  if(!starters.length&&!subs.length)return null;
  return{teamId:team.id||team.teamId||fixtureSide?.teamId||null,team:team.name||team.teamName||fixtureSide?.name||'',logo:fixtureSide?.logo||'',formation:team.formation||'',coach:team.coach?.name||team.coachName||'',startXI:starters,substitutes:subs};
}
function teamLineupFromLegacy(raw,index,fixtureSide,container){
  const team=raw||{};
  const starters=flatPlayers(team.players||team.starters||team.startXI).map(fotmobPlayer).filter(p=>p.name);
  let subs=flatPlayers(team.bench||team.substitutes).map(fotmobPlayer).filter(p=>p.name);
  if(!subs.length&&Array.isArray(container?.bench))subs=flatPlayers(container.bench[index]).map(fotmobPlayer).filter(p=>p.name);
  const teamId=team.teamId||team.id||fixtureSide?.teamId||null;
  let coach='';
  if(Array.isArray(container?.coaches)){const c=container.coaches.find(x=>String(x.teamId||x.team?.id||'')===String(teamId||''))||container.coaches[index];coach=c?.name||c?.coach?.name||'';}
  if(!starters.length&&!subs.length)return null;
  return{teamId,team:team.teamName||team.name||fixtureSide?.name||'',logo:fixtureSide?.logo||'',formation:team.formation||'',coach,startXI:starters,substitutes:subs};
}
function parseFotmobLineups(details,fixture){
  const content=details?.content||details||{};
  const box=content.lineup||content.lineups||{};
  const sides=[{name:fixture.home,logo:fixture.homeLogo},{name:fixture.away,logo:fixture.awayLogo}];
  const modern=[teamLineupFromModern(box.homeTeam,sides[0]),teamLineupFromModern(box.awayTeam,sides[1])].filter(Boolean);
  if(modern.length>=2)return modern;
  const legacy=Array.isArray(box.lineup)?box.lineup:Array.isArray(box.lineups)?box.lineups:[];
  const parsed=legacy.slice(0,2).map((team,index)=>teamLineupFromLegacy(team,index,sides[index],box)).filter(Boolean);
  return parsed.length>=2?parsed:modern.length?modern:parsed;
}
async function fotmobFallback(date,season,reason=''){
  const leagues=await getFotmobMatchesByDate(date);
  const fixtures=leagues.filter(l=>FOTMOB_COMPETITION_MAP.has(Number(l.providerId))).flatMap(l=>{const comp=FOTMOB_COMPETITION_MAP.get(Number(l.providerId));return(l.fixtures||[]).map(f=>({fixtureId:f.id,date:f.date,timestamp:f.timestamp,status:f.status,elapsed:f.elapsed,leagueId:comp.id,leagueName:comp.name,home:f.home,away:f.away,homeLogo:f.homeLogo,awayLogo:f.awayLogo,lineups:[]}));}).sort((a,b)=>(a.timestamp||0)-(b.timestamp||0));
  const enriched=[];const lineupErrors=[];
  for(const fixture of fixtures){
    let lineups=[];
    try{lineups=parseFotmobLineups(await getFotmobMatchDetails(fixture.fixtureId),fixture);}catch(error){lineupErrors.push({fixtureId:fixture.fixtureId,match:`${fixture.home} v ${fixture.away}`,detail:String(error.message||error)});}
    enriched.push({...fixture,lineups});
  }
  return{date,season,updatedAt:new Date().toISOString(),fixtureCount:fixtures.length,lineupErrors,fixtures:enriched,provider:'FotMob',fallback:true,reason};
}

export default async function handler(req,res){
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
  const key=(process.env.API_FOOTBALL_KEY||'').trim();const now=new Date();const date=londonDateString(now);const season=seasonFor(now);
  if(!key){try{const payload=await fotmobFallback(date,season,'API_FOOTBALL_KEY is not configured');res.setHeader('Cache-Control','public, s-maxage=60, stale-while-revalidate=120');return res.status(200).json(payload);}catch(error){return res.status(502).json({error:'Unable to load lineups right now',detail:String(error.message||error),date,season});}}
  try{const fixtures=await fixturesForToday(key,date);const enriched=[];const lineupErrors=[];for(const fixture of fixtures){let lineups=[];try{lineups=await lineupForFixture(fixture,key);}catch(error){lineupErrors.push({fixtureId:fixture.fixtureId,match:`${fixture.home} v ${fixture.away}`,detail:error instanceof Error?error.message:String(error)});}enriched.push({...fixture,lineups});}res.setHeader('Cache-Control','public, s-maxage=60, stale-while-revalidate=60');return res.status(200).json({date,season,updatedAt:new Date().toISOString(),fixtureCount:fixtures.length,lineupErrors,fixtures:enriched,provider:'API-Football'});}
  catch(error){const message=error instanceof Error?error.message:String(error);try{const payload=await fotmobFallback(fotmobDate(now),season,message);res.setHeader('Cache-Control','public, s-maxage=60, stale-while-revalidate=120');return res.status(200).json(payload);}catch(fallbackError){res.setHeader('Cache-Control','no-store');return res.status(502).json({error:'Unable to load lineups right now',detail:`${message}; fallback: ${String(fallbackError.message||fallbackError)}`,date,season});}}
}
