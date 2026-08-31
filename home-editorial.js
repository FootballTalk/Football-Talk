(()=>{
const feed=document.getElementById('dynamic-posts');
if(!feed)return;
const enhance=()=>{
  const cards=[...feed.querySelectorAll('.post-card')];
  if(!cards.length)return;
  feed.classList.add('editorial-home-grid');
  cards.forEach((card,i)=>{
    card.classList.toggle('editorial-lead',i===0);
    card.classList.toggle('editorial-support',i>0&&i<4);
    card.classList.toggle('editorial-more',i>=4);
    const body=card.querySelector('.post-card-body');
    if(i===0&&body&&!body.querySelector('.editorial-kicker')){
      const tag=body.querySelector('.tag');
      if(tag){const k=document.createElement('span');k.className='editorial-kicker';k.textContent='TOP STORY';tag.before(k);}
    }
  });
};
new MutationObserver(enhance).observe(feed,{childList:true,subtree:false});
enhance();
})();
