(() => {
  const feed=document.getElementById('members-transfer-feed');
  const updated=document.getElementById('members-transfer-updated');
  if(!feed)return;
  const read=()=>{try{return JSON.parse(localStorage.getItem('football-talk-member-session')||'null')}catch{return null}};
  const esc=(v='')=>String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  const fmt=v=>v?new Date(v).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'';
  function render(items){
    if(!items.length){feed.innerHTML='<div class="empty-state"><strong>No fresh “IT’S A GO!” updates showing right now</strong><span>The feed checks Fabrizio Romano’s official Telegram mirror and will refresh automatically.</span></div>';return;}
    feed.innerHTML=items.map(item=>`<article class="press-card"><div class="press-card-top"><span class="here-we-go">🚨 IT’S A GO!</span><span>${esc(fmt(item.publishedAt))}</span></div><p>${esc(item.text)}</p><a href="${esc(item.link)}" target="_blank" rel="noopener noreferrer">View Fabrizio source →</a></article>`).join('');
  }
  async function load(){
    const session=read();
    if(!session?.access_token)return;
    try{
      const r=await fetch(`/api/members-transfers?t=${Date.now()}`,{headers:{Authorization:`Bearer ${session.access_token}`},cache:'no-store'});
      if(r.status===401)return;
      if(!r.ok)throw new Error('feed unavailable');
      const data=await r.json();render(data.items||[]);
      if(updated)updated.textContent=`Updated ${new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}`;
    }catch(_){feed.innerHTML='<div class="empty-state"><strong>Feed temporarily unavailable</strong><span>Your Members Area is working — the live transfer source could not be reached just now.</span></div>';}
  }
  load();setInterval(load,120000);
})();