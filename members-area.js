(() => {
  const cfg=window.FT_CONFIG||{};
  const storageKey='football-talk-member-session';
  const loading=document.getElementById('members-loading');
  const shell=document.getElementById('members-shell');
  const read=()=>{try{return JSON.parse(localStorage.getItem(storageKey)||'null')}catch{return null}};
  const clear=()=>{try{localStorage.removeItem(storageKey)}catch(_){}};
  const redirect=()=>{location.replace('account.html?next=members.html')};
  const username=user=>user?.user_metadata?.username||user?.user_metadata?.display_name||'Football fan';

  async function validate(){
    if(!cfg.SUPABASE_URL||!cfg.SUPABASE_ANON_KEY){redirect();return}
    const session=read();
    if(!session?.access_token){redirect();return}
    try{
      const r=await fetch(`${cfg.SUPABASE_URL}/auth/v1/user`,{headers:{apikey:cfg.SUPABASE_ANON_KEY,Authorization:`Bearer ${session.access_token}`}});
      if(!r.ok)throw new Error('invalid session');
      const user=await r.json();
      const name=username(user);
      document.getElementById('members-user').textContent=`🔒 ${name}`;
      document.getElementById('welcome-title').textContent=`Welcome, ${name}`;
      loading.style.display='none';shell.classList.add('ready');
    }catch(_){clear();redirect()}
  }

  document.getElementById('members-signout')?.addEventListener('click',async()=>{
    const session=read();
    try{if(session?.access_token)await fetch(`${cfg.SUPABASE_URL}/auth/v1/logout`,{method:'POST',headers:{apikey:cfg.SUPABASE_ANON_KEY,Authorization:`Bearer ${session.access_token}`}})}catch(_){ }
    clear();location.replace('index.html');
  });

  validate();
})();