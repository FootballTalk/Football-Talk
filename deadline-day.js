(() => {
  const TIME_ZONE='Europe/London';
  const DEADLINE_DATE='2026-09-01';
  const DEADLINE_HOUR=23;
  const REFRESH_MS=60000;

  const londonParts=date=>new Intl.DateTimeFormat('en-GB',{
    timeZone:TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false
  }).formatToParts(date).reduce((o,p)=>(o[p.type]=p.value,o),{});

  const londonDateKey=()=>{
    const p=londonParts(new Date());
    return `${p.year}-${p.month}-${p.day}`;
  };

  if(londonDateKey()!==DEADLINE_DATE) return;
  if(document.getElementById('deadline-day-live')) return;

  const host=document.createElement('section');
  host.id='deadline-day-live';
  host.setAttribute('aria-label','Transfer Deadline Day live updates');
  host.innerHTML=`
    <div class="ddl-head">
      <span class="ddl-badge">DEADLINE DAY LIVE</span>
      <span class="ddl-countdown" id="ddl-countdown">Closes 23:00</span>
    </div>
    <div class="ddl-viewport">
      <div class="ddl-track" id="ddl-track">
        <span>⚡ Loading the latest Deadline Day transfer news…</span>
        <span aria-hidden="true">⚡ Loading the latest Deadline Day transfer news…</span>
      </div>
    </div>`;

  const anchor=document.querySelector('.ticker')||document.querySelector('.top-social')||document.querySelector('main');
  if(!anchor) return;
  anchor.insertAdjacentElement('beforebegin',host);

  const style=document.createElement('style');
  style.textContent=`
    #deadline-day-live{background:#0b0b0e;color:#fff;border-top:4px solid #f7c600;border-bottom:4px solid #f7c600;overflow:hidden}
    .ddl-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 14px;background:#111}
    .ddl-badge{display:inline-block;background:#f7c600;color:#000;font-weight:1000;font-size:12px;letter-spacing:.08em;padding:6px 9px}
    .ddl-countdown{font-size:12px;font-weight:900;color:#f7c600;white-space:nowrap}
    .ddl-viewport{overflow:hidden;white-space:nowrap;background:#f7c600;color:#000}
    .ddl-track{display:inline-flex;align-items:center;gap:48px;min-width:max-content;padding:10px 0;font-weight:900;animation:ddl-crawl 52s linear infinite;will-change:transform}
    .ddl-track span{display:inline-block}
    .ddl-stage{font-weight:1000}
    @keyframes ddl-crawl{from{transform:translateX(0)}to{transform:translateX(-50%)}}
    @media(max-width:700px){.ddl-head{padding:7px 9px}.ddl-badge,.ddl-countdown{font-size:10px}.ddl-track{gap:32px;animation-duration:42s;font-size:13px}}
    @media(prefers-reduced-motion:reduce){.ddl-track{animation:none;white-space:normal;display:block;padding:10px 12px}}
  `;
  document.head.appendChild(style);

  const track=document.getElementById('ddl-track');
  const countdown=document.getElementById('ddl-countdown');

  const stageLabel=item=>{
    if(item.stage==='OFFICIAL') return 'DONE DEAL';
    if(item.stage==='ITS_A_GO') return "IT'S A GO!";
    if(item.stage==='DEVELOPING') return 'BREAKING';
    return 'RUMOUR';
  };

  const escapeHtml=value=>String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  const render=items=>{
    const transfers=(items||[])
      .filter(item=>item&&item.type==='TRANSFER'&&item.title)
      .sort((a,b)=>new Date(b.publishedAt||0)-new Date(a.publishedAt||0))
      .slice(0,12);
    if(!transfers.length){
      track.innerHTML='<span>⚡ Deadline Day live: waiting for the next transfer development…</span><span aria-hidden="true">⚡ Deadline Day live: waiting for the next transfer development…</span>';
      return;
    }
    const line=transfers.map(item=>`<span>⚡ <span class="ddl-stage">${escapeHtml(stageLabel(item))}</span> — ${escapeHtml(item.title)}</span>`).join('');
    track.innerHTML=line+line;
  };

  async function load(){
    try{
      const r=await fetch(`/api/news?deadline=1&t=${Date.now()}`,{cache:'no-store'});
      if(!r.ok) return;
      const data=await r.json();
      render(data.items||[]);
    }catch(_){}
  }

  function updateCountdown(){
    const p=londonParts(new Date());
    const nowMinutes=Number(p.hour)*60+Number(p.minute);
    const closeMinutes=DEADLINE_HOUR*60;
    const diff=Math.max(0,closeMinutes-nowMinutes);
    if(diff<=0){
      countdown.textContent='WINDOW CLOSED · late deals still updating';
      return;
    }
    const h=Math.floor(diff/60),m=diff%60;
    countdown.textContent=`WINDOW CLOSES IN ${h}h ${String(m).padStart(2,'0')}m`;
  }

  updateCountdown();
  load();
  setInterval(updateCountdown,30000);
  setInterval(load,REFRESH_MS);
})();
