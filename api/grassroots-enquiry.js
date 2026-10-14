const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LIMITS = { clubName: 120, contactName: 100, role: 80, email: 254, leagueArea: 120, phone: 50, message: 2000 };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const body = req.body || {};
  if (body.website) return res.status(200).json({ ok: true }); // Honeypot for automated submissions.
  const values = {};
  for (const [field, limit] of Object.entries(LIMITS)) {
    if (typeof body[field] !== 'string' || body[field].length > limit) return res.status(400).json({ error: 'Please check the form fields' });
    values[field] = body[field].trim();
  }
  if (['clubName', 'contactName', 'role', 'email', 'leagueArea', 'message'].some(field => !values[field]) || !EMAIL_RE.test(values.email)) {
    return res.status(400).json({ error: 'Please complete the required fields' });
  }
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error('Grassroots enquiry: RESEND_API_KEY is missing');
    return res.status(503).json({ error: 'Enquiry service unavailable' });
  }
  const lines = [
    'New Football Talk grassroots club enquiry', '',
    `Club: ${values.clubName}`, `Contact: ${values.contactName}`, `Role: ${values.role}`,
    `Email: ${values.email}`, `Phone: ${values.phone || 'Not supplied'}`,
    `League or area: ${values.leagueArea}`, '', 'About the club:', values.message
  ];
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Football Talk Grassroots <newsletter@footballtalk.uk>',
        to: ['Mark@footballtalk.uk'],
        reply_to: values.email,
        subject: `Grassroots club enquiry: ${values.clubName.replace(/[\r\n]/g, ' ')}`,
        text: lines.join('\n')
      })
    });
    if (!response.ok) throw new Error(`Resend returned ${response.status}`);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Grassroots enquiry delivery failed', error);
    return res.status(502).json({ error: 'Enquiry could not be delivered' });
  }
}
