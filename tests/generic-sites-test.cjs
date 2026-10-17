// Real MV3 runtime/storage on synthetic non-ChatGPT pages. Only the TEST copy
// adds host permissions so the runner can invoke the same executeScript API as
// the toolbar. This does NOT exercise a real toolbar click or live AI servers.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.QA_OUTPUT||'work/generic-sites');fs.mkdirSync(out,{recursive:true});
 const extension=path.join(out,'test-extension');fs.mkdirSync(extension,{recursive:true});
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
 assert.deepEqual(manifest.content_scripts[0].matches,['https://chatgpt.com/*']);
 assert.ok(manifest.permissions.includes('activeTab'));assert.ok(manifest.permissions.includes('scripting'));
 manifest.host_permissions=['https://gemini.google.com/*','https://grok.com/*'];
 fs.writeFileSync(path.join(extension,'manifest.json'),JSON.stringify(manifest));
 for(const f of ['background.js','content.js'])fs.copyFileSync(path.join(root,f),path.join(extension,f));
 for(const dir of ['assets'])fs.cpSync(path.join(root,dir),path.join(extension,dir),{recursive:true});
 const ctx=await chromium.launchPersistentContext(fs.mkdtempSync(path.join(out,'profile-')),{headless:true,executablePath:process.env.QA_BROWSER,viewport:{width:1450,height:950},args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
 const cases=[];
 try{
  const worker=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker'),errors=[];
  const html='<!doctype html><html><head><meta charset="utf-8"><style>body{font:17px/2 system-ui;margin:50px 440px 70px 60px}main{max-width:750px}textarea{width:600px;height:70px}pre{padding:16px;background:#eef0f5}</style></head><body><main><h1>Generic AI response fixture</h1><p id="one">Read an AI answer, mark the source, and collect a question.</p><p id="two">Keep the exact wording so the next prompt has its context.</p><pre><code id="code">const nextPrompt = questions.join("\\n");</code></pre></main><textarea aria-label="Site composer">Keep this draft.</textarea></body></html>';
  await ctx.route('https://gemini.google.com/**',r=>r.fulfill({contentType:'text/html',body:html}));
  await ctx.route('https://grok.com/**',r=>r.fulfill({contentType:'text/html',body:html}));
  const p=ctx.pages()[0];p.on('pageerror',e=>errors.push(e.message));
  const cdp=await ctx.newCDPSession(p);cdp.on('Runtime.exceptionThrown',e=>errors.push(e.exceptionDetails.exception?.description||e.exceptionDetails.text));await cdp.send('Runtime.enable');
  for(const url of ['https://gemini.google.com/app/fixture-one','https://grok.com/c/fixture-one']){
   const inject=()=>worker.evaluate(async url=>{const tab=(await chrome.tabs.query({})).find(t=>t.url===url);if(!tab)throw Error('Fixture tab missing');await chrome.scripting.executeScript({target:{tabId:tab.id},files:['content.js']});},url);
   await p.goto(url);assert.equal(await p.locator('#question-basket-extension').count(),0,'Other AI sites do not auto-inject');await inject();
   const ext=p.locator('#question-basket-extension'),draft=()=>p.locator('[data-qb-inline^="draft-"]');
   await ext.locator('#mode-compact').click();
   async function drag(id){const el=p.locator('#'+id);await el.scrollIntoViewIfNeeded();const b=await el.evaluate(el=>{const r=document.createRange();r.setStart(el.firstChild,0);r.setEnd(el.firstChild,18);const b=r.getBoundingClientRect();return{x:b.x,y:b.y,w:b.width,h:b.height};});await p.mouse.move(b.x+1,b.y+b.h/2);await p.mouse.down();await p.mouse.move(b.x+b.w-1,b.y+b.h/2,{steps:12});await p.mouse.up();await ext.locator('#selection-add').waitFor();}
   for(let i=0;i<10;i++){await drag(i%2?'two':'one');await ext.locator('#selection-add').click();await draft().getByRole('button',{name:'취소',exact:true}).click();await draft().waitFor({state:'detached'});}
   for(const [id,q]of [['one','Why does this passage matter?'],['code','What does this code return?']]){await drag(id);await ext.locator('#selection-add').click();await draft().getByRole('textbox').fill(q);await draft().getByRole('button',{name:'질문 저장',exact:true}).click();await draft().waitFor({state:'detached'});}
   await ext.locator('#launcher').click();assert.equal(await ext.locator('#count').textContent(),'2');assert.equal(await p.locator('[data-qb-inline]').count(),2);assert.equal(await ext.locator('#quick-insert').isEnabled(),true);
   const notes=await worker.evaluate(async url=>Object.values(await chrome.storage.local.get(null)).filter(n=>n&&n.scope===url&&n.question),url);assert.equal(notes.length,2);
   await ext.locator('#generate').click();const prompt=await ext.locator('#prompt').inputValue();for(const n of notes){assert.ok(prompt.includes(n.quote));assert.ok(prompt.includes(n.question));}assert.equal(await ext.locator('#insert').isVisible(),true);
   await ctx.grantPermissions(['clipboard-read','clipboard-write'],{origin:new URL(url).origin});
   await ext.locator('#quick-copy').click();assert.equal((await p.evaluate(()=>navigator.clipboard.readText())).replace(/\r\n/g,'\n'),prompt);
   await p.reload();await inject();await ext.locator('#launcher').click();
   // Isolated-world permission failure, without changing production APIs.
   await worker.evaluate(async url=>{const tab=(await chrome.tabs.query({})).find(t=>t.url===url);await chrome.scripting.executeScript({target:{tabId:tab.id},func:()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('test clipboard denial');}}});const exec=document.execCommand.bind(document);document.execCommand=(cmd,...args)=>cmd==='copy'?false:exec(cmd,...args);}});},url);
   await ext.locator('#quick-copy').click();await ext.locator('#preview').waitFor();assert.equal(await ext.locator('#prompt').inputValue(),prompt);assert.equal(await ext.locator('#insert').isVisible(),true,'Copy fallback retains the cross-site append action');
   assert.equal(await p.locator('textarea[aria-label="Site composer"]').inputValue(),'Keep this draft.');
   assert.equal(await ext.locator('#list .prompt-include:checked').count(),2,'Copy alone does not claim successful delivery');
   await p.reload();await inject();await ext.locator('#mode-compact').click();await p.waitForFunction(()=>document.querySelectorAll('[data-qb-inline]').length===2);
   assert.equal(await p.evaluate(()=>[...CSS.highlights.values()].reduce((n,h)=>n+h.size,0)),2);
   await p.locator('#one').evaluate(el=>el.textContent='Changed source text');await p.waitForFunction(()=>document.querySelectorAll('[data-qb-inline]').length===0);
   await ext.locator('#launcher').click();assert.equal(await ext.locator('#count').textContent(),'2','Changed generic root retains notes without guessing');
   await p.goto(url+'-other');await worker.evaluate(async()=>{const tabs=await chrome.tabs.query({});const tab=tabs.find(t=>t.url?.endsWith('-other'));await chrome.scripting.executeScript({target:{tabId:tab.id},files:['content.js']});});
   await p.locator('#question-basket-extension').locator('#launcher').click();assert.equal(await p.locator('#question-basket-extension').locator('#count').textContent(),'0');
   cases.push({host:new URL(url).hostname,result:'PASS',checks:['No automatic injection; scripting entry point works','Ten mouse drag/add/cancel cycles','Text/code notes, highlights, inline and sidebar views','Exact prompt preview, enabled append and clipboard; copy alone leaves input untouched','Reload restores unchanged source; changed source retains detached records','Different URL and different host records isolated'],limitation:'Generic main/body anchor: changes elsewhere in the indexed root may detach markers; list records remain. Live editor delivery tested separately from these synthetic textareas.'});
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'generic-sites-results.json'),JSON.stringify({environment:'Actual MV3 content/storage with test-only host grants; synthetic ordinary DOM at Gemini/Grok URLs, NOT live site or toolbar permission verification',cases,errors},null,2));console.log(JSON.stringify(cases,null,2));
 }finally{await ctx.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
