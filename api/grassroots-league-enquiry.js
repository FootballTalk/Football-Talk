const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LIMITS = { leagueName: 120, contactName: 100, role: 80, email: 254, area: 120, season: 30, platform: 80, leagueUrl: 500, fixturesUrl: 500, tableUrl: 500, divisions: 1000, message: 2000 };
const REQUIRED = ['leagueName', 'contactName', 'role', 'email', 'area', 'season', 'platform', 'leagueUrl'];
function validUrl(value) { if (!value) return true; try { return new URL(value).protocol === 'https:'; } catch { return false; } }

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }); }
  const body = req.body || {};
  if (body.website) return res.status(200).json({ ok: true });
  const values = {};
  for (const [field, limit] of Object.entries(LIMITS)) {
    if (typeof body[field] !== 'string' || body[field].length > limit) return res.status(400).json({ error: 'Please check the form fields' });
    values[field] = body[field].trim();
  }
  if (REQUIRED.some(field => !values[field]) || !EMAIL_RE.test(values.email) ||
      !['FA Full-Time', 'League website or another provider', 'Not sure'].includes(values.platform) ||
      !['leagueUrl', 'fixturesUrl', 'tableUrl'].every(field => validUrl(values[field]))) {
    return res.status(400).json({ error: 'Please complete the required fields with valid links' });
  }
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.error('Grassroots league enquiry: RESEND_API_KEY is missing'); return res.status(503).json({ error: 'Enquiry service unavailable' }); }
  const lines = ['New Football Talk grassroots league enquiry', '',
    `League: ${values.leagueName}`, `Contact: ${values.contactName}`, `Role: ${values.role}`,
    `Email: ${values.email}`, `Area or County FA: ${values.area}`, `Season: ${values.season}`,
    `Platform: ${values.platform}`, `League page: ${values.leagueUrl}`,
    `Fixtures: ${values.fixturesUrl || 'Same league page / to follow'}`,
    `Table: ${values.tableUrl || 'Same league page / to follow'}`, '',
    'Divisions or clubs to start with:', values.divisions || 'Not supplied', '',
    'Other details:', values.message || 'Not supplied'];
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'Football Talk Grassroots <newsletter@footballtalk.uk>', to: ['Mark@footballtalk.uk'], reply_to: values.email,
        subject: `Grassroots league enquiry: ${values.leagueName.replace(/[\r\n]/g, ' ')}`, text: lines.join('\n') })
    });
    if (!response.ok) throw new Error(`Resend returned ${response.status}`);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Grassroots league enquiry delivery failed', error);
    return res.status(502).json({ error: 'Enquiry could not be delivered' });
  }
}
