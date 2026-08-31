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
    const params=new URLSearchParams(location.search),view=params.get('view')||'',hub=params.get('hub')||'';
    if(path==='section.html'&&view==='transfers')return'section.html?view=transfers';
    if(path==='section.html'&&['latest','debate'].includes(view))return'news.html';
    if(path==='section.html'&&view==='matchday')return'match-centre.html';
    if(hub==='stats'||['tables.html','tables-stats.html'].includes(path)||location.pathname.includes('/api/stats-zone')||location.pathname.includes('/api/top-scorers'))return'tables-stats.html';
    if(['fixtures.html','lineups.html','cups.html','european.html'].includes(path))return'match-centre.html';
    if(['super-six.html','quiz.html'].includes(path))return'more.html';
    return path||'index.html';
  }

  function addStatsHub(tabs,key){
    if(key!=='tables-stats.html'||document.querySelector('.section-tools'))return;
    const bar=document.createElement('nav');bar.className='section-tools';bar.setAttribute('aria-label','Tables and stats tools');
    const label=document.createElement('span');label.className='section-tools-label';label.textContent='STATS HUB';bar.appendChild(label);
    const items=[
      ['Tables','tables.html','tables'],
      ['Stats Zone','/api/stats-zone','zone'],
      ['Top Scorers','/api/stats-zone?main=leaders&stat=goals','scorers'],
      ['Form & Results','fixtures.html?hub=stats','form']
    ];
    const path=location.pathname.toLowerCase(),params=new URLSearchParams(location.search),main=params.get('main')||'',stat=params.get('stat')||'',hub=params.get('hub')||'';
    let active='';
    if(path.endsWith('/tables.html'))active='tables';
    else if(path.includes('/api/stats-zone'))active=(main==='leaders'&&stat==='goals'?'scorers':'zone');
    else if(path.endsWith('/fixtures.html')&&hub==='stats')active='form';
    items.forEach(([text,href,id])=>{const a=document.createElement('a');a.href=href;a.textContent=text;if(id===active)a.classList.add('context-active');bar.appendChild(a)});
    tabs.insertAdjacentElement('afterend',bar);
  }

  function build(){
    let tabs=document.querySelector('.quick-nav, .ft-persistent-tabs');
    const header=document.querySelector('.site-header, .section-page-brand, header.top, .top');
    if(!header)return;
    if(!tabs){tabs=document.createElement('nav');tabs.className='ft-persistent-tabs';tabs.setAttribute('aria-label','Football Talk main sections');header.insertAdjacentElement('afterend',tabs);}
    tabs.classList.add('ft-persistent-tabs');tabs.replaceChildren();LINKS.forEach(([label,href])=>{const a=document.createElement('a');a.href=href;a.textContent=label;tabs.appendChild(a);});
    if(!document.getElementById('ft-persistent-tabs-style')){const style=document.createElement('style');style.id='ft-persistent-tabs-style';style.textContent=`.ft-persistent-tabs{position:sticky!important;top:var(--ft-tabs-top,76px)!important;z-index:175!important;display:grid!important;grid-template-columns:repeat(7,minmax(0,1fr))!important;gap:0!important;padding:0 10px!important;background:#0b0b0e!important;border-bottom:1px solid #2b2b31!important;box-shadow:0 3px 10px rgba(0,0,0,.14)!important}.ft-persistent-tabs a{position:relative!important;display:flex!important;align-items:center!important;justify-content:center!important;text-align:center!important;background:transparent!important;color:#fff!important;padding:14px 8px 16px!important;font-size:13px!important;font-weight:900!important;text-decoration:none!important;white-space:nowrap!important}.ft-persistent-tabs a.active-tab{color:#f7c600!important}.ft-persistent-tabs a.active-tab::after{content:'';position:absolute;left:10px;right:10px;bottom:0;height:5px;background:#f7c600}.section-tools{display:flex!important;gap:8px!important;overflow-x:auto!important;scrollbar-width:none!important;padding:9px max(12px,calc((100vw - 1180px)/2))!important;background:#f7c600!important;border-bottom:1px solid #d0a800!important;position:sticky!important;top:calc(var(--ft-tabs-top,76px) + 47px)!important;z-index:174!important}.section-tools::-webkit-scrollbar{display:none}.section-tools a{flex:0 0 auto!important;padding:9px 13px!important;border-radius:999px!important;background:#111!important;color:#fff!important;font-size:12px!important;font-weight:900!important;text-decoration:none!important;white-space:nowrap!important}.section-tools a.context-active{background:#fff!important;color:#111!important}.section-tools-label{flex:0 0 auto;display:flex;align-items:center;padding-right:5px;font-size:11px;font-weight:1000;letter-spacing:.08em;color:#111}@media(max-width:900px){.ft-persistent-tabs{grid-template-columns:none!important;grid-auto-flow:column!important;grid-auto-columns:max-content!important;justify-content:start!important;overflow-x:auto!important;scrollbar-width:none!important;padding:0 8px!important}.ft-persistent-tabs a{min-width:92px!important;padding:11px 12px 13px!important;font-size:11px!important}.section-tools{padding:8px 10px!important;top:calc(var(--ft-tabs-top,66px) + 37px)!important}.section-tools a{padding:8px 12px!important;font-size:11px!important}}`;document.head.appendChild(style);}
    const setOffset=()=>document.documentElement.style.setProperty('--ft-tabs-top',`${Math.ceil(header.getBoundingClientRect().height)}px`);setOffset();window.addEventListener('resize',setOffset,{passive:true});
    const key=currentKey();[...tabs.querySelectorAll('a')].forEach(a=>{const active=(a.getAttribute('href')||'').toLowerCase()===key.toLowerCase();a.classList.toggle('active-tab',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});addStatsHub(tabs,key);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build,{once:true});else build();
})();