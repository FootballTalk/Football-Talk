(() => {
  const formatTime = ms => {
    const total=Math.max(0,Math.floor(ms/1000));
    const days=Math.floor(total/86400);
    const hours=Math.floor((total%86400)/3600);
    const mins=Math.floor((total%3600)/60);
    const secs=total%60;
    return {days,hours,mins,secs};
  };
  const pad=n=>String(n).padStart(2,'0');
  const fixtureTime=f=>{
    const raw=Number(f?.timestamp||0);
    if(raw) return raw<100000000000?raw*1000:raw;
    const value=f?.date||f?.kickoff||f?.startTime;
    const parsed=value?Date.parse(value):NaN;
    return Number.isNaN(parsed)?0:parsed;
  };

  async function init(){
    const hero=document.querySelector('.hero');
    if(!hero||document.getElementById('pl-kickoff-countdown'))return;
    const row=document.createElement('section');
    row.id='pl-partner-row';
    const box=document.createElement('div');
    box.id='pl-kickoff-countdown';
    box.innerHTML=`<div class="plcd-inner"><div class="plcd-label">PREMIER LEAGUE</div><div class="plcd-title">⏱ COUNTDOWN TO KICK-OFF</div><div class="plcd-clock"><span><b data-unit="days">--</b><small>DAYS</small></span><i>:</i><span><b data-unit="hours">--</b><small>HRS</small></span><i>:</i><span><b data-unit="mins">--</b><small>MIN</small></span><i>:</i><span><b data-unit="secs">--</b><small>SEC</small></span></div><div class="plcd-next">Finding the next Premier League kick-off…</div></div>`;
    const partner=document.createElement('aside');
    partner.id='ft-premium-partner-22law';
    partner.setAttribute('aria-label','Football Talk Premium Featured Partner — 22 Law');
    partner.innerHTML=`<div class="ftpp-kicker">PREMIUM FEATURED PARTNER</div><a class="ftpp-brand" href="https://www.22law.co.uk/?utm_source=footballtalk&utm_medium=partner&utm_campaign=22law_2026&utm_content=homepage_countdown" target="_blank" rel="sponsored noopener" data-ft-partner="22law" data-ft-placement="homepage-countdown">22 <span>|</span> LAW.</a><div class="ftpp-sub">SOLICITORS</div><p>Residential &amp; Commercial Conveyancing</p><div class="ftpp-actions"><a href="https://www.22law.co.uk/?utm_source=footballtalk&utm_medium=partner&utm_campaign=22law_2026&utm_content=homepage_countdown_cta" target="_blank" rel="sponsored noopener" data-ft-partner="22law" data-ft-placement="homepage-countdown-cta">VISIT 22 LAW →</a><a class="ftpp-story" href="22-law-feature.html">READ OUR PARTNER FEATURE</a></div><small>Sponsored partnership</small>`;
    row.appendChild(box);row.appendChild(partner);
    hero.insertAdjacentElement('beforebegin',row);
    const style=document.createElement('style');
    style.textContent=`#pl-partner-row{background:#0b0b0e;border-top:5px solid #f7c600;border-bottom:1px solid #2a2a2e;padding:18px 16px;display:grid;grid-template-columns:minmax(0,1.45fr) minmax(300px,.75fr);gap:16px;align-items:stretch}#pl-kickoff-countdown{color:#fff;display:flex;align-items:center;justify-content:center}.plcd-inner{width:100%;max-width:820px;margin:auto;text-align:center}.plcd-label{display:inline-block;background:#f7c600;color:#111;font-weight:1000;font-size:11px;letter-spacing:.12em;padding:5px 9px;margin-bottom:7px}.plcd-title{font-weight:1000;font-size:18px;letter-spacing:.03em}.plcd-clock{display:flex;justify-content:center;align-items:center;gap:10px;margin:12px 0 8px}.plcd-clock span{min-width:64px;background:#17171b;border:1px solid #333;padding:9px 7px}.plcd-clock b{display:block;font-size:27px;line-height:1;color:#f7c600}.plcd-clock small{display:block;font-size:9px;font-weight:900;letter-spacing:.1em;margin-top:5px;color:#ddd}.plcd-clock i{font-style:normal;font-size:25px;font-weight:900;color:#f7c600}.plcd-next{font-size:13px;font-weight:800;color:#eee}#ft-premium-partner-22law{background:linear-gradient(135deg,#f4f0e8,#fff);color:#151515;border:1px solid #d8d0c3;border-radius:8px;padding:16px 18px;text-align:center;display:flex;flex-direction:column;justify-content:center;box-shadow:0 8px 24px rgba(0,0,0,.22)}.ftpp-kicker{font-size:10px;font-weight:1000;letter-spacing:.14em;color:#7c5c31;margin-bottom:7px}.ftpp-brand{font-family:Georgia,serif;font-size:30px;font-weight:800;letter-spacing:.03em;color:#171717;text-decoration:none;line-height:1}.ftpp-brand span{color:#b37b38}.ftpp-sub{font-size:10px;font-weight:900;letter-spacing:.28em;margin:5px 0 8px;color:#555}#ft-premium-partner-22law p{font-family:Georgia,serif;font-size:15px;font-weight:700;margin:4px 0 12px}.ftpp-actions{display:flex;gap:8px;justify-content:center;align-items:center;flex-wrap:wrap}.ftpp-actions a{background:#171717;color:#fff;text-decoration:none;font-size:11px;font-weight:1000;padding:9px 11px;border-radius:3px}.ftpp-actions .ftpp-story{background:transparent;color:#171717;border:1px solid #777}#ft-premium-partner-22law>small{font-size:9px;color:#777;margin-top:9px}@media(max-width:780px){#pl-partner-row{grid-template-columns:1fr;padding:14px 8px;gap:12px}#pl-kickoff-countdown{padding:0 0 4px}.plcd-clock{gap:4px}.plcd-clock span{min-width:50px;padding:8px 4px}.plcd-clock b{font-size:23px}.plcd-clock i{font-size:20px}.plcd-title{font-size:15px}#ft-premium-partner-22law{padding:15px}.ftpp-brand{font-size:28px}}`;
    document.head.appendChild(style);
    const nextEl=box.querySelector('.plcd-next');
    let target=0, group=[];

    const describe=()=>{
      if(!target)return;
      const d=new Date(target);
      const when=d.toLocaleString('en-GB',{weekday:'long',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Europe/London'});
      if(group.length===1) nextEl.textContent=`Next: ${when} — ${group[0].home} v ${group[0].away}`;
      else nextEl.textContent=`Next: ${when} — ${group.length} Premier League matches`;
    };

    const load=async()=>{
      try{
        const r=await fetch(`/api/next-premier?t=${Date.now()}`,{cache:'no-store'});
        const data=await r.json();
        if(!r.ok)throw new Error(data.detail||data.error||'Unable to load next fixture');
        const first=data.next||null;
        if(!first){target=0;group=[];nextEl.textContent='Next Premier League kick-off will appear here when fixtures are available.';return;}
        target=fixtureTime(first);group=Array.isArray(data.group)&&data.group.length?data.group:[first];describe();
      }catch(_){target=0;group=[];nextEl.textContent='Premier League countdown temporarily unavailable.';}
    };

    const tick=()=>{
      if(!target)return;
      const diff=target-Date.now();
      if(diff<=0){target=0;group=[];load();return;}
      const t=formatTime(diff);
      box.querySelector('[data-unit="days"]').textContent=pad(t.days);
      box.querySelector('[data-unit="hours"]').textContent=pad(t.hours);
      box.querySelector('[data-unit="mins"]').textContent=pad(t.mins);
      box.querySelector('[data-unit="secs"]').textContent=pad(t.secs);
    };

    await load();tick();setInterval(tick,1000);setInterval(load,300000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

if(!document.querySelector('script[data-ft-draw-news]')){const drawNews=document.createElement('script');drawNews.src='draw-news.js?v=20260826-1';drawNews.dataset.ftDrawNews='1';document.body.appendChild(drawNews);}
if(!document.querySelector('script[data-ft-header-logo]')){const headerLogo=document.createElement('script');headerLogo.src='header-logo.js?v=20260827-1';headerLogo.dataset.ftHeaderLogo='1';document.body.appendChild(headerLogo);}
