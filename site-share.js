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
  const lines=games.slice(0,14).map(g=>{const raw=esc(g.querySelector('.teams')?.textContent||'');const parts=raw.split(/\n|\s{2,}/).map(esc).filter(Boolean);const matchup=parts.length>=2?parts.slice(0,2).join(' v '):raw;const time=esc(g.querySelector('.time')?.textContent||'');return matchup+(time?' — '+time:'')}).filter(Boolean);
  return lines.length?'⚽ TODAY’S FOOTBALL\n'+lines.join('\n'):'';
 };
 const payload=()=>{const fixture=fixtureText(),title=pageTitle()||'Football Talk';const text=fixture?fixture+'\n\nSee today’s fixtures on Football Talk — where fans have their say.':title+' — Football Talk, where fans have their say.';return {title:'Football Talk — '+title,text,url:location.href}};
 async function share(){const p=payload();if(navigator.share){try{await navigator.share(p);return}catch(e){if(e?.name==='AbortError')return}}try{await navigator.clipboard.writeText(p.text+'\n'+p.url);toast('Copied — ready to paste')}catch(e){window.prompt('Copy and share this link:',p.url)}}
 function toast(msg){const t=document.createElement('div');t.className='ft-share-toast';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),2200)}
 function button(cls,label,html,fn){const b=document.createElement('button');b.type='button';b.className=cls;b.setAttribute('aria-label',label);b.innerHTML=html;b.addEventListener('click',fn);return b}
 function add(){
  if(document.querySelector('.ft-page-controls'))return;
  const controls=document.createElement('div');controls.className='ft-page-controls';
  const back=button('ft-history-button','Go back','← <span>BACK</span>',()=>history.back());
  const forward=button('ft-history-button','Go forward','<span>FORWARD</span> →',()=>history.forward());
  const shareBtn=button('ft-share-button','Share this Football Talk page','<span aria-hidden="true">↗</span> SHARE',share);
  controls.append(back,forward,shareBtn);
  const hero=document.querySelector('.hub-hero,.section-hero,.page-hero,.hero');
  const todayHead=document.querySelector('.today-head');
  if((path==='match-centre.html'||path==='fixtures.html')&&todayHead){controls.classList.add('ft-controls-inline');todayHead.appendChild(controls)}
  else if(hero){hero.appendChild(controls)}
  else {controls.classList.add('ft-controls-floating');document.body.appendChild(controls)}
  if(history.length<=1){back.disabled=true;back.setAttribute('aria-disabled','true')}
  const updateForward=()=>{forward.classList.toggle('ft-history-quiet',history.length<=1)};updateForward();window.addEventListener('pageshow',updateForward);
 }
 const style=document.createElement('style');style.textContent=`.ft-page-controls{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:12px}.ft-page-controls button{appearance:none;border:2px solid #111;border-radius:999px;padding:9px 14px;font:900 11px/1 Inter,Arial,sans-serif;letter-spacing:.05em;cursor:pointer;white-space:nowrap;box-shadow:0 3px 0 #111}.ft-history-button{background:#fff;color:#111}.ft-share-button{background:#f7c600;color:#111}.ft-page-controls button:hover:not(:disabled){transform:translateY(-1px)}.ft-page-controls button:active:not(:disabled){transform:translateY(2px);box-shadow:0 1px 0 #111}.ft-page-controls button:disabled{opacity:.38;cursor:default;box-shadow:none}.ft-history-quiet{opacity:.72}.ft-controls-inline{margin:0 0 0 auto}.ft-controls-floating{position:fixed;right:16px;bottom:18px;z-index:88;background:rgba(255,255,255,.94);padding:7px;border-radius:999px;box-shadow:0 8px 28px rgba(0,0,0,.18)}.ft-share-toast{position:fixed;left:50%;bottom:82px;transform:translateX(-50%);z-index:9999;background:#111;color:#fff;border:2px solid #f7c600;border-radius:999px;padding:10px 16px;font:800 12px Inter,Arial,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.25)}@media(max-width:700px){.today-head{flex-wrap:wrap}.ft-controls-inline{width:100%;margin:2px 0 0}.ft-page-controls{gap:6px}.ft-page-controls button{padding:9px 11px;font-size:10px}.ft-controls-floating{left:50%;right:auto;transform:translateX(-50%);bottom:10px;width:max-content;max-width:calc(100vw - 16px)}}`;document.head.appendChild(style);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{add();setTimeout(add,900)});else{add();setTimeout(add,900)}
})();