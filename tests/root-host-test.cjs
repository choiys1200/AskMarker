// Real MV3 extension regression for the user's getRootNode().host.hasAttribute TypeError.
// Fault injection in the extension isolated world: Document.host is a native HTMLCollection, not a ShadowRoot host.
const {chromium}=require('playwright');const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.QA_OUTPUT||'work/root-host-validation');fs.mkdirSync(out,{recursive:true});
 const fixture=fs.readFileSync(path.join(root,'tests/fixture.html'),'utf8').replace('<body>','<body><form name="host" hidden></form><form name="host" hidden></form>');
 const results=[];
 async function run(extensionPath,fixed){
  const ctx=await chromium.launchPersistentContext(fs.mkdtempSync(path.join(out,'profile-')),{headless:true,executablePath:process.env.QA_BROWSER,viewport:{width:1560,height:1100},args:[`--disable-extensions-except=${extensionPath}`,`--load-extension=${extensionPath}`]});
  try{
   const worker=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker');const version=await worker.evaluate(()=>chrome.runtime.getManifest().version);
   await ctx.route('https://chatgpt.com/**',r=>r.fulfill({contentType:'text/html',body:fixture}));
   const p=ctx.pages()[0],errors=[],worlds=[];p.on('pageerror',e=>errors.push(e.message));const cdp=await ctx.newCDPSession(p);cdp.on('Runtime.executionContextCreated',e=>worlds.push(e.context));cdp.on('Runtime.exceptionThrown',e=>errors.push(e.exceptionDetails.exception?.description||e.exceptionDetails.text));await cdp.send('Runtime.enable');await p.goto('https://chatgpt.com/c/root-host-regression');const ext=p.locator('#question-basket-extension');await ext.waitFor();if(await ext.locator('#mode-compact').count())await ext.locator('#mode-compact').click();
   async function injectHost(){const world=worlds.filter(w=>w.origin.includes('chrome-extension')).at(-1);assert.ok(world);const result=await cdp.send('Runtime.evaluate',{contextId:world.id,expression:'Object.defineProperty(document,"host",{value:document.forms,configurable:true});JSON.stringify({type:document.host.constructor.name,length:document.host.length,method:typeof document.host.hasAttribute})',returnByValue:true});assert.ok(!result.exceptionDetails);return JSON.parse(result.result.value);}
   const named=await injectHost();assert.deepEqual(named,{type:'HTMLCollection',length:2,method:'undefined'});
   async function drag(id){const el=p.locator('#'+id);await el.scrollIntoViewIfNeeded();const b=await el.boundingBox();await p.mouse.move(b.x+2,b.y+15);await p.mouse.down();await p.mouse.move(b.x+280,b.y+15,{steps:12});await p.mouse.up();if(await ext.locator('#selection-add').isVisible())await ext.locator('#selection-add').click();}
   await drag('first');
   if(!fixed){await p.waitForTimeout(200);assert.ok(errors.some(e=>/hasAttribute is not a function/.test(e)),JSON.stringify(errors));assert.equal(await p.locator('[data-qb-inline]').count(),0);results.push({version,documentHost:named,result:'REPRODUCED',errors,bubbleCount:0});return;}
   const drafts=()=>p.locator('[data-qb-inline^="draft-"]');await drafts().waitFor();
   for(let i=0;i<10;i++){if(i)await drag(i%2?'second':'first');await drafts().waitFor();await drafts().getByRole('textbox',{name:'코멘트'}).fill(i===5?'그림자 DOM 입력 이벤트 확인':'');await drafts().getByRole('button',{name:i%2?'작성 취소':'취소',exact:true}).click();await drafts().waitFor({state:'detached'});}
   await drag('first');await drafts().getByRole('textbox',{name:'코멘트'}).fill('예외 수정 후 첫 코멘트');await drafts().getByRole('button',{name:'코멘트 저장',exact:true}).click();await drafts().waitFor({state:'detached'});
   await drag('second');await drafts().getByRole('textbox',{name:'코멘트'}).fill('예외 수정 후 두 번째 코멘트');await drafts().getByRole('button',{name:'코멘트 저장',exact:true}).click();await drafts().waitFor({state:'detached'});
   await p.waitForFunction(()=>document.querySelector('#question-basket-extension').shadowRoot.getElementById('count').textContent==='2');
   await ext.locator('#launcher').click();await ext.locator('#generate').click();assert.ok((await ext.locator('#prompt').inputValue()).includes('예외 수정 후 두 번째 코멘트'));await ext.locator('#preview-close').click();
   await p.reload();await ext.waitFor();if(await ext.locator('#mode-compact').count())await ext.locator('#mode-compact').click();await injectHost();await p.waitForFunction(()=>document.querySelectorAll('[data-qb-inline]').length===2);assert.equal(await p.locator('form[name="host"]').count(),2);assert.deepEqual(errors,[]);
   await ext.locator('#launcher').click();await p.screenshot({path:path.join(out,'v040-root-host-fixed.png')});
   results.push({version,documentHost:named,result:'PASS',realMouseCancelCycles:10,savedAndRestored:2,promptVerified:true,siteNamedFormsUntouched:true,errors});
  }finally{await ctx.close();}
 }
 if(process.env.QA_BASELINE)await run(path.resolve(process.env.QA_BASELINE),false);
 await run(root,true);fs.writeFileSync(path.join(out,'root-host-results.json'),JSON.stringify({environment:'Real unpacked MV3 extension, isolated Chromium, local fixture. CDP fault-injected Document.host=HTMLCollection in the extension isolated world. Not live ChatGPT; the actual host value on the user page is not known.',results},null,2));console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
