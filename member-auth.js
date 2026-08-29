(() => {
  const cfg=window.FT_CONFIG||{};
  if(!cfg.SUPABASE_URL||!cfg.SUPABASE_ANON_KEY)return;
  const base=`${cfg.SUPABASE_URL}/auth/v1`;
  const storageKey='football-talk-member-session';
  const headers={'apikey':cfg.SUPABASE_ANON_KEY,'Content-Type':'application/json'};
  const readSession=()=>{try{return JSON.parse(localStorage.getItem(storageKey)||'null')}catch{return null}};
  const saveSession=s=>{try{localStorage.setItem(storageKey,JSON.stringify(s))}catch(_){}};
  const clearSession=()=>{try{localStorage.removeItem(storageKey)}catch(_){}};
  const getUsername=user=>user?.user_metadata?.username||user?.user_metadata?.display_name||'Football fan';

  window.FT_MEMBER={
    session:readSession,
    username:()=>getUsername(readSession()?.user),
    isSignedIn:()=>!!readSession()?.access_token
  };

  const joinTab=document.getElementById('join-tab'),loginTab=document.getElementById('login-tab');
  const joinForm=document.getElementById('join-form'),loginForm=document.getElementById('login-form');
  const authCard=document.getElementById('auth-card'),accountBox=document.getElementById('account-box');
  if(!joinTab||!loginTab||!joinForm||!loginForm)return;

  const setMode=mode=>{
    const joining=mode==='join';
    joinTab.classList.toggle('active',joining);loginTab.classList.toggle('active',!joining);
    joinForm.hidden=!joining;loginForm.hidden=joining;
  };
  joinTab.addEventListener('click',()=>setMode('join'));loginTab.addEventListener('click',()=>setMode('login'));

  function showAccount(session){
    if(!session?.access_token||!session?.user)return false;
    authCard.style.display='none';accountBox.classList.add('show');
    document.getElementById('welcome-name').textContent=`Welcome, ${getUsername(session.user)}`;
    document.getElementById('account-email').textContent=session.user.email||'';
    return true;
  }
  const existing=readSession();if(existing)showAccount(existing);

  joinForm.addEventListener('submit',async e=>{
    e.preventDefault();const status=document.getElementById('join-status');const button=joinForm.querySelector('button[type=submit]');
    const username=joinForm.username.value.trim();const email=joinForm.email.value.trim();const password=joinForm.password.value;
    if(!/^[A-Za-z0-9 _.-]{3,30}$/.test(username)){status.textContent='Use 3–30 letters, numbers, spaces, dots, dashes or underscores for your username.';return;}
    button.disabled=true;button.textContent='Creating account…';status.textContent='';
    try{
      const r=await fetch(`${base}/signup`,{method:'POST',headers,body:JSON.stringify({email,password,data:{username,display_name:username}})});
      const data=await r.json();if(!r.ok)throw new Error(data.msg||data.message||data.error_description||'Could not create account');
      if(data.access_token){saveSession(data);showAccount(data);status.textContent='';}
      else{status.textContent='Account created. Check your email to verify it, then return here and sign in.';setMode('login');document.getElementById('login-email').value=email;}
    }catch(err){status.textContent=err.message||'Could not create your account just yet.'}
    finally{button.disabled=false;button.textContent='Join Football Talk — Free'}
  });

  loginForm.addEventListener('submit',async e=>{
    e.preventDefault();const status=document.getElementById('login-status');const button=loginForm.querySelector('button[type=submit]');
    button.disabled=true;button.textContent='Signing in…';status.textContent='';
    try{
      const r=await fetch(`${base}/token?grant_type=password`,{method:'POST',headers,body:JSON.stringify({email:loginForm.email.value.trim(),password:loginForm.password.value})});
      const data=await r.json();if(!r.ok)throw new Error(data.error_description||data.msg||data.message||'Sign-in failed');
      saveSession(data);showAccount(data);
    }catch(err){status.textContent=err.message||'Could not sign you in.'}
    finally{button.disabled=false;button.textContent='Sign in'}
  });

  document.getElementById('logout')?.addEventListener('click',async()=>{
    const session=readSession();
    try{if(session?.access_token)await fetch(`${base}/logout`,{method:'POST',headers:{...headers,Authorization:`Bearer ${session.access_token}`}})}catch(_){ }
    clearSession();location.reload();
  });
})();