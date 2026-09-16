(()=>{
 const SHAREABLE=new Set(['index.html','match-centre.html','fixtures.html','match.html','lineups.html','cups.html','european.html','news.html','section.html','ref-watch.html','tables-stats.html','tables.html','top-scorers.html','highlights.html','quiz.html','tv-guide.html','super-six.html','business-directory.html','mental-health.html','mental-health-support.html']);
 const path=(location.pathname.split('/').pop()||'index.html').toLowerCase();
 if(!SHAREABLE.has(path))return;
 const esc=s=>String(s||'').replace(/\s+/g,' ').trim();
 const pageTitle=()=>esc(document.querySelector('h1')?.textContent||document.title.replace(/\s*\|\s*Football Talk.*$/i,''));
 const fixtureText=()=>{
  if(path!=='match-centre.html'&&path!=='fixtures.html')return '';
  const games=[...document.querySelectorAll('.game')];
  if(!games.length)return '';
  const lines=games.slice(0,14).map(g=>{
   const teams=[...g.querySelectorAll('.teams')].map(x=>esc(x.textContent)).join(' v ');
   const raw=esc(g.querySelector('.teams')?.textContent||'');
   const parts=raw.split(/\n|\s{2,}/).map(esc).filter(Boolean);
   const matchup=parts.length>=2?parts.slice(0,2).join(' v '):raw;
   const time=esc(g.querySelector('.time')?.textContent||'');
   return matchup+(time?' — '+time:'');
  }).filter(Boolean);
  return lines.length?'⚽ TODAY’S FOOTBALL\n'+lines.join('\n'):'';
 };
 const payload=()=>{
  const fixture=fixtureText();
  const title=pageTitle()||'Football Talk';
  const text=fixture?fixture+'\n\nSee today’s fixtures on Football Talk — where fans have their say.':title+' — Football Talk, where fans have their say.';
  return {title:'Football Talk — '+title,text,url:location.href};
 };
 async function share(){
  const p=payload();
  if(navigator.share){try{await navigator.share(p);return}catch(e){if(e?.name==='AbortError')return}}
  try{await navigator.clipboard.writeText(p.text+'\n'+p.url);toast('Copied — ready to paste')}catch(e){window.prompt('Copy and share this link:',p.url)}
 }
 function toast(msg){const t=document.createElement('div');t.className='ft-share-toast';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),2200)}
 function add(){
  if(document.querySelector('.ft-share-button'))return;
  const btn=document.createElement('button');btn.type='button';btn.className='ft-share-button';btn.setAttribute('aria-label','Share this Football Talk page');btn.innerHTML='<span aria-hidden="true">↗</span> SHARE';btn.addEventListener('click',share);
  const hero=document.querySelector('.hub-hero,.section-hero,.page-hero,.hero');
  const todayHead=document.querySelector('.today-head');
  if((path==='match-centre.html'||path==='fixtures.html')&&todayHead){const wrap=document.createElement('div');wrap.className='ft-share-inline';wrap.appendChild(btn);todayHead.appendChild(wrap)}
  else if(hero)hero.appendChild(btn);
  else {btn.classList.add('ft-share-floating');document.body.appendChild(btn)}
 }
 const style=document.createElement('style');style.textContent=`.ft-share-button{appearance:none;border:2px solid #111;border-radius:999px;background:#f7c600;color:#111;padding:9px 15px;font:900 12px/1 Inter,Arial,sans-serif;letter-spacing:.06em;cursor:pointer;box-shadow:0 3px 0 #111;white-space:nowrap}.ft-share-button:hover{transform:translateY(-1px)}.ft-share-button:active{transform:translateY(2px);box-shadow:0 1px 0 #111}.hub-hero .ft-share-button,.section-hero .ft-share-button,.page-hero .ft-share-button,.hero .ft-share-button{margin-top:10px}.ft-share-inline{margin-left:auto}.ft-share-floating{position:fixed;right:16px;bottom:18px;z-index:88}.ft-share-toast{position:fixed;left:50%;bottom:75px;transform:translateX(-50%);z-index:9999;background:#111;color:#fff;border:2px solid #f7c600;border-radius:999px;padding:10px 16px;font:800 12px Inter,Arial,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.25)}@media(max-width:700px){.today-head{flex-wrap:wrap}.ft-share-inline{margin-left:0}.ft-share-button{padding:9px 13px;font-size:11px}.ft-share-floating{right:10px;bottom:12px}}`;document.head.appendChild(style);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{add();setTimeout(add,900)});else{add();setTimeout(add,900)}
})();