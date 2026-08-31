(async function(){
  const allowed=new Set(['latest','transfers','matchday','debate','social','stats']);
  const params=new URLSearchParams(location.search);
  const view=allowed.has(params.get('view'))?params.get('view'):'latest';
  const titleMap={latest:'Latest Football Talk',transfers:'Transfer Centre',matchday:'Matchday Centre',debate:'Fan Debate',social:'Follow Football Talk',stats:'Stats Zone'};
  document.title=`${titleMap[view]} | Football Talk`;
  const mount=document.getElementById('section-page-content');

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

    if(view==='transfers'){
      mount.querySelectorAll('.transfer-update-grid,.transfer-live-head,.latest-transfer-head,#transfer-stories').forEach(el=>el.style.display='none');
    }

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
        const draw=document.createElement('script');
        draw.src='draw-news.js?v=20260826-1';
        draw.dataset.ftDrawNews='1';
        document.body.appendChild(draw);
      }
      if(view==='matchday'){
        const extra=document.createElement('script');
        extra.src='matchday-extra.js?v=20260831-live-now-1';
        document.body.appendChild(extra);
      }
      if(view==='transfers'){
        const tracker=document.createElement('script');
        tracker.src='transfer-centre.js?v=20260831-2';
        tracker.dataset.ftTransferCentre='1';
        document.body.appendChild(tracker);
      }
      if(['latest','transfers','debate'].includes(view)){
        const auto=document.createElement('script');
        auto.src='auto-editorial.js?v=20260828-2';
        auto.dataset.autoEditorial='1';
        document.body.appendChild(auto);
      }
      if(view==='debate'){
        const comments=document.createElement('script');
        comments.src='debate-comments.js?v=20260826-4';
        document.body.appendChild(comments);
      }
    };
    document.body.appendChild(script);
  }catch(e){
    mount.innerHTML='<section class="section"><div class="empty-state">This Football Talk section could not be loaded right now. Tap × to return home.</div></section>';
  }
})();