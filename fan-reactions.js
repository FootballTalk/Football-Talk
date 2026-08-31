(()=>{
  if(window.__FT_FAN_REACTIONS__)return;window.__FT_FAN_REACTIONS__=true;
  const cfg=window.FT_CONFIG||{};
  const ready=Boolean(cfg.SUPABASE_URL&&cfg.SUPABASE_ANON_KEY&&!cfg.SUPABASE_URL.includes('PASTE_'));
  const styles=document.createElement('style');
  styles.textContent=`.ft-reactions{margin:22px 0 4px;padding:16px;border:2px solid #f7c600;border-radius:14px;background:#111;color:#fff}.ft-reactions h3{margin:0 0 4px;font-size:18px}.ft-reactions p{margin:0 0 12px;color:#bbb;font-size:12px}.ft-reaction-buttons{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.ft-reaction-button{appearance:none;border:1px solid #444;background:#1c1c20;color:#fff;border-radius:9px;padding:11px 7px;font-weight:900;cursor:pointer}.ft-reaction-button:hover,.ft-reaction-button.selected{background:#f7c600;color:#111;border-color:#f7c600}.ft-reaction-results{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:10px}.ft-reaction-result{font-size:10px;color:#bbb;text-align:center}.ft-reaction-result strong{display:block;color:#fff;font-size:16px;margin-bottom:2px}.ft-reaction-message{min-height:18px;margin-top:9px!important;color:#f7c600!important;font-weight:800}.ft-reactions.loading{opacity:.72}@media(max-width:520px){.ft-reaction-button{font-size:11px;padding:10px 4px}.ft-reaction-result{font-size:9px}.ft-reaction-result strong{font-size:14px}}`;
  document.head.appendChild(styles);

  function hash(text=''){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(36)}
  function contextFor(content){
    const tag=(content.querySelector('.tag')?.textContent||'').toLowerCase();
    const title=(content.querySelector('h1')?.textContent||'').toLowerCase();
    if(/transfer|it'?s a go|official/.test(tag)||/sign|transfer|deal|move/.test(title))return{prompt:'Good move?',options:[['yes','👍 Good signing'],['no','👎 Bad signing'],['unsure','🤔 Not sure']]};
    if(/ref|var/.test(tag)||/\b(ref|referee|var|penalty|red card|decision)\b/.test(title))return{prompt:'Right or wrong?',options:[['right','✅ Right call'],['wrong','❌ Wrong call'],['unsure','🤔 Not sure']]};
    return{prompt:'What do the fans think?',options:[['agree','👍 Agree'],['disagree','👎 Disagree'],['unsure','🤔 Not sure']]};
  }
  function pollId(content){const title=(content.querySelector('h1')?.textContent||'football-talk').trim().toLowerCase();return`ft-reaction:${hash(title)}`}
  function headers(extra={}){return{apikey:cfg.SUPABASE_ANON_KEY,Authorization:`Bearer ${cfg.SUPABASE_ANON_KEY}`,...extra}}
  async function counts(id){
    if(!ready)return{};
    const url=`${cfg.SUPABASE_URL}/rest/v1/poll_responses?select=answer&poll_id=eq.${encodeURIComponent(id)}&limit=1000`;
    const r=await fetch(url,{headers:headers(),cache:'no-store'});if(!r.ok)throw new Error('load');
    const rows=await r.json();return rows.reduce((m,row)=>{const k=String(row.answer||'');m[k]=(m[k]||0)+1;return m},{});
  }
  async function save(id,answer){
    if(!ready)throw new Error('offline');
    const r=await fetch(`${cfg.SUPABASE_URL}/rest/v1/poll_responses`,{method:'POST',headers:headers({'Content-Type':'application/json',Prefer:'return=minimal'}),body:JSON.stringify({poll_id:id,answer})});if(!r.ok)throw new Error('save');
  }
  function renderResults(box,ctx,data){
    const total=ctx.options.reduce((n,[key])=>n+(data[key]||0),0);
    const results=box.querySelector('.ft-reaction-results');
    results.innerHTML=ctx.options.map(([key,label])=>{const pct=total?Math.round(((data[key]||0)/total)*100):0;return`<div class="ft-reaction-result"><strong>${pct}%</strong>${label.replace(/^\S+\s/,'')}</div>`}).join('');
    box.querySelector('.ft-reaction-message').textContent=total?`${total} fan vote${total===1?'':'s'} so far`:'Be the first to vote.';
  }
  async function mount(content){
    if(!content||content.querySelector('.ft-reactions')||!content.querySelector('h1'))return;
    const ctx=contextFor(content),id=pollId(content),storageKey=`ft-reaction-vote:${id}`;
    const box=document.createElement('section');box.className='ft-reactions';box.innerHTML=`<h3>${ctx.prompt}</h3><p>Tap once and see the Football Talk fan verdict instantly.</p><div class="ft-reaction-buttons">${ctx.options.map(([key,label])=>`<button type="button" class="ft-reaction-button" data-reaction="${key}">${label}</button>`).join('')}</div><div class="ft-reaction-results"></div><p class="ft-reaction-message" aria-live="polite">Loading fan verdict…</p>`;
    const form=content.querySelector('.poll-response-form');if(form)form.before(box);else content.appendChild(box);
    let data={};try{data=await counts(id)}catch{box.querySelector('.ft-reaction-message').textContent='Fan verdict will appear after your vote.'}renderResults(box,ctx,data);
    const prior=localStorage.getItem(storageKey);if(prior)box.querySelector(`[data-reaction="${prior}"]`)?.classList.add('selected');
    box.querySelectorAll('.ft-reaction-button').forEach(btn=>btn.addEventListener('click',async()=>{
      const answer=btn.dataset.reaction;if(localStorage.getItem(storageKey)){box.querySelector('.ft-reaction-message').textContent='You have already voted on this story.';return;}
      box.classList.add('loading');box.querySelectorAll('button').forEach(b=>b.disabled=true);
      try{await save(id,answer);localStorage.setItem(storageKey,answer);data[answer]=(data[answer]||0)+1;box.querySelectorAll('.ft-reaction-button').forEach(b=>b.classList.toggle('selected',b===btn));renderResults(box,ctx,data)}catch{box.querySelector('.ft-reaction-message').textContent='We could not record that vote just yet. Please try again.'}finally{box.classList.remove('loading');box.querySelectorAll('button').forEach(b=>b.disabled=false)}
    }));
  }
  const observer=new MutationObserver(()=>mount(document.getElementById('article-content')));
  const start=()=>{const content=document.getElementById('article-content');if(content){observer.observe(content,{childList:true,subtree:false});mount(content)}else{const bodyObserver=new MutationObserver(()=>{const c=document.getElementById('article-content');if(c){bodyObserver.disconnect();observer.observe(c,{childList:true,subtree:false});mount(c)}});bodyObserver.observe(document.body,{childList:true,subtree:true})}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();