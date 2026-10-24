(() => {
  const hero = document.querySelector('main > .hero');
  if (!hero || document.getElementById('ft-today')) return;
  const section = document.createElement('section');
  section.id = 'ft-today';
  section.setAttribute('aria-labelledby', 'ft-today-title');
  section.innerHTML = `<header class="today-heading"><div><p class="today-kicker">YOUR DAILY FOOTBALL FIX</p><h2 id="ft-today-title">Today in Football</h2><p id="today-date"></p></div><a href="match-centre.html">Match Centre →</a></header><div class="today-grid"><div class="today-games"><h3>Today’s games & UK TV</h3><p class="today-note">Selected matches · Kick-off times are UK local time. Coverage may require a subscription.</p><div id="today-games">Loading today’s games…</div><a class="today-more" href="tv-guide.html">Full UK TV guide →</a></div><div><h3>Three key headlines</h3><div id="today-headlines">Loading the latest headlines…</div><div class="today-poll"><p class="today-kicker">WHERE FANS HAVE THEIR SAY</p><h3 id="today-question"></h3><div id="today-options"></div><p id="today-verdict" class="today-note" role="status"></p></div></div></div>`;
  hero.after(section);
  const $ = id => section.querySelector('#' + id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dateKey = () => {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(p => [p.type,p.value]));
    return `${p.year}-${p.month}-${p.day}`;
  };
  const clock = value => new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value));
  const live = new Set(['1H','2H','HT','ET','BT','P','LIVE','INT']);
  const finished = new Set(['FT','AET','PEN']);
  const normal = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g,'');
  const team = s => { const n = normal(s); return ({manutd:'manchesterunited',manunited:'manchesterunited',mancity:'manchestercity',spurs:'tottenham',tottenhamhotspur:'tottenham',wolverhamptonwanderers:'wolves',brightonhovealbion:'brighton',brightonandhovealbion:'brighton',nottmforest:'nottinghamforest',charltonathletic:'charlton',norwichcity:'norwich',derbycounty:'derby',leedsunited:'leeds',westhamunited:'westham',newcastleunited:'newcastle'})[n] || n; };
  async function json(url) {
    const r = await fetch(url, {cache:'no-store',signal:AbortSignal.timeout(15000)});
    if (!r.ok) throw Error('Unavailable');
    const data = await r.json();
    if (data.error) throw Error(data.error);
    return data;
  }
  async function games(day) {
    const [fixtures,tv] = await Promise.allSettled([json('/api/fixtures?date='+day),json('/api/tv-guide')]);
    if (dateKey() !== day) return;
    const listings = tv.status === 'fulfilled' ? (tv.value.matches || []).filter(m => m.date === day) : [];
    const fs = fixtures.status === 'fulfilled' ? (fixtures.value.leagues || []).flatMap(l => (l.fixtures || []).map(f => ({...f,competition:l.name,leagueId:Number(l.id)}))).filter(f => f.date && dateFor(f.date) === day) : [];
    const matches = fs.map(f => ({...f,tv:listings.find(t => team(t.home) === team(f.home) && team(t.away) === team(f.away))}));
    // Keep TV-only fixtures visible if the scores feed omits a competition.
    listings.forEach(t => { if (!matches.some(f => team(f.home) === team(t.home) && team(f.away) === team(t.away))) matches.push({...t,tv:t,tvOnly:true}); });
    const priority = f => [39,40,179,45,48,2,3,9227,9294].includes(f.leagueId) || (f.tvOnly && /^(Premier League|Championship|Scottish Premiership|FA Cup|Carabao Cup|UEFA Champions League|UEFA Europa League|Women.*Super League)$/i.test(f.competition || '')) ? 3 : f.tv ? 2 : 0;
    matches.sort((a,b) => (priority(b)-priority(a)) || (live.has(b.status)-live.has(a.status)) || (finished.has(a.status)-finished.has(b.status)) || String(a.time || clock(a.date)).localeCompare(String(b.time || clock(b.date))));
    const message = !matches.length ? (fixtures.status === 'rejected' ? 'Today’s games are temporarily unavailable. Please try the Match Centre.' : 'No games are currently listed for today.') : '';
    $('today-games').innerHTML = message ? `<p>${message}</p>` : matches.slice(0,6).map(f => {
      const active = live.has(f.status), done = finished.has(f.status);
      const status = active ? (f.status === 'HT' ? 'HT' : f.elapsed ? `${f.elapsed}′` : 'LIVE') : done ? f.status : ({PST:'Postponed',CANC:'Cancelled',ABD:'Abandoned',SUSP:'Suspended'}[f.status] || (f.tvOnly ? f.time : clock(f.date)));
      const score = (active || done) && f.homeGoals != null && f.awayGoals != null ? ` · ${f.homeGoals}–${f.awayGoals}` : '';
      const channel = f.tv?.channel && f.tv.channel !== 'TV details confirmed' ? f.tv.channel : tv.status === 'rejected' ? 'UK TV listings temporarily unavailable' : 'UK TV coverage not listed';
      return `<a class="today-match ${active?'is-live':''}" href="match-centre.html"><strong>${esc(status)}</strong><span><b>${esc(f.home)} v ${esc(f.away)}${esc(score)}</b><small>${esc(f.competition || '')}</small><small class="today-channel">${esc(channel)}</small></span></a>`;
    }).join('');
    if (matches.length > 6) $('today-games').insertAdjacentHTML('beforeend','<a class="today-more" href="match-centre.html">See all today’s matches →</a>');
  }
  function dateFor(value) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value)).map(p => [p.type,p.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  }
  async function headlines(day) {
    try {
      const data = await json('/api/news');
      if (dateKey() !== day) return;
      const seen = new Set();
      const items = (data.items || []).filter(x => {
        const age = Date.now() - new Date(x.publishedAt || x.published).getTime();
        if (!x.title || !/^https?:\/\//i.test(x.link || '') || age < -300000 || age > 86400000 || !Number.isFinite(age) || seen.has(normal(x.title))) return false;
        seen.add(normal(x.title)); return true;
      }).sort((a,b) => (b.relevance || 0)-(a.relevance || 0)).slice(0,3);
      $('today-headlines').innerHTML = items.length ? items.map(x => `<a class="today-story" href="football-talk-story.html?source=${encodeURIComponent(x.link)}"><b>${esc(x.title)}</b><small>${esc(x.source)} · ${esc(clock(x.publishedAt || x.published))}</small></a>`).join('') : '<p>No fresh headlines are available yet. Check back shortly.</p>';
    } catch { $('today-headlines').textContent = 'Headlines are temporarily unavailable. Please try Latest News.'; }
  }
  const polls = [
    ['Should VAR stay in the Premier League?', ['Keep it','Scrap it','Keep it, but change how it works']],
    ['Should ticket prices for home fans be capped?', ['Yes','No','Only for certain seats']],
    ['What should settle a drawn FA Cup tie?', ['Extra time and penalties','Straight to penalties','Bring back replays']],
    ['Should clubs give academy players more first-team chances?', ['Yes','Only if they are ready','Results must come first']],
    ['Would you support a salary cap in English football?', ['Yes','No','Need more detail']],
    ['What matters most from your club this weekend?', ['The result','The performance','Both equally']],
    ['Should referees explain major decisions after matches?', ['Yes, every match','Only controversial decisions','No']]
  ];
  let pollDay = '', chosen = null, busy = false, counts = [];
  const readChoice = key => {try {return localStorage.getItem(key)} catch {return null}};
  const cfg = window.FT_CONFIG || {};
  const pollId = () => 'ft-today-v1:' + pollDay;
  const headers = () => ({apikey:cfg.SUPABASE_ANON_KEY,'Content-Type':'application/json'});
  async function totals() {
    const id = pollId(), day = pollDay;
    const result = await Promise.all(counts.map(async (_,i) => {
      const r = await fetch(`${cfg.SUPABASE_URL}/rest/v1/poll_responses?select=id&poll_id=eq.${encodeURIComponent(id)}&answer=eq.${i}`,{method:'HEAD',headers:{...headers(),Prefer:'count=exact'},cache:'no-store',signal:AbortSignal.timeout(10000)});
      const count = Number(r.headers.get('content-range')?.split('/')[1]);
      if (!r.ok || !Number.isFinite(count)) throw Error('Results unavailable');
      return count;
    }));
    if (day === pollDay) counts = result;
  }
  function drawPoll(message) {
    const p = polls[Math.floor(Date.parse(pollDay+'T12:00:00Z')/86400000)%polls.length];
    $('today-question').textContent = p[0];
    const total = counts.reduce((a,b) => a+b,0);
    $('today-options').innerHTML = p[1].map((label,i) => `<button type="button" data-choice="${i}" ${busy || chosen !== null ? 'disabled' : ''} class="${chosen === String(i)?'chosen':''}">${esc(label)}${chosen !== null ? `<strong>${total ? Math.round(counts[i]/total*100) : 0}%</strong>` : ''}</button>`).join('');
    $('today-verdict').textContent = message || (chosen !== null ? `${total} fan vote${total===1?'':'s'} · Your vote is saved on this browser.` : 'Vote to see the fans’ verdict. New question every day.');
    $('today-options').querySelectorAll('button').forEach(b => b.addEventListener('click', () => vote(b.dataset.choice)));
  }
  async function vote(choice) {
    if (dateKey() !== pollDay) { refresh(); return; }
    if (busy || chosen !== null) return;
    busy = true; drawPoll('Saving your vote…');
    try {
      if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) throw Error('Unavailable');
      const r = await fetch(`${cfg.SUPABASE_URL}/rest/v1/poll_responses`,{method:'POST',headers:headers(),body:JSON.stringify({poll_id:pollId(),answer:choice}),signal:AbortSignal.timeout(10000)});
      if (!r.ok) throw Error('Save failed');
      chosen = choice; counts[Number(choice)]++;
      try {localStorage.setItem(pollId(),choice)} catch {}
      try {await totals(); drawPoll()} catch {drawPoll('Your vote was saved. Live results are temporarily unavailable.')}
    } catch {drawPoll('We could not save your vote. Please try again.')} finally {busy = false; $('today-options').querySelectorAll('button').forEach(b => b.disabled = chosen !== null);}
  }
  let loading = false;
  async function refresh() {
    if (loading || busy) return;
    loading = true;
    const day = dateKey();
    $('today-date').textContent = new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',weekday:'long',day:'numeric',month:'long'}).format(new Date());
    if (pollDay !== day) { $('today-games').textContent = 'Loading today’s games…'; $('today-headlines').textContent = 'Loading the latest headlines…'; pollDay = day; chosen = readChoice(pollId()); counts = [0,0,0]; drawPoll(); }
    await Promise.allSettled([games(day),headlines(day),totals().then(() => drawPoll()).catch(() => drawPoll('Fan vote results are temporarily unavailable.'))]);
    loading = false;
  }
  refresh();
  setInterval(() => {if (!document.hidden) refresh()},60000);
  document.addEventListener('visibilitychange', () => {if (!document.hidden) refresh()});
})();
