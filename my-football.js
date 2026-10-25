(()=>{
  if(window.__FT_MY_FOOTBALL__)return;window.__FT_MY_FOOTBALL__=true;
  const latest=document.querySelector('main > .hero') || document.getElementById('latest');
  if(!latest)return;
  const CLUBS=['Arsenal','Aston Villa','Bournemouth','Brentford','Brighton','Burnley','Chelsea','Crystal Palace','Everton','Fulham','Leeds United','Liverpool','Manchester City','Manchester United','Newcastle United','Nottingham Forest','Sunderland','Tottenham Hotspur','West Ham United','Wolverhampton Wanderers','Birmingham City','Blackburn Rovers','Bristol City','Charlton Athletic','Coventry City','Derby County','Hull City','Ipswich Town','Leicester City','Middlesbrough','Millwall','Norwich City','Oxford United','Portsmouth','Preston North End','Queens Park Rangers','Sheffield United','Sheffield Wednesday','Southampton','Stoke City','Swansea City','Watford','West Bromwich Albion','Wrexham'];
  const KEY='ft-my-football-club';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const styles=document.createElement('style');styles.textContent=`#ft-my-football{display:block!important;max-width:1180px;margin:18px auto 8px;padding:0 20px}.ft-mf-shell{background:#111;color:#fff;border:2px solid #f7c600;border-radius:18px;padding:18px}.ft-mf-top{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.ft-mf-kicker{color:#f7c600;font-size:12px;font-weight:1000;letter-spacing:.1em}.ft-mf-top h2{margin:3px 0 6px;font-size:clamp(24px,4vw,34px)}.ft-mf-top p{margin:0;color:#bbb;max-width:720px}.ft-mf-select{min-width:220px;background:#fff;color:#111;border:0;border-radius:9px;padding:11px 12px;font-weight:800}.ft-mf-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:16px}.ft-mf-card{background:#1b1b20;border-radius:12px;padding:14px}.ft-mf-card h3{margin:0 0 9px;font-size:14px;color:#f7c600}.ft-mf-item{display:block;color:#fff!important;text-decoration:none;padding:8px 0;border-top:1px solid #333;font-size:13px;line-height:1.35}.ft-mf-item:first-of-type{border-top:0}.ft-mf-empty{color:#aaa;font-size:12px}.ft-mf-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:13px}.ft-mf-actions a{background:#f7c600;color:#111!important;text-decoration:none;border-radius:8px;padding:9px 11px;font-size:12px;font-weight:900}@media(max-width:760px){#ft-my-football{padding:0 14px}.ft-mf-top{display:block}.ft-mf-select{width:100%;margin-top:12px}.ft-mf-grid{grid-template-columns:1fr}}`;document.head.appendChild(styles);
  const box=document.createElement('section');box.id='ft-my-football';box.innerHTML=`<div class="ft-mf-shell"><div class="ft-mf-top"><div><div class="ft-mf-kicker">MY CLUB</div><h2 id="ft-mf-title">Choose your club</h2><p id="ft-mf-sub">Pick your team and Football Talk will put their news, matches and league position at your fingertips.</p></div><select aria-label="Choose or change your club" id="ft-mf-select" class="ft-mf-select"><option value="">Choose a club…</option>${CLUBS.map(c=>`<option>${esc(c)}</option>`).join('')}</select></div><div id="ft-mf-content"></div></div>`;
  latest.insertAdjacentElement(latest.matches('.hero') ? 'afterend' : 'beforebegin',box);
  const select=box.querySelector('#ft-mf-select'),title=box.querySelector('#ft-mf-title'),sub=box.querySelector('#ft-mf-sub'),content=box.querySelector('#ft-mf-content');

  const aliases={'afc bournemouth':'bournemouth','man utd':'manchester united','man united':'manchester united','man city':'manchester city','spurs':'tottenham hotspur','wolves':'wolverhampton wanderers','brighton & hove albion':'brighton','brighton and hove albion':'brighton','nottm forest':'nottingham forest','qpr':'queens park rangers','west brom':'west bromwich albion','leeds':'leeds united'};
  const normal=v=>{const t=String(v||'').toLowerCase().trim();return aliases[t]||t};
  const storage={get(){try{return localStorage.getItem(KEY)||''}catch{return''}},set(v){try{v?localStorage.setItem(KEY,v):localStorage.removeItem(KEY)}catch{}}};
  const dateLabel=v=>new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(v));
  const finished=new Set(['FT','AET','PEN']);
  const playing=new Set(['LIVE','1H','2H','HT','ET','BT','P','INT']);
  async function json(url){const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Unavailable');const d=await r.json();if(d.error)throw Error(d.error);return d}
  let tables=null;
  const tableRequest=json('/api/standings').then(data=>{
    tables=data.leagues||[];
    const names=tables.flatMap(l=>(l.standings||[]).map(r=>r.team)).filter(Boolean);
    if(names.length){const saved=select.value;select.innerHTML='<option value="">Choose a club…</option>'+names.sort((a,b)=>a.localeCompare(b)).map(c=>`<option>${esc(c)}</option>`).join('');
      if(saved&&!names.includes(saved)){const equivalent=names.find(c=>normal(c)===normal(saved));if(equivalent)select.value=equivalent;else select.insertAdjacentHTML('beforeend',`<option selected>${esc(saved)}</option>`)}else select.value=saved;
    }
    return data;
  });
  // The standings request also supplies current-season club choices.
  tableRequest.catch(()=>{});
  function mentions(item,club){
    const text=`${item.title||''} ${item.description||item.summary||''}`.toLowerCase();
    const names=[club,normal(club),...Object.keys(aliases).filter(a=>aliases[a]===normal(club))];
    return names.some(n=>new RegExp('(^|[^a-z])'+n.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'([^a-z]|$)').test(text));
  }
  let requestId=0;
  async function render(club){
    const request=++requestId;
    storage.set(club);
    if(!club){title.textContent='Choose your club';sub.textContent='Your next match, latest result, league position and club headlines — all on Football Talk.';content.innerHTML='';return}
    title.textContent=club;sub.textContent='Your club. Your football. Change your team using the selector.';
    content.innerHTML='<p class="ft-mf-empty" role="status">Loading your club…</p>';
    const data=await Promise.allSettled([json('/api/news'),json('/api/fixtures'),json('/api/fixtures?results=1'),tableRequest,json('/api/tv-guide')]);
    if(request!==requestId)return;
    const flatten=i=>data[i].status==='fulfilled'?(data[i].value.leagues||[]).flatMap(l=>(l.fixtures||[]).map(f=>({...f,leagueName:l.name}))):[];
    const yours=f=>[f.home,f.away].some(t=>normal(t)===normal(club));
    const upcoming=flatten(1).filter(yours).filter(f=>playing.has(f.status)||(!finished.has(f.status)&&!['PST','CANC','ABD'].includes(f.status)&&new Date(f.date).getTime()>=Date.now())).sort((a,b)=>Number(playing.has(b.status))-Number(playing.has(a.status))||new Date(a.date)-new Date(b.date))[0];
    const result=flatten(2).filter(yours).filter(f=>finished.has(f.status)).sort((a,b)=>new Date(b.date)-new Date(a.date))[0];
    const tv=data[4].status==='fulfilled'?data[4].value.matches||[]:[];
    const londonDay=v=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(v));
    const match=(f,failed)=>{
      if(!f)return `<p class="ft-mf-empty">${failed?'Match information temporarily unavailable.':'No match listed right now.'}</p>`;
      const listing=tv.find(t=>t.date===londonDay(f.date)&&normal(t.home)===normal(f.home)&&normal(t.away)===normal(f.away));
      const channel=listing?.channel&&listing.channel!=='TV details confirmed'?listing.channel:'UK TV coverage not listed';
      const score=(playing.has(f.status)||finished.has(f.status))&&f.homeGoals!=null&&f.awayGoals!=null?`${f.homeGoals}–${f.awayGoals}`:'v';
      return `<a class="ft-mf-item" href="match.html?id=${encodeURIComponent(f.id)}"><strong>${esc(f.home)} ${esc(score)} ${esc(f.away)}</strong><small style="display:block;margin-top:6px;color:#bbb">${esc(playing.has(f.status)?'LIVE · ':finished.has(f.status)?'Full time · ':'')}${esc(dateLabel(f.date))} UK · ${esc(f.leagueName)}</small>${!finished.has(f.status)?`<small style="display:block;margin-top:5px;color:#f7c600">${esc(data[4].status==='rejected'?'TV listings temporarily unavailable':channel)}</small>`:''}</a>`;
    };
    const league=(tables||[]).find(l=>(l.standings||[]).some(r=>normal(r.team)===normal(club)));
    const row=league?.standings.find(r=>normal(r.team)===normal(club));
    const recentForm=flatten(2).filter(yours).filter(f=>finished.has(f.status)&&f.homeGoals!=null&&f.awayGoals!=null).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5).reverse().map(f=>{const home=normal(f.home)===normal(club);const us=Number(home?f.homeGoals:f.awayGoals),them=Number(home?f.awayGoals:f.homeGoals);return us===them?'D':us>them?'W':'L'}).join('');
    const form=String(row?.form||recentForm).toUpperCase().replace(/[^WDL]/g,'').slice(-5).split('').join(' · ');
    const table=row?`<a class="ft-mf-item" href="tables.html"><strong>${esc(league.name)} · Position ${esc(row.rank)}</strong><small style="display:block;margin-top:6px;color:#bbb">${esc(row.points)} points · ${esc(row.played)} played${form?' · Form: '+esc(form):''}</small></a>`:`<p class="ft-mf-empty">League position temporarily unavailable.</p>`;
    const seen=new Set();
    const news=(data[0].status==='fulfilled'?data[0].value.items||[]:[]).filter(i=>{
      const age=Date.now()-new Date(i.publishedAt||i.published).getTime();
      if(!mentions(i,club)||!/^https?:\/\//i.test(i.link||'')||!Number.isFinite(age)||age< -300000||age>172800000||seen.has(i.title))return false;
      seen.add(i.title);return true;
    }).sort((a,b)=>new Date(b.publishedAt||b.published)-new Date(a.publishedAt||a.published)).slice(0,3);
    const stories=news.length?news.map(i=>`<a class="ft-mf-item" href="football-talk-story.html?source=${encodeURIComponent(i.link)}">${esc(i.title)}<small style="display:block;margin-top:5px;color:#bbb">${esc(i.source||'Football news')} · ${esc(dateLabel(i.publishedAt||i.published))}</small></a>`).join(''):`<p class="ft-mf-empty">${data[0].status==='rejected'?'Club headlines temporarily unavailable.':'No fresh club headlines right now. Check back shortly.'}</p>`;
    content.innerHTML=`<div class="ft-mf-grid"><div class="ft-mf-card"><h3>${playing.has(upcoming?.status)?'Live match':'Next match'}</h3>${match(upcoming,data[1].status==='rejected')}<h3 style="margin-top:18px">Latest result</h3>${match(result,data[2].status==='rejected')}</div><div class="ft-mf-card"><h3>League position & form</h3>${table}<a class="ft-mf-item" href="tables.html">View the full tables →</a></div><div class="ft-mf-card"><h3>Latest club headlines</h3>${stories}</div></div><div class="ft-mf-actions"><a href="match-centre.html">Match Centre</a><a href="news.html">Latest football news</a><a href="tv-guide.html">UK TV guide</a></div>`;
  }
  const saved=storage.get();if(saved){if(!CLUBS.includes(saved))select.insertAdjacentHTML('beforeend',`<option>${esc(saved)}</option>`);select.value=saved;render(saved)}else render('');
  select.addEventListener('change',()=>render(select.value));
  setInterval(()=>{if(select.value&&!document.hidden)render(select.value)},120000);
})();
