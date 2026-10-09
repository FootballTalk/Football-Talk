import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const RESEND_API = 'https://api.resend.com';
const SITE_URL = 'https://www.footballtalk.uk/';
const TIME_ZONE = 'Europe/London';

function londonParts(date = new Date()) {
  return Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false
  }).formatToParts(date).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
}
function londonDate(date = new Date()) {
  const p = londonParts(date);
  return p.year + '-' + p.month + '-' + p.day;
}
function isFridayNineLondon(date = new Date()) {
  const p = londonParts(date);
  return p.weekday === 'Fri' && Number(p.hour) === 9;
}
function londonStamp(date = new Date()) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}
function addDays(dateKey, count) {
  const date = new Date(dateKey + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
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
async function supabaseRpc(config, name, body) {
  const response = await fetch(config.url + '/rest/v1/rpc/' + name, {
    method: 'POST',
    headers: supabaseHeaders(config, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
    cache: 'no-store'
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error('Subscriber service failed (' + response.status + ')' + (detail ? ': ' + detail.slice(0, 180) : ''));
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
    if (!response.ok) throw new Error('Resend contact reconciliation failed (' + response.status + ')');
    const data = await response.json();
    const rows = Array.isArray(data.data) ? data.data : [];
    all.push(...rows.filter(contact => contact && contact.email));
    if (!data.has_more || !rows.length) return all;
    after = rows[rows.length - 1].id;
  }
  throw new Error('Resend contact list exceeded the safe reconciliation limit');
}
async function siteJson(path, label) {
  const response = await fetch(new URL(path, SITE_URL), {
    headers: { 'User-Agent': 'FootballTalk Weekly Newsletter/1.0 (+https://www.footballtalk.uk)' },
    cache: 'no-store'
  });
  if (!response.ok) throw new Error(label + ' is unavailable (' + response.status + ')');
  return response.json();
}
function formatDate(dateKey) {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(dateKey + 'T12:00:00Z'));
}
function fixtureMoment(fixture) {
  const timestamp = Number(fixture.timestamp || 0);
  if (timestamp > 0) return new Date(timestamp * 1000);
  return fixture.date ? new Date(fixture.date) : null;
}
function buildFixtures(data, now = new Date()) {
  const start = londonDate(now);
  const end = addDays(start, 3);
  return (data.leagues || []).flatMap(league => (league.fixtures || []).map(fixture => ({ league: league.name, fixture })))
    .map(item => {
      const date = fixtureMoment(item.fixture);
      if (!date || Number.isNaN(date.getTime())) return null;
      return { league: item.league, fixture: item.fixture, moment: date, dateKey: londonDate(date) };
    })
    .filter(item => item && item.dateKey >= start && item.dateKey <= end && item.moment.getTime() >= now.getTime() - 60 * 60 * 1000)
    .filter(item => !['FT', 'AET', 'PEN'].includes(String(item.fixture.status || '').toUpperCase()))
    .sort((a, b) => a.moment - b.moment);
}
async function edition(now = new Date()) {
  const [newsData, fixturesData] = await Promise.all([
    siteJson('api/news', 'Current news'),
    siteJson('api/fixtures', 'Weekend fixtures')
  ]);
  const allNews = Array.isArray(newsData.items) ? newsData.items : [];
  if (!allNews.length) throw new Error('No current football stories are available');
  const news = allNews.filter(item => item.type !== 'TRANSFER').slice(0, 4);
  const mainStories = news.length ? news : allNews.slice(0, 4);
  const transfers = allNews.filter(item => item.type === 'TRANSFER' && item.stage !== 'GOSSIP').slice(0, 3);
  return {
    dateKey: londonDate(now),
    dateLabel: londonStamp(now),
    stories: mainStories,
    transfers,
    fixtures: buildFixtures(fixturesData, now),
    debate: mainStories[0] || allNews[0] || null
  };
}
function storyCards(items, category) {
  if (!items.length) return '';
  const destination = category === 'TRANSFERS' ? SITE_URL + 'section.html?view=transfers' : SITE_URL + 'section.html?view=latest';
  return items.map(item => '<div style="border-top:1px solid #dedede;padding:16px 0"><p style="font-size:10px;font-weight:900;letter-spacing:1px;color:#8a6d00;margin:0 0 6px">' + category + '</p><h3 style="font-size:18px;line-height:1.3;margin:0 0 9px">' + escapeHtml(item.title) + '</h3><a href="' + destination + '" style="color:#806400;font-weight:900;text-decoration:none">READ THE LATEST ON FOOTBALL TALK →</a></div>').join('');
}
function fixtureCards(items) {
  if (!items.length) return '<p style="font-size:14px;line-height:1.6;color:#555">Check the Match Centre for the latest confirmed fixtures and kick-off times.</p>';
  return items.slice(0, 12).map(item => {
    const f = item.fixture;
    const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TIME_ZONE }).format(item.moment);
    const line = formatDate(item.dateKey) + ' · ' + time + ' — ' + (f.home || 'Home') + ' v ' + (f.away || 'Away');
    return '<div style="border-top:1px solid #dedede;padding:12px 0"><strong>' + escapeHtml(line) + '</strong><div style="font-size:12px;color:#666;margin-top:4px">' + escapeHtml(item.league || 'Football') + '</div></div>';
  }).join('');
}
function html(content, unsubscribeUrl) {
  const debate = content.debate ? (content.debate.debatePrompt || (String(content.debate.title || '').replace(/[?.!]+$/, '') + ' — what is your verdict?')) : 'Which story has caught your eye this week?';
  return '<!doctype html><html><body style="margin:0;background:#f3f3f3;font-family:Arial,sans-serif;color:#111"><div style="max-width:640px;margin:auto;background:#fff"><div style="background:#0b0b0e;color:#fff;padding:26px;border-bottom:6px solid #f7c600"><div style="font-size:25px;font-weight:900"><span style="color:#f7c600">FT</span> FOOTBALL TALK</div><div style="font-size:11px;letter-spacing:1.4px;color:#ccc">WHERE FANS HAVE THEIR SAY</div></div><div style="padding:28px 25px"><p style="font-size:12px;font-weight:900;color:#8a6d00;letter-spacing:1px;margin:0 0 9px">FOOTBALL TALK WEEKLY · ' + escapeHtml(content.dateLabel.toUpperCase()) + '</p><h1 style="font-size:34px;line-height:1.05;margin:8px 0 14px">YOUR WEEK IN FOOTBALL.</h1><p style="font-size:16px;line-height:1.6;color:#444">The latest stories, transfer updates and weekend fixtures from Football Talk.</p><h2 style="font-size:21px;margin:28px 0 6px">THE BIG STORIES</h2>' + storyCards(content.stories, 'LATEST NEWS') + (content.transfers.length ? '<h2 style="font-size:21px;margin:28px 0 6px">TRANSFER TALK</h2>' + storyCards(content.transfers, 'TRANSFER CENTRE') : '') + '<div style="margin:28px 0;padding:19px;background:#111;color:#fff;border-left:5px solid #f7c600"><p style="font-size:11px;font-weight:900;letter-spacing:1px;color:#f7c600;margin:0 0 8px">THE BIG DEBATE</p><p style="font-size:18px;line-height:1.45;font-weight:800;margin:0 0 13px">' + escapeHtml(debate) + '</p><a href="' + SITE_URL + 'section.html?view=latest" style="color:#f7c600;font-weight:900;text-decoration:none">HAVE YOUR SAY ON FOOTBALL TALK →</a></div><h2 style="font-size:21px;margin:28px 0 6px">WEEKEND AHEAD</h2>' + fixtureCards(content.fixtures) + '<div style="display:flex;flex-wrap:wrap;gap:10px;margin:24px 0"><a href="' + SITE_URL + 'match-centre.html" style="background:#f7c600;color:#111;text-decoration:none;font-weight:900;padding:12px 15px;border-radius:5px">MATCH CENTRE →</a><a href="' + SITE_URL + 'tv-guide.html" style="background:#111;color:#fff;text-decoration:none;font-weight:900;padding:12px 15px;border-radius:5px">WEEKEND TV GUIDE →</a><a href="' + SITE_URL + 'ref-watch.html" style="background:#eee;color:#111;text-decoration:none;font-weight:900;padding:12px 15px;border-radius:5px">REF WATCH →</a></div><p style="margin:26px 0 16px"><a href="' + SITE_URL + '" style="background:#f7c600;color:#111;text-decoration:none;font-weight:900;padding:14px 19px;border-radius:6px;display:inline-block">VISIT FOOTBALL TALK →</a></p><p style="font-size:12px;color:#777;line-height:1.5">You are receiving Football Talk Weekly because you subscribed on FootballTalk.uk. <a href="' + unsubscribeUrl + '">Unsubscribe</a>.</p></div><div style="background:#111;color:#aaa;padding:20px 25px;font-size:12px">FootballTalk.uk · Where Fans Have Their Say</div></div></body></html>';
}
function plainText(content, unsubscribeUrl) {
  const lines = ['FOOTBALL TALK WEEKLY · ' + content.dateLabel.toUpperCase(), '', 'YOUR WEEK IN FOOTBALL', '', 'THE BIG STORIES'];
  for (const item of content.stories) lines.push('- ' + item.title);
  if (content.transfers.length) {
    lines.push('', 'TRANSFER TALK');
    for (const item of content.transfers) lines.push('- ' + item.title);
  }
  lines.push('', 'THE BIG DEBATE', content.debate ? (content.debate.debatePrompt || content.debate.title) : 'Which story has caught your eye this week?');
  lines.push('', 'WEEKEND AHEAD');
  for (const item of content.fixtures.slice(0, 12)) {
    const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TIME_ZONE }).format(item.moment);
    lines.push('- ' + formatDate(item.dateKey) + ' ' + time + ' — ' + item.fixture.home + ' v ' + item.fixture.away + ' (' + item.league + ')');
  }
  lines.push('', 'Match Centre: ' + SITE_URL + 'match-centre.html', 'Weekend TV Guide: ' + SITE_URL + 'tv-guide.html', 'Ref Watch: ' + SITE_URL + 'ref-watch.html', '', 'Visit Football Talk: ' + SITE_URL, '', 'Unsubscribe: ' + unsubscribeUrl);
  return lines.join('\n');
}
async function syncResendContacts(key) {
  const contacts = await listResendContacts(key);
  return new Map(contacts.map(contact => [String(contact.email).toLowerCase(), contact]));
}
async function ensureResendContact(key, email, contactMap) {
  let contact = contactMap.get(email.toLowerCase());
  if (contact && contact.id && !contact.unsubscribed) return contact;
  if (contact && contact.unsubscribed) throw new Error('An active database subscriber is marked unsubscribed in Resend');
  const create = await fetch(RESEND_API + '/contacts', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, unsubscribed: false })
  });
  if (create.ok) {
    const data = await create.json().catch(() => ({}));
    contact = data.data || data;
    if (contact.id) {
      contactMap.set(email.toLowerCase(), contact);
      return contact;
    }
  }
  if (create.status === 409) {
    const refreshed = await syncResendContacts(key);
    const found = refreshed.get(email.toLowerCase());
    if (found && found.id && !found.unsubscribed) {
      contactMap.set(email.toLowerCase(), found);
      return found;
    }
  }
  const detail = await create.text().catch(() => '');
  throw new Error('Could not sync a subscribed address to Resend' + (detail ? ': ' + detail.slice(0, 160) : ''));
}
async function prepare(now, secret, resendKey, dryRun) {
  const config = siteConfig();
  const contacts = await listResendContacts(resendKey);
  const unsubscribedEmails = contacts.filter(contact => contact.unsubscribed === true).map(contact => String(contact.email).trim().toLowerCase()).filter(Boolean);
  const reconciled = await supabaseRpc(config, 'ft_newsletter_reconcile_unsubscribed', { p_secret: secret, p_emails: unsubscribedEmails });
  const active = await supabaseRpc(config, 'ft_newsletter_list_active', { p_secret: secret });
  const recipients = Array.isArray(active) ? active.filter(item => item.email && item.id) : [];
  const content = await edition(now);
  const contactMap = new Map(contacts.map(contact => [String(contact.email).toLowerCase(), contact]));
  const missingContacts = recipients.filter(item => !contactMap.has(String(item.email).toLowerCase())).length;
  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      activeSubscribers: recipients.length,
      resendContacts: contacts.length,
      resendUnsubscribed: unsubscribedEmails.length,
      reconciled: Number(reconciled) || 0,
      missingResendContacts: missingContacts,
      storyCount: content.stories.length,
      transferCount: content.transfers.length,
      fixtureCount: content.fixtures.length,
      sendReady: recipients.length > 0 && content.stories.length > 0
    };
  }
  for (const recipient of recipients) {
    const email = String(recipient.email).trim().toLowerCase();
    const contact = await ensureResendContact(resendKey, email, contactMap);
    recipient.email = email;
    recipient.resendContactId = contact.id;
  }
  return { ok: true, recipients, content, reconciled: Number(reconciled) || 0 };
}
async function sendBatches(resendKey, recipients, content) {
  let sent = 0;
  let failed = 0;
  for (let offset = 0; offset < recipients.length; offset += 100) {
    const batch = recipients.slice(offset, offset + 100);
    const batchNumber = Math.floor(offset / 100);
    const messages = batch.map(recipient => {
      const unsubscribeUrl = SITE_URL + 'unsubscribe.html?id=' + encodeURIComponent(recipient.resendContactId);
      return {
        from: 'Football Talk Weekly <newsletter@footballtalk.uk>',
        to: [recipient.email],
        reply_to: 'Mark@footballtalk.uk',
        subject: 'Football Talk Weekly — ' + content.dateLabel,
        html: html(content, unsubscribeUrl),
        text: plainText(content, unsubscribeUrl),
        headers: {
          'List-Unsubscribe': '<' + SITE_URL + 'api/newsletter-unsubscribe?id=' + encodeURIComponent(recipient.resendContactId) + '>',
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
        }
      };
    });
    const response = await fetch(RESEND_API + '/emails/batch', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + resendKey,
        'Content-Type': 'application/json',
        'Idempotency-Key': 'football-talk-weekly-' + content.dateKey + '-' + batchNumber
      },
      body: JSON.stringify(messages)
    });
    if (response.ok) sent += batch.length;
    else failed += batch.length;
  }
  return { sent, failed };
}
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const secret = String(process.env.CRON_SECRET || '').trim();
  const dryRun = String(req.query?.dryRun || '') === '1';
  if (!secret) return res.status(503).json({ error: 'Newsletter schedule is not configured' });
  if (!(dryRun && process.env.VERCEL_ENV === 'preview') && req.headers.authorization !== 'Bearer ' + secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const isCron = String(req.headers['user-agent'] || '').toLowerCase().includes('vercel-cron');
  if (!dryRun && isCron && !isFridayNineLondon()) {
    return res.status(200).json({ ok: true, sent: 0, skipped: true, reason: 'Waiting for Friday 09:00 Europe/London' });
  }

  const resendKey = String(process.env.RESEND_API_KEY || '').trim();
  if (!resendKey) return res.status(503).json({ error: 'Email delivery is not configured' });
  try {
    const prepared = await prepare(new Date(), secret, resendKey, dryRun);
    if (dryRun) return res.status(prepared.sendReady ? 200 : 503).json(prepared);
    if (!prepared.recipients.length) return res.status(200).json({ ok: true, sent: 0, skipped: true, reason: 'No active subscribers' });
    const result = await sendBatches(resendKey, prepared.recipients, prepared.content);
    return res.status(result.failed ? 207 : 200).json({
      ok: result.failed === 0,
      recipients: prepared.recipients.length,
      sent: result.sent,
      failed: result.failed,
      reconciledUnsubscribes: prepared.reconciled,
      editionDate: prepared.content.dateLabel
    });
  } catch (error) {
    console.error('Weekly newsletter error', error);
    return res.status(502).json({ error: 'Weekly newsletter failed', detail: String(error.message || error).slice(0, 180) });
  }
}
