(() => {
  if (window.__FT_STORY_COMMENTS__) return;
  window.__FT_STORY_COMMENTS__ = true;
  const config = window.FT_CONFIG || {
    SUPABASE_URL: 'https://cwilgnubzfpmfvoldttm.supabase.co',
    SUPABASE_ANON_KEY: 'sb_publishable_GdbObU6cF2eh3wSQ6pz47A_gTgBDjvH'
  };
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
  const discussionPaths = new Set(['index.html','news.html','football-talk-story.html','football-talk-archive.html','fan-debate.html','fan-voice.html','fixtures.html','results.html','tables.html','tables-stats.html','top-scorers.html','match.html','match-centre.html','lineups.html','cups.html','european.html','womens-news.html','womens-transfers.html','womens-results.html','womens-tables.html','womens-tables-stats.html','womens-stats.html','womens-ref-watch.html','womens-match-centre.html','ref-watch.html','highlights.html','transfer-story.html','football-talk-analysis-coventry-newcastle-october-2026.html','football-talk-analysis-liverpool-man-city-october-2026.html','football-talk-analysis-premier-league-international-break.html','football-talk-club.html','football-talk-editorial-standards.html','football-talk-matchday-guide.html','football-talk-opinion-jordan-henderson-stole-weekend.html','football-talk-opinion-premier-league-stripped-titles.html','football-talk-ref-watch-explained.html','manchester-city-premier-league-verdict-2026.html','premier-league-table-tiebreakers-explained.html']);
  function pageKey() {
    const path = location.pathname.split('/').filter(Boolean).pop() || 'index.html';
    const params = [...new URLSearchParams(location.search).entries()].sort(([a],[b]) => a.localeCompare(b));
    return 'page:' + path + (params.length ? '?' + new URLSearchParams(params).toString() : '');
  }
  function pageIntro() {
    const path = location.pathname.split('/').filter(Boolean).pop() || 'index.html';
    if (/tables|stats|scorers/.test(path)) return 'Where do you think your club will finish? Use the standings or stats on this page to explain your view.';
    if (/fixtures|results|lineups|cups|european/.test(path)) return 'Which fixture, result or team selection matters most to your club? Tell other fans why.';
    if (/match/.test(path)) return 'What should fans take away from this match? Share your view and refer to the match details shown here.';
    if (/news|transfer|debate|section/.test(path)) return 'What is your take on this update? Separate confirmed information from speculation and explain your view.';
    if (/football-talk|premier-league-table/.test(path)) return 'What stood out to you in this Football Talk coverage? Add your perspective and keep it on the subject.';
    return 'Join the Football Talk conversation. Share your view and keep it focused on the football.';
  }
  function getTarget() {
    const path = location.pathname.split('/').filter(Boolean).pop() || 'index.html';
    const params = new URLSearchParams(location.search);
    const view = (params.get('view') || '').toLowerCase();
    if (!discussionPaths.has(path) && !(path === 'section.html' && ['latest','debate','transfers','matchday'].includes(view))) return null;
    if (path === 'fan-voice.html') return null;
    const dynamic = document.getElementById('article-content');
    if (dynamic && dynamic.querySelector('h1')) {
      const title = dynamic.querySelector('h1').textContent.trim();
      return { host: dynamic, id: dynamic.dataset.storyId || 'post:' + slug(title), intro: pageIntro() };
    }
    const article = document.querySelector('main article.article');
    if (article && article.querySelector('h1')) {
      return { host: article, id: article.dataset.storyId || pageKey(), intro: pageIntro() };
    }
    const main = document.querySelector('main');
    if (main && main.querySelector('h1')) return { host: main, id: pageKey(), intro: pageIntro() };
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
  function mountTarget(target) {
    if (!target || target.host.querySelector('.ft-comments')) return;
    const section = createElement('section', 'ft-comments');
    section.dataset.storyId = target.id;
    const headingId = 'ft-comments-title-' + slug(target.id);
    section.setAttribute('aria-labelledby', headingId);
    const heading = createElement('h2', '', 'Have your say');
    heading.id = headingId;
    section.append(heading, createElement('p', 'ft-comments-intro', target.intro));
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
    privacyNote.append(document.createTextNode('Comments are published immediately and visible to everyone. Keep it on topic; do not share personal information, abuse or spam. See our '));
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
  function mount() {
    const path = location.pathname.split('/').filter(Boolean).pop() || 'index.html';
    if (path === 'fan-voice.html') {
      document.querySelectorAll('main article.ft-editorial[data-discussion-id]').forEach(article => {
        mountTarget({ host: article, id: 'fan-voice:' + article.dataset.discussionId, intro: 'Join this specific debate. Share your opinion below and see what other fans think.' });
      });
      return;
    }
    mountTarget(getTarget());
  }
  function start() {
    mount();
    const observer = new MutationObserver(mount);
    observer.observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();