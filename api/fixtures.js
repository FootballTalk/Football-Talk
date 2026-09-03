import {getPredictionFallback} from './prediction-fixtures-fallback.js';
import {FOTMOB_LEAGUES,fotmobDate,getFotmobLeagueMatches,getFotmobMatchesByDate,withinRange} from '../lib/fotmob.js';

const API_BASE='https://v3.football.api-sports.io';
const LEAGUES=[{id:39,name:'Premier League'},{id:40,name:'EFL Championship'},{id:179,name:'Scottish Premiership'}];
const PREDICTION_LEAGUES=[{id:39,name:'Premier League'},{id:45,name:'FA Cup'},{id:48,name:'Carabao Cup'},{id:2,name:'UEFA Champions League'},{id:3,name:'UEFA Europa League'}];
const FINISHED=new Set(['FT','AET','PEN']);
const LIVE=new Set(['1H','2H','ET','BT','P','LIVE','HT','INT']);

function londonDateString(date){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);const map=Object.fromEntries(parts.map(({type,value})=>[type,value]));return `${map.year}-${map.month}-${map.day}`;}
function seasonFor(date){const year=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric'}).format(date));const month=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',month:'numeric'}).format(date));return month>=7?year:year-1;}
function apiErrors(data){if(!data||!data.errors)return[];if(Array.isArray(data.errors))return data.errors.filter(Boolean).map(String);if(typeof data.errors==='object')return Object.entries(data.errors).map(([key,value])=>`${key}: ${value}`);return[String(data.errors)];}
function mapFixture(item){return{id:item.fixture?.id,date:item.fixture?.date,timestamp:item.fixture?.timestamp,status:item.fixture?.status?.short,elapsed:item.fixture?.status?.elapsed,home:item.teams?.home?.name,away:item.teams?.away?.name,homeLogo:item.teams?.home?.logo,awayLogo:item.teams?.away?.logo,homeWinner:item.teams?.home?.winner===true,awayWinner:item.teams?.away?.winner===true,homeGoals:item.goals?.home,awayGoals:item.goals?.away,penaltyHome:item.score?.penalty?.home,penaltyAway:item.score?.penalty?.away,events:Array.isArray(item.events)?item.events.map(event=>({elapsed:event.time?.elapsed,extra:event.time?.extra,team:event.team?.name,player:event.player?.name,assist:event.assist?.name,type:event.type,detail:event.detail})):[]};}
async function readApi(url,apiKey,label){const response=await fetch(url,{headers:{'x-apisports-key':apiKey,accept:'application/json'}});let data;try{data=await response.json();}catch{const text=await response.text().catch(()=>'');throw new Error(`${label}: API-Football returned HTTP ${response.status}${text?` - ${text.slice(0,200)}`:''}`);}const errors=apiErrors(data);if(!response.ok||errors.length)throw new Error(`${label}: ${errors.length?errors.join('; '):`HTTP ${response.status}`}`);return data.response||[];}
async function fetchLeague({id,name},apiKey,from,to,season){const url=new URL(`${API_BASE}/fixtures`);url.searchParams.set('league',String(id));url.searchParams.set('season',String(season));url.searchParams.set('from',from);url.searchParams.set('to',to);url.searchParams.set('timezone','Europe/London');return{id,name,fixtures:(await readApi(url,apiKey,name)).map(mapFixture)};}
async function fetchDate(apiKey,date){const url=new URL(`${API_BASE}/fixtures`);url.searchParams.set('date',date);url.searchParams.set('timezone','Europe/London');const response=await readApi(url,apiKey,`Fixtures for ${date}`);const groups=new Map();response.forEach(item=>{const id=Number(item.league?.id||0);const key=String(id||`${item.league?.country||''}-${item.league?.name||''}`);if(!groups.has(key))groups.set(key,{id,name:item.league?.name||'Other',country:item.league?.country||'International',logo:item.league?.logo||'',flag:item.league?.flag||'',round:item.league?.round||'',fixtures:[]});groups.get(key).fixtures.push(mapFixture(item));});return[...groups.values()].map(league=>({...league,fixtures:league.fixtures.sort((a,b)=>(a.timestamp||0)-(b.timestamp||0))})).sort((a,b)=>`${a.country} ${a.name}`.localeCompare(`${b.country} ${b.name}`,'en'));}
async function fetchLive(apiKey){const url=new URL(`${API_BASE}/fixtures`);url.searchParams.set('live','all');url.searchParams.set('timezone','Europe/London');const response=await readApi(url,apiKey,'Live scores');return LEAGUES.map(league=>({...league,fixtures:response.filter(item=>Number(item.league?.id)===league.id).map(mapFixture)}));}
async function fetchResults(apiKey,now,season,leagues=LEAGUES){const fromDate=new Date(now.getTime()-30*24*60*60*1000);const from=londonDateString(fromDate);const to=londonDateString(now);const results=await Promise.all(leagues.map(async league=>{const result=await fetchLeague(league,apiKey,from,to,season);return{...result,fixtures:result.fixtures.filter(f=>FINISHED.has(f.status)).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0))};}));return{from,to,leagues:results};}

async function fotmobFallback(req,res,reason=''){
  const now=new Date();
  const season=seasonFor(now);
  const requestedDate=String(req.query?.date||'').trim();
  const liveOnly=String(req.query?.live||'')==='1';
  const resultsOnly=String(req.query?.results||'')==='1';
  const predictionsOnly=String(req.query?.predictions||'')==='1';
  const fallback=Boolean(reason);

  if(predictionsOnly){
    const payload=await getPredictionFallback(resultsOnly);
    res.setHeader('Cache-Control',resultsOnly?'public, s-maxage=300, stale-while-revalidate=900':'public, s-maxage=180, stale-while-revalidate=600');
    return res.status(200).json({...payload,season,predictions:true,fallback,reason});
  }
  if(requestedDate){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate))return res.status(400).json({error:'Invalid date. Use YYYY-MM-DD.'});
    const leagues=await getFotmobMatchesByDate(requestedDate);
    res.setHeader('Cache-Control',requestedDate===fotmobDate(now)?'public, s-maxage=45, stale-while-revalidate=90':'public, s-maxage=900, stale-while-revalidate=1800');
    return res.status(200).json({date:requestedDate,allCompetitions:true,provider:'FotMob',fallback,reason,leagues});
  }
  if(liveOnly){
    const all=await getFotmobMatchesByDate(fotmobDate(now));
    const leagues=LEAGUES.map(league=>{const source=all.find(x=>Number(x.id)===league.id);return{...league,fixtures:(source?.fixtures||[]).filter(f=>LIVE.has(f.status))};});
    res.setHeader('Cache-Control','public, s-maxage=30, stale-while-revalidate=60');
    return res.status(200).json({season,live:true,provider:'FotMob',fallback,reason,leagues});
  }
  const sourceLeagues=[FOTMOB_LEAGUES.premier,FOTMOB_LEAGUES.championship,FOTMOB_LEAGUES.scottishPremiership];
  const fetched=await Promise.all(sourceLeagues.map(async league=>({league,fixtures:await getFotmobLeagueMatches(league)})));
  if(resultsOnly){
    const fromMs=now.getTime()-30*24*60*60*1000;
    const leagues=fetched.map(({league,fixtures})=>({id:league.siteId,name:league.name,fixtures:withinRange(fixtures,fromMs,now.getTime()).filter(f=>FINISHED.has(f.status)).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0))}));
    res.setHeader('Cache-Control','public, s-maxage=180, stale-while-revalidate=300');
    return res.status(200).json({season,results:true,provider:'FotMob',fallback,reason,leagues});
  }
  const fromMs=now.getTime()-6*60*60*1000,toMs=now.getTime()+14*24*60*60*1000;
  const leagues=fetched.map(({league,fixtures})=>({id:league.siteId,name:league.name,fixtures:withinRange(fixtures,fromMs,toMs).sort((a,b)=>(a.timestamp||0)-(b.timestamp||0))}));
  res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=600');
  return res.status(200).json({from:londonDateString(now),to:londonDateString(new Date(toMs)),season,provider:'FotMob',fallback,reason,leagues});
}

export default async function handler(req,res){
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
  const now=new Date();const end=new Date(now.getTime()+14*24*60*60*1000);const from=londonDateString(now);const to=londonDateString(end);const season=seasonFor(now);const liveOnly=String(req.query?.live||'')==='1';const resultsOnly=String(req.query?.results||'')==='1';const predictionsOnly=String(req.query?.predictions||'')==='1';const requestedDate=String(req.query?.date||'').trim();const apiKey=(process.env.API_FOOTBALL_KEY||'').trim();
  if(!apiKey){try{return await fotmobFallback(req,res);}catch(error){return res.status(502).json({error:'Unable to load fixtures right now',detail:String(error.message||error),season,from,to});}}
  try{
    if(requestedDate){if(!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate))return res.status(400).json({error:'Invalid date. Use YYYY-MM-DD.'});const leagues=await fetchDate(apiKey,requestedDate);const today=londonDateString(now);res.setHeader('Cache-Control',requestedDate===today?'public, s-maxage=30, stale-while-revalidate=30':requestedDate<today?'public, s-maxage=3600, stale-while-revalidate=86400':'public, s-maxage=900, stale-while-revalidate=1800');return res.status(200).json({date:requestedDate,allCompetitions:true,leagues});}
    if(resultsOnly){const resultData=await fetchResults(apiKey,now,season,predictionsOnly?PREDICTION_LEAGUES:LEAGUES);res.setHeader('Cache-Control','public, s-maxage=120, stale-while-revalidate=120');return res.status(200).json({from:resultData.from,to:resultData.to,season,results:true,predictions:predictionsOnly,leagues:resultData.leagues});}
    const selectedLeagues=predictionsOnly?PREDICTION_LEAGUES:LEAGUES;const results=liveOnly?await fetchLive(apiKey):await Promise.all(selectedLeagues.map(league=>fetchLeague(league,apiKey,from,to,season)));res.setHeader('Cache-Control',liveOnly?'public, s-maxage=30, stale-while-revalidate=30':'public, s-maxage=900, stale-while-revalidate=1800');return res.status(200).json({from,to,season,live:liveOnly,predictions:predictionsOnly,leagues:results});
  }catch(error){const message=error instanceof Error?error.message:String(error);console.error('API-Football fixtures error:',message);try{return await fotmobFallback(req,res,message);}catch(fallbackError){console.error('FotMob fixture fallback error:',fallbackError);res.setHeader('Cache-Control','no-store');return res.status(502).json({error:'Unable to load fixtures right now',detail:`${message}; fallback: ${String(fallbackError.message||fallbackError)}`,season,from,to});}}
}
