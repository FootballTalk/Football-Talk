(() => {
  const fix=()=>document.querySelectorAll('a[href="/api/stats-zone"],a[href$="/api/stats-zone"]').forEach(a=>a.setAttribute('href','section.html?view=stats'));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fix,{once:true});else fix();
  new MutationObserver(fix).observe(document.documentElement,{childList:true,subtree:true});
})();
