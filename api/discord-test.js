export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    return res.status(500).json({ ok: false, error: 'Discord webhook is not configured' });
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Football Talk',
        content: '⚽ **Football Talk Discord is LIVE!**\nWhere fans have their say.\nhttps://FootballTalk.uk'
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
