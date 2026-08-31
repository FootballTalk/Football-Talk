(()=>{
  const hero=document.querySelector('.hero');
  if(!hero||document.getElementById('ft-today'))return;
  const styles=document.createElement('style');
  styles.textContent=`#ft-today{max-width:1180px;margin:18px auto 4px;padding:0 18px}.ft-today-shell{background:#111;color:#fff;border-radius:16px;padding:16px 18px;border-left:5px solid #f7c600}.ft-today-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:11px}.ft-today-head h2{font-family:'Archivo Black',sans-serif;font-size:20px;margin:0}.ft-today-head span{font-size:10px;font-weight:900;color:#f7c600;letter-spacing:.08em}.ft-today-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.ft-today-item{display:block;background:#1d1d1d;color:#fff!important;text-decoration:none!important;border-radius:10px;padding:11px 12px;min-height:78px}.ft-today-item:hover{background:#292929}.ft-today-kicker{font-size:9px;font-weight:1000;color:#f7c600;letter-spacing:.07em;margin-bottom:5px}.ft-today-title{font-size:13px;font-weight:900;line-height:1.28}.ft-today-empty{font-size:13px;color:#bbb;margin:0}@media(max-width:700px){#ft-today{padding:0 12px}.ft-today-grid{grid-template-columns:1fr}.ft-today-item{min-height:auto}.ft-today-shell{padding:14px}}`;
  document.head.appendChild(styles);
  const section=document.createElement('section');section.id='ft-today';section.innerHTML='<div class="ft-today-shell"><div class="ft-today-head"><h2>Today on Football Talk</h2><span>YOUR FOOTBALL SNAPSHOT</span></div><div class="ft-today-grid"><p class="ft-today-empty">Loading today’s football…</p></div></div>';
  hero.insertAdjacentElement('afterend',section);
  const grid=section.querySelector('.ft-today-grid');
  const clean=v=>String(v||'').replace(/\s+/g,' ').trim();
  const dateKey=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  function card(kicker,title,href){const a=document.createElement('a');a.className='ft-today-item';a.href=href;const k=document.createElement('div');k.className='ft-today-kicker';k.textContent=kicker;const t=document.createElement('div');t.className='ft-today-title';t.textContent=title;a.append(k,t);return a}
  function fixtureTitle(f){const home=clean(f.home?.name||f.home||f.homeTeam?.name||f.homeTeam);const away=clean(f.away?.name||f.away||f.awayTeam?.name||f.awayTeam);if(!home||!away)return'';const status=clean(f.status?.short||f.status||'').toUpperCase();const hg=f.goals?.home??f.homeScore;const ag=f.goals?.away??f.awayScore;if(['1H','HT','2H','ET','P','LIVE'].includes(status)&&hg!=null&&ag!=null)return `${home} ${hg}–${ag} ${away}`;return `${home} v ${away}`}
  async function load(){
    const picks=[];
    try{const r=await fetch(`/api/fixtures?date=${dateKey()}&_=${Date.now()}`,{cache:'no-store'});if(r.ok){const d=await r.json();const fs=d.fixtures||d.items||d.response||[];const f=fs.find(x=>fixtureTitle(x));if(f){const id=f.id||f.fixture?.id;const href=id?`match.html?id=${encodeURIComponent(id)}`:'fixtures.html';picks.push(card('MATCHDAY',fixtureTitle(f),href))}}}catch{}
    try{const r=await fetch(`/api/news?_=${Date.now()}`,{cache:'no-store'});if(r.ok){const d=await r.json();const items=(d.items||[]).filter(x=>clean(x.title));const story=items.find(x=>String(x.type||'').toUpperCase()!=='TRANSFER')||items[0];const transfer=items.find(x=>String(x.type||'').toUpperCase()==='TRANSFER');if(story)picks.push(card('TOP STORY',clean(story.title),'#latest'));if(transfer)picks.push(card('TRANSFER',clean(transfer.title),'#transfers'))}}catch{}
    grid.replaceChildren();
    if(!picks.length){const p=document.createElement('p');p.className='ft-today-empty';p.textContent='Today’s football snapshot is refreshing.';grid.appendChild(p);return}
    picks.slice(0,3).forEach(x=>grid.appendChild(x));
  }
  load();setInterval(load,60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)load()});
})();