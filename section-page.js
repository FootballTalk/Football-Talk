(async function(){
  const allowed=new Set(['latest','transfers','matchday','social','stats']);
  const params=new URLSearchParams(location.search);
  const requested=params.get('view');
  if(requested==='debate'){
    location.replace('news.html');
    return;
  }
  const view=allowed.has(requested)?requested:'latest';
  const titleMap={latest:'Latest Football Talk',transfers:'Transfer Centre',matchday:'Matchday Centre',social:'Follow Football Talk',stats:'Stats Zone'};
  document.title=`${titleMap[view]} | Football Talk`;
  const mount=document.getElementById('section-page-content');

  // These sections were removed from the homepage. Keep their existing URLs
  // useful without depending on a hidden copy of index.html.
  if(view==='transfers'){
    mount.innerHTML='<section id="transfers" class="section" style="max-width:1180px;margin:auto"><div class="section-heading"><div><p class="eyebrow">FOOTBALL TALK • TRANSFERS</p><h1>Transfer Centre</h1><p>Reports, developing moves and confirmed deals from attributed football sources. Check the linked report before treating a rumour as a completed transfer.</p></div></div><p><a href="news.html">News and Football Talk analysis →</a></p></section>';
    const tracker=document.createElement('script');
    tracker.src='transfer-centre.js?v=20260927-2';
    document.body.appendChild(tracker);
    return;
  }

  if(view==='matchday'){
    mount.innerHTML='<section class="section" style="max-width:1180px;margin:auto"><div class="section-heading"><div><p class="eyebrow">FT LIVE • MATCHDAY</p><h1>Matchday Feed</h1><p>Live scores and sourced football updates.</p></div></div><p><a href="match-centre.html">Open live Match Centre →</a> &nbsp; <a href="fixtures.html">Fixtures and results →</a></p><h2>Latest football updates</h2><div id="matchday-news" aria-live="polite">Loading updates…</div></section>';
    const feed=mount.querySelector('#matchday-news');
    fetch('/api/news',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('news unavailable');return r.json()}).then(data=>{
      const items=(data.items||[]).filter(i=>i.type!=='TRANSFER').slice(0,12);
      feed.replaceChildren();
      if(!items.length){feed.textContent='No new updates are available right now. The live Match Centre remains available above.';return;}
      for(const item of items){
        const article=document.createElement('article');
        article.className='post-card';article.style.padding='16px';article.style.margin='12px 0';
        const link=document.createElement('a');
        try{const url=new URL(item.link);if(url.protocol!=='https:')continue;link.href=url.href}catch{continue}
        link.target='_blank';link.rel='noopener noreferrer';link.textContent=item.title||'Read football update';
        const summary=document.createElement('p');summary.textContent=String(item.description||item.summary||'').slice(0,240);
        const source=document.createElement('small');source.textContent=item.source||'Football source';
        article.append(link,summary,source);feed.appendChild(article);
      }
    }).catch(()=>{feed.textContent='Updates could not be refreshed. Live scores are still available in the Match Centre.'});
    return;
  }

  if(view==='stats'){
    const stats=document.createElement('script');
    stats.src='stats-section.js?v=20260827-1';
    document.body.appendChild(stats);
    return;
  }

  try{
    const html=await fetch('./index.html',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('load failed');return r.text()});
    const doc=new DOMParser().parseFromString(html,'text/html');
    const selected=doc.getElementById(view);
    if(!selected)throw new Error('section missing');
    mount.innerHTML='';
    mount.appendChild(selected.cloneNode(true));

    if(view!=='latest'){
      const latest=doc.getElementById('latest');
      if(latest){
        const hidden=document.getElementById('section-hidden-latest');
        hidden.appendChild(latest.cloneNode(true));
      }
    }

    const script=document.createElement('script');
    script.src='script.js';
    script.onload=()=>{
      const reactions=document.createElement('script');
      reactions.src='fan-reactions.js?v=20260831-1';
      reactions.dataset.ftFanReactions='1';
      document.body.appendChild(reactions);
      if(view==='latest'){
        const auto=document.createElement('script');
        auto.src='auto-editorial.js?v=20260924-live-lead-2';
        auto.dataset.autoEditorial='1';
        document.body.appendChild(auto);
      }
    };
    document.body.appendChild(script);
  }catch(e){
    mount.innerHTML='<section class="section"><div class="empty-state">This Football Talk section could not be loaded right now. Tap × to return home.</div></section>';
  }
})();
