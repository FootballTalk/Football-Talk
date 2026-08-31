import {getFotmobMatchDetails} from '../lib/fotmob.js';

const API_BASE='https://v3.football.api-sports.io';

function apiErrors(data){
  if(!data||!data.errors)return[];
  if(Array.isArray(data.errors))return data.errors.filter(Boolean).map(String);
  if(typeof data.errors==='object')return Object.entries(data.errors).map(([k,v])=>`${k}: ${v}`);
  return[String(data.errors)];
}
async function readApi(path,key,label){
  const r=await fetch(`${API_BASE}${path}`,{headers:{'x-apisports-key':key,accept:'application/json'}});
  let data;try{data=await r.json();}catch{throw new Error(`${label}: invalid response`);}
  const errors=apiErrors(data);if(!r.ok||errors.length)throw new Error(`${label}: ${errors.join('; ')||`HTTP ${r.status}`}`);
  return data.response||[];
}
function mapEvent(e){return{minute:e.time?.elapsed??null,extra:e.time?.extra??null,team:e.team?.name||'',teamId:e.team?.id||null,player:e.player?.name||'',assist:e.assist?.name||'',type:e.type||'',detail:e.detail||'',comments:e.comments||''};}
function mapLineup(x){const player=p=>({id:p.player?.id||null,name:p.player?.name||'',number:p.player?.number??'',pos:p.player?.pos||'',grid:p.player?.grid||''});return{teamId:x.team?.id||null,team:x.team?.name||'',logo:x.team?.logo||'',formation:x.formation||'',coach:x.coach?.name||'',startXI:(x.startXI||[]).map(player),substitutes:(x.substitutes||[]).map(player)};}
function mapStats(rows){return rows.map(x=>({teamId:x.team?.id||null,team:x.team?.name||'',logo:x.team?.logo||'',stats:Object.fromEntries((x.statistics||[]).map(s=>[s.type,s.value]))}));}
function mapFixture(x){return{id:x.fixture?.id,date:x.fixture?.date,timestamp:x.fixture?.timestamp,status:x.fixture?.status?.short||'NS',longStatus:x.fixture?.status?.long||'',elapsed:x.fixture?.status?.elapsed??null,venue:x.fixture?.venue?.name||'',city:x.fixture?.venue?.city||'',referee:x.fixture?.referee||'',leagueId:x.league?.id||null,league:x.league?.name||'',country:x.league?.country||'',round:x.league?.round||'',leagueLogo:x.league?.logo||'',homeId:x.teams?.home?.id||null,home:x.teams?.home?.name||'',homeLogo:x.teams?.home?.logo||'',awayId:x.teams?.away?.id||null,away:x.teams?.away?.name||'',awayLogo:x.teams?.away?.logo||'',homeGoals:x.goals?.home??null,awayGoals:x.goals?.away??null,halftimeHome:x.score?.halftime?.home??null,halftimeAway:x.score?.halftime?.away??null,penaltyHome:x.score?.penalty?.home??null,penaltyAway:x.score?.penalty?.away??null};}
function extractFotmob(raw,id){
  const h=raw?.header||{};const content=raw?.content||{};const teams=h?.teams||[];const home=teams[0]||h?.homeTeam||{};const away=teams[1]||h?.awayTeam||{};const status=h?.status||{};
  const events=(content?.matchFacts?.events?.events||content?.matchFacts?.events||[]).flatMap(group=>Array.isArray(group?.events)?group.events:[group]).filter(Boolean).map(e=>({minute:e.time??e.minute??null,extra:null,team:e.teamName||'',teamId:e.teamId||null,player:e.player?.name||e.name||'',assist:e.assist?.name||'',type:e.type||e.eventType||'',detail:e.card||e.reason||'',comments:''}));
  const statGroups=content?.stats?.Periods?.All?.stats||content?.stats?.periods?.all?.stats||[];const stats=[{team:'Home',stats:{}},{team:'Away',stats:{}}];for(const group of statGroups){for(const s of group.stats||[]){const title=s.title||s.name||'';if(!title)continue;stats[0].stats[title]=s.stats?.[0]??s.home??null;stats[1].stats[title]=s.stats?.[1]??s.away??null;}}
  return{fixture:{id,date:status?.utcTime||h?.status?.utcTime||null,status:status?.finished?'FT':status?.started?'LIVE':'NS',longStatus:status?.reason?.long||status?.reason?.short||'',elapsed:null,venue:content?.matchFacts?.infoBox?.Venue?.name||'',city:'',referee:content?.matchFacts?.infoBox?.Referee?.text||'',league:h?.leagueName||'',country:'',round:h?.roundName||'',home:home?.name||'',homeLogo:home?.imageUrl||'',away:away?.name||'',awayLogo:away?.imageUrl||'',homeGoals:home?.score??null,awayGoals:away?.score??null},events,lineups:[],stats,provider:'FotMob'};
}
export default async function handler(req,res){
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
  const id=String(req.query?.id||req.query?.fixture||'').trim();if(!/^\d+$/.test(id))return res.status(400).json({error:'A numeric fixture id is required'});
  const key=(process.env.API_FOOTBALL_KEY||'').trim();
  if(key){
    try{
      const [fixtureRows,lineups,stats]=await Promise.all([
        readApi(`/fixtures?id=${encodeURIComponent(id)}&timezone=Europe%2FLondon`,key,'Fixture'),
        readApi(`/fixtures/lineups?fixture=${encodeURIComponent(id)}`,key,'Lineups').catch(()=>[]),
        readApi(`/fixtures/statistics?fixture=${encodeURIComponent(id)}`,key,'Statistics').catch(()=>[])
      ]);
      if(!fixtureRows.length)throw new Error('Fixture not found');
      const x=fixtureRows[0];
      res.setHeader('Cache-Control','public, s-maxage=30, stale-while-revalidate=60');
      return res.status(200).json({fixture:mapFixture(x),events:(x.events||[]).map(mapEvent),lineups:lineups.map(mapLineup),stats:mapStats(stats),updatedAt:new Date().toISOString(),provider:'API-Football'});
    }catch(error){console.error('Match detail API-Football error:',String(error.message||error));}
  }
  try{
    const raw=await getFotmobMatchDetails(id);const payload=extractFotmob(raw,id);res.setHeader('Cache-Control','public, s-maxage=30, stale-while-revalidate=60');return res.status(200).json({...payload,updatedAt:new Date().toISOString()});
  }catch(error){res.setHeader('Cache-Control','no-store');return res.status(502).json({error:'Unable to load match details right now',detail:String(error.message||error)});}
}
