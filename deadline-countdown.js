(()=>{
  const TARGET=Date.parse('2026-09-01T22:00:00Z'); // 23:00 BST
  const pad=n=>String(n).padStart(2,'0');
  const split=ms=>{const t=Math.max(0,Math.floor(ms/1000));return{days:Math.floor(t/86400),hours:Math.floor((t%86400)/3600),mins:Math.floor((t%3600)/60),secs:t%60}};

  function init(){
    const kickoff=document.getElementById('pl-kickoff-countdown');
    if(!kickoff||document.getElementById('transfer-deadline-countdown'))return;

    const section=document.createElement('section');
    section.id='transfer-deadline-countdown';
    section.innerHTML=`<div class="tdc-inner"><div class="tdc-label">TRANSFER DEADLINE DAY</div><div class="tdc-title">⏳ SUMMER WINDOW CLOSES IN</div><div class="tdc-clock"><span><b data-tdc="days">--</b><small>DAYS</small></span><i>:</i><span><b data-tdc="hours">--</b><small>HRS</small></span><i>:</i><span><b data-tdc="mins">--</b><small>MIN</small></span><i>:</i><span><b data-tdc="secs">--</b><small>SEC</small></span></div><div class="tdc-meta">Tuesday 1 September · 11:00pm BST</div></div>`;
    kickoff.insertAdjacentElement('afterend',section);

    const style=document.createElement('style');
    style.textContent=`#transfer-deadline-countdown{max-width:1180px;margin:14px auto;padding:0 20px}.tdc-inner{background:#111;color:#fff;border:2px solid #f7c600;border-radius:18px;padding:17px 16px;text-align:center;box-shadow:0 12px 28px rgba(0,0,0,.14)}.tdc-label{display:inline-block;background:#f7c600;color:#111;font-weight:1000;font-size:11px;letter-spacing:.12em;padding:5px 9px;margin-bottom:7px}.tdc-title{font-weight:1000;font-size:17px;letter-spacing:.03em}.tdc-clock{display:flex;justify-content:center;align-items:center;gap:9px;margin:12px 0 8px}.tdc-clock span{min-width:64px;background:#1c1c20;border:1px solid #3a3a3e;border-radius:8px;padding:9px 7px}.tdc-clock b{display:block;font-size:27px;line-height:1;color:#f7c600}.tdc-clock small{display:block;font-size:9px;font-weight:900;letter-spacing:.1em;margin-top:5px;color:#ddd}.tdc-clock i{font-style:normal;font-size:25px;font-weight:900;color:#f7c600}.tdc-meta{font-size:12px;font-weight:900;color:#eee}@media(max-width:520px){#transfer-deadline-countdown{padding:0 14px}.tdc-clock{gap:4px}.tdc-clock span{min-width:50px;padding:8px 4px}.tdc-clock b{font-size:23px}.tdc-clock i{font-size:20px}.tdc-title{font-size:14px}}`;
    document.head.appendChild(style);

    const title=section.querySelector('.tdc-title');
    const meta=section.querySelector('.tdc-meta');
    const tick=()=>{
      const diff=TARGET-Date.now();
      const t=split(diff);
      section.querySelector('[data-tdc="days"]').textContent=pad(t.days);
      section.querySelector('[data-tdc="hours"]').textContent=pad(t.hours);
      section.querySelector('[data-tdc="mins"]').textContent=pad(t.mins);
      section.querySelector('[data-tdc="secs"]').textContent=pad(t.secs);
      if(diff<=0){title.textContent='🔒 SUMMER TRANSFER WINDOW CLOSED';meta.textContent='Deadline passed · Tuesday 1 September · 11:00pm BST';}
    };
    tick();setInterval(tick,1000);
  }

  function wait(tries=0){
    if(document.getElementById('pl-kickoff-countdown'))return init();
    if(tries<80)setTimeout(()=>wait(tries+1),50);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>wait(),{once:true});else wait();
})();
