(()=>{
 const path=(location.pathname.split('/').pop()||'index.html').toLowerCase();
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
  const bar=document.createElement('div');bar.className='ft-page-controls';bar.setAttribute('role','navigation');bar.setAttribute('aria-label','Page navigation and sharing');
  const inner=document.createElement('div');inner.className='ft-page-controls-inner';
  const back=button('ft-history-button','Go back','← <span>BACK</span>',()=>history.back());
  const forward=button('ft-history-button','Go forward','<span>FORWARD</span> →',()=>history.forward());
  const shareBtn=button('ft-share-button','Share this Football Talk page','<span aria-hidden="true">↗</span> SHARE',share);
  inner.append(back,forward,shareBtn);bar.appendChild(inner);document.body.prepend(bar);
  if(history.length<=1){back.disabled=true;back.setAttribute('aria-disabled','true')}
 }
 const style=document.createElement('style');style.textContent=`.ft-page-controls{position:sticky;top:0;z-index:10000;width:100%;background:#0b0b0e;border-bottom:3px solid #f7c600;box-shadow:0 4px 14px rgba(0,0,0,.2)}.ft-page-controls-inner{max-width:1180px;margin:0 auto;padding:7px 14px;display:flex;align-items:center;justify-content:flex-end;gap:7px}.ft-page-controls button{appearance:none;border:1px solid #f7c600;border-radius:999px;padding:8px 13px;font:900 10px/1 Inter,Arial,sans-serif;letter-spacing:.05em;cursor:pointer;white-space:nowrap}.ft-history-button{background:#fff;color:#111}.ft-share-button{background:#f7c600;color:#111}.ft-page-controls button:hover:not(:disabled){transform:translateY(-1px)}.ft-page-controls button:active:not(:disabled){transform:translateY(1px)}.ft-page-controls button:disabled{opacity:.35;cursor:default}.ft-share-toast{position:fixed;left:50%;top:62px;transform:translateX(-50%);z-index:10001;background:#111;color:#fff;border:2px solid #f7c600;border-radius:999px;padding:10px 16px;font:800 12px Inter,Arial,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.25)}@media(max-width:700px){.ft-page-controls-inner{justify-content:center;padding:6px 8px;gap:5px}.ft-page-controls button{padding:8px 10px;font-size:9px;flex:1;max-width:120px}.ft-share-toast{top:58px;max-width:calc(100vw - 24px);text-align:center}}`;document.head.appendChild(style);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',add);else add();
})();