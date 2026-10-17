// Real MV3 + real mouse. Controlled HTML, not live ChatGPT.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.QA_OUTPUT||'work/selection-action');fs.mkdirSync(out,{recursive:true});
 const ctx=await chromium.launchPersistentContext(fs.mkdtempSync(path.join(out,'profile-')),{headless:true,executablePath:process.env.QA_BROWSER,viewport:{width:1560,height:1100},args:[`--disable-extensions-except=${root}`,`--load-extension=${root}`]});const checks=[],errors=[],check=s=>{checks.push(s);console.log('PASS',s);};
 try{
  const worker=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker');assert.equal(await worker.evaluate(()=>chrome.runtime.getManifest().version),'0.8.0');
  let html=fs.readFileSync(path.join(__dirname,'fixture.html'),'utf8').replace('<article data-message-id="answer-one" data-message-author-role="assistant">','<article data-dil-source-message-id="answer-one"><div data-markdown-text-style="assistant-message">').replace('</article>','</div></article>');
  await ctx.route('https://chatgpt.com/**',r=>r.fulfill({contentType:'text/html',body:html}));const p=ctx.pages()[0];p.on('pageerror',e=>errors.push(e.message));const cdp=await ctx.newCDPSession(p);cdp.on('Runtime.exceptionThrown',e=>errors.push(e.exceptionDetails.exception?.description||e.exceptionDetails.text));await cdp.send('Runtime.enable');await p.goto('https://chatgpt.com/c/selection-action');
  const ext=p.locator('#question-basket-extension'),button=ext.locator('#selection-add'),drafts=()=>p.locator('[data-qb-inline^="draft-"]');
  const values=()=>worker.evaluate(async()=>Object.values(await chrome.storage.local.get(null)).filter(n=>n?.question));
  const highlights=()=>p.evaluate(()=>[...CSS.highlights.values()].reduce((sum,h)=>sum+h.size,0));
  const native=()=>p.evaluate(()=>getSelection().toString());
  const count=n=>p.waitForFunction(n=>document.querySelector('#question-basket-extension').shadowRoot.getElementById('count').textContent===String(n),n);
  async function drag(id='first',reverse=false){const el=p.locator('#'+id);await el.scrollIntoViewIfNeeded();const b=await el.boundingBox();await p.mouse.move(b.x+(reverse?230:2),b.y+15);await p.mouse.down();await p.mouse.move(b.x+(reverse?2:230),b.y+15,{steps:14});await p.mouse.up();}
  await drag();assert.equal(await button.isVisible(),false);assert.ok(await native());await ext.locator('#mode-compact').click();
  const originalY=(await p.locator('#second').boundingBox()).y;
  for(let i=0;i<10;i++){
   await drag(i%2?'second':'first',i%3===0);await button.waitFor({state:'visible'});assert.ok(await native());assert.equal(await drafts().count(),0);assert.equal(await highlights(),0);assert.equal((await values()).length,0);assert.equal(await p.evaluate(()=>document.activeElement?.tagName),'BODY');assert.equal((await p.locator('#second').boundingBox()).y,originalY);
  }
  check('Ten read-only drags keep native selection and focus; only one small button, no editor/highlight/record/layout shift');
  await p.screenshot({path:path.join(out,'selection-button.png')});
  const selected=await native();await button.click();await drafts().waitFor();assert.equal(await button.isVisible(),false);assert.equal(await drafts().locator('blockquote').textContent(),selected);assert.equal(await native(),'');assert.equal(await highlights(),1);assert.equal(await drafts().getByRole('textbox').evaluate(el=>el===el.getRootNode().activeElement),true);
  await drafts().getByRole('button',{name:'취소',exact:true}).click();await drafts().waitFor({state:'detached'});
  for(let i=0;i<10;i++){await drag(i%2?'second':'first',i%3===0);await button.click();await drafts().waitFor();await drafts().getByRole('button',{name:i%2?'작성 취소':'취소',exact:true}).click();await drafts().waitFor({state:'detached'});}
  check('Explicit button opens focused editor under exact source; ten add/cancel/reselect cycles');
  await drag();await button.waitFor({state:'visible'});await p.keyboard.press('Escape');assert.equal(await button.isVisible(),false);assert.equal(await drafts().count(),0);
  await drag('second');await button.waitFor({state:'visible'});await p.locator('main > h1').click();assert.equal(await button.isVisible(),false);
  await drag();await p.evaluate(()=>getSelection().removeAllRanges());await button.waitFor({state:'hidden'});assert.equal((await values()).length,0);
  check('Escape, outside click and cleared selection dismiss only the pending button');
  await drag();await button.click();let first=drafts().last(),id=await first.getAttribute('data-qb-inline');const quote=await first.locator('blockquote').textContent();await first.getByRole('textbox').fill('입력 중인 첫 번째 질문');
  await drag('second');await button.waitFor();assert.equal(await drafts().count(),1);assert.equal(await first.getByRole('textbox').inputValue(),'입력 중인 첫 번째 질문');assert.equal(await first.locator('blockquote').textContent(),quote);const nextQuote=await native();await button.click();assert.equal(await drafts().count(),2);const second=drafts().last();assert.equal(await second.locator('blockquote').textContent(),nextQuote);await second.getByRole('button',{name:'취소',exact:true}).click();await first.getByRole('button',{name:'질문 저장',exact:true}).click();await p.locator(`[data-qb-inline="${id}"]`).waitFor({state:'detached'});await count(1);
  check('A new reading drag leaves the typed draft untouched; clicking Add creates independent source ownership');
  const saved=(await values())[0];await drag('third');assert.equal(await drafts().count(),0);assert.equal(await p.locator('[data-qb-inline]').count(),1);assert.equal(await highlights(),1);await ext.locator('#launcher').click();await ext.locator('#close').click();await drag('second');await button.click();await drafts().getByRole('textbox').fill('접힌 패널에서 저장');await drafts().getByRole('button',{name:'질문 저장',exact:true}).click();await count(2);
  assert.equal((await values()).find(n=>n.id===saved.id).question,saved.question);
  await drag('third');await button.waitFor();await ext.locator('#mode-compact').click();assert.equal(await button.isVisible(),false);assert.equal((await values()).length,2);await drag();assert.equal(await button.isVisible(),false);await ext.locator('#mode-compact').click();assert.equal(await p.locator('[data-qb-inline]').count(),2);
  check('Saved annotations and collapsed-panel flow survive; mode OFF dismisses button without deleting records');
  // Button follows the end of the selected text and hides when clipped by an internal scroller.
  await p.setViewportSize({width:1560,height:1500});await drag('third');await button.waitFor();const before=await button.boundingBox(),sourceBefore=await p.evaluate(()=>[...getSelection().getRangeAt(0).getClientRects()].at(-1).bottom);
  await p.locator('main').evaluate(el=>{const tail=document.createElement('div');tail.id='scroll-tail';tail.style.height='600px';el.append(tail);el.style.height='1000px';el.style.overflow='auto';el.scrollTop=50;});
  await p.waitForTimeout(100);const moved=await button.boundingBox(),sourceAfter=await p.evaluate(()=>[...getSelection().getRangeAt(0).getClientRects()].at(-1).bottom);assert.ok(moved);assert.equal(await p.locator('main').evaluate(el=>el.scrollTop),50);assert.ok(Math.abs((moved.y-sourceAfter)-(before.y-sourceBefore))<3);
  await p.locator('main').evaluate(el=>{el.style.height='100px';el.scrollTop=document.getElementById('third').offsetTop-el.offsetTop+120;});await button.waitFor({state:'hidden'});await p.locator('main').evaluate(el=>{el.style.height='';el.style.overflow='';el.scrollTop=0;document.getElementById('scroll-tail').remove();});await p.locator('#third').scrollIntoViewIfNeeded();await button.waitFor({state:'visible'});
  await p.setViewportSize({width:1000,height:850});const box=await button.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=1000);await p.setViewportSize({width:1560,height:1100});
  await p.locator('#third').evaluate(el=>el.firstChild.textContent='변경된 원문 '+el.firstChild.textContent);await button.waitFor({state:'hidden'});assert.equal((await values()).length,2);
  check('Scroll/resize position follows selection; clipped or changed source never leaves a detached action button');
  await p.reload();await count(2);await ext.locator('#mode-compact').click();await drag('third');await button.focus();await button.press('Enter');await drafts().waitFor();await drafts().getByRole('textbox').fill('버튼을 눌러 연 입력창');await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:path.join(out,'after-question-add.png'),fullPage:true});await drafts().getByRole('button',{name:'취소',exact:true}).click();
  await drag('third');await p.evaluate(()=>history.pushState({},'', '/c/other-selection-action'));await count(0);assert.equal(await button.isVisible(),false);assert.equal(await drafts().count(),0);assert.deepEqual(errors,[]);check('Keyboard activation works; navigation clears only pending intent; no runtime errors');
  fs.writeFileSync(path.join(out,'selection-action-results.json'),JSON.stringify({version:'0.8.0',environment:'Real unpacked MV3 in Chromium; controlled HTML; NOT live ChatGPT',checks,errors},null,2));
 }finally{await ctx.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
