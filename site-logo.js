(() => {
  const loadScript=(src,dataKey)=>{
    if([...document.scripts].some(s=>(s.src||'').includes(src.split('?')[0]))) return;
    const script=document.createElement('script');
    script.src=src;
    if(dataKey) script.dataset[dataKey]='1';
    document.head.appendChild(script);
  };

  loadScript('header-logo.js?v=20260827-sitewide-2','headerLogoShared');
  loadScript('persistent-tabs.js?v=20260829-members-2','persistentTabsShared');
  loadScript('stats-route.js?v=20260827-1','statsRouteShared');
  loadScript('deadline-day.js?v=20260827-1','deadlineDayShared');
  if(/quiz\.html$/i.test(location.pathname)) loadScript('quiz-scoreboard.js?v=20260829-1','quizScoreboardShared');
})();
