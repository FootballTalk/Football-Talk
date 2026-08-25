(() => {
  const REFRESH_MS = 180000;
  const MAX_LATEST = 8;
  const MAX_TRANSFERS = 8;
  const MAX_DEBATES = 4;

  const esc = (value='') => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  const clean = (value='') => String(value).replace(/\s+/g,' ').trim();
  const fmt = value => value ? new Date(value).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '';

  function ensureStyles(){
    if(document.getElementById('auto-editorial-styles')) return;
    const style=document.createElement('style');
    style.id='auto-editorial-styles';
    style.textContent=`
      .auto-editorial-wrap{margin:0 0 26px}.auto-editorial-head{display:flex;align-items:end;justify-content:space-between;gap:12px;margin:0 0 12px}.auto-editorial-head h3{margin:0;font-size:20px}.auto-editorial-head small{opacity:.7}.auto-editorial-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.auto-card{background:#fff;color:#111;border-top:4px solid #f7c600;padding:16px;box-shadow:0 6px 18px rgba(0,0,0,.08)}.dark-section .auto-card{background:#17171b;color:#fff;border:1px solid #2a2a30;border-top:4px solid #f7c600}.auto-card h4{margin:8px 0;font-size:17px;line-height:1.25}.auto-card p{margin:0 0 10px;line-height:1.45;font-size:14px}.auto-meta{font-size:11px;opacity:.7}.auto-tag{display:inline-block;background:#111;color:#fff;font-size:10px;font-weight:900;letter-spacing:.08em;padding:5px 7px}.dark-section .auto-tag{background:#f7c600;color:#000}.auto-tag.go{background:#f7c600;color:#000}.auto-tag.developing{background:#fff1a8;color:#111}.auto-tag.gossip{background:#ddd;color:#111}.auto-link{font-weight:900;color:inherit;text-decoration:none;border-bottom:2px solid #f7c600}.auto-debate{background:#fff8cf}.dark-section .auto-debate{background:#242014}.auto-note{font-size:12px;opacity:.72;margin:8px 0 0}.auto-hidden{display:none!important}@media(max-width:700px){.auto-editorial-grid{grid-template-columns:1fr}.auto-editorial-head{align-items:start;flex-direction:column}}
    `;
    document.head.appendChild(style);
  }

  function labelFor(item){
    if(item.type!=='TRANSFER') return 'HOT NEWS';
    if(item.stage==='ITS_A_GO') return "IT'S A GO!";
    if(item.stage==='DEVELOPING') return 'TRANSFER UPDATE';
    return 'TRANSFER GOSSIP';
  }

  function classFor(item){
    if(item.stage==='ITS_A_GO') return 'go';
    if(item.stage==='DEVELOPING') return 'developing';
    if(item.stage==='GOSSIP') return 'gossip';
    return '';
  }

  function summaryFor(item){
    const desc=clean(item.description);
    if(desc) return desc;
    if(item.type==='TRANSFER'){
      if(item.stage==='ITS_A_GO') return 'A significant transfer development has been reported, with the move appearing agreed or completed.';
      if(item.stage==='DEVELOPING') return 'This transfer story is developing. Talks or negotiations are reported to be progressing, but the deal is not yet confirmed.';
      return 'Transfer gossip from the live football news feed. No agreement is being claimed by Football Talk at this stage.';
    }
    return 'A fresh football story from the live news feed. Follow the source for the full report.';
  }

  function card(item, extraClass=''){
    const href=item.link ? ` href="${esc(item.link)}" target="_blank" rel="noopener noreferrer"` : '';
    return `<article class="auto-card ${extraClass}"><span class="auto-tag ${classFor(item)}">${esc(labelFor(item))}</span><div class="auto-meta">${esc(item.source||'Live feed')}${item.publishedAt?` · ${esc(fmt(item.publishedAt))}`:''}</div><h4>${esc(item.title)}</h4><p>${esc(summaryFor(item))}</p>${href?`<a class="auto-link"${href}>Read source →</a>`:''}</article>`;
  }

  function debateCard(item){
    const prompt=clean(item.debatePrompt)||`${clean(item.title)} — what do you think?`;
    return `<article class="auto-card auto-debate"><span class="auto-tag">FAN DEBATE</span><div class="auto-meta">Generated from a live story</div><h4>${esc(prompt)}</h4><p>Have your say on the latest talking point.</p></article>`;
  }

  function ensureBlock(parent, id, title, note){
    let wrap=document.getElementById(id);
    if(wrap) return wrap;
    wrap=document.createElement('div');
    wrap.id=id;
    wrap.className='auto-editorial-wrap';
    wrap.innerHTML=`<div class="auto-editorial-head"><h3>${esc(title)}</h3><small>${esc(note)}</small></div><div class="auto-editorial-grid"></div>`;
    parent.prepend(wrap);
    return wrap;
  }

  function render(data){
    const items=(data.items||[]).filter(item=>item&&item.title);
    const latest=items.slice(0,MAX_LATEST);
    const transfers=items.filter(item=>item.type==='TRANSFER').slice(0,MAX_TRANSFERS);
    const debates=items.filter(item=>item.debatePrompt).slice(0,MAX_DEBATES);

    const latestSection=document.getElementById('latest');
    if(latestSection){
      const grid=document.getElementById('dynamic-posts');
      const anchor=grid?.parentElement||latestSection;
      const block=ensureBlock(anchor,'auto-live-news','Live from the wire','Refreshes automatically');
      block.querySelector('.auto-editorial-grid').innerHTML=latest.map(item=>card(item)).join('');
    }

    const transferSection=document.getElementById('transfers');
    if(transferSection){
      const transferLive=transferSection.querySelector('.transfer-live')||transferSection;
      const block=ensureBlock(transferLive,'auto-live-transfers','Automatic Transfer Wire',"Gossip stays gossip until it's verified");
      block.querySelector('.auto-editorial-grid').innerHTML=transfers.length?transfers.map(item=>card(item)).join(''):'<div class="auto-card"><p>No fresh transfer stories on the live feed right now.</p></div>';
    }

    const debateSection=document.getElementById('debate');
    if(debateSection){
      const feed=debateSection.querySelector('.debate-feed')||debateSection;
      const block=ensureBlock(feed,'auto-live-debates','Debates from today’s stories','Generated automatically from live headlines');
      block.querySelector('.auto-editorial-grid').innerHTML=debates.map(item=>debateCard(item)).join('');
    }
  }

  async function load(){
    try{
      const response=await fetch(`/api/news?t=${Date.now()}`,{cache:'no-store'});
      if(!response.ok) return;
      const data=await response.json();
      render(data);
    }catch(_){}
  }

  function start(){ensureStyles();load();setInterval(load,REFRESH_MS);}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();
// Football Talk automatic editorial feed enabled.
