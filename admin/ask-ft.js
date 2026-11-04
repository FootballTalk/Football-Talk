(()=>{
 const cfg=window.FT_CONFIG||{},sb=supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY),$=id=>document.getElementById(id);
 const labels={'tv':'UK TV coverage','fixtures':'Fixtures','results':'Results','tables':'League tables','news':'News','transfers':'Transfers','unknown':'Unrecognised requests','offside':'Offside explanation','var':'VAR explanation','women':'Women’s football','navigation':'Site navigation'};
 const name=s=>labels[s]||s.replaceAll('-',' ');
 function lines(id,rows){$(id).replaceChildren();if(!rows.length){$(id).textContent='No requests recorded in this period yet.';return}for(const line of rows){const p=document.createElement('p');p.textContent=line;$(id).appendChild(p)}}
 async function load(){
  $('notice').textContent='Loading private insights…';
  try{const {data:{session}}=await sb.auth.getSession();if(!session||session.user.app_metadata?.role!=='admin'){ $('dashboard').hidden=true;$('login').hidden=!!session;$('notice').textContent=session?'This account does not have administrator access. Sign out to use an administrator account.':'Sign in with your Football Talk administrator account.';if(session){$('login').hidden=false;$('login').querySelector('button').textContent='Sign in as administrator'}return}
   const today=new Date().toLocaleDateString('en-CA',{timeZone:'Europe/London'}),midnight=Date.parse(today+'T00:00:00Z'),day=n=>new Date(midnight-n*86400000).toISOString().slice(0,10);let rows=[];
   for(let from=0;;from+=1000){const {data,error}=await sb.from('ft_ask_daily').select('*').gte('day',day(13)).order('day').order('topic').order('club').order('intent').order('answered').range(from,from+999);if(error)throw error;rows.push(...data);if(data.length<1000)break;if(from>=99000)throw Error('Too many metric groups to display safely')}
   $('login').hidden=true;$('dashboard').hidden=false;
   const current=rows.filter(r=>r.day>=day(6)),previous=rows.filter(r=>r.day<day(6)),sum=a=>a.reduce((n,r)=>n+r.requests,0),total=sum(current),unanswered=sum(current.filter(r=>!r.answered));
   $('totals').replaceChildren();for(const [value,label]of [[total,'Requests · last 7 days'],[unanswered,'Unanswered · last 7 days'],[total?Math.round((total-unanswered)*100/total)+'%':'—','Answered or directed to a page']]){const d=document.createElement('div');d.className='card';const b=document.createElement('strong');b.textContent=value;d.append(b,document.createTextNode(label));$('totals').appendChild(d)}
   const group=(rs,key)=>rs.reduce((out,r)=>(out[key(r)]=(out[key(r)]||0)+r.requests,out),{}),topics=group(current,r=>r.topic),old=group(previous,r=>r.topic),clubs=group(current.filter(r=>r.club),r=>r.club),gaps=group(current.filter(r=>!r.answered),r=>(r.club?r.club+' · ':'')+name(r.topic)+' · '+name(r.intent));
   $('topics').replaceChildren();for(const [topic,n]of Object.entries(topics).sort((a,b)=>b[1]-a[1])){const tr=document.createElement('tr');for(const text of [name(topic),n,old[topic]||0,old[topic]?((n-old[topic]>=0?'+':'')+(n-old[topic])):'New']){const td=document.createElement('td');td.textContent=text;tr.appendChild(td)}$('topics').appendChild(tr)}
   lines('clubs',Object.entries(clubs).sort((a,b)=>b[1]-a[1]).slice(0,20).map(([k,n])=>k+': '+n+' requests'));
   lines('gaps',Object.entries(gaps).sort((a,b)=>b[1]-a[1]).slice(0,20).map(([k,n])=>k+': '+n));
   const advice={tv:'Review UK TV coverage and make the guide easier to find.',transfers:'Review attributed transfer coverage and unanswered club requests.',fixtures:'Check competition coverage and fixture-feed gaps.',results:'Check results coverage and recently completed match updates.',unknown:'Expand the supported question patterns and show clearer example questions.',women:'Review women’s football coverage and navigation.',tables:'Review the leagues available in the tables feed.'};
   lines('ideas',Object.entries(topics).sort((a,b)=>b[1]-a[1]).filter(([k])=>advice[k]).slice(0,4).map(([k,n])=>name(k)+' ('+n+' requests): '+advice[k]));
   $('notice').textContent='Updated '+new Date().toLocaleString('en-GB',{timeZone:'Europe/London'})+' UK. New counters start from the Ask FT trial launch.';
  }catch(e){$('notice').textContent='Could not load insights: '+e.message}
 }
 $('login').onsubmit=async e=>{e.preventDefault();$('notice').textContent='Signing in…';const {error}=await sb.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});$('password').value='';if(error)$('notice').textContent=error.message;else load()};$('refresh').onclick=load;$('logout').onclick=async()=>{await sb.auth.signOut();$('dashboard').hidden=true;load()};load();
})();
