(() => {
  const STORY_ID='ft-carabao-r3-draw-2026';
  const fixtures=[
    'Crystal Palace v Middlesbrough',
    'Manchester United v Brighton',
    'Manchester City v Norwich City',
    'Sunderland v Hull City',
    'Ipswich Town v Arsenal',
    'Coventry City v Aston Villa',
    'Bournemouth v Lincoln City',
    'Liverpool v Tottenham Hotspur',
    'Chelsea or Luton Town v Leeds United',
    'Millwall v Newcastle United',
    'Fleetwood Town v Sheffield United',
    'Everton v Wolverhampton Wanderers',
    'Leyton Orient v Bradford City',
    'Reading v Brentford',
    'Peterborough United v Barnsley',
    'West Ham United v Fulham or AFC Wimbledon'
  ];
  const source='https://www.skysports.com/football/news/11095/13577302/carabao-cup-third-round-draw-liverpool-host-tottenham-with-as-many-as-six-all-premier-league-ties';
  function render(){
    const grid=document.getElementById('dynamic-posts');
    if(!grid) return;
    let card=document.getElementById(STORY_ID);
    if(card && card.parentElement===grid) return;
    card=document.createElement('article');
    card.id=STORY_ID;
    card.className='post-card featured';
    const list=fixtures.map(t=>`<li>${t}</li>`).join('');
    card.innerHTML=`<div class="post-card-body"><span class="tag">Carabao Cup</span><p class="card-meta">26 Aug · 22:29</p><h3>Carabao Cup third-round draw confirmed in full</h3><p>The 2026/27 Carabao Cup third-round draw is complete. Ties will be played across the weeks commencing 7 and 14 September.</p><div class="draw-story-list"><strong>Third-round draw:</strong><ol>${list}</ol></div><p><a class="read-story" href="${source}" target="_blank" rel="noopener noreferrer">Confirmed source →</a></p></div>`;
    grid.prepend(card);
  }
  function start(){
    render();
    const grid=document.getElementById('dynamic-posts');
    if(grid) new MutationObserver(()=>render()).observe(grid,{childList:true});
    setTimeout(render,1000);setTimeout(render,3000);setTimeout(render,6000);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();
