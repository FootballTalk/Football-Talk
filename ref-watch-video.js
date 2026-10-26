(() => {
  const host=document.getElementById('ref-watch-video');
  if(!host) return;
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const label=iso=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/London'}).format(new Date(iso));
  async function refresh() {
    try {
      const response=await fetch('/api/ref-watch-video',{cache:'no-store'});
      if(!response.ok) throw new Error('unavailable');
      const data=await response.json();
      if(!data.available) throw new Error('unavailable');
      const url=new URL(data.articleUrl);
      if(url.protocol!=='https:'||url.hostname!=='www.skysports.com') throw new Error('invalid source');
      const message=data.status==='awaiting-edition'?"This week's edition is awaiting publication. Previous coverage is dated below.":data.status==='source-unavailable'?'Sky Sports has dated this edition, but its coverage is temporarily unavailable. We will check again automatically.':'The latest weekly refereeing and VAR coverage from Sky Sports.';
      host.innerHTML=`<div class="ref-video-head"><span class="ref-badge">REF WATCH • SKY SPORTS</span><h2>${esc(data.title)}</h2><p><strong>Edition: ${esc(label(data.publishedAt))}</strong></p><p role="status">${esc(message)}</p></div><div class="ref-watch-cta"><a class="ref-watch-button" href="${esc(url.href)}" target="_blank" rel="noopener noreferrer">VIEW THIS EDITION ON SKY SPORTS ↗</a></div><div class="ref-video-credit"><strong>Coverage: Sky Sports</strong><span>Checked ${esc(label(data.checkedAt))}. Checks for new editions automatically every 30 minutes.</span></div>`;
    } catch {
      const status=host.querySelector('[role="status"]');
      if(status) status.textContent='Unable to check the latest edition right now. Please try again shortly.';
    }
  }
  refresh();
  setInterval(()=>{if(!document.hidden) refresh();},30*60*1000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden) refresh();});
})();
