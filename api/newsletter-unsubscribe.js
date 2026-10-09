import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const RESEND_API = 'https://api.resend.com';
function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
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
async function listResendContacts(key) {
  const all = [];
  let after = '';
  for (let page = 0; page < 100; page++) {
    const url = new URL(RESEND_API + '/contacts');
    url.searchParams.set('limit', '100');
    if (after) url.searchParams.set('after', after);
    const response = await fetch(url, { headers: { Authorization: 'Bearer ' + key }, cache: 'no-store' });
    if (!response.ok) throw new Error('Contact lookup failed (' + response.status + ')');
    const data = await response.json();
    const rows = Array.isArray(data.data) ? data.data : [];
    all.push(...rows.filter(contact => contact && contact.email));
    if (!data.has_more || !rows.length) return all;
    after = rows[rows.length - 1].id;
  }
  throw new Error('Contact list exceeded the safe lookup limit');
}
async function findContact(key, id, email) {
  if (id) {
    const response = await fetch(RESEND_API + '/contacts/' + encodeURIComponent(id), {
      headers: { Authorization: 'Bearer ' + key },
      cache: 'no-store'
    });
    if (response.ok) {
      const data = await response.json();
      const contact = data.data || data;
      if (contact.email) return contact;
    }
  }
  const contacts = await listResendContacts(key);
  return contacts.find(contact => (id && String(contact.id) === id) || (email && String(contact.email).toLowerCase() === email.toLowerCase())) || null;
}
async function unsubscribeResendContact(key, id) {
  const response = await fetch(RESEND_API + '/contacts/' + encodeURIComponent(id), {
    method: 'PATCH',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ unsubscribed: true })
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error('Resend unsubscribe failed (' + response.status + ')' + (detail ? ': ' + detail.slice(0, 160) : ''));
  }
}
async function markSupabaseUnsubscribed(email) {
  const config = siteConfig();
  const secret = String(process.env.CRON_SECRET || '').trim();
  if (!secret) throw new Error('Newsletter unsubscribe sync is not configured');
  const response = await fetch(config.url + '/rest/v1/rpc/ft_newsletter_mark_unsubscribed', {
    method: 'POST',
    headers: supabaseHeaders(config, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ p_secret: secret, p_email: email }),
    cache: 'no-store'
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error('Supabase unsubscribe sync failed (' + response.status + ')' + (detail ? ': ' + detail.slice(0, 160) : ''));
  }
}
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const key = String(process.env.RESEND_API_KEY || '').trim();
  if (!key) return res.status(503).json({ error: 'Email delivery is not configured' });
  if (req.method === 'GET') return res.status(200).json({ ok: true, configured: true });
  const id = String(req.query?.id || req.body?.id || '').trim();
  const requestedEmail = String(req.body?.email || '').trim().toLowerCase();
  if (!id && !validEmail(requestedEmail)) return res.status(400).json({ error: 'Subscriber reference or valid email is required' });
  try {
    const contact = await findContact(key, id, requestedEmail);
    if (id && !contact) return res.status(404).json({ error: 'Subscriber reference was not found' });
    if (contact && contact.id) await unsubscribeResendContact(key, contact.id);
    const email = String(contact?.email || requestedEmail).trim().toLowerCase();
    if (!validEmail(email)) return res.status(400).json({ error: 'Subscriber email could not be confirmed' });
    await markSupabaseUnsubscribed(email);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Newsletter unsubscribe error', error);
    return res.status(502).json({ error: 'Unable to unsubscribe right now' });
  }
}
