(() => {
  const legacyStatsUrl='section.html?view=stats';
  const newStatsUrl='/api/stats-zone';

  function fixLinks(){
    document.querySelectorAll('a[href="section.html?view=stats"],a[href$="section.html?view=stats"]').forEach(a=>a.setAttribute('href',newStatsUrl));
  }

  function redirectLegacyPage(){
    const path=(location.pathname.split('/').pop()||'').toLowerCase();
    const view=(new URLSearchParams(location.search).get('view')||'').toLowerCase();
    if(path==='section.html'&&view==='stats') location.replace(newStatsUrl);
  }

  redirectLegacyPage();
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fixLinks,{once:true}); else fixLinks();
  new MutationObserver(fixLinks).observe(document.documentElement,{childList:true,subtree:true});
})();
