const API_BASE='https://v3.football.api-sports.io';

function apiErrors(data){if(!data||!data.errors)return[];if(Array.isArray(data.errors))return data.errors.filter(Boolean).map(String);if(typeof data.errors==='object')return Object.entries(data.errors).map(([k,v])=>`${k}: ${v}`);return[String(data.errors)];}
async function readApi(path,key,label){const r=await fetch(`${API_BASE}${path}`,{headers:{'x-apisports-key':key,accept:'application/json'}});let data;try{data=await r.json();}catch{throw new Error(`${label}: invalid response`);}const errors=apiErrors(data);if(!r.ok||errors.length)throw new Error(`${label}: ${errors.join('; ')||`HTTP ${r.status}`}`);return data.response||[];}
function seasonFor(date){const d=new Date(date);const y=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric'}).format(d));const m=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',month:'numeric'}).format(d));return m>=7?y:y-1;}
function resultLetter(f,teamId){const h=f.teams?.home?.id,a=f.teams?.away?.id,hg=f.goals?.home,ag=f.goals?.away;if(hg==null||ag==null)return null;if(hg===ag)return'D';const win=(h===teamId&&hg>ag)||(a===teamId&&ag>hg);return win?'W':'L';}
function mapRecent(rows,teamId){return rows.filter(x=>['FT','AET','PEN'].includes(String(x.fixture?.status?.short||''))).slice(0,5).map(x=>({date:x.fixture?.date,home:x.teams?.home?.name||'',away:x.teams?.away?.name||'',homeGoals:x.goals?.home??null,awayGoals:x.goals?.away??null,result:resultLetter(x,teamId)}));}
function mapH2H(rows){return rows.filter(x=>['FT','AET','PEN'].includes(String(x.fixture?.status?.short||''))).slice(0,5).map(x=>({date:x.fixture?.date,home:x.teams?.home?.name||'',away:x.teams?.away?.name||'',homeGoals:x.goals?.home??null,awayGoals:x.goals?.away??null}));}
function mapInjury(rows){return rows.slice(0,12).map(x=>({team:x.team?.name||'',player:x.player?.name||'',type:x.player?.type||'',reason:x.player?.reason||''})).filter(x=>x.player);}
function standingsContext(rows,homeId,awayId){const flat=(rows?.[0]?.league?.standings||[]).flat();const pick=id=>{const r=flat.find(x=>Number(x.team?.id)===Number(id));return r?{rank:r.rank??null,points:r.points??null,played:r.all?.played??null,form:r.form||'',goalDiff:r.goalsDiff??null}:null;};return{home:pick(homeId),away:pick(awayId)};}

export default async function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}const id=String(req.query?.id||req.query?.fixture||'').trim();if(!/^\d+$/.test(id))return res.status(400).json({error:'A numeric fixture id is required'});const key=(process.env.API_FOOTBALL_KEY||'').trim();if(!key)return res.status(503).json({error:'Pre-match data provider is not configured'});
 try{
  const fixtureRows=await readApi(`/fixtures?id=${encodeURIComponent(id)}&timezone=Europe%2FLondon`,key,'Fixture');if(!fixtureRows.length)return res.status(404).json({error:'Fixture not found'});const x=fixtureRows[0];const homeId=x.teams?.home?.id,awayId=x.teams?.away?.id,leagueId=x.league?.id,season=x.league?.season||seasonFor(x.fixture?.date||Date.now());
  const [homeRecent,awayRecent,h2h,standings,injuries]=await Promise.all([
   readApi(`/fixtures?team=${homeId}&last=8&timezone=Europe%2FLondon`,key,'Home form').catch(()=>[]),
   readApi(`/fixtures?team=${awayId}&last=8&timezone=Europe%2FLondon`,key,'Away form').catch(()=>[]),
   readApi(`/fixtures/headtohead?h2h=${homeId}-${awayId}&last=5&timezone=Europe%2FLondon`,key,'Head to head').catch(()=>[]),
   leagueId?readApi(`/standings?league=${leagueId}&season=${season}`,key,'Standings').catch(()=>[]):Promise.resolve([]),
   readApi(`/injuries?fixture=${encodeURIComponent(id)}`,key,'Injuries').catch(()=>[])
  ]);
  res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=600');return res.status(200).json({fixture:{id:Number(id),homeId,awayId,home:x.teams?.home?.name||'',away:x.teams?.away?.name||'',league:x.league?.name||'',leagueId,season,date:x.fixture?.date,status:x.fixture?.status?.short||'NS'},form:{home:mapRecent(homeRecent,homeId),away:mapRecent(awayRecent,awayId)},h2h:mapH2H(h2h),standings:standingsContext(standings,homeId,awayId),availability:mapInjury(injuries),updatedAt:new Date().toISOString(),provider:'API-Football'});
 }catch(error){console.error('Pre-match intelligence error:',String(error.message||error));res.setHeader('Cache-Control','no-store');return res.status(502).json({error:'Unable to load pre-match intelligence right now'});}
}
