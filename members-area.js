(() => {
  const cfg=window.FT_CONFIG||{};
  const storageKey='football-talk-member-session';
  const loading=document.getElementById('members-loading');
  const shell=document.getElementById('members-shell');
  const read=()=>{try{return JSON.parse(localStorage.getItem(storageKey)||'null')}catch{return null}};
  const save=s=>{try{localStorage.setItem(storageKey,JSON.stringify(s))}catch(_){}};
  const clear=()=>{try{localStorage.removeItem(storageKey)}catch(_){}};
  const redirect=()=>{location.replace('account.html?next=members.html')};
  const username=user=>user?.user_metadata?.username||user?.user_metadata?.display_name||'Football fan';
  const authBase=()=>`${cfg.SUPABASE_URL}/auth/v1`;

  function openMembers(user){
    const name=username(user);
    const userEl=document.getElementById('members-user');
    const titleEl=document.getElementById('welcome-title');
    if(userEl)userEl.textContent=`🔒 ${name}`;
    if(titleEl)titleEl.textContent=`Welcome, ${name}`;
    if(loading)loading.style.display='none';
    if(shell)shell.classList.add('ready');
  }

  async function getUser(accessToken){
    const r=await fetch(`${authBase()}/user`,{headers:{apikey:cfg.SUPABASE_ANON_KEY,Authorization:`Bearer ${accessToken}`},cache:'no-store'});
    if(!r.ok){const err=new Error('invalid session');err.status=r.status;throw err;}
    return r.json();
  }

  async function refreshSession(session){
    if(!session?.refresh_token)return null;
    const r=await fetch(`${authBase()}/token?grant_type=refresh_token`,{
      method:'POST',headers:{apikey:cfg.SUPABASE_ANON_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({refresh_token:session.refresh_token}),cache:'no-store'
    });
    if(!r.ok)return null;
    const fresh=await r.json();
    if(!fresh?.access_token)return null;
    const merged={...session,...fresh,refresh_token:fresh.refresh_token||session.refresh_token};
    save(merged);return merged;
  }

  async function validate(){
    if(!cfg.SUPABASE_URL||!cfg.SUPABASE_ANON_KEY){redirect();return}
    let session=read();
    if(!session?.access_token&&!session?.refresh_token){redirect();return}

    // A session created by Football Talk is enough to render immediately.
    // Network validation then refreshes/repairs it in the background instead of
    // locking a genuine member out because of a temporary mobile/network failure.
    if(session?.user)openMembers(session.user);

    try{
      if(session?.access_token){
        try{
          const user=await getUser(session.access_token);
          session={...session,user};save(session);openMembers(user);return;
        }catch(err){
          if(err.status!==401&&err.status!==403){
            // Temporary connectivity/server problem: keep the locally signed-in member in.
            if(session?.user)return;
            throw err;
          }
        }
      }

      const fresh=await refreshSession(session);
      if(fresh?.access_token){
        try{
          const user=await getUser(fresh.access_token);
          const repaired={...fresh,user};save(repaired);openMembers(user);return;
        }catch(_){
          if(fresh?.user){openMembers(fresh.user);return;}
        }
      }

      // Only force sign-in when Supabase has positively rejected the credentials
      // and we have no usable member identity stored locally.
      if(!session?.user){clear();redirect();}
    }catch(err){
      console.warn('Members Area session check deferred',err);
      if(session?.user){openMembers(session.user);return;}
      if(loading)loading.innerHTML='<div><strong>🔒 MEMBERS AREA</strong><span>We could not confirm your session just now. <a href="account.html?next=members.html" style="color:#f7c600;font-weight:900">Sign in again</a></span></div>';
    }
  }

  document.getElementById('members-signout')?.addEventListener('click',async()=>{
    const session=read();
    try{if(session?.access_token)await fetch(`${authBase()}/logout`,{method:'POST',headers:{apikey:cfg.SUPABASE_ANON_KEY,Authorization:`Bearer ${session.access_token}`}})}catch(_){ }
    clear();location.replace('index.html');
  });

  validate();
})();