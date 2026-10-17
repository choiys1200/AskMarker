// Actual MV3. Capture and invoke the registered toolbar callback, then let the
// real chrome.scripting API reinject the shipped content script. No real toolbar
// UI click or live AI service is claimed. Host grants are test-copy-only because
// invoking the listener does not grant activeTab like a real toolbar click.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.QA_OUTPUT||'work/menu-visibility');fs.mkdirSync(out,{recursive:true});
 const extension=path.join(out,'test-extension');fs.mkdirSync(extension,{recursive:true});const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));manifest.host_permissions=['https://chatgpt.com/*','https://gemini.google.com/*'];fs.writeFileSync(path.join(extension,'manifest.json'),JSON.stringify(manifest));
 fs.copyFileSync(path.join(root,'content.js'),path.join(extension,'content.js'));fs.cpSync(path.join(root,'assets'),path.join(extension,'assets'),{recursive:true});
 fs.writeFileSync(path.join(extension,'background.js'),'const qaAdd=chrome.action.onClicked.addListener.bind(chrome.action.onClicked);chrome.action.onClicked.addListener=fn=>{globalThis.qaToolbarClick=fn;qaAdd(fn);};\n'+fs.readFileSync(path.join(root,'background.js'),'utf8'));
 const ctx=await chromium.launchPersistentContext(fs.mkdtempSync(path.join(out,'profile-')),{headless:true,executablePath:process.env.QA_BROWSER,viewport:{width:1560,height:1200},args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});const cases=[],errors=[];
 try{
  const worker=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker'),p=ctx.pages()[0];p.on('pageerror',e=>errors.push(e.message));const cdp=await ctx.newCDPSession(p);await cdp.send('Runtime.enable');cdp.on('Runtime.exceptionThrown',e=>errors.push(e.exceptionDetails.exception?.description||e.exceptionDetails.text));
  const html=fs.readFileSync(path.join(__dirname,'fixture.html'),'utf8');
  for(const host of ['chatgpt.com','gemini.google.com']){
   const url='https://'+host+(host==='chatgpt.com'?'/c/':'/app/')+'menu-visibility';await ctx.route(url,r=>r.fulfill({contentType:'text/html',body:html}));await p.goto(url);
   async function toolbar(){await worker.evaluate(async url=>{const tab=(await chrome.tabs.query({})).find(t=>t.url===url);if(!tab)throw Error('Fixture tab missing');await globalThis.qaToolbarClick({id:tab.id});},url);}
   if(host!=='chatgpt.com')await toolbar();
   const ext=p.locator('#question-basket-extension'),dock=ext.locator('#dock'),panel=ext.locator('#panel'),drafts=()=>p.locator('[data-qb-inline^="draft-"]');await dock.waitFor();
   await ext.locator('#mode-compact').click();
   async function drag(id){const loc=p.locator('#'+id);await loc.scrollIntoViewIfNeeded();const b=await loc.boundingBox();await p.mouse.move(b.x+2,b.y+14);await p.mouse.down();await p.mouse.move(b.x+240,b.y+14,{steps:12});await p.mouse.up();await ext.locator('#selection-add').click();await drafts().waitFor();return drafts();}
   let draft=await drag('first');await draft.getByRole('textbox').fill('숨겨도 남아 있어야 할 저장 질문');await draft.getByRole('button',{name:'질문 저장',exact:true}).click();await draft.waitFor({state:'detached'});await p.waitForFunction(()=>document.querySelector('#question-basket-extension').shadowRoot.getElementById('count').textContent==='1');
   await ext.locator('#launcher').click();await ext.locator('#list .prompt-include').uncheck();await ext.locator('#close').click();
   draft=await drag('second');await draft.getByRole('textbox').fill('메뉴를 숨겨도 보존할 작성 중 초안');const id=await draft.getAttribute('data-qb-inline'),quote=await draft.locator('blockquote').textContent(),before=await worker.evaluate(()=>chrome.storage.local.get(null));
   for(let i=0;i<10;i++){
    await ext.getByRole('button',{name:'숨기기',exact:true}).click();assert.equal(await dock.isVisible(),false);assert.equal(await panel.isVisible(),false);assert.equal(await ext.locator('#mode-compact').getAttribute('aria-pressed'),'true');assert.equal(await p.locator('[data-qb-inline]').count(),2);
    if(i===4){await p.setViewportSize({width:1050,height:700});await p.setViewportSize({width:1560,height:1200});}
    await toolbar();await dock.waitFor({state:'visible'});assert.equal(await panel.isVisible(),false,'Toolbar restores the compact menu');assert.equal(await p.locator('#question-basket-extension').count(),1);assert.equal(await p.locator(`[data-qb-inline="${id}"]`).getByRole('textbox').inputValue(),'메뉴를 숨겨도 보존할 작성 중 초안');assert.equal(await draft.locator('blockquote').textContent(),quote);assert.deepEqual(await worker.evaluate(()=>chrome.storage.local.get(null)),before);
   }
   const checks=['Ten hide → registered toolbar callback → real content-script reinjection cycles restore compact menu with no duplicate roots, storage writes, source swaps or lost draft; reading mode and saved annotations remain'];
   // A source change can rescue a draft in the sidebar. It must not reopen a
   // menu the user explicitly hid until the toolbar is used again.
   await ext.locator('#hide-menu').click();await p.locator('#second').evaluate(el=>el.textContent='원문 변경 후에도 초안은 보존합니다.');await draft.waitFor({state:'detached'});assert.equal(await dock.isVisible(),false);assert.equal(await panel.isVisible(),false);
   await toolbar();await dock.waitFor();await ext.locator('#launcher').click();const rescued=ext.locator('#draft-list textarea');await rescued.waitFor();assert.equal(await rescued.inputValue(),'메뉴를 숨겨도 보존할 작성 중 초안');await ext.locator('#draft-list').getByRole('button',{name:'취소',exact:true}).click();await ext.locator('#close').click();checks.push('Hidden menu stays hidden during source rerender; toolbar recovery preserves sidebar-rescued draft');
   await ext.locator('#mode-compact').click();await ext.locator('#hide-menu').click();await toolbar();await dock.waitFor();assert.equal(await ext.locator('#mode-compact').getAttribute('aria-pressed'),'false');assert.equal(await p.locator('[data-qb-inline]').count(),0);await ext.locator('#launcher').click();assert.equal(await ext.locator('#list .prompt-include').isChecked(),false);await ext.locator('#close').click();checks.push('OFF mode and excluded prompt checkbox survive hide/reopen; saved question is intact');
   await p.emulateMedia({colorScheme:'dark'});await dock.screenshot({path:path.join(out,host+'-dock-dark.png'),animations:'disabled'});await p.emulateMedia({colorScheme:'light'});await dock.screenshot({path:path.join(out,host+'-dock-light.png'),animations:'disabled'});assert.deepEqual(await worker.evaluate(()=>chrome.storage.local.get(null)),before);checks.push('Compact hide button rendered in light/dark; no saved data changes');
   cases.push({host,result:'PASS',checks});console.log('PASS',host,'hide/reopen and state preservation');
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'menu-visibility-results.json'),JSON.stringify({version:'0.9.1',environment:'Actual MV3 + synthetic ChatGPT/Gemini HTML; captured toolbar listener invoked programmatically, real scripting reinjection; test-only host grants instead of actual toolbar activeTab authorization. Not real toolbar UI/live site.',cases,errors},null,2));
 }finally{await ctx.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
