(function(){
  var form=document.getElementById('ft-newsletter-form');
  if(!form)return;
  var email=document.getElementById('ft-newsletter-email');
  var consent=document.getElementById('ft-newsletter-consent');
  var status=document.getElementById('ft-newsletter-status');
  var button=form.querySelector('button[type="submit"]');
  function msg(text,type){status.textContent=text;status.className='ft-newsletter-status '+(type||'');}
  form.addEventListener('submit',async function(e){
    e.preventDefault();
    var value=(email.value||'').trim().toLowerCase();
    if(!email.checkValidity()){email.reportValidity();return}
    if(!consent.checked){msg('Please tick the consent box to join.','error');return}
    button.disabled=true;
    button.textContent='JOINING…';
    msg('','');
    try{
      var res=await fetch('/api/newsletter-subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:value,consent:true})});
      var data={};
      try{data=await res.json()}catch{}
      if(!res.ok)throw new Error(data.error||'Signup failed');
      form.reset();
      if(data.alreadySubscribed)msg('You are already subscribed to Football Talk Weekly. ⚽','success');
      else if(data.resubscribed)msg('You are subscribed again. Check your inbox for your welcome email. ⚽','success');
      else msg('You are in! Check your inbox for your Football Talk welcome email. ⚽','success');
      if(window.va)window.va('event',{name:'newsletter_signup',data:{source:'homepage'}});
    }catch(err){
      msg('We could not complete the signup just now. Please try again.','error');
    }finally{
      button.disabled=false;
      button.textContent='SIGN ME UP →';
    }
  });
})();