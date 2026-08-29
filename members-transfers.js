(() => {
  const feed=document.getElementById('members-transfer-feed');
  const updated=document.getElementById('members-transfer-updated');
  if(!feed)return;
  const read=()=>{try{return JSON.parse(localStorage.getItem('football-talk-member-session')||'null')}catch{return null}};
  const esc=(v='')=>String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  const fmt=v=>v?new Date(v).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'';
  let retryTimer=null;

  function styles(){
    if(document.getElementById('itsago-ticker-css'))return;
    const s=document.createElement('style');
    s.id='itsago-ticker-css';
    s.textContent='.transfer-feed{overflow:hidden;padding:18px}.transfer-feed-head{margin-bottom:10px}.transfer-feed-head p{font-size:14px}.itsago-ticker{overflow:hidden;display:flex;align-items:center;min-height:52px;background:#08080a;border:1px solid #3b3b40;border-radius:10px}.itsago-label{flex:0 0 auto;align-self:stretch;display:flex;align-items:center;padding:0 14px;background:#b11219;color:#fff;font-weight:1000;z-index:2;box-shadow:8px 0 18px rgba(0,0,0,.35)}.itsago-window{overflow:hidden;white-space:nowrap;flex:1}.itsago-track{display:inline-flex;width:max-content;will-change:transform;animation:itsago-scroll 42s linear infinite}.itsago-item{display:inline-flex;align-items:center;gap:9px;padding:0 26px;font-weight:900;color:#f4f4f5;white-space:nowrap}.itsago-item:after{content:"◆";color:#f7c600;margin-left:18px;font-size:9px}.itsago-time{font-size:11px;color:#9f9fa6;font-weight:700}.itsago-status{padding:14px 16px;background:#101013;border:1px dashed #444;border-radius:10px;color:#bbb}.itsago-status strong{color:#f7c600}.itsago-ticker:hover .itsago-track{animation-play-state:paused}@keyframes itsago-scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}@media(max-width:700px){.transfer-feed{padding:14px}.itsago-label{padding:0 10px;font-size:11px}.itsago-item{padding:0 18px;font-size:13px}.itsago-track{animation-duration:34s}.transfer-feed-head p{font-size:13px}}';
    document.head.appendChild(s);
  }

  function render(items){
    styles();
    if(!items.length){
      feed.innerHTML='<div class="itsago-status"><strong>No IT\'S A GO! confirmations right now.</strong> The ticker will update automatically when a new confirmed transfer lands.</div>';
      return;
    }
    const one=items.slice(0,20).map(item=>'<span class="itsago-item"><span>🚨 '+esc(item.text)+'</span><span class="itsago-time">'+esc(fmt(item.publishedAt))+'</span></span>').join('');
    feed.innerHTML='<div class="itsago-ticker" aria-label="Latest confirmed transfers"><div class="itsago-label">IT\'S A GO!</div><div class="itsago-window"><div class="itsago-track">'+one+one+'</div></div></div>';
  }

  function queueRetry(ms=2500){
    clearTimeout(retryTimer);
    retryTimer=setTimeout(load,ms);
  }

  async function load(){
    clearTimeout(retryTimer);
    const session=read();
    if(!session?.access_token){
      styles();
      feed.innerHTML='<div class="itsago-status"><strong>Loading live confirmations…</strong></div>';
      queueRetry();
      return;
    }
    try{
      const r=await fetch('/api/members-transfers?t='+Date.now(),{headers:{Authorization:'Bearer '+session.access_token},cache:'no-store'});
      if(r.status===401){
        feed.innerHTML='<div class="itsago-status"><strong>Refreshing your member session…</strong></div>';
        queueRetry();
        return;
      }
      if(!r.ok)throw new Error('feed unavailable');
      const data=await r.json();
      render(data.items||[]);
      if(updated)updated.textContent='Updated '+new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
    }catch(_){
      styles();
      feed.innerHTML='<div class="itsago-status"><strong>Ticker temporarily unavailable.</strong> Retrying automatically…</div>';
      queueRetry(10000);
    }
  }

  load();
  setInterval(load,120000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});
  window.addEventListener('storage',e=>{if(e.key==='football-talk-member-session')load();});
})();