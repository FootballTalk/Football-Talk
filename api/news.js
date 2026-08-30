const FEEDS = [
  { url: 'https://feeds.bbci.co.uk/sport/football/rss.xml', source: 'BBC Sport' },
  { url: 'https://feeds.bbci.co.uk/sport/football/premier-league/rss.xml', source: 'BBC Sport' },
  { url: 'https://www.theguardian.com/football/rss', source: 'The Guardian' }
];

const PRIORITY_TERMS = [
  'premier league','championship','arsenal','aston villa','bournemouth','brentford','brighton','burnley','chelsea','crystal palace','everton','fulham','leeds','liverpool','manchester city','man city','manchester united','man utd','newcastle','nottingham forest','nottingham','sunderland','tottenham','west ham','wolves','wolverhampton',
  'birmingham','blackburn','bristol city','charlton','coventry','derby','hull','ipswich','leicester','middlesbrough','millwall','norwich','oxford united','portsmouth','preston','qpr','queens park rangers','sheffield united','sheffield wednesday','southampton','stoke','swansea','watford','west brom','wrexham'
];

const STOP_WORDS = new Set(['the','a','an','and','or','to','of','for','in','on','at','is','are','was','were','be','been','with','from','as','by','after','before','still','your','club','clubs','what','does','do','why','how','this','that','their','its','it']);

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

function attrValue(tag = '', attr = '') {
  const match = String(tag).match(new RegExp(`\\b${attr}=["']([^"']+)["']`, 'i'));
  return match ? decodeXml(match[1]) : '';
}

function imageFromBlock(block = '') {
  const tags = [
    ...(block.match(/<media:content\b[^>]*>/gi) || []),
    ...(block.match(/<media:thumbnail\b[^>]*>/gi) || []),
    ...(block.match(/<enclosure\b[^>]*>/gi) || [])
  ];
  for (const tag of tags) {
    const url = attrValue(tag, 'url');
    const type = attrValue(tag, 'type').toLowerCase();
    if (/^https:\/\//i.test(url) && (!type || type.startsWith('image/'))) return url;
  }
  const htmlImage = block.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i);
  if (htmlImage && /^https:\/\//i.test(htmlImage[1])) return decodeXml(htmlImage[1]);
  return '';
}

function classify(title = '', description = '') {
  const headline = String(title).toLowerCase().replace(/\s+/g, ' ').trim();
  const detail = String(description).toLowerCase().replace(/\s+/g, ' ').trim();

  const headlineTransferPatterns = [
    /\btransfer(?:s| news| update| latest| window)?\b/,
    /\bgossip\b/,
    /\b(?:signs|signed|joins|joined)\b/,
    /\bsign [a-z]/,
    /\b(?:loan|loaned)\b/,
    /\b(?:deal|deals)\b/,
    /\bbid\b/,
    /\bmedical\b/,
    /\bpersonal terms\b/,
    /\b(?:advanced |open )?talks? (?:with|over|for|to)\b/,
    /\bnegotiations?\b/,
    /\bset to (?:sign|join|leave|move)\b/,
    /\bclose to (?:signing|joining|leaving|a deal)\b/,
    /\b(?:sale|sold|sell|selling)\b/,
    /\b(?:move|switch) (?:to|from|for)\b/,
    /\bcompletes? .*\bmove\b/,
    /\bagree(?:d|s)? .*\b(?:deal|move|transfer)\b/
  ];
  if (headlineTransferPatterns.some(pattern => pattern.test(headline))) return 'TRANSFER';

  // Analysis, match coverage and player-rating pieces stay NEWS unless the headline
  // itself is explicitly about a transfer. This prevents incidental transfer wording
  // in long descriptions from polluting the Transfer Centre.
  if (/^(why|how)\b|\bplayer ratings?\b|\bmatch report\b|\bpreview\b|\bopinion\b|\blife after\b/.test(headline)) return 'NEWS';

  const detailTransferPatterns = [
    /\b(?:club|side|team) (?:want|wants|wanted|keen|interested) (?:to sign|in signing)\b/,
    /\b(?:show|shows|shown|expressed|have|has) interest in (?:signing|buying)\b/,
    /\binterest in [a-z][a-z .'-]{2,} (?:winger|striker|midfielder|defender|goalkeeper|forward)\b/,
    /\b(?:sign|signs|signed) (?:a |an )?(?:defender|midfielder|striker|winger|forward|goalkeeper|player)\b.*\bfrom\b/,
    /\b(?:join|joins|joined) [a-z][a-z .'-]{2,} (?:from|for|on)\b/,
    /\b(?:move|moves|moved|switch|switches|switched) (?:to|from) [a-z]/,
    /\bmove for [a-z][a-z .'-]{2,}\b/,
    /\bdeal (?:to sign|to sell|to buy|for|worth)\b/,
    /\bagree(?:d|s)? (?:a |an )?(?:£|€|\$|[0-9]|deal|fee)/,
    /\bfee (?:agreed|worth|of)\b/,
    /\bbid (?:accepted|rejected|submitted|made|for)\b/,
    /\boffer (?:accepted|rejected|submitted|made|for)\b/,
    /\b(?:buy|buying|bought|sell|selling|sold) [a-z][a-z .'-]{2,} (?:to|from|for)\b/,
    /\b(?:on loan|loan move|loan deal|season-long loan)\b/,
    /\bmedical (?:booked|scheduled|completed|underway|set)\b/,
    /\bpersonal terms\b/,
    /\b(?:advanced |open )?talks? (?:with|over|for|to sign|to buy)\b/,
    /\bnegotiations? (?:with|over|for|to sign|to buy)\b/,
    /\bset to (?:sign|join|leave|move)\b/,
    /\brelease clause\b/,
    /\bcontract offer\b/
  ];
  return detailTransferPatterns.some(pattern => pattern.test(detail)) ? 'TRANSFER' : 'NEWS';
}

function transferStage(title = '', description = '') {
  const headline = String(title).toLowerCase();
  const text = `${title} ${description}`.toLowerCase();
  const officialPatterns = [
    /\b(?:sign|signs|signed) [a-z]/,
    /\b(?:joins|joined)\b/,
    /\bcompletes? .*\bmove\b/,
    /\bcompleted .*\bmove\b/,
    /\bofficially (?:joins|signed)\b/,
    /\b(?:signing|move) confirmed\b/
  ];
  if (officialPatterns.some(pattern => pattern.test(headline)) || [
    'has signed', 'have signed', 'signs for', 'signs from', 'completes the signing',
    'completed the signing', 'complete the signing', 'signing confirmed', 'officially joins',
    'officially signed', 'announces signing', 'announce signing'
  ].some(phrase => text.includes(phrase))) return 'OFFICIAL';

  const personalTermsOnly = text.includes('personal terms') && !text.includes('deal agreed') && !text.includes('agreement reached') && !text.includes('clubs agreed');
  if (!personalTermsOnly && [
    'deal agreed', 'agree deal', 'agreed deal', 'agreement reached', 'club agreement reached',
    'clubs agreed', 'fee agreed', 'set to sign after agreeing', 'medical completed and deal agreed'
  ].some(phrase => text.includes(phrase))) return 'ITS_A_GO';
  if ([
    'advanced talks', 'talks advanced', 'close to', 'closing in', 'set to', 'medical', 'finalising',
    'finalizing', 'bid accepted', 'offer accepted', 'verbal agreement', 'in negotiations',
    'negotiations', 'talks continue', 'talks progressing', 'open talks'
  ].some(phrase => text.includes(phrase))) return 'DEVELOPING';
  return 'GOSSIP';
}

function debatePrompt(title = '', type = 'NEWS') {
  const cleanTitle = String(title).replace(/[?!.]+$/, '').trim();
  if (!cleanTitle) return '';
  if (type === 'TRANSFER') return `Would this be a good move? ${cleanTitle} — have your say.`;
  return `${cleanTitle} — what’s your verdict?`;
}

function normaliseTokens(value = '') {
  return String(value).toLowerCase().replace(/£|€|\$|\d+(?:\.\d+)?m?/g, ' ').replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(token => token.length > 2 && !STOP_WORDS.has(token));
}

function similarity(a = '', b = '') {
  const A = new Set(normaliseTokens(a));
  const B = new Set(normaliseTokens(b));
  if (!A.size || !B.size) return 0;
  let intersection = 0;
  for (const token of A) if (B.has(token)) intersection++;
  const union = new Set([...A, ...B]).size;
  return union ? intersection / union : 0;
}

function sameStory(a, b) {
  if (a.link && b.link && a.link === b.link) return true;
  if (a.title.toLowerCase() === b.title.toLowerCase()) return true;
  const titleScore = similarity(a.title, b.title);
  if (titleScore >= 0.58) return true;
  const combinedScore = similarity(`${a.title} ${a.description}`, `${b.title} ${b.description}`);
  return combinedScore >= 0.68;
}

function relevanceScore(item) {
  const text = `${item.title} ${item.description}`.toLowerCase();
  let score = PRIORITY_TERMS.reduce((sum, term) => sum + (text.includes(term) ? 1 : 0), 0);
  if (item.type === 'TRANSFER') score += 2;
  if (item.stage === 'OFFICIAL') score += 4;
  else if (item.stage === 'ITS_A_GO') score += 3;
  else if (item.stage === 'DEVELOPING') score += 1;
  return score;
}

function parseFeed(xml, source) {
  return [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map(match => {
    const block = match[0];
    const title = tagValue(block, 'title');
    const link = tagValue(block, 'link');
    const description = tagValue(block, 'description');
    const image = imageFromBlock(block);
    const publishedRaw = tagValue(block, 'pubDate');
    const published = publishedRaw ? Date.parse(publishedRaw) : 0;
    const type = classify(title, description);
    const stage = type === 'TRANSFER' ? transferStage(title, description) : null;
    return { title, link, description, image, published, source, type, stage };
  }).filter(item => item.title);
}

module.exports = async function handler(req, res) {
  try {
    const settled = await Promise.allSettled(FEEDS.map(async feed => {
      const response = await fetch(feed.url, { headers: { 'User-Agent': 'FootballTalk/1.0 (+https://footballtalk.uk)' } });
      if (!response.ok) throw new Error(`Feed ${response.status}`);
      const xml = await response.text();
      return parseFeed(xml, feed.source);
    }));

    const combined = settled.filter(result => result.status === 'fulfilled').flatMap(result => result.value).sort((a, b) => b.published - a.published);
    const deduped = [];
    for (const item of combined) {
      if (deduped.some(existing => sameStory(item, existing))) continue;
      deduped.push(item);
    }

    deduped.sort((a, b) => b.published - a.published);

    const items = deduped.slice(0, 60).map(item => ({
      ...item,
      relevance: relevanceScore(item),
      publishedAt: item.published ? new Date(item.published).toISOString() : null,
      debatePrompt: debatePrompt(item.title, item.type)
    }));

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    res.status(200).json({ updatedAt: new Date().toISOString(), items });
  } catch (error) {
    res.status(500).json({ error: 'Unable to load football news' });
  }
};
