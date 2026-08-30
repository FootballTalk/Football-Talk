import {FOTMOB_LEAGUES,getFotmobLeagueMatches,withinRange} from '../lib/fotmob.js';

const COMPETITIONS=[
  FOTMOB_LEAGUES.premier,
  FOTMOB_LEAGUES.faCup,
  FOTMOB_LEAGUES.carabao,
  FOTMOB_LEAGUES.championsLeague,
  FOTMOB_LEAGUES.europaLeague,
];
const FINISHED=new Set(['FT','AET','PEN']);

export async function getPredictionFallback(results=false){
  const now=new Date();
  const from=results?new Date(now.getTime()-40*24*60*60*1000):new Date(now.getTime()-6*60*60*1000);
  const to=results?new Date(now.getTime()+24*60*60*1000):new Date(now.getTime()+28*24*60*60*1000);
  const settled=await Promise.allSettled(COMPETITIONS.map(async comp=>({comp,fixtures:await getFotmobLeagueMatches(comp)})));
  const leagues=[];
  const errors=[];

  settled.forEach((result,index)=>{
    const comp=COMPETITIONS[index];
    if(result.status==='fulfilled'){
      let fixtures=withinRange(result.value.fixtures,from.getTime(),to.getTime());
      fixtures=fixtures
        .filter(f=>results?FINISHED.has(f.status):!FINISHED.has(f.status))
        .map(f=>({...f,competition:comp.name,leagueId:comp.siteId}))
        .sort((a,b)=>results?(b.timestamp||0)-(a.timestamp||0):(a.timestamp||0)-(b.timestamp||0));
      leagues.push({id:comp.siteId,name:comp.name,fixtures});
    }else{
      errors.push(`${comp.name}: ${String(result.reason?.message||result.reason)}`);
      leagues.push({id:comp.siteId,name:comp.name,fixtures:[]});
    }
  });

  return {
    source:'fotmob-fallback',
    results,
    from:from.toISOString(),
    to:to.toISOString(),
    leagues,
    errors,
  };
}

export default async function handler(req,res){
  if(req.method!=='GET'){
    res.setHeader('Allow','GET');
    return res.status(405).json({error:'Method not allowed'});
  }
  const results=String(req.query?.results||'')==='1';
  try{
    const payload=await getPredictionFallback(results);
    const total=payload.leagues.reduce((n,l)=>n+l.fixtures.length,0);
    res.setHeader('Cache-Control',results?'public, s-maxage=300, stale-while-revalidate=900':'public, s-maxage=180, stale-while-revalidate=600');
    return res.status(total?200:200).json(payload);
  }catch(error){
    res.setHeader('Cache-Control','no-store');
    return res.status(502).json({error:'Prediction fixtures temporarily unavailable',detail:String(error.message||error)});
  }
}
