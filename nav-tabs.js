document.addEventListener('DOMContentLoaded',()=>{
  if(!document.querySelector('script[data-site-logo]')){
    const siteLogo=document.createElement('script');
    siteLogo.src='site-logo.js?v=20260829-4';
    siteLogo.dataset.siteLogo='1';
    document.body.appendChild(siteLogo);
  }
  if(!document.querySelector('script[data-auto-editorial]')){
    const autoEditorial=document.createElement('script');
    autoEditorial.src='auto-editorial.js?v=20260825-5';
    autoEditorial.dataset.autoEditorial='1';
    document.body.appendChild(autoEditorial);
  }

  const addStatsLink=(container,label='Stats Zone')=>{
    if(!container||container.querySelector('a[href="/api/stats-zone"]'))return;
    const link=document.createElement('a');link.href='/api/stats-zone';link.textContent=label;
    const tables=[...container.querySelectorAll('a')].find(a=>a.textContent.trim()==='Tables');
    if(tables) container.insertBefore(link,tables); else container.appendChild(link);
  };
  const addCupsLink=(container,label='Domestic Cups')=>{
    if(!container||container.querySelector('a[href="cups.html"]'))return;
    const link=document.createElement('a');link.href='cups.html';link.textContent=label;
    const results=[...container.querySelectorAll('a')].find(a=>a.textContent.trim()==='Results');
    if(results) container.insertBefore(link,results); else container.appendChild(link);
  };
  const addEuropeLink=(container,label='European Football')=>{
    if(!container||container.querySelector('a[href="european.html"]'))return;
    const link=document.createElement('a');link.href='european.html';link.textContent=label;
    const cups=[...container.querySelectorAll('a')].find(a=>['Cups','Domestic Cups'].includes(a.textContent.trim()));
    if(cups) cups.insertAdjacentElement('afterend',link); else container.appendChild(link);
  };
  const addSuperSixLink=(container,label='Super Six')=>{
    if(!container||container.querySelector('a[href="super-six.html"]'))return;
    const link=document.createElement('a');link.href='super-six.html';link.textContent=label;
    const debate=[...container.querySelectorAll('a')].find(a=>(a.getAttribute('href')||'').includes('view=debate'));
    if(debate) debate.insertAdjacentElement('afterend',link); else container.appendChild(link);
  };
  const addQuizLink=(container,label='Daily Quiz')=>{
    if(!container||container.querySelector('a[href="quiz.html"]'))return;
    const link=document.createElement('a');link.href='quiz.html';link.textContent=label;
    const superSix=[...container.querySelectorAll('a')].find(a=>['Super Six','Super 6'].includes(a.textContent.trim()));
    if(superSix) superSix.insertAdjacentElement('afterend',link); else container.appendChild(link);
  };
  const addMembersLink=(container)=>{
    if(!container||container.querySelector('a[href="members.html"]'))return;
    const link=document.createElement('a');link.href='members.html';link.textContent='🔒 Members Area';link.classList.add('members-area-tab');container.appendChild(link);
  };

  const nav=document.querySelector('.nav');
  const quick=document.querySelector('.quick-nav');
  addStatsLink(nav);addStatsLink(quick,'Stats');
  addCupsLink(nav,'Domestic Cups');addCupsLink(quick,'Domestic Cups');
  addEuropeLink(nav,'Europe');addEuropeLink(quick,'Europe');
  addSuperSixLink(nav);addSuperSixLink(quick,'Super 6');
  addQuizLink(nav,'Daily Quiz');addQuizLink(quick,'Daily Quiz');
  addMembersLink(nav);addMembersLink(quick);

  document.querySelectorAll('a[href="cups.html"]').forEach(a=>a.textContent='Domestic Cups');
  document.querySelectorAll('a[href*="view=debate"]').forEach(a=>{a.innerHTML='<span class="debate-live-dot" aria-hidden="true"></span>Fan Debate Live';a.classList.add('debate-live-tab');});

  const transfers=document.getElementById('transfers');
  if(transfers){transfers.querySelectorAll('.transfer-update-grid,.transfer-live-head,.latest-transfer-head,#transfer-stories').forEach(el=>el.remove());}

  const matchday=document.getElementById('matchday');
  if(matchday){
    const strong=matchday.querySelector('.scoreboard strong');const heading=matchday.querySelector('.scoreboard h3');const copy=matchday.querySelector('.scoreboard p');
    if(strong) strong.textContent='FT LIVE Matchday Centre';
    if(heading) heading.textContent='Live scores, match status & results';
    if(copy) copy.textContent='Live coverage for the Premier League, Championship, Carabao Cup and FA Cup, updated automatically throughout matchdays.';
  }

  const staleDebateTitles=new Set(['Who wins the Premier League this season?','Poll: Which summer signing will make the biggest impact?','VAR: improving football or still causing too much frustration?']);
  const removeStaleDebates=()=>{const debatePosts=document.getElementById('debate-posts');if(!debatePosts)return;debatePosts.querySelectorAll('.post-card').forEach(card=>{const title=card.querySelector('h3')?.textContent?.trim();if(staleDebateTitles.has(title)) card.remove();});};
  removeStaleDebates();const debatePosts=document.getElementById('debate-posts');if(debatePosts) new MutationObserver(removeStaleDebates).observe(debatePosts,{childList:true,subtree:true});

  document.querySelectorAll('.ticker-track span').forEach(span=>{span.textContent='⚽ FT LIVE — Loading the latest football news, transfers and live match scores…';});
  if(!quick)return;

  const style=document.createElement('style');
  style.textContent=`
    .auto-hidden{display:none!important}.debate-live-tab{display:flex!important;align-items:center!important;justify-content:center!important;gap:6px!important}.debate-live-dot{width:9px;height:9px;flex:0 0 9px;border-radius:50%;background:#24d164;box-shadow:0 0 0 3px rgba(36,209,100,.15),0 0 8px rgba(36,209,100,.75)}
    .quick-nav{background:#0b0b0e!important;border-bottom:1px solid #2b2b31!important;gap:0!important;padding:0 10px!important;align-items:stretch!important}.quick-nav a{position:relative!important;background:transparent!important;color:#fff!important;border:0!important;border-radius:0!important;padding:14px 16px 16px!important;font-weight:800!important;max-width:none!important}.quick-nav a.members-area-tab{font-size:14px!important;color:#f7c600!important;font-weight:1000!important}.nav a.members-area-tab{color:#f7c600!important;font-weight:1000!important}.quick-nav a:hover,.quick-nav a:focus-visible{background:#17171b!important;color:#fff!important}.quick-nav a.active-tab::after{content:'';position:absolute;left:10px;right:10px;bottom:0;height:5px;background:#f7c600}
    @media(max-width:900px){.quick-nav{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:0!important;padding:0 4px!important}.quick-nav a{min-width:0!important;width:100%!important;padding:11px 3px 13px!important;font-size:11px!important;line-height:1.1!important}.quick-nav a.members-area-tab{font-size:13px!important;grid-column:4}.quick-nav a.active-tab::after{left:5px;right:5px;height:4px}.debate-live-dot{width:7px;height:7px;flex-basis:7px}}
  `;
  document.head.appendChild(style);

  const links=[...quick.querySelectorAll('a')];
  const setActive=link=>links.forEach(a=>a.classList.toggle('active-tab',a===link));
  const currentPath=(location.pathname.split('/').pop()||'').toLowerCase();
  const current=links.find(a=>{const href=(a.getAttribute('href')||'').toLowerCase();return currentPath&&href.includes(currentPath);});
  const latest=links.find(a=>a.textContent.trim()==='Latest');setActive(current||latest);
  links.forEach(link=>{link.addEventListener('pointerdown',()=>setActive(link));link.addEventListener('focus',()=>setActive(link));});
});

document.addEventListener('click',e=>{
  const link=e.target.closest('.nav a[href*="?view="],.quick-nav a[href*="?view="]');if(!link)return;
  const url=new URL(link.href,window.location.href);const view=url.searchParams.get('view');if(!view)return;
  e.preventDefault();window.location.href=`section.html?view=${encodeURIComponent(view)}`;
},true);
