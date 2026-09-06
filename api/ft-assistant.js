const WINDOW_MS=60_000;
const MAX_PER_WINDOW=8;
const buckets=new Map();

function ipOf(req){return String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim()}
function allowed(ip){const now=Date.now();const b=buckets.get(ip)||{start:now,count:0};if(now-b.start>WINDOW_MS){b.start=now;b.count=0}b.count++;buckets.set(ip,b);return b.count<=MAX_PER_WINDOW}

export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  if(!allowed(ipOf(req))) return res.status(429).json({error:'Too many questions — please try again in a minute.'});
  const question=String(req.body?.question||'').trim().slice(0,500);
  if(!question) return res.status(400).json({error:'Ask a football question.'});
  if(!process.env.OPENAI_API_KEY) return res.status(503).json({error:'FT Assistant is being connected. Please try again shortly.'});

  const instructions=`You are FT Assistant, the football-only assistant for FootballTalk.uk, a UK football platform. Answer only association football/soccer questions. Be concise, conversational and useful to UK football fans. For current, recent, live, fixture, result, table, transfer, injury, lineup, manager, competition or other time-sensitive questions, use web search before answering. Prefer official competition/club sources and reputable football reporting. Never invent a score, transfer, quote or fixture. If reliable current information cannot be established, say so. For non-football requests politely say you only cover football. Do not claim to be ChatGPT or OpenAI; identify as FT Assistant when relevant. Keep most answers under 130 words. Plain text only.`;
  try{
    const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.OPENAI_API_KEY}`},body:JSON.stringify({model:'gpt-5.6-luna',instructions,input:question,tools:[{type:'web_search'}],max_output_tokens:450})});
    const data=await r.json();
    if(!r.ok) throw new Error(data?.error?.message||'AI request failed');
    let text=data.output_text;
    if(!text&&Array.isArray(data.output)) text=data.output.flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\n');
    return res.status(200).json({answer:(text||'I could not get a reliable football answer just then. Please try again.').trim()});
  }catch(e){console.error('FT Assistant:',e);return res.status(502).json({error:'FT Assistant could not answer that just now. Please try again.'})}
}