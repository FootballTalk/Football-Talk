// Deterministic Football Talk answers. No language model or paid search calls.
export const routes = [
 ['match-centre','Match Centre','/match-centre.html','Live scores, match status and today’s games.',['match centre','match center','live scores','matchday']],
 ['fixtures','Fixtures & results','/fixtures.html','Browse fixtures and results by date and competition.',['fixtures','fixture']],
 ['results','Results','/results.html','Browse completed matches and their scores.',['results','result']],
 ['tables','Tables & stats','/tables-stats.html','League tables, player stats and competition information.',['tables','table','standings','stats','top scorer','top scorers','clean sheets']],
 ['lineups','Lineups','/lineups.html','Team sheets are labelled predicted until the provider confirms them.',['lineups','line ups','lineup','line up','starting eleven','starting xi']],
 ['tv','UK TV guide','/tv-guide.html','Kick-off times and UK television coverage.',['tv guide','television','tv','watch','channel']],
 ['transfers','Transfer Centre','/section.html?view=transfers','Attributed transfer reports and developing stories.',['transfers','transfer','signings','rumours','rumors']],
 ['news','News','/news.html','Fresh headlines and Football Talk coverage.',['news','headlines','headline']],
 ['ref-watch','Ref Watch','/ref-watch.html','Refereeing analysis, Football Talk’s verdict and fans’ views.',['ref watch','refwatch']],
 ['fan-voice','Fan Voice','/fan-voice.html','Original Football Talk opinions and editorials.',['fan voice','editorials','opinions','debate']],
 ['quiz','Daily Quiz','/quiz.html','Test your football and sports knowledge.',['quiz']],
 ['women','Women’s football','/womens-match-centre.html','Women’s fixtures, results, tables and news.',['womens football','women’s football','women football','wsl','lionesses']],
 ['grassroots','Grassroots','/grassroots/','Local football and grassroots coverage.',['grassroots','local football']],
 ['founder','Meet the founder','/meet-the-founder.html','Read Mark’s story and why he created Football Talk.',['founder','who created','who runs','who owns','mark']],
 ['advertising','Advertising & partnerships','/advertise.html','Find partnership and advertising opportunities.',['advertise','advertising','sponsor','partnership']],
 ['directory','Business directory','/business-directory.html','Businesses supporting the Football Talk community.',['directory','businesses']],
 ['shop','Shop','/shop.html','Explore the Football Talk shop.',['shop']],
 ['contact','Contact','/contact.html','Get in touch with Football Talk.',['contact']],
 ['home','Home','/','Today in Football, My Club and the latest updates.',['home','my club','my football']],
 ['more','More on Football Talk','/more.html','Explore all the sections.',['members','account','more']]
];
const aliases={
 'Manchester United':['manchester united','man united','man utd'], 'Manchester City':['manchester city','man city'], 'Tottenham Hotspur':['tottenham','spurs'], 'Wolverhampton Wanderers':['wolverhampton','wolves'], 'Brighton & Hove Albion':['brighton'], 'Newcastle United':['newcastle'], 'Nottingham Forest':['nottingham forest','forest'], 'AFC Bournemouth':['bournemouth'], 'West Ham United':['west ham'], 'Leeds United':['leeds'], 'Sheffield United':['sheffield united'], 'West Bromwich Albion':['west brom'], 'Queens Park Rangers':['qpr','queens park rangers']
};
const more=['Arsenal','Aston Villa','Brentford','Burnley','Chelsea','Crystal Palace','Everton','Fulham','Liverpool','Sunderland','Birmingham City','Blackburn Rovers','Bristol City','Cardiff City','Charlton Athletic','Coventry City','Derby County','Hull City','Ipswich Town','Leicester City','Lincoln City','Middlesbrough','Millwall','Norwich City','Oxford United','Portsmouth','Preston North End','Sheffield Wednesday','Southampton','Stoke City','Swansea City','Watford','Wrexham','Real Madrid','Barcelona','Bayern Munich','Paris Saint-Germain'];
for(const name of more) aliases[name]=[name.toLowerCase()];
export const clubNames=Object.keys(aliases);
export function norm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
function has(s,w){return (' '+s+' ').includes(' '+norm(w)+' ')}
export function findClubs(q){const low=norm(q);return Object.entries(aliases).filter(([,words])=>words.some(w=>has(low,w))).map(([name])=>name).filter(n=>n!=='Manchester United'||!has(low,'sheffield united')&&!has(low,'newcastle united')&&!has(low,'leeds united')||has(low,'manchester united')||has(low,'man utd'));}
export function sameClub(a,b){return norm(a)===norm(b)||(aliases[b]||[]).some(w=>norm(a)===norm(w))||findClubs(a).includes(b)}
export const faqs=[
 ['offside',/\boffside\b/,'In general, a player is in an offside position when they are in the opponents’ half and nearer the goal line than both the ball and the second-last opponent when a team-mate plays the ball. Position alone is not an offence: involvement in active play matters. There is no offside offence directly from a goal kick, throw-in or corner.'],
 ['goal-difference',/\b(goal difference|goal differential)\b/,'Goal difference is goals scored minus goals conceded. It can separate teams level on points; the full tie-breaking order depends on the competition.'],
 ['stoppage-time',/\b(stoppage|added|injury) time\b/,'Added time accounts for time lost during a half, such as substitutions, injuries and other delays. The board shows a minimum: further delays can mean the referee plays longer.'],
 ['var',/\b(what is var|what does var|how does var|var stand)\b/,'VAR means Video Assistant Referee. It assists with certain major match-changing incidents, including goals, penalty decisions, direct red cards and mistaken identity. It does not review every decision.'],
 ['points',/\b(how many points|three points|3 points)\b/,'In the usual league format, a win earns three points, a draw one point and a defeat none. Competition rules can vary.'],
 ['extra-time',/\b(what is|explain|how does|how long is) extra time\b/,'Extra time is normally two 15-minute periods in a knockout match when the competition requires it. It is different from added time at the end of each half. Some competitions go straight to penalties.'],
 ['predicted-lineups',/\b(why|when|what).*(predicted|confirmed).*(lineup|line up)|\bpredicted lineups\b/,'Predicted lineups are forecasts, not confirmed team sheets. Football Talk switches the label when the match data provider supplies confirmed teams. The lineup views refresh while visible; release timing depends on the competition and provider.'],
 ['football-talk',/\b(what is football talk|about football talk)\b/,'Football Talk is a fan-focused home for football news, live match information and original opinions. Our slogan is “Where fans have their say.”']
];
export function classify(question,context={}){
 const q=norm(question);let clubs=findClubs(q);const follow=/^(and |what about |how about |their |they |them |when do they |where are they )/.test(q);
 if(!clubs.length&&follow&&clubNames.includes(context.club))clubs=[context.club];
 let topic='unknown',intent='unknown',route;
 const explicit=/^(open|show me|take me|go to|find|where (is|are|can i find)|how do i (find|get to)|navigate)\b/.test(q);
 route=routes.find(r=>r[4].some(w=>has(q,w)));
 const faq=faqs.find(([,re])=>re.test(q));
 if(faq){intent='explanation';topic=faq[0];}
 else if(/\b(watch|channel|television|tv)\b/.test(q)){intent='tv';topic='tv';}
 else if(/\b(score|scores|result|results|won|win|beat|finished|yesterday|last game|last match)\b/.test(q)){intent='results';topic='results';}
 else if(/\b(table|tables|standings|position|points|top of|leading the league)\b/.test(q)){intent='standings';topic='tables';}
 else if(/\b(play|playing|kick off|kickoff|fixture|fixtures|next game|next match|today|tomorrow|tonight)\b/.test(q)){intent='fixtures';topic='fixtures';}
 else if(/\b(news|transfer|transfers|signing|signings|rumour|rumours|rumor|rumors|injury|injuries|manager|sacked)\b/.test(q)||clubs.length){intent='news';topic=/transfer|signing|rumour/.test(q)?'transfers':'news';}
 if(explicit&&route&&(!clubs.length||/^(open|show me|take me|go to|navigate)\b/.test(q))){intent='navigation';topic=route[0];}
 else if(route&&(q===norm(route[1])||route[4].some(w=>q===norm(w)))){intent='navigation';topic=route[0];}
 if(follow&&intent==='news'&&!route&&context.intent&&['fixtures','results','standings','tv'].includes(context.intent)){intent=context.intent;topic=intent==='standings'?'tables':intent;}
 if(route&&intent==='unknown'){intent='navigation';topic=route[0]}
 if(route?.[0]==='lineups')return {q,clubs,intent:'navigation',topic:'lineups',route};
 if(/\b(women|womens|wsl|lionesses)\b/.test(q))return {q,clubs,intent:'navigation',topic:'women',route:routes.find(r=>r[0]==='women')};
 return {q,clubs,intent,topic,route,faq};
}
const cache=new Map();
export async function getData(path,ttl=15000){const c=cache.get(path);if(c&&Date.now()-c.at<ttl)return c.data;const r=await fetch('https://www.footballtalk.uk'+path,{signal:AbortSignal.timeout(9000)});if(!r.ok)throw Error('Data unavailable');const data=await r.json();cache.set(path,{at:Date.now(),data});return data;}
function dateKey(date){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(date)}
function when(date){const d=new Date(date);return Number.isFinite(+d)?new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(d)+' UK':''}
function link(label,url){return {label,url}}
export async function answerQuestion(question,context={},read=getData,now=new Date()){
 const c=classify(question,context),{q,clubs,intent,topic}=c;const base={topic,intent,club:clubs[0]||null,context:{club:clubs[0]||null,intent},answered:true,links:[],checkedAt:now.toISOString()};
 const fallback=(text,links=[])=>({...base,answered:false,text,links});
 if(/^(hi|hello|hey|help|thanks|thank you|what can you do|how can you help)( there| ft| ask ft| me)?$/.test(q))return {...base,topic:'home',intent:'navigation',text:'Hello! I’m Ask FT. I can help you find a page, check fixtures, results, UK TV coverage or league positions, and explain common football terms. Try “When do Liverpool play next?” or “What is offside?”.',links:[link('Match Centre','/match-centre.html'),link('Explore Football Talk','/more.html')]};
 if(intent==='navigation')return {...base,text:c.route[3],links:[link(c.route[1],c.route[2])]};
 if(c.faq)return {...base,text:c.faq[2],source:'Football Talk guide',links:[link(c.faq[0]==='goal-difference'?'Premier League tie-breakers':c.faq[0]==='football-talk'?'About Football Talk':'Football terms explained',c.faq[0]==='goal-difference'?'/premier-league-table-tiebreakers-explained.html':c.faq[0]==='football-talk'?'/about.html':'/football-terms.html')]};
 try{
 if(intent==='fixtures'||intent==='results'){
  if(/\b(19|20)\d{2}\b|world cup|euros|champions league|europa league|fa cup|carabao/.test(q)&&!/\b(today|tonight|tomorrow|yesterday)\b/.test(q))return fallback('I can’t reliably answer that competition or historical question from this feed. Please browse the competition pages.',[link('Match Centre','/match-centre.html')]);
  if(!clubs.length&&!/\b(today|tonight|tomorrow|yesterday|results|fixtures|premier league|championship|scottish)\b/.test(q))return fallback('Please name a club or date, for example “Liverpool’s last result” or “today’s results”.',[link('Fixtures & results','/fixtures.html')]);
  const day=new Date(now);if(/\btomorrow\b/.test(q))day.setUTCDate(day.getUTCDate()+1);if(/\byesterday\b/.test(q))day.setUTCDate(day.getUTCDate()-1);
  const specific=/\b(today|tonight|tomorrow|yesterday)\b/.test(q);const data=await read(specific?'/api/fixtures?date='+dateKey(day):intent==='results'?'/api/fixtures?results=1':'/api/fixtures');
  const finished=new Set(['FT','AET','PEN']);let matches=(data.leagues||[]).flatMap(l=>(l.fixtures||[]).map(f=>({...f,league:l.name})));
  if(intent==='fixtures'&&!specific){
   // The league fixture feed can omit European games; use attributed TV listings too.
   const extras=await Promise.allSettled([read('/api/fixtures?date='+dateKey(now)),read('/api/tv-guide',60000)]);
   if(extras[0].status==='fulfilled')matches.push(...(extras[0].value.leagues||[]).flatMap(l=>(l.fixtures||[]).map(f=>({...f,league:l.name}))));
   if(extras[1].status==='fulfilled')for(const r of extras[1].value.matches||[]){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(r.date||'')||!/^\d{2}:\d{2}$/.test(r.time||''))continue;
    const offset=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',timeZoneName:'shortOffset'}).formatToParts(new Date(r.date+'T12:00:00Z')).find(p=>p.type==='timeZoneName')?.value.includes('+1')?'+01:00':'+00:00';
    if(matches.some(f=>sameClub(f.home,r.home)&&sameClub(f.away,r.away)&&dateKey(new Date(f.date))===r.date))continue;
    matches.push({home:r.home,away:r.away,date:r.date+'T'+r.time+':00'+offset,status:'TV',league:r.competition,tv:true});
   }
   matches=matches.filter((f,i,all)=>!f.id||all.findIndex(x=>String(x.id)===String(f.id))===i);
  }
  const competition=/premier league/.test(q)?'premier league':/championship/.test(q)?'championship':/scottish/.test(q)?'scottish':null;if(competition)matches=matches.filter(f=>norm(f.league).includes(competition));
  if(clubs.length)matches=matches.filter(f=>clubs.every(n=>sameClub(f.home,n)||sameClub(f.away,n)));
  matches=matches.filter(f=>intent==='results'?finished.has(f.status):!finished.has(f.status)&&!['PST','CANC','ABD'].includes(f.status)&&(f.status!=='NS'&&f.status!=='TV'||new Date(f.date)>=now));
  matches.sort((a,b)=>intent==='results'?new Date(b.date)-new Date(a.date):new Date(a.date)-new Date(b.date));matches=matches.slice(0,clubs.length&&!specific?1:5);
  if(!matches.length)return fallback('I couldn’t find a matching '+(intent==='results'?'finished match':'fixture')+' in the available Football Talk feed. That does not mean no match exists. Try the full fixtures and results page.',[link('Fixtures & results','/fixtures.html')]);
  return {...base,text:(intent==='fixtures'?'Next matches available in Football Talk’s feeds (coverage can be incomplete):\n\n':'')+matches.map(f=>`${f.home} ${finished.has(f.status)||['1H','2H','HT','ET','LIVE','P'].includes(f.status)?`${f.homeGoals??'–'}–${f.awayGoals??'–'}`:'v'} ${f.away}\n${when(f.date)} · ${f.league} · ${f.tv?'TV guide listing; match feed unavailable':f.status}${f.status==='PEN'&&f.penaltyHome!=null?` (penalties ${f.penaltyHome}–${f.penaltyAway})`:''}`).join('\n\n'),source:matches.some(f=>f.tv)?'Football Talk UK TV guide':data.provider||'Football Talk match feed',links:matches.some(f=>f.tv)?[link('UK TV guide','/tv-guide.html')]:matches.filter(f=>/^\d+$/.test(String(f.id))).map(f=>link(f.home+' v '+f.away,'/match.html?id='+f.id))};
 }
 if(intent==='standings'){
  const data=await read('/api/standings',60000);let rows=(data.leagues||[]).flatMap(l=>(l.standings||[]).map(r=>({...r,league:l.name})));
  if(clubs.length)rows=rows.filter(r=>clubs.some(n=>sameClub(r.team,n)));else rows=rows.filter(r=>r.rank===1);
  if(!rows.length)return fallback('I couldn’t find that club in the available league tables.',[link('Tables & stats','/tables-stats.html')]);
  return {...base,text:rows.slice(0,4).map(r=>`${r.team}: ${r.rank}${r.rank%100>=11&&r.rank%100<=13?'th':r.rank%10===1?'st':r.rank%10===2?'nd':r.rank%10===3?'rd':'th'} in ${r.league}, ${r.points} points from ${r.played} games. Goal difference: ${r.goalsDiff}.`).join('\n'),source:data.provider||'Football Talk tables',links:[link('Full tables','/tables.html')]};
 }
 if(intent==='tv'){
  const data=await read('/api/tv-guide',60000);let rows=data.matches||[];const day=new Date(now);if(/\btomorrow\b/.test(q))day.setUTCDate(day.getUTCDate()+1);
  rows=rows.filter(r=>r.date===dateKey(day));if(clubs.length)rows=rows.filter(r=>clubs.every(n=>sameClub(r.home,n)||sameClub(r.away,n)));
  if(!rows.length)return fallback('I couldn’t find matching UK TV coverage for '+dateKey(day)+'. Check the guide for other dates; missing coverage is not confirmation that a game is untelevised.',[link('UK TV guide','/tv-guide.html')]);
  return {...base,text:rows.slice(0,5).map(r=>`${r.home} v ${r.away} · ${r.time} UK\n${r.channel} · ${r.competition}`).join('\n\n'),source:'Football Talk UK TV guide',links:[link('Full UK TV guide','/tv-guide.html')]};
 }
 if(intent==='news'){
  const data=await read('/api/news',60000);let rows=(data.items||[]).filter(r=>r.title&&/^https:\/\//.test(r.link||'')&&+new Date(r.publishedAt)<=+now&&+now-new Date(r.publishedAt)<48*3600000);
  if(clubs.length)rows=rows.filter(r=>clubs.some(n=>(aliases[n]||[n]).some(w=>has(norm(r.title+' '+r.description),w))));
  if(topic==='transfers')rows=rows.filter(r=>/transfer|sign|deal|bid|offer|loan|gossip|target/i.test(r.title+' '+r.description));
  const terms=q.split(' ').filter(w=>w.length>3&&!['what','latest','about','there','their','news','tell','please','football'].includes(w));
  rows.sort((a,b)=>terms.filter(t=>norm(b.title).includes(t)).length-terms.filter(t=>norm(a.title).includes(t)).length||new Date(b.publishedAt)-new Date(a.publishedAt));
  if(!rows.length)return fallback('I couldn’t find a fresh matching report in Football Talk’s news feed. I can’t confirm rumours or fill in missing details.',[link('News','/news.html'),link('Transfer Centre','/section.html?view=transfers')]);
  const direct=/\b(who|why|how|is|has|did|will|sacked|injured)\b/.test(q)&&!/^latest|^news|^tell me/.test(q);
  return {...base,answered:!direct,text:(direct?'I can show related reports, but I can’t independently answer that claim.\n\n':'Latest matching reports — headlines are attributed reports, not independent confirmation:\n\n')+rows.slice(0,3).map(r=>`${r.title}\n${r.source||'Reported source'} · ${when(r.publishedAt)}`).join('\n\n'),source:'Football Talk news feed',links:rows.slice(0,3).map(r=>link(r.title,'/football-talk-story.html?source='+encodeURIComponent(r.link)))};
 }
 }catch{return fallback('The football data feed is unavailable just now. I can still help you navigate the site; please try the live information again shortly.',[link('Match Centre','/match-centre.html'),link('News','/news.html')])}
 return fallback('I don’t have a reliable answer to that in this trial version. I can find fixtures, results, UK TV coverage, league positions and news, explain common football terms, or help you find a page. Try “When do Liverpool play next?” or “What is offside?”',[link('Explore Football Talk','/more.html')]);
}
