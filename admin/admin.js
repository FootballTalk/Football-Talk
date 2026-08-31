const cfg=window.FT_CONFIG||{};
const setup=document.getElementById('setupPanel'),login=document.getElementById('loginPanel'),admin=document.getElementById('adminPanel'),logoutBtn=document.getElementById('logoutBtn');
let sb=null,editingId=null;
const DRAFT_KEY='footballTalkAdminDraftV1';
const DRAFT_FIELDS=['type','status','title','summary','body','imageUrl','featured','publishedAt'];

if(!cfg.SUPABASE_URL||cfg.SUPABASE_URL.includes('PASTE_')){
  setup.classList.remove('hidden');
}else{
  sb=supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
  init();
}

async function init(){
  bindDraftAutosave();
  const{data:{session}}=await sb.auth.getSession();
  renderAuth(session,true);
  sb.auth.onAuthStateChange((_e,s)=>renderAuth(s,false));
}

function renderAuth(session,firstLoad=false){
  const bell=document.getElementById('advertisingBell');
  if(session){
    login.classList.add('hidden');
    admin.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');
    bell?.classList.remove('hidden');
    loadStories();
    loadAdvertisingCount();
    if(firstLoad) restoreDraftOrReset();
  }else{
    login.classList.remove('hidden');
    admin.classList.add('hidden');
    logoutBtn.classList.add('hidden');
    bell?.classList.add('hidden');
  }
}

async function loadAdvertisingCount(){
  const badge=document.getElementById('advertisingCount');
  if(!badge||!sb)return;

  let result=await sb
    .from('advertising_enquiries')
    .select('id',{count:'exact',head:true})
    .is('handled_at',null);

  // Keep the admin usable until the handled_at database migration has been run.
  if(result.error){
    result=await sb
      .from('advertising_enquiries')
      .select('id',{count:'exact',head:true});
  }

  const{count,error}=result;
  if(error){
    badge.textContent='!';
    badge.classList.remove('zero');
    return;
  }

  const n=Number(count||0);
  badge.textContent=n>99?'99+':String(n);
  badge.classList.toggle('zero',n===0);
  const bell=document.getElementById('advertisingBell');
  if(bell)bell.setAttribute('aria-label',`${n} advertising ${n===1?'enquiry':'enquiries'} awaiting review`);
}

document.getElementById('loginBtn')?.addEventListener('click',async()=>{
  const email=document.getElementById('email').value.trim(),password=document.getElementById('password').value;
  show('loginStatus','Signing in…');
  const{error}=await sb.auth.signInWithPassword({email,password});
  show('loginStatus',error?error.message:'Signed in.',!!error);
});

logoutBtn?.addEventListener('click',()=>sb.auth.signOut());
document.getElementById('saveBtn')?.addEventListener('click',saveStory);
document.getElementById('resetBtn')?.addEventListener('click',()=>resetForm(true));

function bindDraftAutosave(){
  DRAFT_FIELDS.forEach(id=>{
    const el=document.getElementById(id);
    if(!el)return;
    el.addEventListener('input',saveDraft);
    el.addEventListener('change',saveDraft);
  });

  window.addEventListener('beforeunload',saveDraft);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)saveDraft();
  });
}

function saveDraft(){
  if(!admin||admin.classList.contains('hidden'))return;

  const draft={
    editingId,
    values:{},
    savedAt:new Date().toISOString()
  };

  DRAFT_FIELDS.forEach(id=>{
    const el=document.getElementById(id);
    if(el)draft.values[id]=el.value;
  });

  try{
    localStorage.setItem(DRAFT_KEY,JSON.stringify(draft));
  }catch(_e){}
}

function restoreDraftOrReset(){
  let draft=null;

  try{
    draft=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');
  }catch(_e){}

  if(draft?.values){
    editingId=draft.editingId||null;

    DRAFT_FIELDS.forEach(id=>{
      if(Object.prototype.hasOwnProperty.call(draft.values,id)){
        setv(id,draft.values[id]);
      }
    });

    const t=document.getElementById('formTitle');
    if(t)t.textContent=editingId?'Edit story':'Create story';

    show('saveStatus','Unfinished draft restored.');
  }else{
    resetForm(false);
  }
}

function clearDraft(){
  try{
    localStorage.removeItem(DRAFT_KEY);
  }catch(_e){}
}

async function saveStory(){
  const title=v('title');

  if(!title){
    return show('saveStatus','Headline is required.',true);
  }

  show('saveStatus','Saving…');

  let image_url=v('imageUrl');
  const file=document.getElementById('imageFile').files[0];

  if(file){
    const ext=file.name.split('.').pop();
    const path=`${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const{error:upErr}=await sb.storage
      .from('post-images')
      .upload(path,file,{upsert:false});

    if(upErr){
      return show('saveStatus','Image upload failed: '+upErr.message,true);
    }

    image_url=sb.storage
      .from('post-images')
      .getPublicUrl(path).data.publicUrl;
  }

  const payload={
    type:v('type'),
    status:v('status'),
    title,
    summary:v('summary'),
    body:v('body'),
    image_url,
    featured:v('featured')==='true',
    published_at:v('publishedAt')
      ?new Date(v('publishedAt')).toISOString()
      :new Date().toISOString(),
    updated_at:new Date().toISOString()
  };

  const q=editingId
    ?sb.from('posts').update(payload).eq('id',editingId)
    :sb.from('posts').insert(payload);

  const{error}=await q;

  if(error){
    return show('saveStatus',error.message,true);
  }

  clearDraft();

  show(
    'saveStatus',
    editingId?'Story updated.':'Story published.'
  );

  resetForm(false);
  loadStories();
}

async function loadStories(){
  const{data,error}=await sb
    .from('posts')
    .select('*')
    .order('published_at',{ascending:false});

  const list=document.getElementById('storyList');

  if(error){
    list.innerHTML='<div class="status">'+esc(error.message)+'</div>';
    return;
  }

  if(!data?.length){
    list.innerHTML='<div class="status">No stories yet.</div>';
    return;
  }

  list.innerHTML=data.map(p=>`
    <div class="item">
      <div>
        ${p.image_url?`<img class="preview-img" src="${esc(p.image_url)}">`:''}
        <div class="meta">
          ${esc(p.type)} • ${esc(p.status)} •
          ${new Date(p.published_at).toLocaleString('en-GB')}
        </div>
        <h3>${esc(p.title)}</h3>
        <div>${esc(p.summary||'')}</div>
      </div>

      <div class="actions">
        <button class="btn dark" onclick="editStory('${p.id}')">
          Edit
        </button>

        <button class="btn red" onclick="deleteStory('${p.id}')">
          Delete
        </button>
      </div>
    </div>
  `).join('');
}

window.editStory=async id=>{
  const{data,error}=await sb
    .from('posts')
    .select('*')
    .eq('id',id)
    .single();

  if(error)return alert(error.message);

  editingId=id;

  setv('type',data.type);
  setv('status',data.status);
  setv('title',data.title);
  setv('summary',data.summary||'');
  setv('body',data.body||'');
  setv('imageUrl',data.image_url||'');
  setv('featured',String(!!data.featured));
  setv('publishedAt',toLocal(data.published_at));

  document.getElementById('formTitle').textContent='Edit story';

  saveDraft();

  scrollTo({top:0,behavior:'smooth'});
};

window.deleteStory=async id=>{
  if(!confirm('Delete this story?'))return;

  const{error}=await sb
    .from('posts')
    .delete()
    .eq('id',id);

  if(error){
    alert(error.message);
  }else{
    loadStories();
  }
};

function resetForm(clearStored=false){
  editingId=null;

  ['title','summary','body','imageUrl'].forEach(x=>setv(x,''));

  setv('type','News');
  setv('status','published');
  setv('featured','false');
  setv('publishedAt',toLocal(new Date().toISOString()));

  const f=document.getElementById('imageFile');
  if(f)f.value='';

  const t=document.getElementById('formTitle');
  if(t)t.textContent='Create story';

  if(clearStored)clearDraft();
}

function v(id){
  return document.getElementById(id).value.trim();
}

function setv(id,val){
  const el=document.getElementById(id);
  if(el)el.value=val??'';
}

function show(id,msg,err=false){
  const el=document.getElementById(id);
  if(!el)return;

  el.textContent=msg;
  el.classList.remove('hidden');
  el.style.borderLeftColor=err?'#d9272e':'#f7c600';
}

function esc(v=''){
  return String(v).replace(
    /[&<>'"]/g,
    c=>({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      "'":'&#039;',
      '"':'&quot;'
    }[c])
  );
}

function toLocal(v){
  const d=new Date(v);
  d.setMinutes(d.getMinutes()-d.getTimezoneOffset());
  return d.toISOString().slice(0,16);
}
