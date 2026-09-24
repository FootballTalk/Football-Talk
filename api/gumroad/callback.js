export default async function handler(req, res) {
  const { code, error } = req.query || {};

  if (error) {
    return res.status(400).send("Gumroad authorization was not completed.");
  }

  if (!code) {
    return res.status(200).send("Football Talk Gumroad callback is live.");
  }

  // OAuth token exchange will be enabled after the Gumroad application
  // credentials are stored securely as Vercel environment variables.
  return res.status(200).send(
    "Football Talk received the Gumroad authorization response. You can close this window and return to setup."
  );
}
