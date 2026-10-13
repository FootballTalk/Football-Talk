const MODERATION_URL = 'https://api.openai.com/v1/moderations';
const MODERATION_MODEL = 'omni-moderation-latest';
const SUPABASE_URL = 'https://cwilgnubzfpmfvoldttm.supabase.co';

function send(res, status, payload) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.end(JSON.stringify(payload));
}

module.exports = async function moderateComment(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { error: 'Method not allowed.' });
  }

  const openAiKey = process.env.OPENAI_API_KEY;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!openAiKey || !supabaseKey) {
    return send(res, 503, { error: 'Comment checking is temporarily unavailable. Please try again later.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return send(res, 400, { error: 'Please check the comment details and try again.' });
  }

  const storyId = typeof body.story_id === 'string' ? body.story_id.trim() : '';
  const displayName = typeof body.display_name === 'string' ? body.display_name.trim() : '';
  const commentText = typeof body.comment_text === 'string' ? body.comment_text.trim() : '';
  if (!storyId || storyId.length > 200 || !displayName || displayName.length > 40 || !commentText || commentText.length > 1000 ||
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(displayName + commentText)) {
    return send(res, 400, { error: 'Please use a name up to 40 characters and a comment up to 1,000 characters.' });
  }

  try {
    const moderationResponse = await fetch(MODERATION_URL, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + openAiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODERATION_MODEL, input: commentText }),
      signal: AbortSignal.timeout(12000)
    });
    if (!moderationResponse.ok) {
      return send(res, 503, { error: 'Comment checking is temporarily unavailable. Please try again later.' });
    }

    const moderation = await moderationResponse.json();
    const result = moderation && Array.isArray(moderation.results) && moderation.results[0];
    if (!result) {
      return send(res, 503, { error: 'Comment checking is temporarily unavailable. Please try again later.' });
    }
    if (result.flagged) {
      return send(res, 422, { error: 'This comment may breach our community standards. Please revise it and try again.' });
    }

    const insertResponse = await fetch(SUPABASE_URL + '/rest/v1/story_comments', {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: 'Bearer ' + supabaseKey,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({
        story_id: storyId,
        display_name: displayName,
        comment_text: commentText,
        approved: true
      }),
      signal: AbortSignal.timeout(12000)
    });
    if (!insertResponse.ok) {
      return send(res, 503, { error: 'Your comment could not be posted right now. Please try again later.' });
    }
    return send(res, 201, { ok: true });
  } catch {
    return send(res, 503, { error: 'Comment checking is temporarily unavailable. Please try again later.' });
  }
};
