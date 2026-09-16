(()=>{
const feed=document.getElementById('dynamic-posts');
if(!feed)return;
const score=(card,i)=>{
  const type=(card.querySelector('.tag')?.textContent||'').toLowerCase();
  const hasImage=!!card.querySelector('img');
  let n=hasImage?100:0;
  if(/breaking|it's a go|its a go/.test(type))n+=45;
  else if(/transfer|var|matchday|full time/.test(type))n+=25;
  n+=Math.max(0,20-i);
  return n;
};
const labelFor=card=>{
  const type=(card.querySelector('.tag')?.textContent||'').toLowerCase();
  if(type.includes('breaking'))return'BREAKING';
  if(type.includes('transfer')||type.includes("it's a go")||type.includes('its a go'))return'TRANSFER';
  if(type.includes('var'))return'VAR';
  if(type.includes('matchday')||type.includes('full time'))return'MATCHDAY';
  return'TOP STORY';
};
const enhance=()=>{
  const cards=[...feed.querySelectorAll('.post-card')];
  if(!cards.length)return;
  feed.classList.add('editorial-home-grid');
  const ranked=cards.map((card,i)=>({card,i,n:score(card,i)})).sort((a,b)=>b.n-a.n||a.i-b.i);
  const lead=ranked[0]?.card||cards[0];
  if(lead&&feed.firstElementChild!==lead)feed.prepend(lead);
  const ordered=[...feed.querySelectorAll('.post-card')];
  ordered.forEach((card,i)=>{
    card.classList.toggle('editorial-lead',i===0);
    card.classList.toggle('editorial-support',i>0&&i<4);
    card.classList.toggle('editorial-more',i>=4);
    card.querySelector('.editorial-kicker')?.remove();
    const body=card.querySelector('.post-card-body');
    if(i===0&&body){
      const tag=body.querySelector('.tag');
      const k=document.createElement('span');
      k.className='editorial-kicker';
      k.textContent=labelFor(card);
      if(tag)tag.before(k);else body.prepend(k);
      const img=card.querySelector('img');
      if(img){img.loading='eager';img.fetchPriority='high';}
    }
  });
};
let queued=false;
new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhance()})}).observe(feed,{childList:true,subtree:false});
enhance();
})();
