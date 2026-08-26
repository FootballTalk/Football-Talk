(function(){
  const cfg=window.FT_CONFIG||{};
  const mount=document.getElementById('debate-posts');
  if(!mount||!cfg.SUPABASE_URL||!cfg.SUPABASE_ANON_KEY)return;

  const headers={apikey:cfg.SUPABASE_ANON_KEY,Authorization:`Bearer ${cfg.SUPABASE_ANON_KEY}`};
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const keyFor=title=>'debate-comments:'+String(title||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,110);
  const makeId=()=>`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
  const relativeTime=iso=>{
    const d=new Date(iso); if(Number.isNaN(d.getTime()))return'';
    const s=Math.max(1,Math.floor((Date.now()-d.getTime())/1000));
    if(s<60)return'just now'; if(s<3600)return`${Math.floor(s/60)}m ago`; if(s<86400)return`${Math.floor(s/3600)}h ago`; if(s<604800)return`${Math.floor(s/86400)}d ago`;
    return d.toLocaleDateString('en-GB',{day:'numeric',month:'short'});
  };

  function addStyles(){
    if(document.getElementById('ft-debate-comments-style'))return;
    const s=document.createElement('style'); s.id='ft-debate-comments-style'; s.textContent=`
      .ft-comments{border-top:2px solid #111;margin-top:18px;padding-top:14px}
      .ft-comments-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}
      .ft-comments-head strong{font-size:15px}.ft-comment-toggle{border:0;background:#111;color:#fff;font-weight:900;padding:9px 12px;cursor:pointer}
      .ft-comment-panel[hidden]{display:none}.ft-comment-form,.ft-reply-form{display:grid;gap:8px;margin:10px 0 14px}
      .ft-comment-form input,.ft-comment-form textarea,.ft-reply-form input,.ft-reply-form textarea{width:100%;border:2px solid #bbb;background:#fff;padding:10px;font:inherit;border-radius:0}
      .ft-comment-form textarea,.ft-reply-form textarea{resize:vertical;min-height:76px}
      .ft-comment-actions{display:flex;justify-content:flex-end;gap:8px}.ft-comment-submit,.ft-reply-submit{border:0;background:#f7c600;color:#111;font-weight:1000;padding:10px 15px;cursor:pointer}
      .ft-comment-status{font-size:12px;color:#555;min-height:16px}.ft-comment-list{display:grid;gap:10px}
      .ft-comment{background:#f6f6f6;border-left:5px solid #f7c600;padding:11px 12px}.ft-comment.reply{margin-left:24px;border-left-color:#111;background:#fff}
      .ft-comment-top{display:flex;justify-content:space-between;gap:10px;align-items:center}.ft-comment-name{font-weight:900}.ft-comment-time{font-size:11px;color:#777;white-space:nowrap}
      .ft-comment-text{margin:7px 0 8px;white-space:pre-wrap;line-height:1.4}.ft-reply-button{border:0;background:none;padding:0;color:#111;font-weight:900;text-decoration:underline;cursor:pointer}
      .ft-empty-comments{font-size:13px;color:#666;padding:7px 0}.ft-comments-loading{font-size:13px;color:#666;padding:6px 0}
      @media(max-width:600px){.ft-comment.reply{margin-left:14px}.ft-comments-head{align-items:flex-start;flex-direction:column}.ft-comment-toggle{width:100%}}
    `; document.head.appendChild(s);
  }

  async function fetchComments(pollId){
    const url=`${cfg.SUPABASE_URL}/rest/v1/poll_responses?select=answer&poll_id=eq.${encodeURIComponent(pollId)}&limit=200`;
    const r=await fetch(url,{headers}); if(!r.ok)throw new Error('comments unavailable');
    const rows=await r.json();
    return rows.map(row=>{try{return JSON.parse(row.answer)}catch{return null}}).filter(x=>x&&x.kind==='debate-comment'&&x.id&&x.text).sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
  }

  async function saveComment(pollId,payload){
    const r=await fetch(`${cfg.SUPABASE_URL}/rest/v1/poll_responses`,{method:'POST',headers:{...headers,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({poll_id:pollId,answer:JSON.stringify(payload)})});
    if(!r.ok)throw new Error('comment submit failed');
  }

  function renderComments(listEl,comments,pollId,refresh){
    if(!comments.length){listEl.innerHTML='<div class="ft-empty-comments">No comments yet — be the first to have your say.</div>';return;}
    const roots=comments.filter(c=>!c.parentId);
    const repliesByParent=new Map();
    comments.filter(c=>c.parentId).forEach(c=>{if(!repliesByParent.has(c.parentId))repliesByParent.set(c.parentId,[]);repliesByParent.get(c.parentId).push(c)});
    const one=(c,isReply=false)=>`<div class="ft-comment${isReply?' reply':''}" data-comment-id="${esc(c.id)}"><div class="ft-comment-top"><span class="ft-comment-name">${esc(c.name||'Football fan')}</span><span class="ft-comment-time">${esc(relativeTime(c.createdAt))}</span></div><div class="ft-comment-text">${esc(c.text)}</div>${!isReply?`<button class="ft-reply-button" type="button">Reply</button><div class="ft-reply-slot"></div>`:''}</div>`;
    listEl.innerHTML=roots.map(root=>one(root)+((repliesByParent.get(root.id)||[]).map(r=>one(r,true)).join(''))).join('');
    listEl.querySelectorAll('.ft-reply-button').forEach(btn=>btn.addEventListener('click',()=>{
      const card=btn.closest('.ft-comment'); const slot=card.querySelector('.ft-reply-slot'); const parentId=card.dataset.commentId;
      if(slot.innerHTML){slot.innerHTML='';return;}
      slot.innerHTML=`<form class="ft-reply-form"><input name="name" maxlength="40" placeholder="Your name (optional)"><textarea name="text" maxlength="500" required placeholder="Write a reply…"></textarea><div class="ft-comment-actions"><button class="ft-reply-submit" type="submit">Post reply</button></div><div class="ft-comment-status" aria-live="polite"></div></form>`;
      const form=slot.querySelector('form'); form.addEventListener('submit',async e=>{e.preventDefault();const text=form.text.value.trim();if(!text)return;const button=form.querySelector('button');const status=form.querySelector('.ft-comment-status');button.disabled=true;button.textContent='Posting…';try{await saveComment(pollId,{kind:'debate-comment',id:makeId(),parentId,name:form.name.value.trim()||'Football fan',text,createdAt:new Date().toISOString()});slot.innerHTML='';await refresh();}catch{status.textContent='Could not post that reply just yet.';button.disabled=false;button.textContent='Post reply';}});
    }));
  }

  function enhanceCard(card){
    if(card.dataset.commentsReady==='1')return;
    const title=card.querySelector('h3')?.textContent?.trim(); if(!title)return;
    card.dataset.commentsReady='1'; const pollId=keyFor(title);
    const body=card.querySelector('.post-card-body')||card;
    const wrap=document.createElement('div'); wrap.className='ft-comments';
    wrap.innerHTML=`<div class="ft-comments-head"><strong>💬 Fan comments</strong><button class="ft-comment-toggle" type="button">View / add comments</button></div><div class="ft-comment-panel" hidden><form class="ft-comment-form"><input name="name" maxlength="40" placeholder="Your name (optional)"><textarea name="text" maxlength="500" required placeholder="Have your say…"></textarea><div class="ft-comment-actions"><button class="ft-comment-submit" type="submit">Post comment</button></div><div class="ft-comment-status" aria-live="polite"></div></form><div class="ft-comment-list"><div class="ft-comments-loading">Loading comments…</div></div></div>`;
    body.appendChild(wrap);
    const panel=wrap.querySelector('.ft-comment-panel'),toggle=wrap.querySelector('.ft-comment-toggle'),list=wrap.querySelector('.ft-comment-list'),form=wrap.querySelector('.ft-comment-form');
    let loaded=false;
    const refresh=async()=>{try{const comments=await fetchComments(pollId);renderComments(list,comments,pollId,refresh);toggle.textContent=comments.length?`Comments (${comments.length})`:'View / add comments';}catch{list.innerHTML='<div class="ft-empty-comments">Comments are temporarily unavailable.</div>';}};
    toggle.addEventListener('click',async()=>{panel.hidden=!panel.hidden;if(!panel.hidden&&!loaded){loaded=true;await refresh();}});
    form.addEventListener('submit',async e=>{e.preventDefault();const text=form.text.value.trim();if(!text)return;const button=form.querySelector('.ft-comment-submit'),status=form.querySelector('.ft-comment-status');button.disabled=true;button.textContent='Posting…';status.textContent='';try{await saveComment(pollId,{kind:'debate-comment',id:makeId(),parentId:null,name:form.name.value.trim()||'Football fan',text,createdAt:new Date().toISOString()});form.reset();status.textContent='Comment posted.';await refresh();}catch{status.textContent='Could not post your comment just yet. Please try again.';}finally{button.disabled=false;button.textContent='Post comment';}});
  }

  function scan(){mount.querySelectorAll('.post-card').forEach(enhanceCard)}
  addStyles();scan();new MutationObserver(scan).observe(mount,{childList:true,subtree:true});
})();
