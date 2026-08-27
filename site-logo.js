(() => {
  const existing=[...document.scripts].find(s=>(s.src||'').includes('header-logo.js'));
  if(existing)return;
  const script=document.createElement('script');
  script.src='header-logo.js?v=20260827-sitewide-2';
  script.dataset.headerLogoShared='1';
  document.head.appendChild(script);
})();
