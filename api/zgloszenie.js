// Writes only to the existing Zgłoszenia WWW source. Never creates a database.
const SOURCE = 'ffed7123-d3cc-46ab-8a2c-794e5d20d86c';
const TEST_SITE_KEY = '1x00000000000000000000AA';
const TEST_SECRET_KEY = '1x0000000000000000000000000000000AA';
const text = value => [{text:{content:value}}];
const field = (v,min,max) => typeof v === 'string' && v.trim().length >= min && v.trim().length <= max ? v.trim() : null;
export function allowedOrigins() {
  return process.env.VERCEL_ENV === 'preview'
    ? [process.env.VERCEL_URL,process.env.VERCEL_BRANCH_URL].filter(Boolean).map(h=>`https://${h}`)
    : ['https://warsztatech.vercel.app'];
}
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method !== 'POST') {res.setHeader('Allow','POST');return res.status(405).json({error:'method_not_allowed'});}
  if(!allowedOrigins().includes(req.headers.origin)) return res.status(403).json({error:'origin'});
  if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||'')) return res.status(415).json({error:'content_type'});
  const b=req.body;
  if(!b || typeof b !== 'object' || Array.isArray(b)) return res.status(400).json({error:'invalid_fields'});
  if(Buffer.byteLength(JSON.stringify(b))>10000) return res.status(413).json({error:'too_large'});
  if(typeof b.website === 'string' && b.website.trim()) return res.status(200).json({ok:true});
  const name=field(b.name,2,80),phone=field(b.phone,9,22),vehicle=field(b.vehicle,2,120),issue=field(b.issue,10,1200),token=field(b.turnstileToken,1,2048);
  if(!name || !phone || !/^\+?[0-9 ()-]+$/.test(phone) || !/^[0-9]{9,15}$/.test(phone.replace(/\D/g,'')) || !vehicle || !issue || b.consent !== true || !token) return res.status(400).json({error:'invalid_fields'});
  if(!process.env.NOTION_API_KEY || !process.env.TURNSTILE_SECRET_KEY || !process.env.TURNSTILE_SITE_KEY) return res.status(503).json({error:'not_configured'});
  if(process.env.VERCEL_ENV !== 'preview' && (process.env.TURNSTILE_SITE_KEY === TEST_SITE_KEY || process.env.TURNSTILE_SECRET_KEY === TEST_SECRET_KEY)) return res.status(503).json({error:'not_configured'});
  try {
    const verify=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
      method:'POST',signal:AbortSignal.timeout(8000),headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({secret:process.env.TURNSTILE_SECRET_KEY,response:token})
    });
    if(!verify.ok) return res.status(502).json({error:'captcha_unavailable'});
    const verdict=await verify.json();
    const officialTestPair = process.env.VERCEL_ENV === 'preview' && process.env.TURNSTILE_SITE_KEY === TEST_SITE_KEY && process.env.TURNSTILE_SECRET_KEY === TEST_SECRET_KEY;
    const strictVerdict = verdict.action === 'zgloszenie' && verdict.hostname === new URL(req.headers.origin).hostname;
    if(verdict.success !== true || (!officialTestPair && !strictVerdict)) return res.status(400).json({error:'captcha'});
    const result=await fetch('https://api.notion.com/v1/pages',{
      method:'POST',signal:AbortSignal.timeout(10000),
      headers:{Authorization:`Bearer ${process.env.NOTION_API_KEY}`,'Notion-Version':'2025-09-03','Content-Type':'application/json'},
      body:JSON.stringify({parent:{type:'data_source_id',data_source_id:SOURCE},properties:{
        Name:{title:text(name)},Telefon:{phone_number:phone},Pojazd:{rich_text:text(vehicle)},'Opis usterki':{rich_text:text(issue)},
        Zgoda:{checkbox:true},'Źródło':{select:{name:'WWW'}},Status:{status:{name:'Nowe'}}
      }})
    });
    // A timeout may follow a successful write. Never automatically retry a create.
    if(!result.ok){console.error('notion-create-failed',result.status);return res.status(502).json({error:'intake_unavailable'});}
    return res.status(201).json({ok:true});
  } catch {console.error('intake-exception');return res.status(502).json({error:'intake_unavailable'});}
}
