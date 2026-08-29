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

  async function getUser(accessToken){
    const r=await fetch(`${authBase()}/user`,{
      headers:{apikey:cfg.SUPABASE_ANON_KEY,Authorization:`Bearer ${accessToken}`},
      cache:'no-store'
    });
    if(!r.ok){
      const err=new Error('invalid session');
      err.status=r.status;
      throw err;
    }
    return r.json();
  }

  async function refreshSession(session){
    if(!session?.refresh_token)return null;
    const r=await fetch(`${authBase()}/token?grant_type=refresh_token`,{
      method:'POST',
      headers:{apikey:cfg.SUPABASE_ANON_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({refresh_token:session.refresh_token}),
      cache:'no-store'
    });
    if(!r.ok)return null;
    const fresh=await r.json();
    if(!fresh?.access_token)return null;
    const merged={...session,...fresh,refresh_token:fresh.refresh_token||session.refresh_token};
    save(merged);
    return merged;
  }

  function openMembers(user){
    const name=username(user);
    document.getElementById('members-user').textContent=`🔒 ${name}`;
    document.getElementById('welcome-title').textContent=`Welcome, ${name}`;
    loading.style.display='none';
    shell.classList.add('ready');
  }

  async function validate(){
    if(!cfg.SUPABASE_URL||!cfg.SUPABASE_ANON_KEY){redirect();return}
    let session=read();
    if(!session?.access_token&&!session?.refresh_token){redirect();return}

    try{
      if(session?.access_token){
        try{
          const user=await getUser(session.access_token);
          openMembers(user);
          return;
        }catch(err){
          if(err.status!==401&&err.status!==403)throw err;
        }
      }

      const fresh=await refreshSession(session);
      if(!fresh?.access_token){clear();redirect();return}
      const user=await getUser(fresh.access_token);
      openMembers(user);
    }catch(err){
      console.warn('Members Area session check failed',err);
      if(loading){
        loading.innerHTML='<div><strong>🔒 MEMBERS AREA</strong><span>We could not confirm your session just now. <a href="members.html" style="color:#f7c600;font-weight:900">Try again</a></span></div>';
      }
    }
  }

  document.getElementById('members-signout')?.addEventListener('click',async()=>{
    const session=read();
    try{if(session?.access_token)await fetch(`${authBase()}/logout`,{method:'POST',headers:{apikey:cfg.SUPABASE_ANON_KEY,Authorization:`Bearer ${session.access_token}`}})}catch(_){ }
    clear();location.replace('index.html');
  });

  validate();
})();