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
    const raw=Number(f.timestamp||0);
    if(raw) return raw<100000000000?raw*1000:raw;
    const value=f.date||f.kickoff||f.startTime;
    const parsed=value?Date.parse(value):NaN;
    return Number.isNaN(parsed)?0:parsed;
  };
  const isPremier=name=>String(name||'').toLowerCase().includes('premier league');

  async function init(){
    const hero=document.querySelector('.hero');
    if(!hero||document.getElementById('pl-kickoff-countdown'))return;
    const box=document.createElement('section');
    box.id='pl-kickoff-countdown';
    box.innerHTML=`<div class="plcd-inner"><div class="plcd-label">PREMIER LEAGUE</div><div class="plcd-title">⏱ COUNTDOWN TO KICK-OFF</div><div class="plcd-clock"><span><b data-unit="days">--</b><small>DAYS</small></span><i>:</i><span><b data-unit="hours">--</b><small>HRS</small></span><i>:</i><span><b data-unit="mins">--</b><small>MIN</small></span><i>:</i><span><b data-unit="secs">--</b><small>SEC</small></span></div><div class="plcd-next">Finding the next Premier League kick-off…</div></div>`;
    hero.insertAdjacentElement('beforebegin',box);
    const style=document.createElement('style');
    style.textContent=`#pl-kickoff-countdown{background:#0b0b0e;color:#fff;border-top:5px solid #f7c600;border-bottom:1px solid #2a2a2e;padding:18px 16px}.plcd-inner{max-width:1180px;margin:auto;text-align:center}.plcd-label{display:inline-block;background:#f7c600;color:#111;font-weight:1000;font-size:11px;letter-spacing:.12em;padding:5px 9px;margin-bottom:7px}.plcd-title{font-weight:1000;font-size:18px;letter-spacing:.03em}.plcd-clock{display:flex;justify-content:center;align-items:center;gap:10px;margin:12px 0 8px}.plcd-clock span{min-width:64px;background:#17171b;border:1px solid #333;padding:9px 7px}.plcd-clock b{display:block;font-size:27px;line-height:1;color:#f7c600}.plcd-clock small{display:block;font-size:9px;font-weight:900;letter-spacing:.1em;margin-top:5px;color:#ddd}.plcd-clock i{font-style:normal;font-size:25px;font-weight:900;color:#f7c600}.plcd-next{font-size:13px;font-weight:800;color:#eee}@media(max-width:520px){#pl-kickoff-countdown{padding:14px 7px}.plcd-clock{gap:4px}.plcd-clock span{min-width:50px;padding:8px 4px}.plcd-clock b{font-size:23px}.plcd-clock i{font-size:20px}.plcd-title{font-size:15px}}`;
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
    const chooseNext=fixtures=>{
      const now=Date.now();
      const future=fixtures.map(f=>({...f,_time:fixtureTime(f)})).filter(f=>f._time>now+1000).sort((a,b)=>a._time-b._time);
      if(!future.length){target=0;group=[];nextEl.textContent='Next Premier League kick-off will appear here when fixtures are available.';return;}
      target=future[0]._time;
      group=future.filter(f=>Math.abs(f._time-target)<60000);
      describe();
    };
    const load=async()=>{
      try{
        const r=await fetch(`/api/fixtures?t=${Date.now()}`,{cache:'no-store'});
        if(!r.ok)throw new Error();
        const data=await r.json();
        const fixtures=(data.leagues||[]).filter(l=>isPremier(l.name)).flatMap(l=>l.fixtures||[]);
        chooseNext(fixtures);
      }catch(_){nextEl.textContent='Premier League countdown temporarily unavailable.';}
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
    await load();tick();setInterval(tick,1000);setInterval(load,60000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();