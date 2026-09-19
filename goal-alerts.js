(()=>{
  const PREFIX='ft-goal-alert-';
  const EDGE='https://cwilgnubzfpmfvoldttm.supabase.co/functions/v1/goal-push';
  const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  const supported='serviceWorker'in navigator&&'PushManager'in window&&'Notification'in window;

  function decodeKey(value){
    const padding='='.repeat((4-value.length%4)%4);
    const base64=(value+padding).replace(/-/g,'+').replace(/_/g,'/');
    const raw=atob(base64),out=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);
    return out;
  }

  function key(matchId){return`${PREFIX}${matchId}`;}
  function enabled(matchId){return localStorage.getItem(key(matchId))==='1';}
  function setEnabled(matchId,value){value?localStorage.setItem(key(matchId),'1'):localStorage.removeItem(key(matchId));}

  function paint(button,on){
    button.classList.toggle('on',on);
    button.setAttribute('aria-pressed',String(on));
    button.innerHTML=on?'<span aria-hidden="true">🔔</span><span>Goal alerts on</span>':'<span aria-hidden="true">🔔</span><span>Notify me of goals</span>';
  }

  function show(message){
    let notice=document.getElementById('goal-alert-notice');
    if(!notice){notice=document.createElement('div');notice.id='goal-alert-notice';notice.className='goal-alert-notice';notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');document.body.appendChild(notice);}
    notice.textContent=message;notice.classList.add('show');
    clearTimeout(show.timer);show.timer=setTimeout(()=>notice.classList.remove('show'),4500);
  }

  async function registration(){
    await navigator.serviceWorker.register('/sw.js');
    return navigator.serviceWorker.ready;
  }

  async function serverRequest(method,body){
    const response=await fetch(`${EDGE}/subscribe`,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||'Goal alerts are temporarily unavailable');
    return data;
  }

  async function turnOn(button){
    if(!supported)throw new Error('Goal alerts are not supported by this browser.');
    if(ios&&!standalone)throw new Error('On iPhone, install Football Talk to your Home Screen first, then open it and switch on goal alerts.');
    const permission=await Notification.requestPermission();
    if(permission!=='granted')throw new Error('Notifications were not allowed. You can change this in your browser settings.');
    const reg=await registration();
    let subscription=await reg.pushManager.getSubscription();
    if(!subscription){
      const keyResponse=await fetch(`${EDGE}/key`,{cache:'no-store'}),keyData=await keyResponse.json().catch(()=>({}));
      if(!keyResponse.ok||!keyData.publicKey)throw new Error(keyData.error||'Goal alerts are temporarily unavailable');
      subscription=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeKey(keyData.publicKey)});
    }
    await serverRequest('POST',{
      subscription:subscription.toJSON(),
      matchId:button.dataset.matchId,
      home:button.dataset.home,
      away:button.dataset.away,
      kickoffAt:button.dataset.kickoff,
      homeGoals:button.dataset.homeGoals,
      awayGoals:button.dataset.awayGoals,
      status:button.dataset.status
    });
    setEnabled(button.dataset.matchId,true);paint(button,true);show(`Goal alerts are on for ${button.dataset.home} v ${button.dataset.away}.`);
  }

  async function turnOff(button){
    const reg=await registration();
    const subscription=await reg.pushManager.getSubscription();
    if(subscription)await serverRequest('DELETE',{endpoint:subscription.endpoint,matchId:button.dataset.matchId});
    setEnabled(button.dataset.matchId,false);paint(button,false);show(`Goal alerts are off for ${button.dataset.home} v ${button.dataset.away}.`);
  }

  document.addEventListener('click',async event=>{
    const button=event.target.closest('.goal-alert');
    if(!button||button.disabled)return;
    event.preventDefault();event.stopPropagation();button.disabled=true;button.classList.add('busy');
    try{enabled(button.dataset.matchId)?await turnOff(button):await turnOn(button);}
    catch(error){show(String(error?.message||error));}
    finally{button.disabled=false;button.classList.remove('busy');}
  });

  function refresh(root=document){root.querySelectorAll('.goal-alert[data-match-id]').forEach(button=>paint(button,enabled(button.dataset.matchId)));}
  document.addEventListener('DOMContentLoaded',()=>refresh());
  new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1)refresh(node.matches?.('.goal-alert')?node.parentNode:node);}).observe(document.documentElement,{childList:true,subtree:true});
})();
