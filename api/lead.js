// Vercel Node.js function: POST /api/lead
// Keeps GHL private integration credentials off the public website.
const allowedRevenue = new Set(['0','1000','2000','5000','10000','20000','50000']);
const allowedBudget = new Set(['0','1000','3000','7000','15000']);
const allowedAttendance = new Set(['yes','no']);
const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validPhone = /^\+[1-9]\d{6,14}$/;

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || '';
  const permitted = (process.env.ALLOWED_ORIGIN || '').split(',').map(s=>s.trim()).filter(Boolean);
  // Browser CORS control, not authentication. Prefer same-origin hosting.
  if (origin && permitted.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  res.setHeader('Cache-Control','no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});
  if (origin && permitted.length && !permitted.includes(origin))
    return res.status(403).json({error:'Origin not allowed'});
  const b = typeof req.body === 'string' ? (()=>{try{return JSON.parse(req.body)}catch{return null}})() : req.body;
  if (!b || typeof b !== 'object' || Array.isArray(b))
    return res.status(400).json({error:'Invalid request'});
  if (JSON.stringify(b).length > 5000) return res.status(413).json({error:'Request too large'});
  // Honeypot: do not write suspected spam into the CRM.
  if (b.website) return res.status(400).json({error:'Invalid request'});
  const name = String(b.name || '').trim().slice(0,120);
  const email = String(b.email || '').trim().toLowerCase().slice(0,200);
  const phone = String(b.phone || '').trim();
  const country = String(b.country || '').trim().toUpperCase();
  const revenue = String(b.revenue ?? '');
  const budget = String(b.budget ?? '');
  const attendance = String(b.attendance || '');
  if (name.length < 2 || !validEmail.test(email) || !validPhone.test(phone) ||
      !/^[A-Z]{2}$/.test(country) || !allowedRevenue.has(revenue) ||
      !allowedBudget.has(budget) || !allowedAttendance.has(attendance)) {
    return res.status(400).json({error:'Please check your contact details and all answers.'});
  }
  const qualified = Number(revenue) >= 1000 && Number(budget) >= 1000 && attendance === 'yes';
  const token = process.env.GHL_PRIVATE_TOKEN;
  const locationId = process.env.GHL_LOCATION_ID;
  const fields = [process.env.GHL_REVENUE_FIELD_ID, process.env.GHL_BUDGET_FIELD_ID, process.env.GHL_ATTENDANCE_FIELD_ID];
  if (!token || !locationId || fields.some(x=>!x)) {
    console.error('Boosta GHL integration missing environment variables');
    return res.status(503).json({error:'Lead saving is not configured yet.'});
  }
  const parts=name.split(/\s+/);
  const payload={
    locationId,
    firstName:parts[0],
    lastName:parts.slice(1).join(' '),
    name,email,phone,country,
    source:'Boosta website qualification',
    customFields:[
      {id:fields[0],fieldValue:revenue},
      {id:fields[1],fieldValue:budget},
      {id:fields[2],fieldValue:attendance}
    ]
  };
  try {
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),12000);
    let response;
    try {
      response=await fetch('https://services.leadconnectorhq.com/contacts/upsert',{
        method:'POST',
        headers:{'Authorization':`Bearer ${token}`,'Version':'2023-02-21','Content-Type':'application/json'},
        body:JSON.stringify(payload),signal:controller.signal
      });
    } finally { clearTimeout(timeout); }
    const result=await response.json().catch(()=>({}));
    const contactId=result?.contact?.id;
    if (!response.ok || !contactId) {
      console.error('GHL upsert failed',response.status,JSON.stringify(result).slice(0,450));
      return res.status(502).json({error:'Could not confirm the lead was saved. Please try again.'});
    }
    return res.status(200).json({saved:true,contactId,qualified});
  } catch(err) {
    console.error('GHL connection failed',err?.message);
    return res.status(502).json({error:'GHL is temporarily unavailable. Please try again.'});
  }
};
