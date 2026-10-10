(() => {
  if (window.__FT_STORY_COMMENTS__) return;
  window.__FT_STORY_COMMENTS__ = true;
  const config = window.FT_CONFIG || {};
  const ready = Boolean(config.SUPABASE_URL && config.SUPABASE_ANON_KEY);
  const style = document.createElement('style');
  style.textContent = `
    .ft-comments{margin:34px 0 4px;padding-top:24px;border-top:2px solid #e7e7e7}
    .ft-comments h2{margin:0 0 6px;font-size:clamp(25px,4vw,32px)}
    .ft-comments-intro{margin:0 0 18px;color:#555;font-size:15px;line-height:1.5}
    .ft-comment-form{display:grid;gap:11px;background:#f5f5f5;border:1px solid #ddd;border-radius:14px;padding:18px;margin:0 0 22px}
    .ft-comment-form label{display:grid;gap:5px;font-size:14px;font-weight:800}
    .ft-comment-form input,.ft-comment-form textarea{box-sizing:border-box;width:100%;border:1px solid #bbb;border-radius:8px;padding:11px 12px;font:inherit;font-size:16px;background:#fff;color:#111}
    .ft-comment-form textarea{resize:vertical;min-height:110px}
    .ft-comment-form button{justify-self:start;border:0;border-radius:8px;background:#111;color:#f7c600;padding:12px 18px;font:inherit;font-weight:900;cursor:pointer}
    .ft-comment-form button:disabled{opacity:.6;cursor:wait}
    .ft-comment-privacy{margin:0;color:#555;font-size:13px;line-height:1.45}.ft-comment-privacy a{color:#111;font-weight:800;text-decoration-color:#f7c600;text-decoration-thickness:2px}
    .ft-comment-status{min-height:20px;margin:0;color:#555;font-size:14px}
    .ft-comment-list{display:grid;gap:12px}
    .ft-comment{border-left:4px solid #f7c600;background:#fff;padding:12px 15px;box-shadow:0 3px 12px rgba(0,0,0,.05)}
    .ft-comment-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px;margin:0 0 5px}
    .ft-comment-head strong{font-size:15px}.ft-comment-head time{color:#777;font-size:12px}
    .ft-comment-text{margin:0!important;font-size:15px!important;line-height:1.6!important;white-space:pre-wrap;overflow-wrap:anywhere}
    .ft-comment-empty{color:#666;font-size:15px}
    .ft-comment-trap{position:absolute!important;left:-10000px!important;width:1px!important;height:1px!important;overflow:hidden!important}
    `;
  document.head.appendChild(style);

  function slug(text) {
    return String(text || 'football-talk').toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100) || 'football-talk';
  }
  function endpoint() {
    return String(config.SUPABASE_URL || '').replace(/\/$/, '') + '/rest/v1/story_comments';
  }
  function headers(extra = {}) {
    return { apikey: config.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + config.SUPABASE_ANON_KEY, ...extra };
  }
  function createElement(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function getTarget() {
    const dynamic = document.getElementById('article-content');
    if (dynamic && dynamic.querySelector('h1')) {
      const title = dynamic.querySelector('h1').textContent.trim();
      return { host: dynamic, id: dynamic.dataset.storyId || 'post:' + slug(title) };
    }
    const article = document.querySelector('main article.article');
    if (article && article.querySelector('h1')) {
      return { host: article, id: location.pathname.split('/').pop() || 'index.html' };
    }
    return null;
  }
  function dateText(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('en-GB', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
  }
  async function loadComments(id, list, empty) {
    if (!ready) { empty.textContent = 'Comments are temporarily unavailable.'; return; }
    const params = new URLSearchParams({
      select: 'display_name,comment_text,created_at',
      story_id: 'eq.' + id,
      approved: 'eq.true',
      order: 'created_at.desc',
      limit: '30'
    });
    try {
      const response = await fetch(endpoint() + '?' + params.toString(), { headers: headers(), cache: 'no-store' });
      if (!response.ok) throw new Error('load failed');
      const rows = await response.json();
      list.replaceChildren();
      if (!rows.length) {
        empty.hidden = false;
        empty.textContent = 'No comments yet. Be the first to have your say.';
        return;
      }
      empty.hidden = true;
      rows.forEach(row => {
        const card = createElement('article', 'ft-comment');
        const head = createElement('p', 'ft-comment-head');
        head.append(createElement('strong', '', row.display_name || 'Football fan'));
        const time = createElement('time', '', dateText(row.created_at));
        if (row.created_at) time.dateTime = row.created_at;
        head.append(time);
        card.append(head, createElement('p', 'ft-comment-text', row.comment_text || ''));
        list.append(card);
      });
    } catch {
      empty.hidden = false;
      empty.textContent = 'Comments could not be loaded right now. Please try again later.';
    }
  }
  function mount() {
    const target = getTarget();
    if (!target || target.host.querySelector('.ft-comments')) return;
    const section = createElement('section', 'ft-comments');
    section.dataset.storyId = target.id;
    section.setAttribute('aria-labelledby', 'ft-comments-title');
    const heading = createElement('h2', '', 'Have your say');
    heading.id = 'ft-comments-title';
    section.append(heading, createElement('p', 'ft-comments-intro', 'Join the conversation. Keep it respectful and focused on the football.'));
    const form = createElement('form', 'ft-comment-form');
    form.setAttribute('aria-label', 'Post a comment');
    const nameLabel = createElement('label', '', 'Your name');
    const name = document.createElement('input');
    name.name = 'display_name'; name.type = 'text'; name.maxLength = 40; name.required = true; name.autocomplete = 'name'; name.placeholder = 'How should we credit you?';
    nameLabel.append(name);
    const commentLabel = createElement('label', '', 'Your comment');
    const comment = document.createElement('textarea');
    comment.name = 'comment_text'; comment.maxLength = 1000; comment.required = true; comment.rows = 4; comment.placeholder = 'Add your view to the discussion…';
    commentLabel.append(comment);
    const trapLabel = createElement('label', 'ft-comment-trap', 'Leave this field blank');
    const trap = document.createElement('input');
    trap.name = 'website'; trap.type = 'text'; trap.tabIndex = -1; trap.autocomplete = 'off';
    trapLabel.append(trap);
    const submit = createElement('button', '', 'Post comment');
    submit.type = 'submit';
    const privacyNote = createElement('p', 'ft-comment-privacy');
    privacyNote.append(document.createTextNode('Your name and comment will be visible publicly. See our '));
    const privacyLink = createElement('a', '', 'Privacy Policy');
    privacyLink.href = 'privacy.html';
    privacyNote.append(privacyLink, document.createTextNode('.'));
    form.append(nameLabel, commentLabel, privacyNote, trapLabel, submit);
    const status = createElement('p', 'ft-comment-status');
    status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    form.append(status);
    const list = createElement('div', 'ft-comment-list');
    list.setAttribute('aria-label', 'Comments');
    const empty = createElement('p', 'ft-comment-empty', 'Loading comments…');
    section.append(form, list, empty);
    target.host.append(section);
    loadComments(target.id, list, empty);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (trap.value) return;
      const displayName = name.value.trim().slice(0, 40);
      const commentText = comment.value.trim().slice(0, 1000);
      if (!displayName || !commentText) return;
      if (!ready) { status.textContent = 'Comments are temporarily unavailable.'; return; }
      const cooldownKey = 'ft-comment-last:' + target.id;
      const last = Number(localStorage.getItem(cooldownKey) || 0);
      if (Date.now() - last < 30000) { status.textContent = 'Please wait a moment before posting another comment.'; return; }
      submit.disabled = true; status.textContent = 'Posting your comment…';
      try {
        const response = await fetch(endpoint(), {
          method: 'POST',
          headers: headers({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
          body: JSON.stringify({ story_id: target.id, display_name: displayName, comment_text: commentText, approved: true })
        });
        if (!response.ok) throw new Error('submit failed');
        localStorage.setItem(cooldownKey, String(Date.now()));
        form.reset();
        status.textContent = 'Thanks — your comment is now live.';
        await loadComments(target.id, list, empty);
      } catch {
        status.textContent = 'We could not post your comment just now. Please try again.';
      } finally {
        submit.disabled = false;
      }
    });
  }
  function start() {
    mount();
    const observer = new MutationObserver(mount);
    observer.observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();