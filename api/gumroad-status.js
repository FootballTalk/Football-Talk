export default function handler(req, res) {
  const ready = !!process.env.GUMROAD_ACCESS_TOKEN;
  res.status(ready ? 200 : 503).json({ ok: ready, gumroadConfigured: ready });
}
