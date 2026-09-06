(function(){
  const STYLE=`
  #ft-var-live{margin:0;background:#0a0a0a;color:#fff;border-top:3px solid #f7c600;border-bottom:3px solid #f7c600;font-family:Inter,Arial,sans-serif}
  #ft-var-live .var-inner{max-width:1180px;margin:0 auto;padding:10px 16px;display:flex;gap:14px;align-items:center}
  #ft-var-live .var-badge{flex:0 0 auto;background:#f7c600;color:#111;font-weight:1000;padding:7px 10px;border-radius:999px;letter-spacing:.04em;font-size:13px}
  #ft-var-live .var-copy{min-width:0;flex:1}
  #ft-var-live .var-main{font-weight:900;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #ft-var-live .var-detail{font-size:13px;opacity:.88;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
  #ft-var-live .var-source{flex:0 0 auto;font-size:11px;opacity:.7}
  #ft-var-live.var-alert{animation:ftVarPulse .9s ease 0s 2}
  @keyframes ftVarPulse{50%{background:#2a2300}}
  @media(max-width:700px){#ft-var-live .var-inner{align-items:flex-start;gap:9px;padding:9px 10px}#ft-var-live .var-source{display:none}#ft-var-live .var-main,#ft-var-live .var-detail{white-space:normal;display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden}#ft-var-live .var-main{-webkit-line-clamp:2}#ft-var-live .var-detail{-webkit-line-clamp:2}}
  `;
  const style=document.createElement('style');style.textContent=STYLE;document.head.appendChild(style);
  const host=document.createElement('section');host.id='ft-var-live';host.hidden=true;host.setAttribute('aria-live','polite');
  host.innerHTML='<div class="var-inner"><span class="var-badge">⚠️ VAR LIVE</span><div class="var-copy"><div class="var-main">Waiting for Premier League Match Centre update…</div><div class="var-detail"></div></div><span class="var-source">Premier League Match Centre</span></div>';
  const matchday=document.querySelector('#matchday');
  if(matchday)matchday.parentNode.insertBefore(host,matchday);else document.querySelector('main')?.prepend(host);
  const main=host.querySelector('.var-main'),detail=host.querySelector('.var-detail');
  let lastId=localStorage.getItem('ft-var-last-id')||'';
  let firstLoad=true;
  function show(u){
    if(!u)return;
    host.hidden=false;
    main.textContent=`${u.match} • ${u.minute} • ${u.kind}`;
    detail.textContent=u.detail||'';
    if(!firstLoad&&u.id&&u.id!==lastId){host.classList.remove('var-alert');void host.offsetWidth;host.classList.add('var-alert');}
    if(u.id){lastId=u.id;localStorage.setItem('ft-var-last-id',u.id);} firstLoad=false;
  }
  async function refresh(){
    try{
      const r=await fetch('/api/var-live?ts='+Date.now(),{cache:'no-store'});if(!r.ok)return;
      const data=await r.json();const u=data?.updates?.[0];
      if(u)show(u);else if(firstLoad){host.hidden=false;main.textContent='VAR LIVE • No current Premier League decision';detail.textContent='This bar updates automatically when the Premier League Match Centre publishes a VAR incident.';firstLoad=false;}
    }catch{}
  }
  refresh();setInterval(refresh,30000);
})();