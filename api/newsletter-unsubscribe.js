const RESEND_API='https://api.resend.com';
function validEmail(value){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)&&value.length<=254}
async function unsubscribeById(key,id){const r=await fetch(`${RESEND_API}/contacts/${encodeURIComponent(id)}`,{method:'PATCH',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({unsubscribed:true})});if(!r.ok){const detail=await r.text();throw new Error('Unsubscribe failed: '+detail.slice(0,180))}}
async function findContactByEmail(key,email){let after='';for(let page=0;page<20;page++){const u=new URL(RESEND_API+'/contacts');u.searchParams.set('limit','100');if(after)u.searchParams.set('after',after);const r=await fetch(u,{headers:{Authorization:`Bearer ${key}`}});if(!r.ok)throw new Error('Contact lookup failed');const j=await r.json();const rows=Array.isArray(j.data)?j.data:[];const found=rows.find(x=>String(x.email||'').toLowerCase()===email);if(found)return found;if(!j.has_more||!rows.length)break;after=rows[rows.length-1].id}return null}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return res.status(405).json({error:'Method not allowed'})}
 const key=String(process.env.RESEND_API_KEY||'').trim();if(!key)return res.status(503).json({error:'Email delivery is not configured'});
 if(req.method==='GET')return res.status(200).json({ok:true,configured:true});
 const id=String(req.query?.id||req.body?.id||'').trim();
 const email=String(req.body?.email||'').trim().toLowerCase();
 if(!id&&!validEmail(email))return res.status(400).json({error:'Subscriber reference or valid email is required'});
 try{
   let contactId=id;
   if(!contactId){const contact=await findContactByEmail(key,email);if(!contact)return res.status(200).json({ok:true});contactId=contact.id}
   await unsubscribeById(key,contactId);
   return res.status(200).json({ok:true});
 }catch(error){console.error('Newsletter unsubscribe error',error);return res.status(502).json({error:'Unable to unsubscribe right now'})}
}