document.addEventListener('DOMContentLoaded',()=>{
  const path=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const params=new URLSearchParams(location.search);
  const view=(params.get('view')||'').toLowerCase();

  if(!document.querySelector('script[data-site-logo]')){
    const siteLogo=document.createElement('script');siteLogo.src='site-logo.js?v=20260829-4';siteLogo.dataset.siteLogo='1';document.body.appendChild(siteLogo);
  }
  const isHome=path==='index.html'||path==='';
  if(isHome&&!document.querySelector('script[data-auto-editorial]')){
    const autoEditorial=document.createElement('script');autoEditorial.src='auto-editorial.js?v=20260829-gaining-pace-1';autoEditorial.dataset.autoEditorial='1';document.body.appendChild(autoEditorial);
  }
  if(isHome&&!document.querySelector('script[data-home-dashboard]')){
    const home=document.createElement('script');home.src='site-home.js?v=20260830-1';home.dataset.homeDashboard='1';document.body.appendChild(home);
  }

  const sections=[
    {key:'home',label:'Home',href:'./'},
    {key:'match',label:'Match Centre',href:'match-centre.html'},
    {key:'news',label:'News',href:'news.html'},
    {key:'stats',label:'Tables & Stats',href:'tables-stats.html'},
    {key:'members',label:'Members',href:'members.html'},
    {key:'more',label:'More',href:'more.html'}
  ];
  const currentKey=()=>{
    if(isHome)return'home';
    if(['match-centre.html','fixtures.html','lineups.html','cups.html','european.html'].includes(path)||(path==='section.html'&&view==='matchday'))return'match';
    if(path==='news.html'||(path==='section.html'&&['latest','transfers','debate'].includes(view)))return'news';
    if(['tables-stats.html','tables.html'].includes(path)||location.pathname.includes('/api/stats-zone')||location.pathname.includes('/api/top-scorers'))return'stats';
    if(['members.html','account.html'].includes(path)||path.startsWith('members-'))return'members';
    if(['more.html','super-six.html','quiz.html'].includes(path))return'more';
    return'home';
  };
  const active=currentKey();
  const makeLinks=container=>{
    if(!container)return;
    container.innerHTML=sections.map(s=>`<a href="${s.href}" data-main-nav="${s.key}" class="${s.key===active?'active-tab':''}">${s.label}</a>`).join('');
  };
  const nav=document.querySelector('.nav');
  const quick=document.querySelector('.quick-nav');
  makeLinks(nav);makeLinks(quick);

  const style=document.createElement('style');
  style.textContent=`
    .quick-nav{position:sticky!important;top:0!important;z-index:90!important;background:#0b0b0e!important;border-bottom:1px solid #2b2b31!important;display:grid!important;grid-template-columns:repeat(6,minmax(0,1fr))!important;gap:0!important;padding:0 10px!important}.quick-nav a{position:relative!important;display:flex!important;align-items:center!important;justify-content:center!important;text-align:center!important;min-width:0!important;background:transparent!important;color:#fff!important;border:0!important;border-radius:0!important;padding:14px 8px 16px!important;font-weight:900!important;font-size:13px!important;text-decoration:none!important}.quick-nav a:hover,.quick-nav a:focus-visible{background:#17171b!important}.quick-nav a.active-tab{color:#f7c600!important}.quick-nav a.active-tab::after{content:'';position:absolute;left:10px;right:10px;bottom:0;height:5px;background:#f7c600}.nav a[data-main-nav="members"]{color:#f7c600!important;font-weight:1000!important}.nav a.active-tab{color:#f7c600!important}.auto-hidden{display:none!important}
    .section-tools{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;padding:9px max(12px,calc((100vw - 1180px)/2));background:#f7c600;border-bottom:1px solid #d0a800;position:relative;z-index:18}.section-tools::-webkit-scrollbar{display:none}.section-tools a{flex:0 0 auto;padding:9px 13px;border-radius:999px;background:#111;color:#fff;font-size:12px;font-weight:900;text-decoration:none;white-space:nowrap}.section-tools a:hover,.section-tools a:focus-visible,.section-tools a.context-active{background:#fff;color:#111;outline:none}.section-tools-label{flex:0 0 auto;display:flex;align-items:center;padding:0 5px 0 0;font-size:11px;font-weight:1000;letter-spacing:.08em;color:#111}
    @media(max-width:900px){.quick-nav{grid-template-columns:none!important;grid-auto-flow:column!important;grid-auto-columns:max-content!important;justify-content:start!important;overflow-x:auto!important;scrollbar-width:none!important;padding:0 8px!important}.quick-nav::-webkit-scrollbar{display:none}.quick-nav a{min-width:92px!important;padding:11px 12px 13px!important;font-size:11px!important;line-height:1.1!important}.quick-nav a.active-tab::after{left:8px;right:8px;height:4px}.nav{max-height:calc(100vh - 70px);overflow:auto}.nav a{font-size:16px!important;padding:14px 18px!important}.section-tools{padding:8px 10px}.section-tools a{padding:8px 12px;font-size:11px}body:not(.section-view) .member-home-cta{margin-top:8px}.member-home-card{padding:14px 16px!important;gap:14px!important}.member-home-card h2{font-size:21px!important;margin-bottom:3px!important}.member-home-card p:not(.eyebrow){font-size:13px!important;line-height:1.35!important}.member-home-button{min-width:0!important;padding:11px 14px!important}.top-social{padding:7px 10px!important}.top-social a.social-icon{width:34px!important;height:34px!important;min-width:34px!important}.ticker-label{padding:7px 12px!important;font-size:11px!important}.ticker-viewport{height:40px!important}.hero{min-height:410px!important;padding-top:46px!important;padding-bottom:46px!important}}
    @media(max-width:520px){.member-home-card{display:grid!important;grid-template-columns:1fr auto!important;align-items:center!important}.member-home-card p:not(.eyebrow){display:none!important}.member-home-button{width:auto!important;margin-top:0!important;white-space:nowrap!important}.member-home-card h2{font-size:18px!important}.hero h1{font-size:clamp(44px,17vw,72px)!important}.hero-tagline{font-size:25px!important}}
  `;document.head.appendChild(style);

  const toolsFor={
    match:[
      ['TODAY','match-centre.html'],['Fixtures & Results','fixtures.html'],['Lineups','lineups.html'],['Domestic Cups','cups.html'],['Europe','european.html'],['Predictions','members.html']
    ],
    stats:[
      ['Tables','tables.html'],['Stats Zone','/api/stats-zone'],['Top Scorers','/api/top-scorers'],['Form & Results','fixtures.html']
    ]
  };
  if(toolsFor[active]&&quick&&!document.querySelector('.section-tools')){
    const bar=document.createElement('nav');bar.className='section-tools';bar.setAttribute('aria-label',active==='match'?'Match Centre tools':'Tables and stats tools');
    const label=document.createElement('span');label.className='section-tools-label';label.textContent=active==='match'?'MATCH HUB':'STATS HUB';bar.appendChild(label);
    toolsFor[active].forEach(([text,href])=>{const a=document.createElement('a');a.href=href;a.textContent=text;const target=(href.split('/').pop()||'').toLowerCase();if((path&&target===path)||(href==='match-centre.html'&&path==='match-centre.html')||(href==='fixtures.html'&&path==='fixtures.html')||(href==='tables.html'&&path==='tables.html')||location.pathname.includes(href.replace(/^\//,'')))a.classList.add('context-active');bar.appendChild(a)});
    quick.insertAdjacentElement('afterend',bar);
  }

  const menu=document.querySelector('.menu-button');
  if(menu&&nav&&!menu.dataset.mainNavBound){menu.dataset.mainNavBound='1';menu.addEventListener('click',()=>{nav.classList.toggle('open');menu.setAttribute('aria-expanded',nav.classList.contains('open')?'true':'false')});}

  const transfers=document.getElementById('transfers');
  if(transfers)transfers.querySelectorAll('.transfer-update-grid,.transfer-live-head,.latest-transfer-head,#transfer-stories').forEach(el=>el.remove());
  const matchday=document.getElementById('matchday');
  if(matchday){const strong=matchday.querySelector('.scoreboard strong'),heading=matchday.querySelector('.scoreboard h3'),copy=matchday.querySelector('.scoreboard p');if(strong)strong.textContent='FT LIVE Matchday Centre';if(heading)heading.textContent='Live scores, match status & results';if(copy)copy.textContent='Live coverage for the Premier League, Championship, Carabao Cup and FA Cup, updated automatically throughout matchdays.';}

  const staleDebateTitles=new Set(['Who wins the Premier League this season?','Poll: Which summer signing will make the biggest impact?','VAR: improving football or still causing too much frustration?']);
  const removeStaleDebates=()=>{const box=document.getElementById('debate-posts');if(!box)return;box.querySelectorAll('.post-card').forEach(card=>{const title=card.querySelector('h3')?.textContent?.trim();if(staleDebateTitles.has(title))card.remove();});};
  removeStaleDebates();const debatePosts=document.getElementById('debate-posts');if(debatePosts)new MutationObserver(removeStaleDebates).observe(debatePosts,{childList:true,subtree:true});
  document.querySelectorAll('.ticker-track span').forEach(span=>{span.textContent='⚽ FT LIVE — Loading the latest football news, transfers and live match scores…';});
});

document.addEventListener('click',e=>{
  const link=e.target.closest('a[href*="section.html?view="]');if(!link)return;
  const url=new URL(link.href,window.location.href);const view=url.searchParams.get('view');if(!view)return;
  e.preventDefault();window.location.href=`section.html?view=${encodeURIComponent(view)}`;
},true);
