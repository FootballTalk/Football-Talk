import {getFotmobMatchesByDate, fotmobDate} from '../lib/fotmob.js';

// Football Talk WhatsApp Channel matchday feed.
// Generates grouped, verified post drafts only. No unofficial WhatsApp sender.
// A publisher can consume these events when a compliant delivery route exists.
const FINAL = new Set(['FT','AET','PEN']);
const HALF = new Set(['HT','INT']);
const TIME_ZONE = 'Europe/London';
const NOW = () => new Date();
const fmtTime = date => new Intl.DateTimeFormat('en-GB', {timeZone:TIME_ZONE,hour:'2-digit',minute:'2-digit'}).format(date);
const norm = s => String(s||'').trim();
const score = f => Number.isFinite(Number(f.homeGoals)) && Number.isFinite(Number(f.awayGoals)) && f.homeGoals != null && f.awayGoals != null ? `${f.home} ${f.homeGoals}–${f.awayGoals} ${f.away}` : null;
const footer = '\n\n⚽ Football Talk — Where Fans Have Their Say\nhttps://footballtalk.uk';
const valid = f => f && f.id && f.home && f.away && f.date;
function leagueId(league) {
  const id=Number(league.id);
  const name=norm(league.name).toLowerCase();
  const country=norm(league.country).toLowerCase();
  if(id===39 || (name==='premier league'&&country==='england')) return 'PL';
  if(id===40 || ((name==='championship'||name==='efl championship')&&country==='england')) return 'CH';
  return null;
}
function group(fixtures, event, competition, label, now){
  const rows=fixtures.filter(f=>event==='HT'?HALF.has(f.status):FINAL.has(f.status)).filter(f=>score(f));
  if(!rows.length)return null;
  const lines=rows.map(score);
  const ids=rows.map(f=>String(f.id)).sort();
  return {event, competition, fixtureIds:ids, eventKey:`${fotmobDate(now)}:${competition}:${event}:${ids.join(',')}`, title:label, text:`⚽ ${label}\n\n${lines.join('\n')}${footer}`, matchCount:rows.length};
}
function officialLineups(fixture, payload){
  const rows=(payload?.fixtures||[]).find(f=>String(f.fixtureId)===String(fixture.id));
  if(!rows || rows.lineupType!=='confirmed' || !Array.isArray(rows.lineups) || rows.lineups.length!==2)return null;
  if(rows.lineups.some(t=>!Array.isArray(t.startXI)||t.startXI.length!==11))return null;
  const text=rows.lineups.map(t=>`🔹 ${t.team} ${t.formation?'('+t.formation+')':''}\n${t.startXI.map(p=>p.name).join(', ')}`).join('\n\n');
  return text;
}
export function buildMatchdayPosts({leagues,lineupData,now=NOW()}){
  const groups={PL:[],CH:[]};
  for(const l of leagues||[]){
    const id=leagueId(l);
    if(!id)continue;
    for(const f of l.fixtures||[])if(valid(f) && fotmobDate(f.date)===fotmobDate(now))groups[id].push(f);
  }
  const posts=[];
  // Premier League: only official confirmed XIs; never use predicted XI.
  for(const f of groups.PL){
    const kickoff=new Date(f.date).getTime();
    const age=now.getTime()-kickoff;
    if(age < -100*60000 || age > 20*60000)continue;
    const xi=officialLineups(f,lineupData);
    if(!xi)continue;
    posts.push({event:'XI',competition:'PL',fixtureIds:[String(f.id)],eventKey:`${fotmobDate(now)}:PL:XI:${f.id}`,title:`Confirmed lineups — ${f.home} v ${f.away}`,text:`📋 CONFIRMED PREMIER LEAGUE LINEUPS\n${f.home} v ${f.away} • ${fmtTime(f.date)}\n\n${xi}${footer}`,matchCount:1});
  }
  for(const [event,competition,title] of [
    ['HT','PL','Premier League half-time scores'],
    ['FT','PL','Premier League full-time results'],
    ['FT','CH','Championship full-time results']
  ]){
    const candidates=groups[competition].filter(f=>event==='HT'?HALF.has(f.status):FINAL.has(f.status));
    // Group games in the same kickoff batch, to avoid multiple near-identical notifications.
    const batches=new Map();
    for(const f of candidates){
      const kickoff=new Date(f.date).getTime();
      const bucket=Math.floor(kickoff/(30*60*1000));
      if(!batches.has(bucket))batches.set(bucket,[]);
      batches.get(bucket).push(f);
    }
    for(const [bucket,fixtures] of batches){
      const p=group(fixtures,event,competition,title,now);
      if(p)posts.push({...p,batch:bucket});
    }
  }
  return posts;
}
export default async function handler(req,res){
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
  // Protect previews: drafts can include licensed sporting data.
  const secret=process.env.MATCHDAY_FEED_TOKEN;
  if(!secret || req.headers.authorization!==`Bearer ${secret}`)return res.status(401).json({error:'Unauthorized'});
  const now=NOW(), date=fotmobDate(now);
  try{
    const leagues=await getFotmobMatchesByDate(date);
    // Only load lineups for today's PL matches; never publish predictions as confirmed.
    let lineupData=null;
    if(leagues.some(l=>leagueId(l)==='PL' && l.fixtures?.length)){
      const key=process.env.API_FOOTBALL_KEY;
      if(key){
        const response=await fetch(`https://v3.football.api-sports.io/fixtures?date=${date}&league=39&season=${Number(date.slice(0,4))-(Number(date.slice(5,7))<7?1:0)}`,{headers:{'x-apisports-key':key}});
        if(response.ok){
          const body=await response.json();
          const fixtures=[];
          for(const row of body.response||[]){
            const id=row.fixture?.id;
            if(!id)continue;
            const r=await fetch(`https://v3.football.api-sports.io/fixtures/lineups?fixture=${id}`,{headers:{'x-apisports-key':key}});
            if(!r.ok)continue;
            const lineups=(await r.json()).response||[];
            fixtures.push({fixtureId:id,lineupType:lineups.length===2?'confirmed':'pending',lineups:lineups.map(t=>({team:t.team?.name,formation:t.formation,startXI:(t.startXI||[]).map(p=>({name:p.player?.name}))}))});
          }
          lineupData={fixtures};
        }
      }
    }
    res.setHeader('Cache-Control','private, no-store');
    return res.status(200).json({date,delivery:'drafts_only',publisherConnected:false,posts:buildMatchdayPosts({leagues,lineupData,now}),note:'Do not publish until an approved WhatsApp Channels integration and persistent per-event deduplication are configured.'});
  }catch(error){return res.status(502).json({error:'Matchday feed unavailable',detail:String(error.message||error)});}
}
