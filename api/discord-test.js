import { timingSafeEqual } from 'node:crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  const testToken = process.env.DISCORD_TEST_TOKEN;
  if (!webhookUrl || !testToken) {
    return res.status(503).json({ ok: false, error: 'Discord test is unavailable' });
  }

  const supplied = req.headers.authorization?.replace(/^Bearer /, '') ?? '';
  const expected = Buffer.from(testToken);
  const actual = Buffer.from(supplied);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Football Talk',
        content: '⚽ Football Talk Discord webhook test — where fans have their say.'
      })
    });

    if (!response.ok) {
      return res.status(502).json({ ok: false, error: 'Discord rejected the webhook request' });
    }

    return res.status(200).json({ ok: true });
  } catch {
    return res.status(500).json({ ok: false, error: 'Unable to send Discord message' });
  }
}
