'use strict';
const {createConversationAdapter,normalize}=require('./adapters');
const ENABLED='am:archive:enabled',HISTORY='am:archive:history:';
// Prompt lifecycle is separate from insertion and from network providers.
function createCapture({doc,loc,storage,findComposer}){
 const adapter=createConversationAdapter(doc,loc);let enabled=false,batch=null,pending=null,revision=0,writing=Promise.resolve(),route=adapter.identity().scope,issue=null;
 const now=()=>new Date().toISOString();
 function persist(){if(!enabled||!batch)return;const value=structuredClone(batch),rev=revision,key=HISTORY+value.id;writing=writing.catch(()=>{}).then(async()=>{if(enabled&&rev===revision){const all=await storage.get(null),bytes=new TextEncoder().encode(JSON.stringify({...Object.fromEntries(Object.entries(all).filter(([k])=>k.startsWith(HISTORY))),[key]:value})).length;if(bytes>2000000){issue='local observation limit reached; newer observations omitted';return;}if(!enabled||rev!==revision)return;await storage.set({[key]:value});if(rev!==revision)await storage.remove(key);}}).catch(()=>{issue='local observation storage failed; observations may be missing';});}
 function observe(){if(!enabled)return;const view=adapter.read();if(view.meta.scope!==route){route=view.meta.scope;batch=null;pending=null;revision++;return;}
  if(pending&&batch){
   // A send gesture plus one newly rendered user message with exact text is evidence.
   // Clearing the editor, elapsed time or a similar quote are never evidence.
   const old=pending.before.messages,newMessages=view.messages;
   const prefix=old.every((m,i)=>newMessages[i]&&m.role===newMessages[i].role&&m.text===newMessages[i].text&&(!m.id||m.id===newMessages[i].id));
   const matches=prefix?newMessages.slice(old.length).filter(m=>m.role==='user'&&normalize(m.text)===normalize(pending.text)):[];
   if(matches.length===1){batch.sent={...matches[0],observedAt:now(),serverTime:null,evidence:'send-gesture-and-new-rendered-user-message',editedAfterInsertion:normalize(matches[0].text)!==normalize(batch.inserted?.editorText)};pending=null;persist();}
  }
  if(batch?.sent){const user=batch.sent.id?view.messages.find(m=>m.role==='user'&&m.id===batch.sent.id):view.messages.find(m=>m.index===batch.sent.index&&m.role==='user'&&m.text===batch.sent.text);
   if(!user||user.text!==batch.sent.text)return; // Branch/virtualization: never attach another turn.
   const next=view.messages.slice(user.index+1).find(m=>m.role==='user');
   const answers=view.messages.filter(m=>m.role==='assistant'&&m.index>user.index&&(!next||m.index<next.index));
   let changed=false;for(const a of answers){const previous=batch.answers.find(x=>x.messageId===a.id&&x.index===a.index&&x.text===a.text);if(previous)continue;
    const entry={messageId:a.id,index:a.index,text:a.text,observedAt:now(),serverTime:null,status:view.streaming?'streaming':'completion-unverified',partial:true,relationship:'request-batch',variant:'observed-version; regeneration/branch identity unverified'};const last=batch.answers.at(-1);if(last?.status==='streaming'&&last.messageId===a.id&&last.index===a.index)batch.answers[batch.answers.length-1]=entry;else batch.answers.push(entry);changed=true;}
   if(changed)persist();
  }
 }
 function generated(text,marks){if(!enabled)return null;const meta=adapter.identity();route=meta.scope;batch={id:crypto.randomUUID(),meta,markIds:marks.map(n=>n.id),marks:marks.map(n=>({id:n.id,quote:n.quote,comment:n.question})),generated:{text,at:now()},inserted:null,sent:null,answers:[],coverage:'only observed linked request; not the whole conversation',timezone:Intl.DateTimeFormat().resolvedOptions().timeZone};pending=null;persist();return batch.id;}
 function inserted(text,marks,editorText){if(!enabled)return;if(!batch||batch.generated.text!==text||batch.meta.scope!==adapter.identity().scope)generated(text,marks);batch.inserted={text,editorText,at:now()};persist();}
 function intent(){if(!enabled||!batch?.inserted)return;const el=findComposer(),text=el?.matches('textarea,input')?el.value:el?.innerText;if(!text?.trim())return;const before=adapter.read();if(!before.meta.identityVerified||before.meta.scope!==batch.meta.scope)return;pending={text,before};}
 doc.addEventListener('click',e=>{if(adapter.isSend(e.target))intent();},true);
 doc.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&findComposer()?.contains(e.target))intent();},true);
 const timer=setInterval(()=>{try{observe();}catch{/* Page re-rendering must not interrupt annotation. */}},1200);
 const initialRevision=revision;
 storage.get(ENABLED).then(x=>{if(revision===initialRevision)enabled=x[ENABLED]===true;}).catch(()=>{});
 return {generated,inserted,observe,adapter,issue:()=>issue,onChanges(changes){if(changes[ENABLED]){enabled=changes[ENABLED].newValue===true;revision++;batch=null;pending=null;}if(changes['am:archive:epoch']||Object.keys(changes).some(k=>k.startsWith('qb:note:')&&!changes[k].newValue)){revision++;batch=null;pending=null;}},stop(){clearInterval(timer);revision++;enabled=false;},flush:()=>writing};
}
module.exports={createCapture,ENABLED,HISTORY};
