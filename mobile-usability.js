(()=>{
 const phone=matchMedia('(max-width:900px)');
 const originalPositions=new Map();
 function moveAfter(node,target){
   if(!node||!target||node===target)return;
   if(!originalPositions.has(node)){const marker=document.createComment('Original desktop position');node.before(marker);originalPositions.set(node,marker)}
   if(target.nextElementSibling!==node)target.after(node);
 }
 function layout(){
   if(!phone.matches){for(const[node,marker]of originalPositions){marker.after(node);marker.remove()}originalPositions.clear();return}
   const editorial=document.querySelector('section[aria-labelledby="ft-original-voice"]');
   const original=document.getElementById('football-talk-original');
   if(editorial&&original)moveAfter(editorial,original);
   const games=document.querySelector('main.hub > .today');
   const sponsor=document.querySelector('main.hub > a[data-ft-partner]');
   if(games&&sponsor)moveAfter(sponsor,games);
   const launch=document.querySelector('#ft-assistant .fta-launch');
   const controls=document.querySelector('.ft-page-controls-inner');
   if(launch&&controls){if(!originalPositions.has(launch)){const marker=document.createComment('Original assistant position');launch.before(marker);originalPositions.set(launch,marker)}controls.appendChild(launch)}
   const tabs=document.querySelector('.ft-persistent-tabs,.quick-nav');
   const active=tabs?.querySelector('[aria-current="page"],.active-tab');
   if(tabs&&active&&tabs.scrollWidth>tabs.clientWidth){const a=active.getBoundingClientRect(),t=tabs.getBoundingClientRect();if(a.left<t.left||a.right>t.right)tabs.scrollLeft+=a.left-t.left-10}
 }
 let queued=false;
 const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;layout()})};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
 phone.addEventListener('change',schedule);
 document.addEventListener('keydown',event=>{if(phone.matches&&event.key==='Escape'){const nav=document.querySelector('.site-header .nav.open');if(nav){nav.classList.remove('open');const button=document.querySelector('.menu-button');button?.setAttribute('aria-expanded','false');button?.focus()}}});
 // These panels arrive after deferred homepage scripts finish.
 const observer=new MutationObserver(schedule);observer.observe(document.body,{childList:true,subtree:false});
 const main=document.querySelector('main');if(main)observer.observe(main,{childList:true});
})();
