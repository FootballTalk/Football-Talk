const SKY = 'https://www.skysports.com';
const INDEXES = [
  `${SKY}/football`, `${SKY}/premier-league`,
  `${SKY}/author/dermot-gallagher-648`,
  'https://www.skysports.com/rss/12040'
];
// Verified current edition; discovery replaces it as soon as a newer edition appears.
const VERIFIED = `${SKY}/football/live-blog/13576553/ref-watch-and-premier-league-weekend-reaction-live-dermot-gallagher-assesses-the-big-refereeing-decisions`;
function clean(v='') { return v.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim(); }
function candidates(html) {
  return [...html.matchAll(/(?:href=["']|<link>)([^"'<>\s]+)/gi)].map(m=>{
    try { const u=new URL(m[1],SKY); return u.hostname==='www.skysports.com' && /\/(?:football\/(?:news|video|live-blog)|watch\/video)\//.test(u.pathname) && /ref-watch/i.test(u.pathname) ? u.href : ''; } catch { return ''; }
  }).filter(Boolean);
}
function metadata(html,url) {
  const title=clean((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)||[])[1]||'');
  const raw=(html.match(/["']datePublished["']\s*:\s*["']([^"']+)/i)||html.match(/<time[^>]*datetime=["']([^"']+)/i)||html.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(\d{1,2}\s+\w+\s+\d{4}\s+\d{2}:\d{2})/i)||[])[1];
  const published=Date.parse(raw||'');
  if(!/ref watch/i.test(title)||!Number.isFinite(published)||published>Date.now()+3600000) return null;
  const widget=(html.match(/(?:https:\/\/www\.skysports\.com)?\/iframe\/widget\/video\/([A-Za-z0-9_-]{16,})/i)||[])[1];
  return {title,articleUrl:url,publishedAt:new Date(published).toISOString(),published,
    sourceUnavailable:/Sorry, this blog is currently unavailable/i.test(clean(html)),
    embedUrl:widget?`${SKY}/iframe/widget/video/${widget}`:null};
}
async function get(url) {
  const r=await fetch(url,{signal:AbortSignal.timeout(5000),headers:{'User-Agent':'Mozilla/5.0 (compatible; FootballTalk/1.0)','Accept-Language':'en-GB'}});
  if(!r.ok) throw new Error(`Sky ${r.status}`);
  return r.text();
}
module.exports=async function handler(req,res) {
  res.setHeader('Cache-Control','s-maxage=1800, stale-while-revalidate=300');
  const indexes=await Promise.allSettled(INDEXES.map(get));
  const urls=[...new Set([VERIFIED,...indexes.filter(r=>r.status==='fulfilled').flatMap(r=>candidates(r.value))])].slice(0,24);
  const results=await Promise.allSettled(urls.map(async url=>metadata(await get(url),url)));
  const latest=results.filter(r=>r.status==='fulfilled'&&r.value).map(r=>r.value).sort((a,b)=>b.published-a.published)[0];
  const london=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const monday=new Date(`${london}T00:00:00Z`); monday.setUTCDate(monday.getUTCDate()-(monday.getUTCDay()+6)%7);
  const current=latest && latest.published>=monday.getTime();
  return res.status(200).json({available:!!latest,provider:'Sky Sports',checkedAt:new Date().toISOString(),editionWeek:monday.toISOString().slice(0,10),status:!latest?'unavailable':!current?'awaiting-edition':latest.sourceUnavailable?'source-unavailable':'current',...(latest||{})});
};
