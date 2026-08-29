(() => {
  const feed=document.getElementById('members-transfer-feed');
  const updated=document.getElementById('members-transfer-updated');
  if(!feed)return;
  const read=()=>{try{return JSON.parse(localStorage.getItem('football-talk-member-session')||'null')}catch{return null}};
  const esc=(v='')=>String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  const fmt=v=>v?new Date(v).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'';

  function styles(){
    if(document.getElementById('itsago-ticker-css'))return;
    const s=document.createElement('style');
    s.id='itsago-ticker-css';
    s.textContent='.transfer-feed{overflow:hidden}.itsago-ticker{overflow:hidden;display:flex;align-items:center;min-height:58px;background:#101013;border:1px solid #34343a;border-left:5px solid #f7c600;border-radius:12px}.itsago-label{flex:0 0 auto;align-self:stretch;display:flex;align-items:center;padding:0 16px;background:#b11219;color:#fff;font-weight:1000;z-index:2}.itsago-window{overflow:hidden;white-space:nowrap;flex:1}.itsago-track{display:inline-flex;width:max-content;animation:itsago-scroll 44s linear infinite}.itsago-item{display:inline-flex;align-items:center;gap:10px;padding:0 30px;font-weight:900;color:#f4f4f5;white-space:nowrap}.itsago-item:after{content:"◆";color:#f7c600;margin-left:20px;font-size:10px}.itsago-time{font-size:11px;color:#aaa;font-weight:700}.itsago-ticker:hover .itsago-track{animation-play-state:paused}@keyframes itsago-scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}@media(max-width:700px){.itsago-label{padding:0 11px;font-size:12px}.itsago-item{padding:0 20px;font-size:13px}.itsago-track{animation-duration:36s}}';
    document.head.appendChild(s);
  }

  function render(items){
    styles();
    if(!items.length){
      feed.innerHTML='<div class="empty-state"><strong>No fresh IT\'S A GO! confirmations right now</strong><span>The ticker updates automatically when a new confirmed transfer lands.</span></div>';
      return;
    }
    const one=items.slice(0,20).map(item=>'<span class="itsago-item"><span>🚨 '+esc(item.text)+'</span><span class="itsago-time">'+esc(fmt(item.publishedAt))+'</span></span>').join('');
    feed.innerHTML='<div class="itsago-ticker" aria-label="Latest confirmed transfers"><div class="itsago-label">IT\'S A GO!</div><div class="itsago-window"><div class="itsago-track">'+one+one+'</div></div></div>';
  }

  async function load(){
    const session=read();
    if(!session?.access_token)return;
    try{
      const r=await fetch('/api/members-transfers?t='+Date.now(),{headers:{Authorization:'Bearer '+session.access_token},cache:'no-store'});
      if(r.status===401)return;
      if(!r.ok)throw new Error('feed unavailable');
      const data=await r.json();
      render(data.items||[]);
      if(updated)updated.textContent='Updated '+new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
    }catch(_){
      feed.innerHTML='<div class="empty-state"><strong>Ticker temporarily unavailable</strong><span>Your Members Area is working — the live transfer source could not be reached just now.</span></div>';
    }
  }

  load();
  setInterval(load,120000);
})();