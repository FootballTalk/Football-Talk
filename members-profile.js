(() => {
  const cfg=window.FT_CONFIG||{};
  const sessionKey='football-talk-member-session';
  const prefKey='football-talk-member-preferences';
  const predPrefix='member-prediction:';
  const finished=new Set(['FT','AET','PEN']);
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const readJSON=(k,fallback)=>{try{return JSON.parse(localStorage.getItem(k)||'null')||fallback}catch{return fallback}};
  const user=()=>readJSON(sessionKey,null)?.user||null;
  const prefs=()=>readJSON(prefKey,{club:''});
  const username=()=>user()?.user_metadata?.username||user()?.user_metadata?.display_name||user()?.email?.split('@')[0]||'Football fan';
  const headers=()=>({apikey:cfg.SUPABASE_ANON_KEY,Authorization:`Bearer ${cfg.SUPABASE_ANON_KEY}`});
  const outcome=(h,a)=>h===a?'D':h>a?'H':'A';
  const points=(p,f)=>{if(!f||!finished.has(f.status)||f.homeGoals==null||f.awayGoals==null)return null;const ph=+p.predHome,pa=+p.predAway,ah=+f.homeGoals,aa=+f.awayGoals;if(ph===ah&&pa===aa)return 3;return outcome(ph,pa)===outcome(ah,aa)?1:0};
  const memberNo=id=>{let h=2166136261;for(const c of String(id||'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return `FT-${String(Math.abs(h>>>0)%1000000).padStart(6,'0')}`};
  const joined=v=>{if(!v)return 'Member';const d=new Date(v);return Number.isNaN(d.getTime())?'Member':d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})};

  function styles(){
    if(document.getElementById('member-profile-styles'))return;
    const s=document.createElement('style');s.id='member-profile-styles';s.textContent=`
      .member-profile{margin:24px 0 0;background:linear-gradient(135deg,#17171b,#0d0d10);border:1px solid #36363d;border-top:4px solid #f7c600;border-radius:16px;padding:20px}.profile-top{display:flex;align-items:center;gap:15px}.profile-avatar{width:58px;height:58px;border-radius:50%;display:grid;place-items:center;background:#f7c600;color:#09090b;font-family:'Archivo Black',sans-serif;font-size:24px}.profile-name{font-family:'Archivo Black',sans-serif;font-size:22px}.profile-tag{color:#f7c600;font-size:12px;font-weight:900;margin-top:4px}.profile-details{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:17px}.profile-detail{background:#101013;border:1px solid #29292f;border-radius:10px;padding:12px}.profile-detail small{display:block;color:#8f8f96;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px}.profile-detail b{font-size:13px}.profile-record{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:10px}.profile-record div{text-align:center;background:#1d1d21;border-radius:9px;padding:10px 6px}.profile-record strong{display:block;color:#f7c600;font-size:19px}.profile-record span{font-size:10px;color:#aaa;font-weight:800}.profile-note{margin:10px 0 0;color:#888;font-size:11px}@media(max-width:700px){.profile-details{grid-template-columns:repeat(2,1fr)}.profile-record{grid-template-columns:repeat(2,1fr)}}`;
    document.head.appendChild(s);
  }

  function render(){
    const main=document.querySelector('.members-main'),anchor=document.getElementById('member-hub');if(!main||!anchor||document.getElementById('member-profile'))return;
    const u=user();if(!u)return;const p=prefs(),name=username(),initial=name.trim().charAt(0).toUpperCase()||'F';
    const el=document.createElement('section');el.id='member-profile';el.className='member-profile';
    el.innerHTML=`<div class="profile-top"><div class="profile-avatar">${esc(initial)}</div><div><div class="profile-name">${esc(name)}</div><div class="profile-tag">⚽ FOOTBALL TALK MEMBER</div></div></div><div class="profile-details"><div class="profile-detail"><small>Member No.</small><b>${esc(memberNo(u.id))}</b></div><div class="profile-detail"><small>Joined</small><b>${esc(joined(u.created_at))}</b></div><div class="profile-detail"><small>Favourite Club</small><b id="profile-club">${esc(p.club||'Not selected')}</b></div><div class="profile-detail"><small>Status</small><b>Active Member</b></div></div><div class="profile-record"><div><strong id="profile-picks">—</strong><span>SCORING PICKS</span></div><div><strong id="profile-correct">—</strong><span>CORRECT RESULTS</span></div><div><strong id="profile-exact">—</strong><span>EXACT SCORES</span></div><div><strong id="profile-accuracy">—</strong><span>ACCURACY</span></div></div><p class="profile-note">Your profile updates automatically from your Football Talk account, club choice and completed predictions.</p>`;
    main.insertBefore(el,anchor);loadRecord();
    document.addEventListener('change',e=>{if(e.target?.id==='fav-club'){document.getElementById('profile-club').textContent=e.target.value||'Not selected'}});
  }

  async function loadRecord(){
    const u=user();if(!u||!cfg.SUPABASE_URL||!cfg.SUPABASE_ANON_KEY)return;
    try{
      const [rows,fx]=await Promise.all([
        fetch(`${cfg.SUPABASE_URL}/rest/v1/poll_responses?select=answer&poll_id=like.${encodeURIComponent(predPrefix+'*')}&limit=5000`,{headers:headers(),cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()),
        fetch('/api/fixtures?results=1',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject())
      ]);
      const map=new Map();(fx.leagues||[]).forEach(l=>(l.fixtures||[]).forEach(f=>map.set(String(f.id),f)));
      const latest=new Map();rows.forEach(x=>{let p;try{p=JSON.parse(x.answer)}catch{return}if(p?.kind!=='member-prediction'||p.userId!==u.id)return;const k=String(p.fixtureId),old=latest.get(k);if(!old||new Date(p.updatedAt)>new Date(old.updatedAt))latest.set(k,p)});
      const scored=[...latest.values()].map(p=>points(p,map.get(String(p.fixtureId)))).filter(v=>v!==null);
      const correct=scored.filter(v=>v>0).length,exact=scored.filter(v=>v===3).length,accuracy=scored.length?Math.round(correct/scored.length*100):0;
      document.getElementById('profile-picks').textContent=scored.length;document.getElementById('profile-correct').textContent=correct;document.getElementById('profile-exact').textContent=exact;document.getElementById('profile-accuracy').textContent=`${accuracy}%`;
    }catch(_){/* Keep profile usable if live stats are temporarily unavailable. */}
  }

  function boot(){styles();let tries=0;const timer=setInterval(()=>{tries++;if(document.getElementById('member-hub')){clearInterval(timer);render()}else if(tries>40)clearInterval(timer)},150)}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
})();