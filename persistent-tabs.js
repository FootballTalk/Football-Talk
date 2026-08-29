(() => {
  const LINKS = [
    ['Latest','section.html?view=latest'],
    ['Transfers','section.html?view=transfers'],
    ['Matchday','section.html?view=matchday'],
    ['Debate','section.html?view=debate'],
    ['Super 6','super-six.html'],
    ['Stats','section.html?view=stats'],
    ['Tables','tables.html'],
    ['Fixtures','fixtures.html'],
    ['Domestic Cups','cups.html'],
    ['Europe','european.html'],
    ['Lineups','lineups.html'],
    ['Daily Quiz','quiz.html'],
    ['Join Free','account.html']
  ];

  function currentKey(){
    const path=(location.pathname.split('/').pop()||'').toLowerCase();
    if(path==='section.html'){
      const view=new URLSearchParams(location.search).get('view')||'latest';
      return `section.html?view=${view}`;
    }
    return path||'index.html';
  }

  function memberLabel(){
    try{const s=JSON.parse(localStorage.getItem('football-talk-member-session')||'null');return s?.access_token?'My Account':'Join Free'}catch{return'Join Free'}
  }

  function build(){
    let tabs=document.querySelector('.quick-nav, .ft-persistent-tabs');
    const header=document.querySelector('.site-header, .section-page-brand, header.top, .top');
    if(!header) return;

    if(!tabs){
      tabs=document.createElement('nav');
      tabs.className='ft-persistent-tabs';
      tabs.setAttribute('aria-label','Football Talk sections');
      LINKS.forEach(([label,href])=>{const a=document.createElement('a');a.href=href;a.textContent=href==='account.html'?memberLabel():label;tabs.appendChild(a);});
      header.insertAdjacentElement('afterend',tabs);
    } else {
      tabs.classList.add('ft-persistent-tabs');
      if(![...tabs.querySelectorAll('a')].some(a=>(a.getAttribute('href')||'').toLowerCase()==='account.html')){
        const a=document.createElement('a');a.href='account.html';a.textContent=memberLabel();tabs.appendChild(a);
      }
    }

    if(!document.getElementById('ft-persistent-tabs-style')){
      const style=document.createElement('style');
      style.id='ft-persistent-tabs-style';
      style.textContent=`.ft-persistent-tabs{position:sticky!important;top:var(--ft-tabs-top,76px)!important;z-index:175!important;display:flex!important;flex-wrap:wrap!important;justify-content:center!important;align-items:stretch!important;gap:0!important;padding:0 8px!important;background:#0b0b0e!important;border-bottom:1px solid #2b2b31!important;box-shadow:0 3px 10px rgba(0,0,0,.14)!important}.ft-persistent-tabs a{position:relative!important;flex:1 1 130px!important;max-width:190px!important;min-width:105px!important;text-align:center!important;background:transparent!important;color:#fff!important;border:0!important;padding:12px 10px 14px!important;font-size:12px!important;line-height:1.1!important;font-weight:900!important;text-decoration:none!important}.ft-persistent-tabs a[href="account.html"]{color:#f7c600!important}.ft-persistent-tabs a:hover,.ft-persistent-tabs a:focus-visible{background:#17171b!important;color:#fff!important}.ft-persistent-tabs a.active-tab::after{content:'';position:absolute;left:7px;right:7px;bottom:0;height:4px;background:#f7c600}@media(max-width:900px){.ft-persistent-tabs{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;padding:0 4px!important}.ft-persistent-tabs a{min-width:0!important;max-width:none!important;width:100%!important;padding:10px 3px 12px!important;font-size:10.5px!important}.ft-persistent-tabs a.active-tab::after{left:4px;right:4px}}`;
      document.head.appendChild(style);
    }

    const setOffset=()=>document.documentElement.style.setProperty('--ft-tabs-top',`${Math.ceil(header.getBoundingClientRect().height)}px`);
    setOffset();window.addEventListener('resize',setOffset,{passive:true});
    const key=currentKey();
    [...tabs.querySelectorAll('a')].forEach(a=>{const active=(a.getAttribute('href')||'').toLowerCase()===key;a.classList.toggle('active-tab',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',build,{once:true}); else build();
})();