(()=>{
const feed=document.getElementById('dynamic-posts');
if(!feed)return;

const storyDate=card=>{
  const exact=card.dataset.publishedAt;if(exact){const time=Date.parse(exact);if(Number.isFinite(time))return time;}
  const raw=(card.querySelector('.card-meta')?.textContent||'').trim();
  if(!raw)return 0;
  const now=new Date();
  const parsed=new Date(`${raw} ${now.getFullYear()}`);
  if(Number.isNaN(parsed.getTime()))return 0;
  // Handle December stories viewed in January without accidentally treating them as future.
  if(parsed.getTime()>now.getTime()+86400000)parsed.setFullYear(parsed.getFullYear()-1);
  return parsed.getTime();
};

const score=(card,i)=>{
  const type=(card.querySelector('.tag')?.textContent||'').toLowerCase();
  const published=storyDate(card);
  const ageHours=published?Math.max(0,(Date.now()-published)/36e5):9999;
  let n=0;

  // Freshness is the main editorial rule. Old featured/image stories must not
  // outrank genuinely current news.
  if(ageHours<=6)n+=180;
  else if(ageHours<=24)n+=150;
  else if(ageHours<=48)n+=120;
  else if(ageHours<=72)n+=90;
  else if(ageHours<=168)n+=45;
  else n-=120;

  // Priority only breaks ties among reasonably fresh stories.
  if(ageHours<=24&&card.classList.contains('home-wire-lead'))n+=300;
  if(ageHours<=168){
    if(/breaking/.test(type))n+=55;
    else if(/transfer|var|matchday|full time/.test(type))n+=25;
    if(card.classList.contains('featured'))n+=20;
    if(card.querySelector('img'))n+=8;
  }

  n+=Math.max(0,12-i);
  return n;
};

const labelFor=card=>{
  const type=(card.querySelector('.tag')?.textContent||'').toLowerCase();
  if(type.includes('breaking'))return'BREAKING NEWS';
  if(type.includes('transfer')||type.includes("it's a go")||type.includes('its a go'))return'TRANSFER';
  if(type.includes('var'))return'VAR';
  if(type.includes('matchday')||type.includes('full time'))return'MATCHDAY';
  return'TOP STORY';
};

const enhance=()=>{
  const cards=[...feed.querySelectorAll('.post-card')];
  if(!cards.length)return;
  feed.classList.add('editorial-home-grid');

  const ranked=cards
    .map((card,i)=>({card,i,n:score(card,i),published:storyDate(card)}))
    .sort((a,b)=>b.n-a.n||b.published-a.published||a.i-b.i);

  const lead=ranked[0]?.card||cards[0];
  const leadIsFresh=Boolean(ranked[0]?.published&&Date.now()-ranked[0].published<48*3600000);
  if(lead&&feed.firstElementChild!==lead)feed.prepend(lead);

  const ordered=[...feed.querySelectorAll('.post-card')];
  ordered.forEach((card,i)=>{
    card.classList.toggle('editorial-lead',i===0&&leadIsFresh);
    card.classList.toggle('editorial-support',i>0&&i<4);
    card.classList.toggle('editorial-more',i>=4);
    card.querySelector('.editorial-kicker')?.remove();
    const body=card.querySelector('.post-card-body');
    if(i===0&&body&&leadIsFresh){
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
new MutationObserver(()=>{
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>{queued=false;enhance()});
}).observe(feed,{childList:true,subtree:false});
enhance();
})();
