const crypto=require('crypto');
const SITE='https://www.footballtalk.uk/22law';
const IMG='https://www.footballtalk.uk/api/social-card-image';
const TEXT=`⚽ FOOTBALL TALK FEATURED PARTNER

We're proud to feature 22 Law as a Football Talk partner.

Find out more about 22 Law here 👇
${SITE}

#FootballTalk #WhereFansHaveTheirSay`;
function cfg(){const fs=require('fs'),path=require('path');const t=fs.readFileSync(path.join(process.cwd(),'config.js'),'utf8');return{url:(t.match(/SUPABASE_URL:\s*'([^']+)'/)||[])[1],key:(t.match(/SUPABASE_ANON_KEY:\s*'([^']+)'/)||[])[1]};}
function h(c,x={}){return{apikey:c.key,Authorization:`Bearer ${c.key}`,...x};}
async function seen(c,s){const k='22law-social:'+s;const r=await fetch(`${c.url}/rest/v1/poll_responses?select=poll_id&poll_id=eq.${encodeURIComponent(k)}&limit=1`,{headers:h(c),cache:'no-store'});return r.ok&&(await r.json()).length>0;}
async function remember(c,s,id){await fetch(`${c.url}/rest/v1/poll_responses`,{method:'POST',headers:h(c,{'Content-Type':'application/json',Prefer:'return=minimal'}),body:JSON.stringify({poll_id:'22law-social:'+s,answer:JSON.stringify({id,createdAt:new Date().toISOString()})})});}
async function buffer(service){const key=process.env.BUFFER_API_KEY;if(!key)throw new Error('Buffer key missing');const q=async(query,variables)=>{const r=await fetch('https://api.buffer.com',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify({query,variables})});const d=await r.json();if(!r.ok||d.errors?.length)throw new Error('Buffer request failed');return d.data;};const a=await q('query { account { organizations { id name } } }',{}),o=a.account.organizations[0];const d=await q('query C($organizationId: OrganizationId!) { channels(input:{organizationId:$organizationId,filter:{isLocked:false}}) { id name displayName service } }',{organizationId:o.id});const ch=d.channels.find(c=>String(c.service).toLowerCase()===service&&/football\\s*talk/i.test(`${c.name||''} ${c.displayName||''}`))||d.channels.find(c=>String(c.service).toLowerCase()===service);if(!ch)throw new Error('No '+service+' channel');const mutation='mutation P($channelId: ChannelId!,$text: String,$image: String!) { createPost(input:{text:$text,channelId:$channelId,schedulingType:automatic,mode:shareNow,saveToDraft:false,assets:[{image:{url:$image}}]}) { ... on PostActionSuccess { post { id } } ... on MutationError { message } } }';const out=await q(mutation,{channelId:ch.id,text:TEXT,image:IMG});if(!out.createPost?.post)throw new Error(out.createPost?.message||'Publish failed');return out.createPost.post.id;}
module.exports=async(req,res)=>{res.setHeader('Cache-Control','no-store');if(String(req.query?.confirm||'')!=='1')return res.status(200).json({ok:true,ready:true,text:TEXT});const c=cfg(),out=[];for(const s of ['facebook','twitter']){if(await seen(c,s)){out.push({service:s,skipped:'already posted'});continue;}try{const id=await buffer(s);await remember(c,s,id);out.push({service:s,posted:true,id});}catch(e){out.push({service:s,posted:false,error:String(e.message||e)});}}return res.status(200).json({ok:true,results:out});};