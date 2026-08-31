(() => {
  const LINKS = [
    ['Home','./'],
    ['Match Centre','match-centre.html'],
    ['News','news.html'],
    ['Transfers','section.html?view=transfers'],
    ['Members','members.html'],
    ['Tables & Stats','tables-stats.html'],
    ['More','more.html']
  ];

  function currentKey(){
    const path=(location.pathname.split('/').pop()||'').toLowerCase();
    const view=new URLSearchParams(location.search).get('view')||'';
    if(path==='section.html'&&view==='transfers')return'section.html?view=transfers';
    if(path==='section.html'&&['latest','debate'].includes(view))return'news.html';
    if(path==='section.html'&&view==='matchday')return'match-centre.html';
    if(['tables.html'].includes(path)||location.pathname.includes('/api/stats-zone')||location.pathname.includes('/api/top-scorers'))return'tables-stats.html';
    if(['fixtures.html','lineups.html','cups.html','european.html'].includes(path))return'match-centre.html';
    if(['super-six.html','quiz.html'].includes(path))return'more.html';
    return path||'index.html';
  }

  function build(){
    let tabs=document.querySelector('.quick-nav, .ft-persistent-tabs');
    const header=document.querySelector('.site-header, .section-page-brand, header.top, .top');
    if(!header)return;

    if(!tabs){
      tabs=document.createElement('nav');
      tabs.className='ft-persistent-tabs';
      tabs.setAttribute('aria-label','Football Talk main sections');
      header.insertAdjacentElement('afterend',tabs);
    }
    tabs.classList.add('ft-persistent-tabs');
    tabs.replaceChildren();
    LINKS.forEach(([label,href])=>{const a=document.createElement('a');a.href=href;a.textContent=label;tabs.appendChild(a);});

    if(!document.getElementById('ft-persistent-tabs-style')){
      const style=document.createElement('style');
      style.id='ft-persistent-tabs-style';
      style.textContent=`
      .ft-persistent-tabs{position:sticky!important;top:var(--ft-tabs-top,76px)!important;z-index:175!important;display:grid!important;grid-template-columns:repeat(7,minmax(0,1fr))!important;gap:0!important;padding:0 10px!important;background:#0b0b0e!important;border-bottom:1px solid #2b2b31!important;box-shadow:0 3px 10px rgba(0,0,0,.14)!important;flex-wrap:nowrap!important}
      .ft-persistent-tabs a{position:relative!important;display:flex!important;align-items:center!important;justify-content:center!important;min-width:0!important;max-width:none!important;text-align:center!important;background:transparent!important;color:#fff!important;border:0!important;padding:14px 8px 16px!important;font-size:13px!important;line-height:1.1!important;font-weight:900!important;text-decoration:none!important;white-space:nowrap!important}
      .ft-persistent-tabs a:hover,.ft-persistent-tabs a:focus-visible{background:#17171b!important;color:#fff!important}.ft-persistent-tabs a.active-tab{color:#f7c600!important}.ft-persistent-tabs a.active-tab::after{content:'';position:absolute;left:10px;right:10px;bottom:0;height:5px;background:#f7c600}
      @media(max-width:900px){.ft-persistent-tabs{grid-template-columns:none!important;grid-auto-flow:column!important;grid-auto-columns:max-content!important;justify-content:start!important;overflow-x:auto!important;scrollbar-width:none!important;-webkit-overflow-scrolling:touch!important;padding:0 8px!important}.ft-persistent-tabs::-webkit-scrollbar{display:none}.ft-persistent-tabs a{min-width:92px!important;width:auto!important;padding:11px 12px 13px!important;font-size:11px!important}.ft-persistent-tabs a.active-tab::after{left:8px;right:8px;height:4px}}
      `;
      document.head.appendChild(style);
    }

    const setOffset=()=>document.documentElement.style.setProperty('--ft-tabs-top',`${Math.ceil(header.getBoundingClientRect().height)}px`);
    setOffset();window.addEventListener('resize',setOffset,{passive:true});
    const key=currentKey();
    [...tabs.querySelectorAll('a')].forEach(a=>{const active=(a.getAttribute('href')||'').toLowerCase()===key.toLowerCase();a.classList.toggle('active-tab',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build,{once:true});else build();
})();