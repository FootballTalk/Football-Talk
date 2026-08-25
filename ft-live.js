(() => {
  function initFtLive(){
    const track = document.querySelector('.ticker-track');
    const viewport = document.querySelector('.ticker-viewport');
    if (!track || !viewport || track.dataset.ftLiveReady === '1') return;
    track.dataset.ftLiveReady = '1';

    const style = document.createElement('style');
    style.textContent = `
      .ticker-viewport{overflow:hidden!important;position:relative!important;height:44px!important;display:block!important;scroll-behavior:auto!important}
      .ticker-track.ft-scroll-track{position:relative!important;left:auto!important;top:auto!important;display:flex!important;align-items:center!important;width:max-content!important;max-width:none!important;white-space:nowrap!important;transform:none!important;animation:none!important;will-change:auto!important}
      .ticker-track.ft-scroll-track .ft-scroll-copy{display:block!important;flex:0 0 auto!important;white-space:nowrap!important;padding:12px 28px!important;font-weight:800!important;line-height:20px!important;transform:none!important}
    `;
    document.head.appendChild(style);

    track.className = 'ticker-track ft-scroll-track';
    const copyA = document.createElement('span');
    const copyB = document.createElement('span');
    const copyC = document.createElement('span');
    copyA.className = 'ft-scroll-copy';
    copyB.className = 'ft-scroll-copy';
    copyC.className = 'ft-scroll-copy';
    copyB.setAttribute('aria-hidden','true');
    copyC.setAttribute('aria-hidden','true');
    track.replaceChildren(copyA, copyB, copyC);

    const LIVE_STATUSES = new Set(['1H','2H','ET','BT','P','LIVE','HT']);
    const FINISHED_STATUSES = new Set(['FT','AET','PEN']);
    let liveItems = [];
    let resultItems = [];
    let automaticNewsItems = [];
    let lastLine = '';
    let timer = null;
    const clean = (text='') => String(text).replace(/\s+/g,' ').trim();

    function latestNewsItems(){
      const items=[];
      document.querySelectorAll('#dynamic-posts .post-card').forEach(card=>{
        const title=clean(card.querySelector('h3')?.textContent);
        if(title) items.push(`NEWS: ${title}`);
      });
      return [...new Set(items)].slice(0,2);
    }

    function latestTransferItems(){
      const items=[];
      document.querySelectorAll('.transfer-live .transfer-update').forEach(card=>{
        const title=clean(card.querySelector('h4')?.textContent);
        const status=clean(card.querySelector('.transfer-status')?.textContent);
        if(title) items.push(`TRANSFER${status?` — ${status}`:''}: ${title}`);
      });
      return [...new Set(items)].slice(0,2);
    }

    function ensureScrollLoop(){
      if(timer) return;
      timer = setInterval(()=>{
        const oneCopyWidth = copyA.offsetWidth;
        if(!oneCopyWidth) return;
        viewport.scrollLeft += 1;
        if(viewport.scrollLeft >= oneCopyWidth){
          viewport.scrollLeft -= oneCopyWidth;
        }
      }, 5);
    }

    function render(){
      const dynamicNews = latestNewsItems();
      const dynamicTransfers = latestTransferItems();
      const items=[...liveItems,...resultItems,...automaticNewsItems,...dynamicNews,...dynamicTransfers];
      const finalItems=[...new Set(items)].slice(0,10);
      const fallback='NEWS: Football Talk live updates are loading';
      const line=`⚽ ${(finalItems.length?finalItems:[fallback]).join('     •     ')}     •     `;
      if(line===lastLine) return;
      lastLine=line;
      const previousScroll = viewport.scrollLeft;
      copyA.textContent=line;
      copyB.textContent=line;
      copyC.textContent=line;
      requestAnimationFrame(()=>{
        const width = copyA.offsetWidth;
        viewport.scrollLeft = width ? previousScroll % width : 0;
      });
      ensureScrollLoop();
    }

    async function loadAutomaticNews(){
      try{
        const response=await fetch(`/api/news?t=${Date.now()}`,{cache:'no-store'});
        if(!response.ok) return;
        const data=await response.json();
        automaticNewsItems=(data.items||[]).slice(0,6).map(item=>{
          const type=clean(item.type)==='TRANSFER'?'TRANSFER':'NEWS';
          const source=clean(item.source);
          const title=clean(item.title);
          return `${type}: ${title}${source?` — ${source}`:''}`;
        }).filter(Boolean);
        render();
      }catch(_){}
    }

    async function loadLiveScores(){
      try{
        const response=await fetch(`/api/fixtures?live=1&t=${Date.now()}`,{cache:'no-store'});
        if(!response.ok) return;
        const data=await response.json();
        const matches=(data.leagues||[]).flatMap(league=>(league.fixtures||[]).map(fixture=>({...fixture,leagueName:league.name}))).filter(fixture=>LIVE_STATUSES.has(fixture.status));
        liveItems=matches.slice(0,2).map(fixture=>{
          const score=`${fixture.homeGoals??0}-${fixture.awayGoals??0}`;
          const matchStatus=fixture.status==='HT'?'HT':fixture.elapsed?`LIVE ${fixture.elapsed}'`:'LIVE';
          return `${matchStatus}: ${fixture.home} ${score} ${fixture.away} (${fixture.leagueName})`;
        });
        render();
      }catch(_){}
    }

    async function loadLatestResult(){
      try{
        const response=await fetch(`/api/fixtures?results=1&t=${Date.now()}`,{cache:'no-store'});
        if(!response.ok) return;
        const data=await response.json();
        const results=(data.leagues||[]).flatMap(league=>(league.fixtures||[]).map(fixture=>({...fixture,leagueName:league.name}))).filter(fixture=>FINISHED_STATUSES.has(fixture.status)).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0));
        resultItems=results.length?[`LATEST RESULT: ${results[0].home} ${results[0].homeGoals??'-'}-${results[0].awayGoals??'-'} ${results[0].away} (${results[0].leagueName})`]:[];
        render();
      }catch(_){}
    }

    const posts=document.getElementById('dynamic-posts');
    if(posts) new MutationObserver(render).observe(posts,{childList:true,subtree:true});
    render();
    loadAutomaticNews();
    loadLiveScores();
    loadLatestResult();
    setInterval(loadLiveScores,30000);
    setInterval(loadLatestResult,120000);
    setInterval(loadAutomaticNews,180000);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',initFtLive,{once:true});
  else initFtLive();
})();