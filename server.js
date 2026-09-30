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
const APP_VERSION='6.1.6.1';
const AT_USERNAME=process.env.AFRICASTALKING_USERNAME||'';
const AT_API_KEY=process.env.AFRICASTALKING_API_KEY||'';
const AT_SENDER_ID=process.env.AFRICASTALKING_SENDER_ID||'';
const AT_DLR_KEY=process.env.AFRICASTALKING_DLR_KEY||'';
const RESEND_API_KEY=process.env.RESEND_API_KEY||'';
const RESET_FROM_EMAIL=process.env.RESET_FROM_EMAIL||'';
const APP_PUBLIC_URL=(process.env.APP_PUBLIC_URL||'').replace(/\/$/,'');

const seed={income:[],expenses:[],projects:[],members:[],partners:[],homeCells:[],programs:[],programArchive:[],events:[],specialDepartments:[],specialMembers:[],specialIncome:[],specialExpenses:[],mercyIncome:[],mercyExpenses:[],officeSchedule:[],deletedTransactions:[],smsHistory:[],smsTemplates:[],counters:{member:0,receipt:0,voucher:0,audit:0},incomeTypes:['Offering','Tithe','Thanksgiving','Special Offering','Other'],expenseTypes:['Utilities','Transport','Staff / Ministry','Maintenance','Events','Office','Construction','Other'],settings:{name:'LSCC Finance Manager',currency:'KSh',openingBalance:0,partnerTarget:0,memberTypes:['Ordinary','Minister','Pastor','Elder','Sunday School'],departments:['Pastoral Team','Praise and Worship/Choir','Media and IT','Ushering','Protocol','Hospitality','Sunday School Ministry']},users:[{id:'u-admin',username:'admin',name:'System Administrator',role:'Administrator',email:'',passwordHash:'3f56650c7d6e50dead95cc014265034126dbfee52c8682a10d028bc76a7f9d31',permissions:[]} ]};

function send(res,status,obj,headers={}){const b=JSON.stringify(obj);res.writeHead(status,Object.assign({'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Cache-Control':'no-store'},headers));res.end(b)}
function html(res){try{const b=fs.readFileSync(path.join(APP_DIR,'index.html'));res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(b)}catch(e){send(res,500,{error:'Application file unavailable'})}}
function readBody(req){return new Promise((resolve,reject)=>{let body='';req.on('data',c=>{body+=c;if(body.length>MAX_BODY){req.destroy();reject(new Error('payload_too_large'))}});req.on('end',()=>resolve(body));req.on('error',reject)})}
function b64u(x){return Buffer.from(x).toString('base64url')}
function tokenFor(user){const payload={sub:user.id,username:user.username,iat:Date.now(),exp:Date.now()+8*60*60*1000};const p=b64u(JSON.stringify(payload));const sig=crypto.createHmac('sha256',SESSION_SECRET).update(p).digest('base64url');return p+'.'+sig}
function auth(req){if(!SESSION_SECRET)return null;const h=req.headers.authorization||'';if(!h.startsWith('Bearer '))return null;const t=h.slice(7),parts=t.split('.');if(parts.length!==2)return null;const sig=crypto.createHmac('sha256',SESSION_SECRET).update(parts[0]).digest('base64url');if(sig.length!==parts[1].length)return null;if(!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(parts[1])))return null;try{const p=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8'));if(!p.exp||p.exp<Date.now())return null;return p}catch(e){return null}}
async function sb(pathname,opts={}){if(!SUPABASE_URL||!SUPABASE_KEY)throw new Error('Cloud database environment variables are not configured.');const headers=Object.assign({apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY,'Content-Type':'application/json'},opts.headers||{});const request=Object.assign({},opts,{headers});const r=await fetch(SUPABASE_URL+'/rest/v1/'+pathname,request);const text=await r.text();let data=null;try{data=text?JSON.parse(text):null}catch(e){data=text}if(!r.ok)throw new Error('Supabase '+r.status+': '+(typeof data==='string'?data:JSON.stringify(data)));return data}
function resetTokenFor(user){const payload={sub:user.id,email:user.email||'',pw:user.passwordHash,iat:Date.now(),exp:Date.now()+30*60*1000};const p=b64u(JSON.stringify(payload));const sig=crypto.createHmac('sha256',SESSION_SECRET).update('reset:'+p).digest('base64url');return p+'.'+sig}
function verifyResetToken(token){const parts=String(token||'').split('.');if(parts.length!==2)return null;const sig=crypto.createHmac('sha256',SESSION_SECRET).update('reset:'+parts[0]).digest('base64url');if(!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(parts[1])))return null;try{const p=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8'));if(!p.exp||p.exp<Date.now())return null;return p}catch(e){return null}}
async function sendResetEmail(to,name,token,req){if(!RESEND_API_KEY||!RESET_FROM_EMAIL)throw new Error('Email reset service is not configured. Set RESEND_API_KEY and RESET_FROM_EMAIL in Render.');const base=APP_PUBLIC_URL||('https://'+(req.headers.host||''));const link=base+'/?reset='+encodeURIComponent(token);const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:RESET_FROM_EMAIL,to:[to],subject:'LSCC Finance Manager — Password Reset',html:`<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2>LSCC Finance Manager</h2><p>Hello ${String(name||'User').replace(/[<>]/g,'')},</p><p>We received a request to reset your LSCC Finance Manager password.</p><p><a href="${link}" style="display:inline-block;padding:12px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px">Reset My Password</a></p><p>This link expires in 30 minutes and becomes invalid after your password is changed.</p><p>If you did not request this reset, you can ignore this email.</p></div>`})});if(!r.ok){const t=await r.text();throw new Error('Email provider error: '+t)}return true}
function smsAuthorized(user){return !!user&&(user.role==='Administrator'||(Array.isArray(user.permissions)&&user.permissions.includes('sms')))}
function normalizePhone(x){let s=String(x||'').trim().replace(/[\s().-]/g,'');if(/^0[17]\d{8}$/.test(s))return '+254'+s.slice(1);if(/^254[17]\d{8}$/.test(s))return '+'+s;if(/^\+254[17]\d{8}$/.test(s))return s;return ''}
async function sendAfricaTalkingBatch(recipients,message){
 if(!AT_USERNAME||!AT_API_KEY)return {ok:false,error:'Africa\'s Talking is not configured on the server. Add AFRICASTALKING_USERNAME and AFRICASTALKING_API_KEY in Render.'};
 if(!AT_SENDER_ID)return {ok:false,error:'Africa\'s Talking Sender ID is not configured. Add AFRICASTALKING_SENDER_ID in Render after approval.'};
 const body=new URLSearchParams({username:AT_USERNAME,to:recipients.join(','),message,from:AT_SENDER_ID});
 const r=await fetch('https://api.africastalking.com/version1/messaging',{method:'POST',headers:{apiKey:AT_API_KEY,'Content-Type':'application/x-www-form-urlencoded','Accept':'application/json'},body});
 const raw=await r.text();let data={};try{data=raw?JSON.parse(raw):{}}catch(e){data={raw}};
 if(!r.ok)return {ok:false,error:'Africa\'s Talking '+r.status+': '+(typeof data==='string'?data:JSON.stringify(data)),data};
 const rs=data?.SMSMessageData?.Recipients||[];let sent=0,failed=0;rs.forEach(x=>{let code=String(x.statusCode||'');if(['100','101','102'].includes(code))sent++;else failed++});
 if(!rs.length)sent=recipients.length;
 return {ok:true,sent,failed,data,providerRecipients:rs};
}


function smsProviderConfig(){if(!AT_USERNAME||!AT_API_KEY)return {configured:false,error:"Africa's Talking username/API key is missing."};if(!AT_SENDER_ID)return {configured:false,error:"Africa's Talking Sender ID is missing."};return {configured:true,username:AT_USERNAME,senderId:AT_SENDER_ID,hasApiKey:true}}
async function getState(){const rows=await sb('lscc_state?select=id,revision,db,updated_at&id=eq.1');if(!rows.length){await sb('lscc_state',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify({id:1,revision:0,db:seed})});return {revision:0,db:seed,updated_at:null}}return rows[0]}
async function login(body){const st=await getState();const u=(st.db.users||[]).find(x=>(x.username||'').toLowerCase()===(body.username||'').trim().toLowerCase()&&x.passwordHash===body.passwordHash);if(!u)throw Object.assign(new Error('invalid_credentials'),{code:401});return {token:tokenFor(u),revision:st.revision,db:st.db,userId:u.id}}
async function saveState(revision,db){const rows=await sb('lscc_state?select=revision&id=eq.1');if(!rows.length){if(Number(revision)!==0)throw Object.assign(new Error('revision_conflict'),{code:409,currentRevision:0});await sb('lscc_state',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({id:1,revision:1,db})});return 1}const current=Number(rows[0].revision||0);if(current!==Number(revision||0))throw Object.assign(new Error('revision_conflict'),{code:409,currentRevision:current});const updated=await sb('lscc_state?id=eq.1&revision=eq.'+encodeURIComponent(String(current)),{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({revision:current+1,db,updated_at:new Date().toISOString()})});if(!updated.length)throw Object.assign(new Error('revision_conflict'),{code:409,currentRevision:current});const verify=await sb('lscc_state?select=revision,updated_at&id=eq.1');if(!verify.length||Number(verify[0].revision)!==current+1)throw new Error('Cloud write verification failed.');return current+1}

const server=http.createServer(async(req,res)=>{
 try{
  if(req.method==='OPTIONS')return send(res,204,{});
  if(req.method==='GET'){const pathname=new URL(req.url,'http://'+(req.headers.host||'localhost')).pathname;if(pathname==='/'||pathname==='/index.html')return html(res);if(pathname==='/liberty-logo.jpeg'){try{const b=fs.readFileSync(path.join(APP_DIR,'liberty-logo.jpeg'));res.writeHead(200,{'Content-Type':'image/jpeg','Cache-Control':'public, max-age=86400'});return res.end(b)}catch(e){return send(res,404,{error:'Logo not found'})}}}
  if(req.method==='GET'&&req.url==='/api/health'){try{const st=await getState();return send(res,200,{ok:true,version:APP_VERSION,cloudConfigured:!!(SUPABASE_URL&&SUPABASE_KEY&&SESSION_SECRET),cloudReachable:true,revision:Number(st.revision||0),updatedAt:st.updated_at||null})}catch(e){return send(res,200,{ok:false,version:APP_VERSION,cloudConfigured:!!(SUPABASE_URL&&SUPABASE_KEY&&SESSION_SECRET),cloudReachable:false,error:e.message||'Cloud database check failed'})}}
  if(req.method==='POST'&&req.url==='/api/login'){
   const body=JSON.parse(await readBody(req));return send(res,200,await login(body));
  }
  if(req.method==='POST'&&req.url==='/api/password-reset/request'){const body=JSON.parse(await readBody(req));const email=String(body.email||'').trim().toLowerCase();if(!email)return send(res,400,{error:'Email address is required.'});const st=await getState();const u=(st.db.users||[]).find(x=>(x.email||'').trim().toLowerCase()===email);if(!u)return send(res,200,{ok:true,message:'If that email is registered, a password reset link has been sent.'});if(!u.email)return send(res,200,{ok:true,message:'If that email is registered, a password reset link has been sent.'});const token=resetTokenFor(u);await sendResetEmail(u.email,u.name,token,req);return send(res,200,{ok:true,message:'A password reset link has been sent to the registered email address.'})}
  if(req.method==='POST'&&req.url==='/api/password-reset/confirm'){const body=JSON.parse(await readBody(req));const token=String(body.token||''),passwordHash=String(body.passwordHash||'');if(!token||!passwordHash)return send(res,400,{error:'Reset token and password are required.'});const p=verifyResetToken(token);if(!p)return send(res,400,{error:'The reset link is invalid or expired.'});const st=await getState();const u=(st.db.users||[]).find(x=>x.id===p.sub);if(!u||u.passwordHash!==p.pw||(u.email||'').toLowerCase()!==(p.email||'').toLowerCase())return send(res,400,{error:'The reset link is invalid, expired, or has already been used.'});u.passwordHash=passwordHash;await saveState(Number(st.revision||0),st.db);return send(res,200,{ok:true})}
  if(req.method==='GET'&&req.url==='/api/sms/config'){
   const a=auth(req);if(!a)return send(res,401,{error:'unauthorized'});const st=await getState();const u=(st.db.users||[]).find(x=>x.id===a.sub);if(!smsAuthorized(u))return send(res,403,{error:'SMS permission required'});return send(res,200,{configured:!!(AT_USERNAME&&AT_API_KEY&&AT_SENDER_ID),senderId:AT_SENDER_ID||'',hasApiKey:!!AT_API_KEY,username:AT_USERNAME||''});
  }
  if(req.method==='POST'&&req.url==='/api/sms/test-config'){
   const a=auth(req);if(!a)return send(res,401,{error:'unauthorized'});const st=await getState();const u=(st.db.users||[]).find(x=>x.id===a.sub);if(!smsAuthorized(u))return send(res,403,{error:'SMS permission required'});const c=smsProviderConfig();return send(res,200,c);
  }
  if(req.method==='POST'&&req.url==='/api/sms/send'){
   const a=auth(req);if(!a)return send(res,401,{error:'unauthorized'});const body=JSON.parse(await readBody(req));const st=await getState();const u=(st.db.users||[]).find(x=>x.id===a.sub);if(!smsAuthorized(u))return send(res,403,{error:'You do not have permission to send SMS.'});
   if(Number(body.revision||0)!==Number(st.revision||0))return send(res,409,{error:'Cloud revision changed. Synchronize before sending SMS.',revision:Number(st.revision||0)});
   const message=String(body.message||'').trim();if(!message)return send(res,400,{error:'SMS message is required.'});if(message.length>1600)return send(res,400,{error:'SMS message is limited to 1600 characters.'});
   const incoming=Array.isArray(body.recipients)?body.recipients:[];const seen=new Set(),recipients=[];for(const x of incoming){const phone=normalizePhone(x?.phone);if(phone&&!seen.has(phone)){seen.add(phone);recipients.push({phone,name:String(x?.name||'')})}}if(!recipients.length)return send(res,400,{error:'No valid recipients were supplied.'});
   let sent=0,failed=0,details=[],providerRecipients=[],batchSize=200;for(let i=0;i<recipients.length;i+=batchSize){const batch=recipients.slice(i,i+batchSize);const msg=batch.map(r=>r.name?message.replaceAll('{MemberName}',r.name):message);let uniform=msg.every(x=>x===msg[0]);if(uniform){const out=await sendAfricaTalkingBatch(batch.map(x=>x.phone),msg[0]);if(!out.ok)return send(res,502,{error:out.error});sent+=out.sent;failed+=out.failed;details.push({batch:i/batchSize+1,sent:out.sent,failed:out.failed});providerRecipients.push(...(out.providerRecipients||[]));}else{for(let j=0;j<batch.length;j++){const out=await sendAfricaTalkingBatch([batch[j].phone],msg[j]);if(out.ok){sent+=out.sent;failed+=out.failed;providerRecipients.push(...(out.providerRecipients||[]))}else{failed++;details.push({phone:batch[j].phone,error:out.error})}}}}
   st.db.smsHistory=Array.isArray(st.db.smsHistory)?st.db.smsHistory:[];st.db.smsHistory.push({id:'sms-'+Date.now().toString(36),createdAt:new Date().toISOString(),username:u.username,userName:u.name,recipientCount:recipients.length,sent,failed,message,status:failed?'Completed with failures':'Completed',senderId:AT_SENDER_ID,details,providerRecipients:providerRecipients.map(x=>({messageId:x.messageId||'',number:x.number||'',statusCode:x.statusCode||'',status:x.status||'',cost:x.cost||''}))});if(st.db.smsHistory.length>500)st.db.smsHistory=st.db.smsHistory.slice(-500);
   const revision=await saveState(Number(st.revision||0),st.db);return send(res,200,{ok:true,sent,failed,recipientCount:recipients.length,revision,db:st.db});
  }
  if(req.method==='POST'&&new URL(req.url,'http://'+(req.headers.host||'localhost')).pathname==='/api/sms/dlr'){
   const u=new URL(req.url,'http://'+(req.headers.host||'localhost'));if(AT_DLR_KEY&&u.searchParams.get('key')!==AT_DLR_KEY)return send(res,403,{error:'forbidden'});
   const raw=await readBody(req);let body={};try{body=JSON.parse(raw||'{}')}catch(e){const p=new URLSearchParams(raw);p.forEach((v,k)=>body[k]=v)}
   const messageId=String(body.id||body.messageId||'').trim(),status=String(body.status||'').trim(),number=String(body.phoneNumber||body.number||'').trim(),reason=String(body.failureReason||body.description||'').trim();
   if(!messageId)return send(res,200,{ok:true,received:true});
   const st=await getState();st.db.smsHistory=Array.isArray(st.db.smsHistory)?st.db.smsHistory:[];let changed=false;
   for(const h of st.db.smsHistory){for(const r of (h.providerRecipients||[])){if(r.messageId===messageId){r.deliveryStatus=status;r.deliveryReason=reason;r.deliveryAt=new Date().toISOString();changed=true;h.lastDeliveryUpdate=r.deliveryStatus}}}
   if(changed){try{const revision=await saveState(Number(st.revision||0),st.db);return send(res,200,{ok:true,updated:true,revision})}catch(e){return send(res,200,{ok:true,received:true,retry:true})}}
   return send(res,200,{ok:true,received:true,matched:false,number});
  }
  if(req.method==='GET'&&req.url==='/api/state'){
   if(!auth(req))return send(res,401,{error:'unauthorized'});return send(res,200,await getState());
  }
  if(req.method==='POST'&&req.url==='/api/state'){
   if(!auth(req))return send(res,401,{error:'unauthorized'});const body=JSON.parse(await readBody(req));if(!body||!body.db)return send(res,400,{error:'Database payload missing'});const revision=await saveState(Number(body.revision||0),body.db);return send(res,200,{ok:true,version:APP_VERSION,revision,saved:true});
  }
  return send(res,404,{error:'Not found'});
 }catch(e){const code=e.code===401?401:e.code===409?409:500;send(res,code,{error:e.message||'Server error',revision:e.currentRevision});}
});
server.listen(PORT,HOST,()=>console.log(`LSCC Cloud V6.1 listening on port ${PORT}`));
