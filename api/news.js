const FEEDS = [
  { url: 'https://feeds.bbci.co.uk/sport/football/rss.xml', source: 'BBC Sport' },
  { url: 'https://feeds.bbci.co.uk/sport/football/premier-league/rss.xml', source: 'BBC Sport' }
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

function classify(title = '', description = '') {
  const lower = `${title} ${description}`.toLowerCase();
  const transferWords = [
    'transfer', 'sign', 'signing', 'joins', 'join ', 'deal', 'bid', 'move',
    'medical', 'talks', 'fee', 'target', 'loan', 'agrees', 'agreed', 'set to leave',
    'interest', 'linked', 'offer', 'approach', 'wanted'
  ];
  return transferWords.some(word => lower.includes(word)) ? 'TRANSFER' : 'NEWS';
}

function transferStage(title = '', description = '') {
  const text = `${title} ${description}`.toLowerCase();
  const personalTermsOnly = text.includes('personal terms') && !text.includes('deal agreed') && !text.includes('agreement reached');
  if (!personalTermsOnly && [
    'has signed', 'have signed', 'signs for', 'signs from', 'completes signing', 'complete signing',
    'joins ', 'deal agreed', 'agree deal', 'agreed deal', 'agreement reached', 'club agreement reached',
    'set to sign after agreeing', 'medical completed and deal agreed'
  ].some(phrase => text.includes(phrase))) return 'ITS_A_GO';
  if ([
    'advanced talks', 'talks advanced', 'close to', 'closing in', 'set to', 'medical', 'finalising',
    'finalizing', 'bid accepted', 'offer accepted', 'verbal agreement'
  ].some(phrase => text.includes(phrase))) return 'DEVELOPING';
  return 'GOSSIP';
}

function debatePrompt(title = '', type = 'NEWS') {
  const cleanTitle = String(title).replace(/[?!.]+$/, '').trim();
  if (!cleanTitle) return '';
  if (type === 'TRANSFER') return `Would this be a good move? ${cleanTitle} — have your say.`;
  return `${cleanTitle} — what’s your verdict?`;
}

function parseFeed(xml, source) {
  return [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map(match => {
    const block = match[0];
    const title = tagValue(block, 'title');
    const link = tagValue(block, 'link');
    const description = tagValue(block, 'description');
    const publishedRaw = tagValue(block, 'pubDate');
    const published = publishedRaw ? Date.parse(publishedRaw) : 0;
    const type = classify(title, description);
    const stage = type === 'TRANSFER' ? transferStage(title, description) : null;
    return { title, link, description, published, source, type, stage };
  }).filter(item => item.title);
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
        publishedAt: item.published ? new Date(item.published).toISOString() : null,
        debatePrompt: debatePrompt(item.title, item.type)
      });
      if (items.length >= 20) break;
    }

    res.setHeader('Cache-Control', 's-maxage=180, stale-while-revalidate=300');
    res.status(200).json({ updatedAt: new Date().toISOString(), items });
  } catch (error) {
    res.status(500).json({ error: 'Unable to load football news' });
  }
};
