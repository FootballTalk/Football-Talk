import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const RESEND_API = 'https://api.resend.com';
const CONSENT_TEXT = 'Yes, send me Football Talk news, community updates, competitions and occasional partner content by email. I can unsubscribe at any time.';

function validEmail(value) {
  if (typeof value !== 'string' || value.length > 254) return false;
  const parts = value.split('@');
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;
  if (!/^[^\s<>(),;:"[\]\\]+$/.test(local)) return false;
  if (!domain || domain.length > 253 || domain.includes('..')) return false;
  const labels = domain.split('.');
  return labels.length >= 2 && labels.every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label)) && labels[labels.length - 1].length >= 2;
}
function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}
function siteConfig() {
  const source = readFileSync(join(process.cwd(), 'config.js'), 'utf8');
  const url = (source.match(/SUPABASE_URL:\s*'([^']+)'/) || [])[1];
  const key = (source.match(/SUPABASE_ANON_KEY:\s*'([^']+)'/) || [])[1];
  if (!url || !key) throw new Error('Supabase site configuration is unavailable');
  return { url: url.replace(/\/$/, ''), key };
}
function supabaseHeaders(config, extra = {}) {
  return { apikey: config.key, Authorization: 'Bearer ' + config.key, ...extra };
}
function welcomeHtml(email) {
  return '<!doctype html><html><body style="margin:0;background:#f3f3f3;font-family:Arial,sans-serif;color:#111"><div style="max-width:620px;margin:auto;background:#fff"><div style="background:#0b0b0e;color:#fff;padding:26px;border-bottom:6px solid #f7c600"><div style="font-size:25px;font-weight:900"><span style="color:#f7c600">FT</span> FOOTBALL TALK</div><div style="font-size:11px;letter-spacing:1.4px;color:#ccc">WHERE FANS HAVE THEIR SAY</div></div><div style="padding:32px 26px"><p style="font-size:12px;font-weight:900;color:#8a6d00;letter-spacing:1px">FOOTBALL TALK WEEKLY</p><h1 style="font-size:34px;line-height:1.05;margin:8px 0 18px">WELCOME TO THE TEAM.</h1><p style="font-size:17px;line-height:1.65">You are now signed up for Football Talk Weekly — one email bringing you the biggest stories, weekend talking points, fixtures, Ref Watch, polls, competitions and Football Talk updates.</p><p style="font-size:17px;line-height:1.65">Your first weekly edition will arrive on Friday.</p><p style="margin:28px 0"><a href="https://www.footballtalk.uk/" style="background:#f7c600;color:#111;text-decoration:none;font-weight:900;padding:14px 19px;border-radius:6px;display:inline-block">VISIT FOOTBALL TALK →</a></p><p style="font-size:13px;color:#666;line-height:1.5">You signed up using ' + escapeHtml(email) + '. You can unsubscribe at any time from <a href="https://www.footballtalk.uk/unsubscribe.html">FootballTalk.uk</a>.</p></div><div style="background:#111;color:#aaa;padding:20px 26px;font-size:12px">FootballTalk.uk · Where Fans Have Their Say</div></div></body></html>';
}
async function signupInSupabase(config, email) {
  const response = await fetch(config.url + '/rest/v1/rpc/ft_newsletter_signup', {
    method: 'POST',
    headers: supabaseHeaders(config, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ p_email: email, p_consent_text: CONSENT_TEXT }),
    cache: 'no-store'
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error('Subscriber record could not be saved (' + response.status + ')' + (detail ? ': ' + detail.slice(0, 160) : ''));
  }
  return response.json();
}
async function listResendContacts(key) {
  const all = [];
  let after = '';
  for (let page = 0; page < 100; page++) {
    const url = new URL(RESEND_API + '/contacts');
    url.searchParams.set('limit', '100');
    if (after) url.searchParams.set('after', after);
    const response = await fetch(url, { headers: { Authorization: 'Bearer ' + key }, cache: 'no-store' });
    if (!response.ok) throw new Error('Resend contact lookup failed (' + response.status + ')');
    const data = await response.json();
    const rows = Array.isArray(data.data) ? data.data : [];
    all.push(...rows.filter(contact => contact && contact.email));
    if (!data.has_more || !rows.length) return all;
    after = rows[rows.length - 1].id;
  }
  throw new Error('Resend contact list exceeded the safe lookup limit');
}
async function syncResendContact(key, email) {
  const create = await fetch(RESEND_API + '/contacts', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, unsubscribed: false })
  });
  if (create.ok) return;
  if (create.status !== 409) {
    const detail = await create.text().catch(() => '');
    throw new Error('Resend contact could not be saved (' + create.status + ')' + (detail ? ': ' + detail.slice(0, 160) : ''));
  }
  const existing = (await listResendContacts(key)).find(contact => String(contact.email).toLowerCase() === email.toLowerCase());
  if (!existing || !existing.id) throw new Error('Existing Resend contact could not be located');
  const update = await fetch(RESEND_API + '/contacts/' + encodeURIComponent(existing.id), {
    method: 'PATCH',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ unsubscribed: false })
  });
  if (!update.ok) {
    const detail = await update.text().catch(() => '');
    throw new Error('Resend could not restore this confirmed subscription (' + update.status + ')' + (detail ? ': ' + detail.slice(0, 160) : ''));
  }
}
async function sendWelcome(key, email) {
  const response = await fetch(RESEND_API + '/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Football Talk Weekly <newsletter@footballtalk.uk>',
      to: [email],
      reply_to: 'Mark@footballtalk.uk',
      subject: 'Welcome to Football Talk Weekly ⚽',
      html: welcomeHtml(email),
      text: 'Welcome to Football Talk Weekly. You are signed up for the biggest stories, weekend talking points, fixtures, Ref Watch, polls, competitions and Football Talk updates. Your first weekly edition will arrive on Friday. Visit https://www.footballtalk.uk/ or unsubscribe at https://www.footballtalk.uk/unsubscribe.html'
    })
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error('Welcome email failed (' + response.status + ')' + (detail ? ': ' + detail.slice(0, 160) : ''));
  }
}
export default async function handler(req, res) {
  if (req.method === 'GET') return res.status(200).json({ ok: true, resendConfigured: Boolean(process.env.RESEND_API_KEY) });
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!validEmail(email) || req.body?.consent !== true) return res.status(400).json({ error: 'Valid email and consent are required' });
  const key = String(process.env.RESEND_API_KEY || '').trim();
  if (!key) return res.status(503).json({ error: 'Email delivery is not configured' });
  try {
    const config = siteConfig();
    const signup = await signupInSupabase(config, email);
    await syncResendContact(key, email);
    if (signup.welcome) await sendWelcome(key, email);
    return res.status(200).json({
      ok: true,
      alreadySubscribed: !signup.welcome,
      resubscribed: Boolean(signup.resubscribed)
    });
  } catch (error) {
    console.error('Newsletter subscribe error', error);
    return res.status(502).json({ error: 'Unable to complete newsletter signup right now' });
  }
}
