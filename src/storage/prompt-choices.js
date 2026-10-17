'use strict';
const {CHOICE_PREFIX,choiceKey}=require('../domain/notes');
// Selection state never writes a note. Revision stamps reject stale storage reads.
function createPromptChoices({storage,enqueue,onChange,onError}) {
  const values=new Map(),pending=new Map(),versions=new Map();
  let revision=0;
  function remember(key,value){
    if(typeof value==='boolean') values.set(key,value); else values.delete(key);
    versions.set(key,++revision);
  }
  function hydrate(data,readRevision){
    const loaded=new Map(Object.entries(data).filter(([k,v])=>k.startsWith(CHOICE_PREFIX)&&typeof v==='boolean'));
    for(const[k,v]of versions)if(v>readRevision){if(values.has(k))loaded.set(k,values.get(k));else loaded.delete(k);}
    values.clear();for(const[k,v]of loaded)values.set(k,v);
    for(const[k,change]of pending)values.set(k,change.value);
  }
  function set(entries,value){
    const writes=entries.map(n=>{
      const key=choiceKey(n),change={value};remember(key,value);pending.set(key,change);
      return enqueue(key,()=>storage.set({[key]:value})).then(()=>true).catch(()=>{
        if(pending.get(key)!==change)return;
        pending.delete(key);onError();return false;
      }).finally(()=>{if(pending.get(key)===change)pending.delete(key);});
    });
    onChange();return Promise.all(writes).then(results=>results.every(Boolean));
  }
  function applyChanges(changes,notes){
    let changed=false;
    for(const[k,change]of Object.entries(changes))if(k.startsWith(CHOICE_PREFIX)&&!pending.has(k)){
      const before=values.get(k)!==false;remember(k,change.newValue);
      if(before!==(values.get(k)!==false)&&notes.some(n=>choiceKey(n)===k))changed=true;
    }
    if(changed)onChange();
  }
  return {included:n=>values.get(choiceKey(n))!==false,revision:()=>revision,hydrate,set,applyChanges};
}
module.exports={createPromptChoices};
