document.addEventListener('DOMContentLoaded',()=>{
  const addStatsLink=(container,label='Stats Zone')=>{
    if(!container||container.querySelector('a[href="/api/stats-zone"]'))return;
    const link=document.createElement('a');
    link.href='/api/stats-zone';
    link.textContent=label;
    const tables=[...container.querySelectorAll('a')].find(a=>a.textContent.trim()==='Tables');
    if(tables) container.insertBefore(link,tables); else container.appendChild(link);
  };
  const addCupsLink=(container,label='Cups')=>{
    if(!container||container.querySelector('a[href="cups.html"]'))return;
    const link=document.createElement('a');
    link.href='cups.html';
    link.textContent=label;
    const results=[...container.querySelectorAll('a')].find(a=>a.textContent.trim()==='Results');
    if(results) container.insertBefore(link,results); else container.appendChild(link);
  };
  const nav=document.querySelector('.nav');
  const quick=document.querySelector('.quick-nav');
  addStatsLink(nav);
  addStatsLink(quick,'Stats');
  addCupsLink(nav);
  addCupsLink(quick,'Cups');

  if(!quick)return;

  const style=document.createElement('style');
  style.textContent=`
    .quick-nav{background:#0b0b0e!important;border-bottom:1px solid #2b2b31!important;gap:0!important;padding:0 10px!important;align-items:stretch!important}
    .quick-nav a{position:relative!important;background:transparent!important;color:#fff!important;border:0!important;border-radius:0!important;padding:14px 16px 16px!important;font-weight:800!important;max-width:none!important}
    .quick-nav a:hover,.quick-nav a:focus-visible{background:#17171b!important;color:#fff!important}
    .quick-nav a.active-tab::after{content:'';position:absolute;left:10px;right:10px;bottom:0;height:5px;background:#f7c600}
    @media(max-width:900px){.quick-nav{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:0!important;padding:0 4px!important}.quick-nav a{min-width:0!important;width:100%!important;padding:11px 3px 13px!important;font-size:11px!important;line-height:1.1!important}.quick-nav a.active-tab::after{left:5px;right:5px;height:4px}}
  `;
  document.head.appendChild(style);

  const links=[...quick.querySelectorAll('a')];
  const setActive=link=>links.forEach(a=>a.classList.toggle('active-tab',a===link));
  const latest=links.find(a=>a.textContent.trim()==='Latest');
  if(latest)setActive(latest);
  links.forEach(link=>{
    link.addEventListener('pointerdown',()=>setActive(link));
    link.addEventListener('focus',()=>setActive(link));
  });
});

document.addEventListener('click',e=>{
  const link=e.target.closest('.nav a[href*="?view="],.quick-nav a[href*="?view="]');
  if(!link)return;
  const url=new URL(link.href,window.location.href);
  const view=url.searchParams.get('view');
  if(!view)return;
  e.preventDefault();
  window.location.href=`section.html?view=${encodeURIComponent(view)}`;
},true);
