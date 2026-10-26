export default function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method !== 'GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'method_not_allowed'});}
  if(!process.env.NOTION_API_KEY || !process.env.TURNSTILE_SECRET_KEY || !process.env.TURNSTILE_SITE_KEY) return res.status(503).json({error:'not_configured'});
  if(process.env.VERCEL_ENV !== 'preview' && (process.env.TURNSTILE_SITE_KEY === '1x00000000000000000000AA' || process.env.TURNSTILE_SECRET_KEY === '1x0000000000000000000000000000000AA')) return res.status(503).json({error:'not_configured'});
  return res.status(200).json({siteKey:process.env.TURNSTILE_SITE_KEY});
}
