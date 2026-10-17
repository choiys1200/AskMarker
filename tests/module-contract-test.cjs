// Domain/storage tests deliberately run without browser or extension globals.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {formatPrompt}=require('../src/domain/prompt');
const {fontOf,opacityOf}=require('../src/domain/appearance');
const {createWriteQueue}=require('../src/storage/queue');
const {createPromptChoices}=require('../src/storage/prompt-choices');
const {choiceKey}=require('../src/domain/notes');
(async()=>{
 const checks=[],out=process.env.QA_OUTPUT;
 const notes=[{id:'a',scope:'chat-a',quote:'원문\n  그대로',question:'질문 1'},{id:'b',scope:'chat-a',quote:'두 번째',question:'질문 2'}];
 assert.ok(formatPrompt([notes[1]],notes).includes('질문 2\n'));assert.ok(formatPrompt(notes).includes(notes[0].quote));
 assert.equal(fontOf('invalid'),'system');assert.equal(opacityOf(NaN),60);assert.equal(opacityOf(150),100);assert.equal(opacityOf(-5),0);
 checks.push('Pure prompt formatting preserves exact pairs/order; appearance values validated without DOM');
 const queue=createWriteQueue(),data={},events=[];let fail=false;
 const choices=createPromptChoices({storage:{set:async entry=>{if(fail){fail=false;throw Error('failure');}Object.assign(data,entry);}},enqueue:queue.enqueue,onChange:()=>events.push('change'),onError:()=>events.push('error')});
 const before=choices.revision();await choices.set(notes,false);choices.hydrate({},before);assert.equal(choices.included(notes[0]),false);
 assert.equal(choices.included({...notes[0],scope:'another'}),true);assert.equal(choices.included({...notes[0],id:'new'}),true);
 choices.applyChanges({[choiceKey(notes[0])]:{newValue:true}},notes);assert.equal(choices.included(notes[0]),true);
 fail=true;assert.equal(await choices.set(notes,true),false);assert.ok(events.includes('error'));
 checks.push('Consumed membership survives delayed reads; new note/conversation defaults; external changes; persistence failure reported');
 // Enforce the boundary that prompted this refactor. Future appearance features
 // may depend only on their schema and documented site selectors, never notes.
 const root=path.resolve(__dirname,'../src');
 for(const name of ['ui/appearance.js','domain/appearance.js','ui/panel.js','ui/dock.js']){
  const code=fs.readFileSync(path.join(root,name),'utf8');
  assert.ok(!/require\([^)]*\/(?:notes|prompt-choices|composer|source|app|cards)(?:\.js)?['"]\)/.test(code),name);
  assert.ok(!/qb:note:|qb:prompt-choice:/.test(code),name);
 }
 checks.push('Appearance/panel dependency contract forbids core note, choice, source and composer access');
 if(out){fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'module-contract-results.json'),JSON.stringify({environment:'Node unit/architecture tests; no browser',checks},null,2));}
 console.log(checks);
})().catch(e=>{console.error(e);process.exitCode=1;});
