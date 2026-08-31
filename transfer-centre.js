(()=>{
  const root=document.getElementById('transfers');
  if(!root||document.getElementById('ft-transfer-tracker'))return;

  const STAGES=[
    {key:'RUMOUR',label:'RUMOUR',icon:'👀'},
    {key:'TALKS',label:'TALKS',icon:'💬'},
    {key:'ITS_A_GO',label:"IT'S A GO",icon:'🚨'},
    {key:'OFFICIAL',label:'OFFICIAL',icon:'✅'}
  ];
  const order=new Map(STAGES.map((s,i)=>[s.key,i]));
  let loading=false;

  const styles=document.createElement('style');
  styles.textContent=`
  #ft-transfer-tracker{margin:22px 0 30px}.ft-tc-shell{background:#f5f5f5;border-radius:18px;padding:18px;border:1px solid #d8d8d8}.ft-tc-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:16px}.ft-tc-head h3{font-family:'Archivo Black',sans-serif;margin:2px 0 5px;font-size:clamp(24px,4vw,34px)}.ft-tc-head p{margin:0;color:#666;max-width:760px;line-height:1.45}.ft-tc-updated{font-size:11px;font-weight:900;color:#777;white-space:nowrap;padding-top:7px}
  .ft-tc-legend{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-bottom:15px}.ft-tc-legend span{background:#111;color:#fff;border-radius:9px;padding:9px 8px;text-align:center;font-size:11px;font-weight:1000;letter-spacing:.04em}.ft-tc-legend span:nth-child(3),.ft-tc-legend span:nth-child(4){background:#f7c600;color:#090909}
  .ft-tc-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.ft-tc-card{background:#fff;border-radius:14px;border:1px solid #ddd;overflow:hidden;box-shadow:0 5px 16px rgba(0,0,0,.05)}.ft-tc-card-head{display:flex;gap:12px;align-items:flex-start;padding:14px 15px 11px}.ft-tc-card img{width:62px;height:62px;object-fit:cover;border-radius:10px;background:#eee;flex:0 0 auto}.ft-tc-stage{display:inline-block;background:#111;color:#fff;border-radius:999px;padding:5px 8px;font-size:10px;font-weight:1000;letter-spacing:.05em}.ft-tc-stage.go,.ft-tc-stage.official{background:#f7c600;color:#070707}.ft-tc-title{font-weight:950;line-height:1.25;margin:7px 0 0}.ft-tc-desc{padding:0 15px 12px;color:#555;font-size:12px;line-height:1.4}.ft-tc-rail{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;padding:0 15px 14px}.ft-tc-step{text-align:center;position:relative}.ft-tc-step:before{content:'';display:block;height:5px;border-radius:4px;background:#ddd;margin-bottom:5px}.ft-tc-step.done:before,.ft-tc-step.current:before{background:#f7c600}.ft-tc-step small{font-size:8px;font-weight:950;color:#999}.ft-tc-step.done small,.ft-tc-step.current small{color:#111}.ft-tc-link{display:block;text-decoration:none!important;color:inherit}.ft-tc-empty{background:#fff;border-radius:12px;padding:22px;text-align:center;color:#666}
  @media(max-width:760px){.ft-tc-shell{padding:14px}.ft-tc-head{display:block}.ft-tc-updated{margin-top:8px}.ft-tc-grid{grid-template-columns:1fr}.ft-tc-legend span{font-size:9px;padding:8px 3px}.ft-tc-card img{width:54px;height:54px}}
  `;
  document.head.appendChild(styles);

  const tracker=document.createElement('div');
  tracker.id='ft-transfer-tracker';
  tracker.innerHTML=`<div class="ft-tc-shell"><div class="ft-tc-head"><div><span class="go-pill">TRANSFER TRACKER</span><h3>Where every deal stands</h3><p>Rumour → talks → IT'S A GO → official. Football Talk shows the current stage so you can instantly see how far a move has progressed.</p></div><div id="ft-tc-updated" class="ft-tc-updated">UPDATING…</div></div><div class="ft-tc-legend">${STAGES.map(s=>`<span>${s.icon} ${s.label}</span>`).join('')}</div><div id="ft-tc-grid" class="ft-tc-grid"><div class="ft-tc-empty">Loading the latest transfer moves…</div></div></div>`;
  const oldLive=root.querySelector('.transfer-live');
  if(oldLive)oldLive.before(tracker);else root.appendChild(tracker);
  const grid=document.getElementById('ft-tc-grid');
  const updated=document.getElementById('ft-tc-updated');

  function clean(v=''){return String(v).replace(/\s+/g,' ').trim()}
  function suspiciousOfficial(item){const t=clean(item.title).toLowerCase();return /\b(rumou?r|rumou?rs|to sign|could sign|may sign|might sign|wants to sign|target|targets|targeting|eyes|eyeing|linked with|interested in)\b/.test(t)}
  function stageFor(item){
    const s=String(item.stage||'').toUpperCase();
    if(s==='ROMANO_CONFIRMED')return'ITS_A_GO';
    if(s==='OFFICIAL')return suspiciousOfficial(item)?'RUMOUR':'OFFICIAL';
    if(s==='DEVELOPING')return'TALKS';
    return'RUMOUR';
  }
  function stageClass(s){return s==='ITS_A_GO'?'go':s==='OFFICIAL'?'official':''}
  function dateValue(i){return Number(i.published||Date.parse(i.publishedAt||i.published_at||0)||0)}
  function render(items){
    const seen=new Set();
    const transfers=items.filter(i=>String(i.type||'').toUpperCase()==='TRANSFER').map(i=>({...i,_stage:stageFor(i)})).sort((a,b)=>dateValue(b)-dateValue(a)).filter(i=>{const k=clean(i.title).toLowerCase();if(!k||seen.has(k))return false;seen.add(k);return true}).slice(0,16);
    grid.replaceChildren();
    if(!transfers.length){const e=document.createElement('div');e.className='ft-tc-empty';e.textContent='No live transfer updates are available right now.';grid.appendChild(e);return;}
    transfers.forEach(item=>{
      const current=order.get(item._stage)??0;
      const a=document.createElement(item.link?'a':'article');
      if(item.link){a.href=item.link;a.target='_blank';a.rel='noopener noreferrer';a.className='ft-tc-card ft-tc-link';}else a.className='ft-tc-card';
      const head=document.createElement('div');head.className='ft-tc-card-head';
      if(item.image){const img=document.createElement('img');img.src=item.image;img.alt='';img.loading='lazy';img.referrerPolicy='no-referrer';img.addEventListener('error',()=>img.remove());head.appendChild(img)}
      const copy=document.createElement('div');const badge=document.createElement('span');badge.className=`ft-tc-stage ${stageClass(item._stage)}`;badge.textContent=`${STAGES[current].icon} ${STAGES[current].label}`;const title=document.createElement('div');title.className='ft-tc-title';title.textContent=clean(item.title);copy.append(badge,title);head.appendChild(copy);a.appendChild(head);
      const desc=document.createElement('div');desc.className='ft-tc-desc';desc.textContent=clean(item.description||item.summary||'').slice(0,190);if(desc.textContent)a.appendChild(desc);
      const rail=document.createElement('div');rail.className='ft-tc-rail';STAGES.forEach((s,i)=>{const step=document.createElement('div');step.className=`ft-tc-step${i<current?' done':''}${i===current?' current':''}`;const label=document.createElement('small');label.textContent=s.label;step.appendChild(label);rail.appendChild(step)});a.appendChild(rail);grid.appendChild(a);
    });
    updated.textContent=`UPDATED ${new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit'}).format(new Date())}`;
  }

  async function load(){
    if(loading)return;loading=true;
    try{
      const [news,confirmed]=await Promise.allSettled([
        fetch(`/api/news?_=${Date.now()}`,{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject(new Error('news'))),
        fetch(`/api/romano?_=${Date.now()}`,{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject(new Error('confirmed')))
      ]);
      const items=[];
      if(news.status==='fulfilled')items.push(...(news.value.items||[]));
      if(confirmed.status==='fulfilled')items.push(...(confirmed.value.items||[]));
      if(!items.length)throw new Error('No transfer data');
      render(items);
    }catch(e){if(!grid.querySelector('.ft-tc-card'))grid.innerHTML='<div class="ft-tc-empty">Transfer tracker is temporarily unavailable. Please try again shortly.</div>';}finally{loading=false}
  }
  load();setInterval(load,60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)load()});
})();