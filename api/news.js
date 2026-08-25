const FEEDS = [
  {
    url: 'https://feeds.bbci.co.uk/sport/football/rss.xml',
    source: 'BBC Sport'
  },
  {
    url: 'https://feeds.bbci.co.uk/sport/football/premier-league/rss.xml',
    source: 'BBC Sport'
  }
];

function decodeXml(text = '') {
  return String(text)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function tagValue(block, tag) {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? decodeXml(match[1]) : '';
}

function parseFeed(xml, source) {
  return [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map(match => {
    const block = match[0];
    const title = tagValue(block, 'title');
    const link = tagValue(block, 'link');
    const publishedRaw = tagValue(block, 'pubDate');
    const published = publishedRaw ? Date.parse(publishedRaw) : 0;
    return { title, link, published, source };
  }).filter(item => item.title);
}

function classify(title = '') {
  const lower = title.toLowerCase();
  const transferWords = [
    'transfer', 'sign', 'signing', 'joins', 'join ', 'deal', 'bid', 'move',
    'medical', 'talks', 'fee', 'target', 'loan', 'agrees', 'agreed', 'set to leave'
  ];
  return transferWords.some(word => lower.includes(word)) ? 'TRANSFER' : 'NEWS';
}

module.exports = async function handler(req, res) {
  try {
    const settled = await Promise.allSettled(FEEDS.map(async feed => {
      const response = await fetch(feed.url, {
        headers: { 'User-Agent': 'FootballTalk/1.0 (+https://vercel.app)' }
      });
      if (!response.ok) throw new Error(`Feed ${response.status}`);
      const xml = await response.text();
      return parseFeed(xml, feed.source);
    }));

    const combined = settled
      .filter(result => result.status === 'fulfilled')
      .flatMap(result => result.value)
      .sort((a, b) => b.published - a.published);

    const seen = new Set();
    const items = [];
    for (const item of combined) {
      const key = item.title.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        ...item,
        type: classify(item.title),
        publishedAt: item.published ? new Date(item.published).toISOString() : null
      });
      if (items.length >= 10) break;
    }

    res.setHeader('Cache-Control', 's-maxage=180, stale-while-revalidate=300');
    res.status(200).json({ updatedAt: new Date().toISOString(), items });
  } catch (error) {
    res.status(500).json({ error: 'Unable to load football news' });
  }
};
