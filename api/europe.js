import {FOTMOB_LEAGUES,getFotmobLeagueMatches,withinRange} from '../lib/fotmob.js';

const API_BASE='https://v3.football.api-sports.io';
const COMPETITIONS=[{id:2,name:'UEFA Champions League'},{id:3,name:'UEFA Europa League'}];
const FOTMOB_COMPETITIONS=[FOTMOB_LEAGUES.championsLeague,FOTMOB_LEAGUES.europaLeague];
const LIVE=new Set(['1H','2H','ET','BT','P','LIVE','HT','INT']);
const FINISHED=new Set(['FT','AET','PEN']);
const PAST_DAYS=30;
const FUTURE_DAYS=45;

function londonDateString(date){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);const map=Object.fromEntries(parts.map(({type,value})=>[type,value]));return `${map.year}-${map.month}-${map.day}`;}
function seasonFor(date){const year=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric'}).format(date));const month=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',month:'numeric'}).format(date));return month>=7?year:year-1;}
function apiErrors(data){if(!data||!data.errors)return[];if(Array.isArray(data.errors))return data.errors.filter(Boolean).map(String);if(typeof data.errors==='object')return Object.entries(data.errors).map(([key,value])=>`${key}: ${value}`);return[String(data.errors)];}
function mapFixture(item){return{id:item.fixture?.id,date:item.fixture?.date,timestamp:item.fixture?.timestamp,status:item.fixture?.status?.short||'NS',elapsed:item.fixture?.status?.elapsed??null,round:item.league?.round||'',home:item.teams?.home?.name||'',away:item.teams?.away?.name||'',homeLogo:item.teams?.home?.logo||'',awayLogo:item.teams?.away?.logo||'',homeGoals:item.goals?.home??null,awayGoals:item.goals?.away??null};}
async function readApi(url,apiKey,label){const response=await fetch(url,{headers:{'x-apisports-key':apiKey,accept:'application/json'}});let data;try{data=await response.json();}catch{throw new Error(`${label}: invalid API response (HTTP ${response.status})`);}const errors=apiErrors(data);if(!response.ok||errors.length)throw new Error(`${label}: ${errors.length?errors.join('; '):`HTTP ${response.status}`}`);return data.response||[];}
async function fetchCompetition(comp,apiKey,from,to,season){const url=new URL(`${API_BASE}/fixtures`);url.searchParams.set('league',String(comp.id));url.searchParams.set('season',String(season));url.searchParams.set('from',from);url.searchParams.set('to',to);url.searchParams.set('timezone','Europe/London');const rows=await readApi(url,apiKey,comp.name);return{...comp,fixtures:rows.map(mapFixture).filter(f=>f.date&&f.home&&f.away)};}
async function fetchLive(apiKey){const url=new URL(`${API_BASE}/fixtures`);url.searchParams.set('live','all');url.searchParams.set('timezone','Europe/London');const rows=await readApi(url,apiKey,'European live scores');return COMPETITIONS.map(comp=>({...comp,fixtures:rows.filter(item=>Number(item.league?.id)===comp.id).map(mapFixture)}));}

async function fotmobFallback(res,{liveOnly,historyOnly,reason=''}){
  const now=new Date();
  const fromMs=now.getTime()-PAST_DAYS*86400000;
  const toMs=now.getTime()+FUTURE_DAYS*86400000;
  const fetched=await Promise.all(FOTMOB_COMPETITIONS.map(async comp=>({comp,fixtures:await getFotmobLeagueMatches(comp)})));
  const competitions=fetched.map(({comp,fixtures})=>{
    let list;
    if(liveOnly) list=fixtures.filter(f=>LIVE.has(f.status));
    else if(historyOnly) list=withinRange(fixtures,fromMs,now.getTime()).filter(f=>FINISHED.has(f.status));
    else list=withinRange(fixtures,now.getTime()-86400000,toMs).filter(f=>!FINISHED.has(f.status)||Number(f.timestamp||0)*1000>=now.getTime()-86400000);
    return{id:comp.siteId,name:comp.name,fixtures:list.sort((a,b)=>(a.timestamp||0)-(b.timestamp||0))};
  });
  res.setHeader('Cache-Control',liveOnly?'public, s-maxage=30, stale-while-revalidate=60':'public, s-maxage=300, stale-while-revalidate=900');
  return res.status(200).json({from:londonDateString(new Date(fromMs)),to:londonDateString(new Date(toMs)),season:seasonFor(now),live:liveOnly,results:historyOnly,provider:'FotMob',fallback:true,reason,competitions});
}

export default async function handler(req,res){
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
  const key=(process.env.API_FOOTBALL_KEY||'').trim();
  const now=new Date();
  const season=seasonFor(now);
  const liveOnly=String(req.query?.live||'')==='1';
  const historyOnly=String(req.query?.results||'')==='1';
  const start=historyOnly?new Date(now.getTime()-PAST_DAYS*86400000):now;
  const end=historyOnly?now:new Date(now.getTime()+FUTURE_DAYS*86400000);
  const from=londonDateString(start),to=londonDateString(end);

  if(!key){try{return await fotmobFallback(res,{liveOnly,historyOnly,reason:'API_FOOTBALL_KEY is not configured'});}catch(error){res.setHeader('Cache-Control','no-store');return res.status(502).json({error:'Unable to load European fixtures right now',detail:String(error.message||error),season,from,to});}}

  try{
    let competitions;
    if(liveOnly) competitions=await fetchLive(key);
    else{
      competitions=await Promise.all(COMPETITIONS.map(comp=>fetchCompetition(comp,key,from,to,season)));
      if(historyOnly) competitions=competitions.map(comp=>({...comp,fixtures:comp.fixtures.filter(f=>FINISHED.has(f.status)).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0))}));
    }
    res.setHeader('Cache-Control',liveOnly?'public, s-maxage=30, stale-while-revalidate=30':'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({from,to,season,live:liveOnly,results:historyOnly,provider:'API-Football',competitions});
  }catch(error){
    const message=String(error?.message||error);console.error('European football API error:',message);
    try{return await fotmobFallback(res,{liveOnly,historyOnly,reason:message});}
    catch(fallbackError){res.setHeader('Cache-Control','no-store');return res.status(502).json({error:'Unable to load European fixtures right now',detail:`${message}; fallback: ${String(fallbackError.message||fallbackError)}`,season,from,to});}
  }
}
