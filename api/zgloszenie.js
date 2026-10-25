// WarsztatTech — server-side intake to the EXISTING Notion "Zgłoszenia WWW" database.
// Configure NOTION_API_KEY and TURNSTILE_SECRET_KEY in Vercel (never in browser or GitHub).
const DATABASE_ID = 'ffed7123d3cc46ab8a2c794e5d20d86c';
const safe = (v, n) => typeof v === 'string' ? v.trim().slice(0,n) : '';
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method !== 'POST') return res.status(405).json({error:'method_not_allowed'});
  if(!process.env.NOTION_API_KEY || !process.env.TURNSTILE_SECRET_KEY) return res.status(503).json({error:'not_configured'});
  const origin=req.headers.origin;
  if(origin && origin !== 'https://warsztatech.vercel.app') return res.status(403).json({error:'origin'});
  const b=req.body && typeof req.body === 'object'?req.body:{};
  if(safe(b.website,100)) return res.status(200).json({ok:true});
  const name=safe(b.name,80),phone=safe(b.phone,30),car=safe(b.vehicle,120),issue=safe(b.issue,1200);
  const token=safe(b.turnstileToken,2048);
  if(!name || !/^[+]?[0-9 ()-]{9,22}$/.test(phone) || !car || issue.length<10 || !b.consent || !token) return res.status(400).json({error:'invalid_fields'});
  try {
    const verify=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({secret:process.env.TURNSTILE_SECRET_KEY,response:token})});
    const verdict=await verify.json();
    if(!verdict.success) return res.status(400).json({error:'captcha'});
    const text=s=>[{'text':{'content':s}}];
    const props={'Name':{'title':text(name)},'Telefon':{'phone_number':phone},'Pojazd':{'rich_text':text(car)},'Opis usterki':{'rich_text':text(issue)},'Zgoda':{'checkbox':true},'Źródło':{'select':{'name':'WWW'}},'Status':{'status':{'name':'Nowe'}}};
    const result=await fetch('https://api.notion.com/v1/pages',{method:'POST',headers:{'Authorization':`Bearer ${process.env.NOTION_API_KEY}`,'Notion-Version':'2022-06-28','Content-Type':'application/json'},body:JSON.stringify({parent:{database_id:DATABASE_ID},properties:props})});
    if(!result.ok){console.error('notion-create-failed',result.status);return res.status(502).json({error:'intake_unavailable'});}
    return res.status(201).json({ok:true});
  }catch(e){console.error('intake-exception');return res.status(502).json({error:'intake_unavailable'});}
}
