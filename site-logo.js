(() => {
  const loadScript=(src,dataKey)=>{
    if([...document.scripts].some(s=>(s.src||'').includes(src.split('?')[0]))) return;
    const script=document.createElement('script');
    script.src=src;
    if(dataKey) script.dataset[dataKey]='1';
    document.head.appendChild(script);
  };

  const isStatsZone=location.pathname.includes('/api/stats-zone');

  loadScript('header-logo.js?v=20260827-sitewide-2','headerLogoShared');

  if(isStatsZone){
    const buildStatsHub=()=>{
      if(document.querySelector('.ft-stats-hub-bar')) return;
      const header=document.querySelector('header.top,.top');
      if(!header) return;

      const bar=document.createElement('nav');
      bar.className='ft-stats-hub-bar';
      bar.setAttribute('aria-label','Stats Hub');
      bar.innerHTML='<span class="ft-stats-hub-label">STATS HUB</span><a href="/tables.html">Tables</a><a class="context-active" href="/api/stats-zone">Stats Zone</a><a href="/api/stats-zone?main=leaders&stat=goals">Top Scorers</a><a href="/api/stats-zone?main=form">Form & Results</a>';
      header.insertAdjacentElement('afterend',bar);

      const style=document.createElement('style');
      style.textContent=`
        .ft-stats-hub-bar{position:sticky;top:78px;z-index:176;display:flex;gap:8px;align-items:center;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;padding:9px 12px;background:#f7c600;border-bottom:1px solid #d0a800;box-shadow:0 3px 8px rgba(0,0,0,.08)}
        .ft-stats-hub-bar::-webkit-scrollbar{display:none}.ft-stats-hub-label{flex:0 0 auto;font-size:11px;font-weight:1000;letter-spacing:.08em;color:#111;padding-right:4px}.ft-stats-hub-bar a{flex:0 0 auto;padding:9px 13px;border-radius:999px;background:#111;color:#fff;font-size:12px;font-weight:900;text-decoration:none;white-space:nowrap}.ft-stats-hub-bar a.context-active{background:#fff;color:#111}.hub-nav{top:132px!important}
        @media(max-width:650px){.ft-stats-hub-bar{top:66px;padding:8px 10px}.ft-stats-hub-bar a{padding:8px 12px;font-size:11px}.hub-nav{top:114px!important}}
      `;
      document.head.appendChild(style);
    };
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',buildStatsHub,{once:true}); else buildStatsHub();
  } else {
    loadScript('persistent-tabs.js?v=20260831-stats-hub-3','persistentTabsShared');
  }

  loadScript('stats-route.js?v=20260827-1','statsRouteShared');
  loadScript('deadline-day.js?v=20260827-1','deadlineDayShared');
  if(/quiz\.html$/i.test(location.pathname)) loadScript('quiz-scoreboard.js?v=20260829-1','quizScoreboardShared');
})();
