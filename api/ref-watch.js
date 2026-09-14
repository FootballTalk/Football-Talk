const FEEDS = [
  { url: 'https://feeds.bbci.co.uk/sport/football/rss.xml', source: 'BBC Sport' },
  { url: 'https://feeds.bbci.co.uk/sport/football/premier-league/rss.xml', source: 'BBC Sport' },
  { url: 'https://www.theguardian.com/football/rss', source: 'The Guardian' }
];

const TERMS = [
  'var','referee','refereeing','offside','penalty','red card','sending off','sent off','handball',
  'decision','controversial','controversy','pgmol','pro ref','apology','apologise','apologize','wrongly allowed',
  'wrongly disallowed','disallowed goal','overturned','on-field review','reviewed by var'
];
const STOP = new Set(['the','and','for','from','with','that','this','have','has','was','were','are','but','not','after','before','into','over','under','their','they','his','her','its','our','your','you','who','what','when','where','why','how']);

function decode(text='') {
  return String(text)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1')
    .replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&apos;/g,"'")
    .replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
}
function tag(block, name) {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`,'i'));
  return m ? decode(m[1]) : '';
}
function parse(xml, source) {
  return [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map(m=>{
    const b=m[0], title=tag(b,'title'), description=tag(b,'description'), link=tag(b,'link'), raw=tag(b,'pubDate');
    const published=raw?Date.parse(raw):0;
    return {title,description,link,source,published};
  }).filter(x=>x.title && x.link && x.published);
}
function mondayKey(date=new Date()) {
  const d=new Date(date);
  const day=d.getUTCDay();
  const delta=(day+6)%7;
  d.setUTCDate(d.getUTCDate()-delta);
  return d.toISOString().slice(0,10);
}
function weekendWindow() {
  const monday=mondayKey();
  const end=new Date(`${monday}T23:59:59Z`).getTime();
  const start=end-(4*86400000)+1000;
  return {monday,start,end};
}
function score(item) {
  const t=`${item.title} ${item.description}`.toLowerCase();
  let s=0;
  for (const term of TERMS) if (t.includes(term)) s+=term.includes('wrongly')||term.includes('apolog')||term==='pgmol'||term==='pro ref'?5:2;
  if (/premier league|manchester|arsenal|liverpool|chelsea|tottenham|newcastle|sunderland|everton|villa|west ham|wolves|brighton|brentford|fulham|palace|forest|bournemouth|burnley|leeds/.test(t)) s+=2;
  if (/podcast|talking points|live blog|round-up|roundup/.test(item.title.toLowerCase())) s-=8;
  return s;
}
function tokens(value='') {
  return new Set(String(value).toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(x=>x.length>2&&!STOP.has(x)));
}
function similar(a,b) {
  const A=tokens(`${a.title} ${a.description}`), B=tokens(`${b.title} ${b.description}`);
  if(!A.size||!B.size) return false;
  let common=0;
  for(const x of A) if(B.has(x)) common++;
  return common/Math.min(A.size,B.size)>=0.42;
}
function verdict(item) {
  const t=`${item.title} ${item.description}`.toLowerCase();
  if (/wrongly|error|mistake|apolog|should not have stood|shouldn't have stood/.test(t)) return {label:'WRONG DECISION',className:'wrong'};
  if (/correct decision|right decision|correctly|justified/.test(t)) return {label:'DECISION SUPPORTED',className:'right'};
  return {label:'DEBATABLE',className:'debate'};
}
function question(title='') {
  const clean=title.replace(/[?.!]+$/,'').trim();
  return `${clean} — did the officials get it right?`;
}

module.exports = async function handler(req,res) {
  try {
    const {monday,start,end}=weekendWindow();
    const settled=await Promise.allSettled(FEEDS.map(async f=>{
      const r=await fetch(f.url,{headers:{'User-Agent':'FootballTalk/1.0 (+https://footballtalk.uk)'}});
      if(!r.ok) throw new Error(`feed ${r.status}`);
      return parse(await r.text(),f.source);
    }));
    const all=settled.filter(x=>x.status==='fulfilled').flatMap(x=>x.value)
      .filter(x=>x.published>=start && x.published<=end)
      .map(x=>({...x,relevance:score(x)}))
      .filter(x=>x.relevance>=4)
      .sort((a,b)=>b.relevance-a.relevance || b.published-a.published);

    const chosen=[];
    for (const item of all) {
      if (chosen.some(existing=>similar(item,existing))) continue;
      chosen.push(item);
      if(chosen.length>=5) break;
    }

    const items=chosen.map(item=>{
      const v=verdict(item);
      return {
        title:item.title,
        incident:item.description || 'A major refereeing or VAR talking point from the weekend.',
        professionalView:`Reported by ${item.source}. Football Talk links to the original report for the full context and any professional referee analysis available.`,
        footballTalkVerdict:v.label==='WRONG DECISION'?'The reporting points to an acknowledged officiating error, so this is flagged as a wrong decision.':v.label==='DECISION SUPPORTED'?'The available reporting supports the on-field or VAR decision.':'This remains a genuine judgement call and is one for fans to debate.',
        verdict:v,
        yourVerdict:question(item.title),
        source:item.source,
        link:item.link,
        publishedAt:new Date(item.published).toISOString()
      };
    });

    res.setHeader('Cache-Control','s-maxage=21600, stale-while-revalidate=86400');
    res.status(200).json({editionKey:monday,editionDate:monday,updatedAt:new Date().toISOString(),items});
  } catch (e) {
    res.status(500).json({error:'Unable to build Ref Watch edition',items:[]});
  }
};
