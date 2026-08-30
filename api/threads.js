const SITE_URL='https://www.footballtalk.uk/';

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  return res.status(200).json({
    ok:true,
    mode:'threads-direct-ready',
    bufferSlotRequired:false,
    site:SITE_URL,
    configured:false,
    next:'Connect Threads OAuth credentials before publishing is enabled.'
  });
};
