(()=>{
  const init=()=>{
    if(document.getElementById('ft-home-news-ticker'))return;
    const countdown=document.getElementById('pl-kickoff-countdown');
    const hero=document.querySelector('.hero');
    if(!countdown&&!hero)return;

    const ticker=document.createElement('section');
    ticker.id='ft-home-news-ticker';
    ticker.setAttribute('aria-label','Latest football news ticker');
    ticker.innerHTML=`<div class="ftnt-inner"><div class="ftnt-badge"><span class="ftnt-live-dot"></span>LIVE</div><div class="ftnt-label">LATEST NEWS</div><div class="ftnt-window"><div class="ftnt-track" id="ftnt-track"><span class="ftnt-loading">Loading the latest football news…</span></div></div><a class="ftnt-more" href="news.html">NEWS →</a></div>`;
    if(countdown)countdown.insertAdjacentElement('afterend',ticker);else hero.insertAdjacentElement('beforebegin',ticker);

    const style=document.createElement('style');
    style.textContent=`#ft-home-news-ticker{background:#09090b;color:#fff;border-bottom:3px solid #f7c600;overflow:hidden}.ftnt-inner{max-width:1180px;margin:auto;display:flex;align-items:center;min-height:46px}.ftnt-badge{align-self:stretch;display:flex;align-items:center;gap:6px;background:#b5121b;color:#fff;padding:0 12px;font-size:11px;font-weight:1000;letter-spacing:.08em;white-space:nowrap}.ftnt-live-dot{width:7px;height:7px;border-radius:50%;background:#fff;box-shadow:0 0 0 3px rgba(255,255,255,.18);animation:ftntPulse 1.2s infinite}.ftnt-label{color:#f7c600;font-size:11px;font-weight:1000;letter-spacing:.08em;padding:0 13px;white-space:nowrap}.ftnt-window{flex:1;min-width:0;overflow:hidden;mask-image:linear-gradient(to right,transparent 0,#000 3%,#000 97%,transparent 100%);-webkit-mask-image:linear-gradient(to right,transparent 0,#000 3%,#000 97%,transparent 100%)}.ftnt-track{display:flex;align-items:center;width:max-content;white-space:nowrap;will-change:transform}.ftnt-track.running{animation:ftntScroll var(--ftnt-speed,48s) linear infinite}.ftnt-track:hover{animation-play-state:paused}.ftnt-item{display:inline-flex;align-items:center;color:#fff;text-decoration:none;font-size:12px;font-weight:800;padding:0 17px}.ftnt-item:hover{color:#f7c600}.ftnt-sep{color:#f7c600;font-weight:1000}.ftnt-source{color:#9b9ba3;font-size:10px;margin-left:7px}.ftnt-loading{color:#b7b7bd;font-size:12px;font-weight:700;padding:0 16px}.ftnt-more{color:#f7c600;text-decoration:none;font-size:10px;font-weight:1000;padding:0 12px;white-space:nowrap}@keyframes ftntScroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}@keyframes ftntPulse{0%,100%{opacity:1}50%{opacity:.4}}@media(max-width:620px){.ftnt-inner{min-height:42px}.ftnt-badge{padding:0 8px;font-size:9px}.ftnt-label{font-size:9px;padding:0 8px}.ftnt-item{font-size:11px;padding:0 12px}.ftnt-source{display:none}.ftnt-more{font-size:9px;padding:0 8px}}`;
    document.head.appendChild(style);

    const track=ticker.querySelector('#ftnt-track');
    const makeItem=item=>{
      const a=document.createElement('a');
      a.className='ftnt-item';
      a.href=item.link||'news.html';
      if(item.link){a.target='_blank';a.rel='noopener';}
      const title=document.createElement('span');title.textContent=item.title||'Football news';a.appendChild(title);
      if(item.source){const source=document.createElement('span');source.className='ftnt-source';source.textContent=item.source;a.appendChild(source);}
      const sep=document.createElement('span');sep.className='ftnt-sep';sep.textContent='  •  ';a.appendChild(sep);
      return a;
    };

    const render=items=>{
      track.classList.remove('running');
      track.replaceChildren();
      const news=(items||[]).filter(item=>item&&item.title&&item.type!=='TRANSFER').slice(0,10);
      if(!news.length){track.innerHTML='<span class="ftnt-loading">Latest football news is temporarily unavailable.</span>';return;}
      const fragment=document.createDocumentFragment();
      [...news,...news].forEach(item=>fragment.appendChild(makeItem(item)));
      track.appendChild(fragment);
      const chars=news.reduce((sum,item)=>sum+String(item.title||'').length,0);
      track.style.setProperty('--ftnt-speed',`${Math.max(36,Math.min(75,chars*.19))}s`);
      requestAnimationFrame(()=>track.classList.add('running'));
    };

    const load=async()=>{
      try{
        const r=await fetch(`/api/news?t=${Date.now()}`,{cache:'no-store'});
        if(!r.ok)throw new Error('news unavailable');
        const data=await r.json();
        render(data.items||[]);
      }catch(_){
        if(!track.querySelector('.ftnt-item'))track.innerHTML='<span class="ftnt-loading">Latest football news is temporarily unavailable.</span>';
      }
    };
    load();
    setInterval(load,90000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)load()});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
