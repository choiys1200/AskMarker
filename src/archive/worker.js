'use strict';
const {GoogleDriveProvider}=require('./google-drive-provider');
const {NotionProvider}=require('./notion-provider');
const {ArchiveError,request}=require('./http');
const {createJobs,JOB,ENABLED,EPOCH,digest}=require('./jobs');
const {notionBroker}=require('./config');
const TOKEN='am:private:tokens';
function installArchiveWorker(){
 if(!chrome.runtime.onMessage||!chrome.storage.session)return;
 const storage=chrome.storage.local,session=chrome.storage.session;
 session.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'}).catch(()=>{});
 const trusted=sender=>sender.id===chrome.runtime.id&&sender.url?.split('?')[0]===chrome.runtime.getURL('archive.html');
 let tokenRevision=0,tokenQueue=Promise.resolve();
 function tokenLock(fn){const next=tokenQueue.catch(()=>{}).then(fn);tokenQueue=next;return next;}
 async function token(provider){const tokens=(await session.get(TOKEN))[TOKEN]||{};if(!tokens[provider])throw new ArchiveError('NOT_CONNECTED');return tokens[provider];}
 const jobs=createJobs({storage,provider:async(name,guard,signal)=>new (name==='drive'?GoogleDriveProvider:NotionProvider)({token:await token(name),guard,signal})});
 async function state(){const s=await storage.get(ENABLED),tokens=(await session.get(TOKEN))[TOKEN]||{},manifest=chrome.runtime.getManifest();return {enabled:s[ENABLED]===true,driveConfigured:!!manifest.oauth2?.client_id,notionConfigured:!!notionBroker,connected:{drive:!!tokens.drive,notion:!!tokens.notion}};}
 async function connect(name){if((await storage.get(ENABLED))[ENABLED]!==true)throw new ArchiveError('DISABLED');const rev=tokenRevision;let value;
  if(name==='drive'){if(!chrome.runtime.getManifest().oauth2?.client_id)throw new ArchiveError('SETUP_REQUIRED');try{const r=await chrome.identity.getAuthToken({interactive:true,scopes:['https://www.googleapis.com/auth/drive.file']});value=r.token||r;}catch{throw new ArchiveError('AUTH_CANCELLED_OR_DENIED');}}
  else if(name==='notion'){
   if(!notionBroker)throw new ArchiveError('SETUP_REQUIRED');const verifier=crypto.randomUUID()+crypto.randomUUID(),challenge=await digest(verifier),redirect=chrome.identity.getRedirectURL('notion');let result;
   try{result=await chrome.identity.launchWebAuthFlow({interactive:true,url:notionBroker+'/start?'+new URLSearchParams({challenge,redirect})});}catch{throw new ArchiveError('AUTH_CANCELLED_OR_DENIED');}
   const url=new URL(result);if(url.origin+url.pathname!==redirect)throw new ArchiveError('AUTH_INVALID');const code=new URLSearchParams(url.hash.slice(1)).get('code');if(!code)throw new ArchiveError('AUTH_CANCELLED_OR_DENIED');
   const exchanged=await request(notionBroker+'/exchange',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,verifier})});value=exchanged.access_token;
  }else throw new ArchiveError('INVALID_PROVIDER');
  return tokenLock(async()=>{if(!value||rev!==tokenRevision||(await storage.get(ENABLED))[ENABLED]!==true)throw new ArchiveError('CANCELLED');const tokens=(await session.get(TOKEN))[TOKEN]||{};tokens[name]=value;await session.set({[TOKEN]:tokens});return {connected:true};});
 }
 async function handle(m,sender){
  if(!trusted(sender)){
   if(m.op!=='open'||!sender.tab?.id||sender.id!==chrome.runtime.id)throw new ArchiveError('UNTRUSTED_SENDER');
   if(JSON.stringify(m.seed||{}).length>2000000)throw new ArchiveError('SNAPSHOT_TOO_LARGE');
   const seedId=crypto.randomUUID(),epoch=(await storage.get(EPOCH))[EPOCH]||0;await session.set({['am:seed:'+seedId]:{...m.seed,epoch}});await chrome.tabs.create({url:chrome.runtime.getURL('archive.html')+'?seed='+seedId});return {opened:true};
  }
  switch(m.op){
   case 'state':return state();
   case 'seed':return (await session.get('am:seed:'+m.id))['am:seed:'+m.id]||null;
   case 'enable':if(m.value!==true){tokenRevision++;await jobs.cancel({all:true});}await storage.set({[ENABLED]:m.value===true});return state();
   case 'connect':return connect(m.provider);
   case 'disconnect':{tokenRevision++;await jobs.cancel({all:true});await tokenLock(async()=>{const tokens=(await session.get(TOKEN))[TOKEN]||{};if(m.provider==='drive'&&tokens.drive)await chrome.identity.removeCachedAuthToken({token:tokens.drive}).catch(()=>{});delete tokens[m.provider];await session.set({[TOKEN]:tokens});});return state();}
   case 'destinations':{if((await storage.get(ENABLED))[ENABLED]!==true)throw new ArchiveError('DISABLED');const p=new(m.provider==='drive'?GoogleDriveProvider:NotionProvider)({token:await token(m.provider),guard:async()=>{if((await storage.get(ENABLED))[ENABLED]!==true)throw new ArchiveError('DISABLED');}});return p.destinations();}
   case 'save':return jobs.run(m.job);
   case 'receipts':return Object.values(await storage.get(null)).filter(v=>v&&v.snapshot&&v.digest&&v.status&&v.provider).map(v=>({id:v.snapshot.id,status:v.status,job:v}));
   case 'purge':{tokenRevision++;await jobs.cancel({all:true,purge:true});const all=await storage.get(null);await storage.remove(Object.keys(all).filter(k=>k.startsWith('am:archive:history:')));const temp=await session.get(null);await session.remove(Object.keys(temp).filter(k=>k.startsWith('am:seed:')));return {deleted:true};}
   default:throw new ArchiveError('UNKNOWN_ACTION');
  }
 }
 chrome.runtime.onMessage.addListener((m,sender,reply)=>{if(m?.channel!=='askmarker-archive')return;handle(m,sender).then(data=>reply({ok:true,data})).catch(e=>reply({ok:false,error:e.code||'FAILED'}));return true;});
 chrome.storage.onChanged.addListener((changes,area)=>{if(area!=='local')return;const deleted=Object.entries(changes).filter(([k,c])=>k.startsWith('qb:note:')&&c.oldValue&&!c.newValue).map(([,c])=>c.oldValue.id);if(deleted.length){tokenRevision++;jobs.cancel({noteIds:deleted,purge:true}).then(async()=>{const all=await storage.get(null);await storage.remove(Object.keys(all).filter(k=>k.startsWith('am:archive:history:')&&all[k].markIds?.some(id=>deleted.includes(id))));const temp=await session.get(null);await session.remove(Object.keys(temp).filter(k=>k.startsWith('am:seed:')));}).catch(()=>{});}});
}
module.exports={installArchiveWorker};
