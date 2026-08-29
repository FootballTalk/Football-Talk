(() => {
  if(!/quiz\.html$/i.test(location.pathname)) return;

  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const makeId=()=>`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
  const londonDateKey=()=>{
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const get=t=>parts.find(p=>p.type===t)?.value||'';
    return `${get('year')}-${get('month')}-${get('day')}`;
  };
  const hash=(text='')=>{let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)};
  const quizVersion=()=>hash([...document.querySelectorAll('.question')].map(q=>`${q.querySelector('h2')?.textContent||''}|${[...q.querySelectorAll('.answer')].map(a=>a.textContent||'').join('|')}`).join('||'));
  const pollId=()=>`daily-quiz:${londonDateKey()}:${quizVersion()}`;
  const sentKey=()=>`football-talk-daily-quiz-score-sent:${pollId()}`;

  function addStyles(){
    if(document.getElementById('quiz-scoreboard-style')) return;
    const s=document.createElement('style');
    s.id='quiz-scoreboard-style';
    s.textContent=`
      .quiz-scoreboard{margin-top:18px;background:#fff;color:#111;border-top:5px solid #f7c600;padding:20px;box-shadow:0 8px 22px rgba(0,0,0,.06)}
      .quiz-scoreboard h3{font-family:'Archivo Black';font-size:24px;margin:0 0 5px}.quiz-scoreboard .qs-sub{margin:0 0 14px;color:#666;font-size:13px}.quiz-score-table{width:100%;border-collapse:collapse}.quiz-score-table th,.quiz-score-table td{padding:10px 12px;border-bottom:1px solid #ddd;text-align:left}.quiz-score-table th:last-child,.quiz-score-table td:last-child{text-align:right}.quiz-score-table tr.mine{background:#fff3ad;font-weight:900}.quiz-score-total{margin:14px 0 0;font-weight:900}.quiz-score-note{margin:7px 0 0;color:#777;font-size:11px}.quiz-score-loading{font-size:13px;color:#666}
    `;
    document.head.appendChild(s);
  }

  function ensureConfig(){
    if(window.FT_CONFIG?.SUPABASE_URL&&window.FT_CONFIG?.SUPABASE_ANON_KEY) return Promise.resolve();
    return new Promise((resolve,reject)=>{
      if(document.querySelector('script[data-quiz-config]')){
        let tries=0;const timer=setInterval(()=>{if(window.FT_CONFIG?.SUPABASE_URL){clearInterval(timer);resolve()}else if(++tries>40){clearInterval(timer);reject(new Error('config unavailable'))}},100);
        return;
      }
      const s=document.createElement('script');s.src='config.js?v=20260829-quiz';s.dataset.quizConfig='1';s.onload=resolve;s.onerror=()=>reject(new Error('config unavailable'));document.head.appendChild(s);
    });
  }

  async function requestRows(){
    await ensureConfig();
    const cfg=window.FT_CONFIG;
    const headers={apikey:cfg.SUPABASE_ANON_KEY,Authorization:`Bearer ${cfg.SUPABASE_ANON_KEY}`};
    const url=`${cfg.SUPABASE_URL}/rest/v1/poll_responses?select=answer&poll_id=eq.${encodeURIComponent(pollId())}&limit=1000`;
    const r=await fetch(url,{headers,cache:'no-store'});
    if(!r.ok) throw new Error('scoreboard unavailable');
    const rows=await r.json();
    return rows.map(row=>{try{return JSON.parse(row.answer)}catch{return null}}).filter(x=>x&&x.kind==='quiz-score'&&Number.isInteger(x.score)&&x.score>=0&&x.score<=5);
  }

  async function saveScore(score){
    let already=false;try{already=localStorage.getItem(sentKey())==='1'}catch(_){}
    if(already) return;
    await ensureConfig();
    const cfg=window.FT_CONFIG;
    const headers={apikey:cfg.SUPABASE_ANON_KEY,Authorization:`Bearer ${cfg.SUPABASE_ANON_KEY}`,'Content-Type':'application/json',Prefer:'return=minimal'};
    const payload={kind:'quiz-score',id:makeId(),score,createdAt:new Date().toISOString()};
    const r=await fetch(`${cfg.SUPABASE_URL}/rest/v1/poll_responses`,{method:'POST',headers,body:JSON.stringify({poll_id:pollId(),answer:JSON.stringify(payload)})});
    if(!r.ok) throw new Error('score submit failed');
    try{localStorage.setItem(sentKey(),'1')}catch(_){}
  }

  function mount(){
    const result=document.getElementById('result');
    if(!result) return null;
    let box=document.getElementById('quiz-scoreboard');
    if(!box){box=document.createElement('section');box.id='quiz-scoreboard';box.className='quiz-scoreboard';box.innerHTML='<h3>Today’s Scoreboard</h3><p class="qs-sub">See how everyone else got on with today’s five questions.</p><div class="quiz-score-loading">Loading today’s scores…</div>';result.insertAdjacentElement('afterend',box)}
    return box;
  }

  async function refresh(myScore){
    const box=mount();if(!box)return;
    try{
      const rows=await requestRows();
      const counts=[0,0,0,0,0,0];rows.forEach(r=>counts[r.score]++);
      const lines=[5,4,3,2,1,0].map(score=>`<tr${score===myScore?' class="mine"':''}><td>${score}/5${score===myScore?' — YOU':''}</td><td>${counts[score]}</td></tr>`).join('');
      box.innerHTML=`<h3>Today’s Scoreboard</h3><p class="qs-sub">See how everyone else got on with today’s five questions.</p><table class="quiz-score-table"><thead><tr><th>Score</th><th>Players</th></tr></thead><tbody>${lines}</tbody></table><p class="quiz-score-total">${rows.length} ${rows.length===1?'person has':'people have'} played today.</p><p class="quiz-score-note">Anonymous totals only — no names or personal details are collected.</p>`;
    }catch(_){box.innerHTML='<h3>Today’s Scoreboard</h3><p class="qs-sub">The shared scores are temporarily unavailable. Your quiz result is still saved normally.</p>'}
  }

  async function handleCompleted(){
    const result=document.getElementById('result');
    if(!result||!result.classList.contains('show')) return;
    const strong=result.querySelector('strong');
    const m=(strong?.textContent||'').match(/^([0-5])\/5$/);if(!m)return;
    const score=Number(m[1]);
    mount();
    try{await saveScore(score)}catch(_){}
    await refresh(score);
  }

  addStyles();
  const result=document.getElementById('result');
  if(result){new MutationObserver(handleCompleted).observe(result,{attributes:true,childList:true,subtree:true});handleCompleted()}
})();
