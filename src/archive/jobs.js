'use strict';
const {ArchiveError}=require('./http');
const {toMarkdown}=require('./document');
const JOB='am:archive:job:',ENABLED='am:archive:enabled',EPOCH='am:archive:epoch';
const digest=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('');
// Durable receipts; no scheduler, automatic retry, or startup upload.
function createJobs({storage,provider,clock=()=>new Date().toISOString()}){
 const active=new Map();let generation=0,local=Promise.resolve();
 function locked(fn){const next=local.catch(()=>{}).then(fn);local=next;return next;}
 async function guard(epoch,id){const s=await storage.get([ENABLED,JOB+id]);if(generation!==epoch||s[ENABLED]!==true||s[JOB+id]?.status==='cancelled')throw new ArchiveError('CANCELLED');}
 async function run(input){
  if(active.has(input.snapshot.id))return active.get(input.snapshot.id).promise;
  const control=new AbortController(),epoch=generation;
  const promise=(async()=>{
   if((await storage.get(ENABLED))[ENABLED]!==true)throw new ArchiveError('DISABLED');
   if(!['drive','notion'].includes(input.provider)||!input.snapshot?.id||!input.destination?.id||!input.snapshot.approvedAt||new TextEncoder().encode(JSON.stringify(input.snapshot)).length>2000000)throw new ArchiveError('INVALID_SNAPSHOT');
   const all=await storage.get(null);if((input.snapshot.epoch||0)!==(all[EPOCH]||0))throw new ArchiveError('STALE_PREVIEW');const required=new Set([...input.snapshot.marks.map(m=>m.id),...input.snapshot.requests.flatMap(r=>r.markIds)]),existing=new Set(Object.entries(all).filter(([k,v])=>k.startsWith('qb:note:')&&v?.id).map(([,v])=>v.id));if([...required].some(id=>!existing.has(id)))throw new ArchiveError('LOCAL_RECORD_DELETED');
   const key=JOB+input.snapshot.id,hash=await digest(JSON.stringify({snapshot:input.snapshot,provider:input.provider,destination:input.destination}));let job=(await storage.get(key))[key];
   if(job&&job.digest!==hash)throw new ArchiveError('SNAPSHOT_CHANGED');
   if(job?.status==='cancelled')throw new ArchiveError('CANCELLED');if(job?.status==='saved')return job.result;
   if(!job){job={...structuredClone(input),digest:hash,markdown:toMarkdown(input.snapshot),status:'approved',createdAt:clock()};await locked(async()=>{await guard(epoch,input.snapshot.id);await storage.set({[key]:job});});}
   const persist=()=>locked(async()=>{await guard(epoch,input.snapshot.id);await storage.set({[key]:structuredClone(job)});});
   try{const p=await provider(job.provider,()=>guard(epoch,input.snapshot.id),control.signal);await guard(epoch,input.snapshot.id);job.status='uploading';await persist();const result=await p.save(job,persist);await guard(epoch,input.snapshot.id);job.status='saved';job.result=result;job.savedAt=clock();await persist();return result;}
   catch(e){if(generation===epoch&&!control.signal.aborted){job.status='needs-user-retry';job.error=e.code||'UNKNOWN';await persist().catch(()=>{});}throw e;}
  })().finally(()=>active.delete(input.snapshot.id));active.set(input.snapshot.id,{promise,control});return promise;
 }
 async function cancel({noteIds=null,all=false,purge=false}={}){generation++;for(const a of active.values())a.control.abort();return locked(async()=>{const values=await storage.get(null),updates={[EPOCH]:(values[EPOCH]||0)+1};for(const[k,j]of Object.entries(values)){if(!k.startsWith(JOB))continue;if(all||!noteIds||j.snapshot?.marks.some(m=>noteIds.includes(m.id))||j.snapshot?.requests.some(r=>r.markIds.some(id=>noteIds.includes(id))))updates[k]={...j,status:'cancelled',...(purge?{snapshot:null,markdown:null}:{}),cancelledAt:clock()};}await storage.set(updates);});}
 return {run,cancel};
}
module.exports={createJobs,JOB,ENABLED,EPOCH,digest};
