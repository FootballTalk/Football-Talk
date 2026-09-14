const SKY_AUTHOR = 'https://www.skysports.com/author/dermot-gallagher-648';
const SKY_ORIGIN = 'https://www.skysports.com';

function clean(text = '') {
  return String(text)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function absoluteSkyUrl(href = '') {
  if (!href) return '';
  try {
    const url = new URL(href, SKY_ORIGIN);
    return url.hostname.endsWith('skysports.com') ? url.toString() : '';
  } catch {
    return '';
  }
}

function articleCandidates(html = '') {
  const results = [];
  const seen = new Set();
  const hrefRe = /href=["']([^"']+)["']/gi;
  for (const match of html.matchAll(hrefRe)) {
    const href = absoluteSkyUrl(match[1]);
    if (!href || seen.has(href)) continue;
    if (!/\/football\/(?:video|news|live-blog)\//i.test(href)) continue;
    seen.add(href);
    results.push(href);
    if (results.length >= 30) break;
  }
  return results;
}

function extractSkyWidget(html = '') {
  const patterns = [
    /https:\/\/www\.skysports\.com\/iframe\/widget\/video\/([a-f0-9-]{20,})/i,
    /\/iframe\/widget\/video\/([a-f0-9-]{20,})/i,
    /iframe\/widget\/video\/([a-f0-9-]{20,})/i
  ];
  for (const pattern of patterns) {
    const m = html.match(pattern);
    if (m) return `https://www.skysports.com/iframe/widget/video/${m[1]}`;
  }
  return '';
}

function pageTitle(html = '') {
  const og = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
             html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i);
  if (og) return clean(og[1]);
  const title = html.match(/<title>([\s\S]*?)<\/title>/i);
  return title ? clean(title[1]).replace(/\s*\|\s*Sky Sports.*$/i, '') : 'Ref Watch';
}

function looksLikeRefWatch(html = '') {
  const text = clean(html).toLowerCase();
  return text.includes('ref watch') && text.includes('dermot gallagher');
}

async function getText(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'FootballTalk/1.0 (+https://footballtalk.uk)',
      'Accept-Language': 'en-GB,en;q=0.9'
    }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

module.exports = async function handler(req, res) {
  try {
    const authorHtml = await getText(SKY_AUTHOR);
    const candidates = articleCandidates(authorHtml);

    for (const href of candidates) {
      try {
        const html = await getText(href);
        if (!looksLikeRefWatch(html)) continue;
        const embedUrl = extractSkyWidget(html);
        if (!embedUrl) continue;
        const title = pageTitle(html);
        res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=21600');
        return res.status(200).json({
          available: true,
          provider: 'Sky Sports',
          title,
          embedUrl,
          articleUrl: href,
          rights: 'Video is streamed from Sky Sports. Football Talk does not host or re-upload the footage.'
        });
      } catch {}
    }

    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
    return res.status(200).json({ available: false, provider: 'Sky Sports' });
  } catch {
    return res.status(200).json({ available: false, provider: 'Sky Sports' });
  }
};
