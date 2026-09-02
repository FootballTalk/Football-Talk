(()=>{
  const init=()=>{
    if(document.getElementById('ft-home-news-ticker'))return;
    const countdown=document.getElementById('pl-kickoff-countdown');
    const hero=document.querySelector('.hero');
    if(!countdown&&!hero)return;

    const ticker=document.createElement('section');
    ticker.id='ft-home-news-ticker';
    ticker.setAttribute('aria-label','Football Talk live ticker');
    ticker.innerHTML=`<div class="ftnt-inner"><div class="ftnt-badge"><span class="ftnt-live-dot"></span>LIVE</div><div class="ftnt-label" id="ftnt-label">LATEST NEWS</div><div class="ftnt-window"><div class="ftnt-track" id="ftnt-track"><span class="ftnt-loading">Loading Football Talk live…</span></div></div><a class="ftnt-more" id="ftnt-more" href="news.html">NEWS →</a></div>`;
    if(countdown)countdown.insertAdjacentElement('afterend',ticker);else hero.insertAdjacentElement('beforebegin',ticker);

    const style=document.createElement('style');
    style.textContent=`#ft-home-news-ticker{background:#09090b;color:#fff;border-bottom:3px solid #f7c600;overflow:hidden}.ftnt-inner{max-width:1180px;margin:auto;display:flex;align-items:center;min-height:46px}.ftnt-badge{align-self:stretch;display:flex;align-items:center;gap:6px;background:#b5121b;color:#fff;padding:0 12px;font-size:11px;font-weight:1000;letter-spacing:.08em;white-space:nowrap}.ftnt-live-dot{width:7px;height:7px;border-radius:50%;background:#fff;box-shadow:0 0 0 3px rgba(255,255,255,.18);animation:ftntPulse 1.2s infinite}.ftnt-label{color:#f7c600;font-size:11px;font-weight:1000;letter-spacing:.08em;padding:0 13px;white-space:nowrap}.ftnt-window{flex:1;min-width:0;overflow:hidden;mask-image:linear-gradient(to right,transparent 0,#000 3%,#000 97%,transparent 100%);-webkit-mask-image:linear-gradient(to right,transparent 0,#000 3%,#000 97%,transparent 100%)}.ftnt-track{display:flex;align-items:center;width:max-content;white-space:nowrap;will-change:transform}.ftnt-track.running{animation:ftntScroll var(--ftnt-speed,48s) linear infinite}.ftnt-track:hover{animation-play-state:paused}.ftnt-item{display:inline-flex;align-items:center;color:#fff;text-decoration:none;font-size:12px;font-weight:800;padding:0 17px}.ftnt-item:hover{color:#f7c600}.ftnt-score{display:inline-flex;align-items:center;color:#fff;font-size:12px;font-weight:900;padding:0 17px}.ftnt-score strong{color:#f7c600;margin:0 6px}.ftnt-live-status{color:#ff4a54;margin-left:6px;font-size:10px}.ftnt-ft-status{color:#aaa;margin-left:6px;font-size:10px}.ftnt-sep{color:#f7c600;font-weight:1000}.ftnt-source{color:#9b9ba3;font-size:10px;margin-left:7px}.ftnt-loading{color:#b7b7bd;font-size:12px;font-weight:700;padding:0 16px}.ftnt-more{color:#f7c600;text-decoration:none;font-size:10px;font-weight:1000;padding:0 12px;white-space:nowrap}@keyframes ftntScroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}@keyframes ftntPulse{0%,100%{opacity:1}50%{opacity:.4}}@media(max-width:620px){.ftnt-inner{min-height:42px}.ftnt-badge{padding:0 8px;font-size:9px}.ftnt-label{font-size:9px;padding:0 8px}.ftnt-item,.ftnt-score{font-size:11px;padding:0 12px}.ftnt-source{display:none}.ftnt-more{font-size:9px;padding:0 8px}}`;
    document.head.appendChild(style);

    const track=ticker.querySelector('#ftnt-track');
    const label=ticker.querySelector('#ftnt-label');
    const more=ticker.querySelector('#ftnt-more');
    const liveStatuses=new Set(['1H','2H','HT','ET','P','LIVE','INT','BT']);
    const doneStatuses=new Set(['FT','AET','PEN']);
    let mode='';
    let lastNewsLoad=0;

    const londonYmd=d=>{const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d).reduce((a,x)=>(a[x.type]=x.value,a),{});return`${p.year}-${p.month}-${p.day}`};
    const today=()=>londonYmd(new Date());
    const leagueLabel=l=>{const name=String(l?.name||'').trim();const country=String(l?.country||'').trim();const id=Number(l?.id);const england=/^(england|eng)$/i.test(country);if(/^premier league$/i.test(name)&&(country===''||england))return'Premier League';if(/^(efl )?championship$/i.test(name)&&(country===''||england))return'EFL Championship';if(england&&id===39)return'Premier League';if(england&&id===40)return'EFL Championship';return null};

    const setRunning=itemsCount=>{
      track.classList.remove('running');
      const speed=Math.max(32,Math.min(75,itemsCount*8));
      track.style.setProperty('--ftnt-speed',`${speed}s`);
      requestAnimationFrame(()=>track.classList.add('running'));
    };

    const makeNewsItem=item=>{
      const a=document.createElement('a');a.className='ftnt-item';a.href=item.link||'news.html';
      if(item.link){a.target='_blank';a.rel='noopener';}
      const title=document.createElement('span');title.textContent=item.title||'Football news';a.appendChild(title);
      if(item.source){const source=document.createElement('span');source.className='ftnt-source';source.textContent=item.source;a.appendChild(source);}
      const sep=document.createElement('span');sep.className='ftnt-sep';sep.textContent='  •  ';a.appendChild(sep);return a;
    };

    const renderNews=items=>{
      mode='news';label.textContent='LATEST NEWS';more.textContent='NEWS →';more.href='news.html';
      track.classList.remove('running');track.replaceChildren();
      const news=(items||[]).filter(item=>item&&item.title&&item.type!=='TRANSFER').slice(0,10);
      if(!news.length){track.innerHTML='<span class="ftnt-loading">Latest football news is temporarily unavailable.</span>';return;}
      const fragment=document.createDocumentFragment();[...news,...news].forEach(item=>fragment.appendChild(makeNewsItem(item)));track.appendChild(fragment);
      const chars=news.reduce((sum,item)=>sum+String(item.title||'').length,0);track.style.setProperty('--ftnt-speed',`${Math.max(36,Math.min(75,chars*.19))}s`);requestAnimationFrame(()=>track.classList.add('running'));
    };

    const scoreStatus=f=>{const s=String(f.status||'').toUpperCase();if(liveStatuses.has(s))return f.elapsed?`${f.elapsed}′`:'LIVE';if(doneStatuses.has(s))return'FT';return s;};
    const renderScores=games=>{
      mode='scores';label.textContent='MATCHDAY SCORES';more.textContent='MATCH CENTRE →';more.href='match-centre.html';
      track.classList.remove('running');track.replaceChildren();
      const visible=games.filter(f=>liveStatuses.has(String(f.status||'').toUpperCase())||doneStatuses.has(String(f.status||'').toUpperCase()));
      if(!visible.length){track.innerHTML='<span class="ftnt-loading">Matchday scores will appear here from kick-off.</span>';return;}
      const make=f=>{const wrap=document.createElement('span');wrap.className='ftnt-score';const s=String(f.status||'').toUpperCase();const home=document.createElement('span');home.textContent=f.home||'';const score=document.createElement('strong');score.textContent=`${f.homeGoals??0} – ${f.awayGoals??0}`;const away=document.createElement('span');away.textContent=f.away||'';const status=document.createElement('span');status.className=liveStatuses.has(s)?'ftnt-live-status':'ftnt-ft-status';status.textContent=scoreStatus(f);const sep=document.createElement('span');sep.className='ftnt-sep';sep.textContent='  •  ';wrap.append(home,score,away,status,sep);return wrap;};
      const fragment=document.createDocumentFragment();[...visible,...visible].forEach(f=>fragment.appendChild(make(f)));track.appendChild(fragment);setRunning(visible.length);
    };

    const loadNews=async force=>{
      if(!force&&mode==='news'&&Date.now()-lastNewsLoad<90000)return;
      try{const r=await fetch(`/api/news?t=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error();const data=await r.json();lastNewsLoad=Date.now();renderNews(data.items||[]);}catch(_){if(mode!=='news'||!track.children.length){mode='news';label.textContent='LATEST NEWS';more.textContent='NEWS →';more.href='news.html';track.innerHTML='<span class="ftnt-loading">Latest football news is temporarily unavailable.</span>';}}
    };

    const refresh=async()=>{
      try{
        const r=await fetch(`/api/fixtures?t=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error();const data=await r.json();const games=[];
        (data.leagues||[]).forEach(l=>{const league=leagueLabel(l);if(!league)return;(l.fixtures||[]).forEach(f=>{if(f.date&&londonYmd(new Date(f.date))===today())games.push({...f,league});});});
        if(!games.length){await loadNews(false);return;}
        const started=games.some(f=>liveStatuses.has(String(f.status||'').toUpperCase())||doneStatuses.has(String(f.status||'').toUpperCase()));
        const allFinished=games.every(f=>doneStatuses.has(String(f.status||'').toUpperCase()));
        if(started&&!allFinished)renderScores(games);else await loadNews(mode!=='news');
      }catch(_){await loadNews(mode!=='news');}
    };

    refresh();
    setInterval(refresh,30000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
