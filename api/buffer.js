const BUFFER_ENDPOINT='https://api.buffer.com';

async function gql(query,variables={}){
  const key=process.env.BUFFER_API_KEY;
  if(!key)throw new Error('BUFFER_API_KEY is not configured');
  const r=await fetch(BUFFER_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify({query,variables}),cache:'no-store'});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(`Buffer HTTP ${r.status}`);
  if(data.errors?.length)throw new Error(data.errors.map(e=>e.message).join('; '));
  return {data:data.data,rateLimit:r.headers.get('ratelimit')||null};
}

async function connectionInfo(){
  const orgResult=await gql(`query FootballTalkOrganizations { account { organizations { id name } } }`);
  const organizations=orgResult.data?.account?.organizations||[];
  const organization=organizations[0];
  if(!organization)return {connected:true,organization:null,channels:[],rateLimit:orgResult.rateLimit};
  const channelResult=await gql(`query FootballTalkChannels($organizationId: OrganizationId!) { channels(input:{organizationId:$organizationId,filter:{isLocked:false}}) { id name displayName service isQueuePaused } }`,{organizationId:organization.id});
  return {connected:true,organization,channels:channelResult.data?.channels||[],rateLimit:channelResult.rateLimit||orgResult.rateLimit};
}

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
  try{
    const info=await connectionInfo();
    return res.status(200).json({ok:true,mode:'diagnostic',...info});
  }catch(error){
    console.error('Buffer connection failed',error);
    return res.status(502).json({ok:false,error:'Buffer connection unavailable',detail:String(error.message||error)});
  }
};
