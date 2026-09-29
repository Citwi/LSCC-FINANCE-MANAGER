const http=require('http');
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');

const PORT=Number(process.env.PORT||4785);
const HOST=process.env.HOST||'0.0.0.0';
const APP_DIR=__dirname;
const SUPABASE_URL=(process.env.SUPABASE_URL||'').replace(/\/$/,'');
const SUPABASE_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||'';
const SESSION_SECRET=process.env.SESSION_SECRET||'';
const MAX_BODY=25*1024*1024;

const seed={income:[],expenses:[],projects:[],members:[],partners:[],homeCells:[],programs:[],programArchive:[],events:[],specialDepartments:[],specialMembers:[],specialIncome:[],specialExpenses:[],mercyIncome:[],mercyExpenses:[],officeSchedule:[],deletedTransactions:[],counters:{member:0,receipt:0,voucher:0,audit:0},incomeTypes:['Offering','Tithe','Thanksgiving','Special Offering','Other'],expenseTypes:['Utilities','Transport','Staff / Ministry','Maintenance','Events','Office','Construction','Other'],settings:{name:'LSCC Finance Manager',currency:'KSh',openingBalance:0,partnerTarget:0},users:[{id:'u-admin',username:'admin',name:'System Administrator',role:'Administrator',email:'',passwordHash:'3f56650c7d6e50dead95cc014265034126dbfee52c8682a10d028bc76a7f9d31',permissions:[]} ]};

function send(res,status,obj,headers={}){const b=JSON.stringify(obj);res.writeHead(status,Object.assign({'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Cache-Control':'no-store'},headers));res.end(b)}
function html(res){try{const b=fs.readFileSync(path.join(APP_DIR,'index.html'));res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(b)}catch(e){send(res,500,{error:'Application file unavailable'})}}
function readBody(req){return new Promise((resolve,reject)=>{let body='';req.on('data',c=>{body+=c;if(body.length>MAX_BODY){req.destroy();reject(new Error('payload_too_large'))}});req.on('end',()=>resolve(body));req.on('error',reject)})}
function b64u(x){return Buffer.from(x).toString('base64url')}
function tokenFor(user){const payload={sub:user.id,username:user.username,iat:Date.now(),exp:Date.now()+8*60*60*1000};const p=b64u(JSON.stringify(payload));const sig=crypto.createHmac('sha256',SESSION_SECRET).update(p).digest('base64url');return p+'.'+sig}
function auth(req){if(!SESSION_SECRET)return null;const h=req.headers.authorization||'';if(!h.startsWith('Bearer '))return null;const t=h.slice(7),parts=t.split('.');if(parts.length!==2)return null;const sig=crypto.createHmac('sha256',SESSION_SECRET).update(parts[0]).digest('base64url');if(!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(parts[1])))return null;try{const p=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8'));if(!p.exp||p.exp<Date.now())return null;return p}catch(e){return null}}
async function sb(pathname,opts={}){if(!SUPABASE_URL||!SUPABASE_KEY)throw new Error('Cloud database environment variables are not configured.');const r=await fetch(SUPABASE_URL+'/rest/v1/'+pathname,Object.assign({headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY,'Content-Type':'application/json'}},opts));const text=await r.text();let data=null;try{data=text?JSON.parse(text):null}catch(e){data=text}if(!r.ok)throw new Error('Supabase '+r.status+': '+(typeof data==='string'?data:JSON.stringify(data)));return data}
async function getState(){const rows=await sb('lscc_state?select=id,revision,db&id=eq.1');if(!rows.length){await sb('lscc_state',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify({id:1,revision:0,db:seed})});return {revision:0,db:seed}}return rows[0]}
async function login(body){const st=await getState();const u=(st.db.users||[]).find(x=>(x.username||'').toLowerCase()===(body.username||'').trim().toLowerCase()&&x.passwordHash===body.passwordHash);if(!u)throw Object.assign(new Error('invalid_credentials'),{code:401});return {token:tokenFor(u),revision:st.revision,db:st.db,userId:u.id}}
async function saveState(revision,db){const rows=await sb('lscc_state?select=revision&id=eq.1');if(!rows.length){if(Number(revision)!==0)throw Object.assign(new Error('revision_conflict'),{code:409,currentRevision:0});await sb('lscc_state',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({id:1,revision:1,db})});return 1}const current=Number(rows[0].revision||0);if(current!==Number(revision||0))throw Object.assign(new Error('revision_conflict'),{code:409,currentRevision:current});const updated=await sb('lscc_state?id=eq.1&revision=eq.'+encodeURIComponent(String(current)),{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({revision:current+1,db,updated_at:new Date().toISOString()})});if(!updated.length)throw Object.assign(new Error('revision_conflict'),{code:409,currentRevision:current});return current+1}

const server=http.createServer(async(req,res)=>{
 try{
  if(req.method==='OPTIONS')return send(res,204,{});
  if(req.method==='GET'&&(req.url==='/'||req.url==='/index.html'))return html(res);
  if(req.method==='GET'&&req.url==='/api/health')return send(res,200,{ok:true,cloudConfigured:!!(SUPABASE_URL&&SUPABASE_KEY&&SESSION_SECRET)});
  if(req.method==='POST'&&req.url==='/api/login'){
   const body=JSON.parse(await readBody(req));return send(res,200,await login(body));
  }
  if(req.method==='GET'&&req.url==='/api/state'){
   if(!auth(req))return send(res,401,{error:'unauthorized'});return send(res,200,await getState());
  }
  if(req.method==='POST'&&req.url==='/api/state'){
   if(!auth(req))return send(res,401,{error:'unauthorized'});const body=JSON.parse(await readBody(req));if(!body||!body.db)return send(res,400,{error:'Database payload missing'});const revision=await saveState(Number(body.revision||0),body.db);return send(res,200,{ok:true,revision});
  }
  return send(res,404,{error:'Not found'});
 }catch(e){const code=e.code===401?401:e.code===409?409:500;send(res,code,{error:e.message||'Server error',revision:e.currentRevision});}
});
server.listen(PORT,HOST,()=>console.log(`LSCC Cloud V6 listening on port ${PORT}`));
