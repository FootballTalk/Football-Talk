const SOURCE='https://www.statbunker.com/competitions/Top10KeepersCleanSheets?comp_id=791';

function decode(s=''){
  return String(s)
    .replace(/<script[\s\S]*?<\/script>/gi,' ')
    .replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;/gi,' ')
    .replace(/&amp;/gi,'&')
    .replace(/&quot;/gi,'"')
    .replace(/&#39;|&#039;/gi,"'")
    .replace(/&lt;/gi,'<')
    .replace(/&gt;/gi,'>')
    .replace(/\s+/g,' ')
    .trim();
}

function parseTable(html){
  const tables=String(html).match(/<table\b[\s\S]*?<\/table>/gi)||[];
  for(const table of tables){
    const rows=(table.match(/<tr\b[\s\S]*?<\/tr>/gi)||[]).map(row=>(row.match(/<(?:th|td)\b[\s\S]*?<\/(?:th|td)>/gi)||[]).map(decode));
    const headerIndex=rows.findIndex(r=>r.some(c=>/^players?$/i.test(c))&&r.some(c=>/^cs$/i.test(c)));
    if(headerIndex<0) continue;
    const headers=rows[headerIndex].map(h=>h.toLowerCase());
    const ix={name:headers.findIndex(h=>h==='players'||h==='player'),team:headers.findIndex(h=>h==='clubs'||h==='club'),cs:headers.findIndex(h=>h==='cs'),played:headers.findIndex(h=>h==='pld'||h==='p'||h.includes('played'))};
    return rows.slice(headerIndex+1).map(r=>({
      name:r[ix.name]||'',
      team:ix.team>=0?r[ix.team]||'':'',
      cleanSheets:Number(String(r[ix.cs]||'0').replace(/[^0-9.-]/g,''))||0,
      appearances:ix.played>=0?(Number(String(r[ix.played]||'0').replace(/[^0-9.-]/g,''))||0):0
    })).filter(p=>p.name&&p.cleanSheets>=0);
  }
  return [];
}

export default async function handler(req,res){
  if(req.method!=='GET') return res.status(405).json({error:'Method not allowed'});
  try{
    const r=await fetch(SOURCE,{headers:{'user-agent':'Mozilla/5.0 FootballTalk/1.0',accept:'text/html,application/xhtml+xml'}});
    const html=await r.text();
    if(!r.ok) throw new Error(`StatBunker returned ${r.status}`);
    const players=parseTable(html)
      .sort((a,b)=>b.cleanSheets-a.cleanSheets||b.appearances-a.appearances||a.name.localeCompare(b.name))
      .slice(0,20)
      .map((p,index)=>({...p,rank:index+1,photo:'',teamLogo:''}));
    if(!players.length) throw new Error('No goalkeeper rows found');
    res.setHeader('Cache-Control','public, s-maxage=1800, stale-while-revalidate=1800');
    return res.status(200).json({season:'2026/27',updatedAt:new Date().toISOString(),source:'StatBunker',players,note:'Goalkeeper clean sheets for the current Premier League season.'});
  }catch(error){
    res.setHeader('Cache-Control','no-store');
    return res.status(502).json({error:'Unable to load goalkeeper clean sheets',detail:String(error)});
  }
}
