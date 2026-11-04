import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {answerQuestion} from '../lib/ask-ft.js';
const buckets=new Map();
function allowed(req){const now=Date.now(),ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0];const key=createHash('sha256').update(ip).digest('hex');let b=buckets.get(key);if(!b||now-b.at>60000){b={at:now,count:0};buckets.set(key,b)};if(buckets.size>2000)for(const [k,v]of buckets)if(now-v.at>60000)buckets.delete(k);return ++b.count<=15}
function config(){const s=readFileSync(join(process.cwd(),'config.js'),'utf8');return {url:s.match(/SUPABASE_URL:\s*'([^']+)'/)?.[1],key:s.match(/SUPABASE_ANON_KEY:\s*'([^']+)'/)?.[1]}}
async function record(answer){try{const c=config();const r=await fetch(c.url+'/rest/v1/rpc/ft_ask_record',{method:'POST',headers:{apikey:c.key,Authorization:'Bearer '+c.key,'Content-Type':'application/json'},body:JSON.stringify({p_topic:answer.topic,p_club:answer.club||'',p_intent:answer.intent,p_answered:answer.answered}),signal:AbortSignal.timeout(2500)});if(!r.ok)throw Error('metrics unavailable');return true}catch{return false}}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method==='GET')return res.status(200).json({name:'Ask FT',mode:'Football Talk content and live feeds',paidAI:false});
 if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return res.status(405).json({error:'Method not allowed'})}
 if(req.headers.origin&&!['https://www.footballtalk.uk','https://footballtalk.uk'].includes(req.headers.origin))return res.status(403).json({error:'Please use Ask FT on Football Talk.'});
 if(!allowed(req))return res.status(429).json({error:'You’ve asked a lot of questions. Please wait a minute and try again.'});
 let body=req.body;try{if(typeof body==='string')body=JSON.parse(body)}catch{return res.status(400).json({error:'Invalid request'})}
 if(typeof body?.question!=='string'||!body.question.trim()||body.question.length>500)return res.status(400).json({error:'Enter a question of 1–500 characters.'});
 const context=body.context&&typeof body.context==='object'?{club:body.context.club,intent:body.context.intent}:{};
 const answer=await answerQuestion(body.question.trim(),context);
 const metricsRecorded=await record(answer);
 return res.status(200).json({...answer,metricsRecorded});
}
