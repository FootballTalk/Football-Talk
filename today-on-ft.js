(()=>{if(document.getElementById('ft-match-link-focus'))return;const style=document.createElement('style');style.id='ft-match-link-focus';style.textContent='a.today-match:focus-visible,a.ftnt-score:focus-visible,a.ftss-game:focus-visible,a.ft-ln-game:focus-visible,#pl-kickoff-countdown a:focus-visible{outline:3px solid #f7c600;outline-offset:2px}#ft-home-news-ticker:focus-within .ftnt-track{animation-play-state:paused!important}';document.head.appendChild(style)})();
(() => {
  const hero = document.querySelector('main > .hero');
  if (!hero || document.getElementById('ft-today')) return;
  const section = document.createElement('section');
  section.id = 'ft-today';
  section.setAttribute('aria-labelledby', 'ft-today-title');
  section.innerHTML = `<header class="today-heading"><div><p class="today-kicker">YOUR DAILY FOOTBALL FIX</p><h2 id="ft-today-title">Headlines & fan vote</h2><p id="today-date"></p></div><a href="match-centre.html">Match Centre →</a></header><div class="today-grid"><div><h3>Three key headlines</h3><div id="today-headlines">Loading the latest headlines…</div></div><div class="today-poll"><p class="today-kicker">WHERE FANS HAVE THEIR SAY</p><h3 id="today-question"></h3><div id="today-options"></div><p id="today-verdict" class="today-note" role="status"></p></div></div>`;
  hero.after(section);
  const $ = id => section.querySelector('#' + id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dateKey = () => {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(p => [p.type,p.value]));
    return `${p.year}-${p.month}-${p.day}`;
  };
  const clock = value => new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value));
  const normal = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g,'');
  async function json(url) {
    const r = await fetch(url, {cache:'no-store',signal:AbortSignal.timeout(15000)});
    if (!r.ok) throw Error('Unavailable');
    const data = await r.json();
    if (data.error) throw Error(data.error);
    return data;
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
    if (pollDay !== day) { $('today-headlines').textContent = 'Loading the latest headlines…'; pollDay = day; chosen = readChoice(pollId()); counts = [0,0,0]; drawPoll(); }
    await Promise.allSettled([headlines(day),totals().then(() => drawPoll()).catch(() => drawPoll('Fan vote results are temporarily unavailable.'))]);
    loading = false;
  }
  refresh();
  setInterval(() => {if (!document.hidden) refresh()},60000);
  document.addEventListener('visibilitychange', () => {if (!document.hidden) refresh()});
})();
