(() => {
  const mount = document.getElementById('member-poll');
  if (!mount) return;

  const cfg = window.FT_CONFIG || {};
  const sessionKey = 'football-talk-member-session';
  const esc = (v='') => String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const readSession = () => { try { return JSON.parse(localStorage.getItem(sessionKey) || 'null'); } catch (_) { return null; } };
  const member = () => readSession()?.user || null;
  const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;

  const polls = [
    {q:'Which matters most when judging a manager?',a:['Trophies','League position','Style of football','Player development']},
    {q:'What makes the best Premier League match?',a:['Loads of goals','Late drama','Tactical battle','Big rivalry']},
    {q:'Which position is most important to build a team around?',a:['Goalkeeper','Centre-back','Midfielder','Striker']},
    {q:'What is the best way to settle a cup tie?',a:['Extra time then penalties','Straight to penalties','Replay','Golden goal']},
    {q:'What do you value most in a new signing?',a:['Proven quality','Potential','Versatility','Big-game experience']},
    {q:'Which is the bigger achievement?',a:['Winning the league','Winning the Champions League','Winning a domestic double','Going unbeaten']},
    {q:'What makes a great captain?',a:['Leadership','Ability','Passion','Consistency']},
    {q:'Which type of goal is best?',a:['Long-range screamer','Team move','Free-kick','Last-minute winner']},
    {q:'What should clubs prioritise most?',a:['Academy players','Smart transfers','Experienced leaders','Elite coaching']},
    {q:'Which matters more to fans?',a:['Winning trophies','Entertaining football','Beating rivals','Club identity']},
    {q:'What is the toughest away ground advantage?',a:['Crowd noise','Pitch familiarity','Travel','Pressure on officials']},
    {q:'Which player trait is hardest to replace?',a:['Pace','Creativity','Goals','Leadership']},
    {q:'What makes the transfer window exciting?',a:['Deadline-day deals','Big-name signings','Young prospects','Unexpected moves']},
    {q:'Which competition produces the best drama?',a:['Premier League','Champions League','FA Cup','League Cup']}
  ];

  function londonDateKey(){
    const parts = new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const get=t=>parts.find(p=>p.type===t)?.value||'';
    return `${get('year')}-${get('month')}-${get('day')}`;
  }
  function dayNumber(){
    const d = londonDateKey().split('-').map(Number);
    return Math.floor(Date.UTC(d[0],d[1]-1,d[2]) / 86400000);
  }
  const todayPoll = () => polls[((dayNumber()%polls.length)+polls.length)%polls.length];
  const pollId = () => `members-poll:${londonDateKey()}`;
  const headers = (write=false) => ({
    apikey:cfg.SUPABASE_ANON_KEY,
    Authorization:`Bearer ${cfg.SUPABASE_ANON_KEY}`,
    ...(write?{'Content-Type':'application/json',Prefer:'return=minimal'}:{})
  });

  function styles(){
    if(document.getElementById('members-poll-style')) return;
    const s=document.createElement('style');
    s.id='members-poll-style';
    s.textContent=`
      .member-poll-card{margin:18px 0;background:#151518;border:1px solid #2c2c31;border-left:5px solid #f7c600;border-radius:14px;padding:18px}
      .member-poll-kicker{font-size:11px;font-weight:1000;letter-spacing:.08em;color:#f7c600;margin-bottom:6px}.member-poll-card h2{margin:0 0 14px;font-size:21px}.member-poll-options{display:grid;grid-template-columns:1fr 1fr;gap:9px}.member-poll-option{position:relative;overflow:hidden;border:1px solid #3a3a40;background:#101013;color:#fff;border-radius:10px;padding:12px 13px;text-align:left;font-weight:900;cursor:pointer}.member-poll-option:hover{border-color:#f7c600}.member-poll-option:disabled{cursor:default}.member-poll-option.mine{border-color:#f7c600;background:#242008}.member-poll-bar{position:absolute;left:0;top:0;bottom:0;background:rgba(247,198,0,.12);z-index:0}.member-poll-label,.member-poll-pct{position:relative;z-index:1}.member-poll-pct{float:right;color:#f7c600}.member-poll-foot{margin:12px 0 0;color:#999;font-size:12px}.member-poll-error{color:#d0d0d4;font-size:13px}@media(max-width:650px){.member-poll-options{grid-template-columns:1fr}.member-poll-card{padding:15px}}
    `;
    document.head.appendChild(s);
  }

  async function rows(){
    if(!cfg.SUPABASE_URL||!cfg.SUPABASE_ANON_KEY) throw new Error('poll unavailable');
    const url=`${cfg.SUPABASE_URL}/rest/v1/poll_responses?select=answer&poll_id=eq.${encodeURIComponent(pollId())}&limit=2000`;
    const r=await fetch(url,{headers:headers(),cache:'no-store'});
    if(!r.ok) throw new Error('poll unavailable');
    return (await r.json()).map(x=>{try{return JSON.parse(x.answer)}catch{return null}}).filter(x=>x?.kind==='members-poll-vote'&&Number.isInteger(x.choice));
  }

  async function vote(choice){
    const user=member(); if(!user?.id) return;
    const existing=await rows();
    if(existing.some(x=>x.userId===user.id)){ await render(); return; }
    const payload={kind:'members-poll-vote',id:makeId(),userId:user.id,choice,createdAt:new Date().toISOString()};
    const r=await fetch(`${cfg.SUPABASE_URL}/rest/v1/poll_responses`,{method:'POST',headers:headers(true),body:JSON.stringify({poll_id:pollId(),answer:JSON.stringify(payload)})});
    if(!r.ok) throw new Error('vote failed');
    await render();
  }

  async function render(){
    const user=member();
    if(!user?.id){ setTimeout(render,350); return; }
    const p=todayPoll();
    mount.innerHTML=`<div class="member-poll-card"><div class="member-poll-kicker">🗳️ MEMBERS ONLY · POLL OF THE DAY</div><h2>${esc(p.q)}</h2><div class="member-poll-options"><div class="member-poll-error">Loading today’s poll…</div></div></div>`;
    try{
      const all=await rows();
      const mine=all.find(x=>x.userId===user.id);
      const counts=p.a.map((_,i)=>all.filter(x=>x.choice===i).length);
      const total=counts.reduce((a,b)=>a+b,0);
      const options=p.a.map((label,i)=>{
        const pct=total?Math.round((counts[i]/total)*100):0;
        const chosen=mine?.choice===i;
        return `<button class="member-poll-option ${chosen?'mine':''}" type="button" data-choice="${i}" ${mine?'disabled':''}><span class="member-poll-bar" style="width:${mine?pct:0}%"></span><span class="member-poll-label">${chosen?'✓ ':''}${esc(label)}</span>${mine?`<span class="member-poll-pct">${pct}%</span>`:''}</button>`;
      }).join('');
      mount.innerHTML=`<div class="member-poll-card"><div class="member-poll-kicker">🗳️ MEMBERS ONLY · POLL OF THE DAY</div><h2>${esc(p.q)}</h2><div class="member-poll-options">${options}</div><p class="member-poll-foot">${mine?`${total} ${total===1?'member has':'members have'} voted today. Results update live.`:'Vote once to reveal today’s live member results.'}</p></div>`;
      if(!mine) mount.querySelectorAll('[data-choice]').forEach(btn=>btn.addEventListener('click',async()=>{btn.disabled=true;try{await vote(Number(btn.dataset.choice))}catch(_){await render()}}));
    }catch(_){mount.innerHTML=`<div class="member-poll-card"><div class="member-poll-kicker">🗳️ MEMBERS ONLY · POLL OF THE DAY</div><h2>${esc(p.q)}</h2><div class="member-poll-error">Today’s poll is temporarily unavailable.</div></div>`}
  }

  styles();
  render();
  setInterval(render,120000);
})();