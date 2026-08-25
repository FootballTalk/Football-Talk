export default async function handler(req,res){
  try{
    const url='https://www.fotmob.com/api/data/leagueseasondeepstats?id=47&season=36781&type=players&stat=goals';
    const r=await fetch(url,{headers:{accept:'application/json','user-agent':'Mozilla/5.0 FootballTalk/1.0'}});
    const text=await r.text();
    let data;try{data=JSON.parse(text)}catch{data={raw:text.slice(0,2000)}}
    return res.status(200).json({status:r.status,keys:data&&typeof data==='object'?Object.keys(data):[],sample:data});
  }catch(e){return res.status(500).json({error:String(e)})}
}
