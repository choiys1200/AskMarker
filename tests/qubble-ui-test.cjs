'use strict';
// Real unpacked MV3 + controlled HTML, not a live AI service.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {storageKey,choiceKey}=require('../src/domain/notes');
(async()=>{
 const root=path.resolve(process.env.QA_EXTENSION||path.join(__dirname,'..')),out=process.env.QA_OUTPUT||path.join(root,'../../work/qubble-ui');fs.mkdirSync(out,{recursive:true});
 const checks=[],errors=[],check=name=>{checks.push(name);console.log('PASS',name);};
 const ctx=await chromium.launchPersistentContext(fs.mkdtempSync(path.join(out,'profile-')),{headless:true,executablePath:process.env.QA_BROWSER,viewport:{width:1450,height:1050},permissions:['clipboard-read','clipboard-write'],args:[`--disable-extensions-except=${root}`,`--load-extension=${root}`]});
 try{
  const w=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker');assert.equal(await w.evaluate(()=>chrome.runtime.getManifest().name),'Qubble');
  const scope='https://chatgpt.com/c/qubble-ui',notes=[
   {id:'legacy-a',scope,messageId:'answer-one',quote:'AI 답변을 읽다가 궁금한 문장을 드래그합니다.',question:'이 문장의 근거와 출처를 알려 주세요.',color:'purple',created:1},
   {id:'legacy-b',scope,messageId:'answer-one',quote:'읽던 흐름을 유지하면서 여러 개의 코멘트를 모을 수 있습니다.',question:'실제 사례를 하나 들어 설명해 주세요.',color:'blue',created:2}
  ],data=Object.fromEntries(notes.flatMap((n,i)=>[[storageKey(n),n],[choiceKey(n),i===0]]));
  await w.evaluate(d=>chrome.storage.local.set(d),data);
  await ctx.route('https://chatgpt.com/**',r=>r.fulfill({contentType:'text/html',body:fs.readFileSync(path.join(__dirname,'fixture.html'),'utf8')}));
  const p=ctx.pages()[0];p.on('pageerror',e=>errors.push(e.message));const cdp=await ctx.newCDPSession(p);cdp.on('Runtime.exceptionThrown',e=>errors.push(e.exceptionDetails.exception?.description||e.exceptionDetails.text));await cdp.send('Runtime.enable');await p.goto(scope);
  const ext=p.locator('#question-basket-extension'),panel=ext.locator('#panel'),dock=ext.locator('#dock');
  await ext.locator('#launcher').click();await dock.waitFor({state:'hidden'});
  assert.equal(await panel.locator('h1').textContent(),'Qubble');
  for(const id of ['language','color-palette','font-size-mode','auto-insert','export','archive-open','use-selection'])assert.equal(await ext.locator('#'+id).isVisible(),false,id);
  for(const id of ['reading-mode','generate','quick-insert','quick-copy','selected-count'])assert.equal(await ext.locator('#'+id).isVisible(),true,id);
  assert.equal(await ext.locator('#selected-count').textContent(),'1 / 2개 선택');
  assert.deepEqual(await ext.locator('#list .card').evaluateAll(cs=>cs.map(c=>c.dataset.selected)),['true','false']);
  assert.equal(await ext.locator('#list .swatch').first().isVisible(),false);
  await panel.screenshot({path:path.join(out,'panel-light.png'),animations:'disabled'});
  check('Qubble primary screen exposes only reading/prompt/list actions; settings, records, help and per-Q palettes start closed; legacy choices remain intact');
  await ext.locator('#settings-toggle').focus();await ext.locator('#settings-toggle').press('Space');await ext.locator('#language').waitFor();
  await ext.locator('#language').focus();await ext.locator('#language').press('Escape');assert.equal(await ext.locator('#settings-toggle').getAttribute('aria-expanded'),'false');
  assert.equal(await ext.locator('#settings-content').evaluate(el=>el.inert),true);
  assert.equal(await ext.locator('#language').evaluate(el=>{el.focus();return el.getRootNode().activeElement===el;}),false);
  check('Disclosures open by keyboard; Escape returns focus and closed controls cannot receive focus');
  await ext.locator('#reading-mode').click();
  await p.locator('#third').evaluate(el=>{const r=document.createRange();r.selectNodeContents(el);getSelection().removeAllRanges();getSelection().addRange(r);el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0}));el.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,button:0}));});
  await ext.locator('#selection-add').click();const draft=p.locator('[data-qb-inline^="draft-"]'),textarea=draft.getByRole('textbox');await textarea.fill('折りたたんでも 보존할 초안');const quote=await draft.locator('blockquote').textContent();
  await ext.locator('#close').click();await panel.waitFor({state:'hidden'});assert.equal(await textarea.inputValue(),'折りたたんでも 보존할 초안');assert.equal(await ext.locator('#mode-compact').getAttribute('aria-pressed'),'true');await ext.locator('#launcher').click();
  await ext.locator('#settings-toggle').click();await ext.locator('#font-family').selectOption('serif');assert.equal(await textarea.inputValue(),'折りたたんでも 보존할 초안');assert.equal(await draft.locator('blockquote').textContent(),quote);await ext.locator('#font-family').selectOption('system');await ext.locator('#settings-toggle').click();
  // Stress interruption of CSS transitions; no storage or real AI input touched.
  for(let i=0;i<12;i++){await ext.locator('#close').dispatchEvent('click');await ext.locator('#launcher').dispatchEvent('click');}
  await p.waitForTimeout(220);assert.equal(await panel.isVisible(),true);assert.equal(await panel.evaluate(el=>el.inert),false);assert.equal(await dock.isVisible(),false);assert.equal(await textarea.inputValue(),'折りたたんでも 보존할 초안');
  await draft.getByRole('button',{name:'취소',exact:true}).click();
  for(const [k,v]of Object.entries(data))assert.deepEqual((await w.evaluate(k=>chrome.storage.local.get(k),k))[k],v);
  check('Rapid open/close never leaves a stale hidden panel; mode, draft text/source and all legacy note/choice values survive appearance changes');
  const first=ext.locator('#list .card').first();await first.locator('.card-color-toggle').click();await first.getByRole('button',{name:'초록',exact:true}).click();await first.locator('.card-color-toggle').click();
  await first.locator('.edit').click();await first.getByRole('textbox').fill('근거와 함께 예외도 설명해 주세요.');await first.getByRole('button',{name:'수정 저장',exact:true}).click();await p.waitForFunction(()=>document.querySelector('[data-qb-inline="legacy-a"]').shadowRoot.querySelector('.question').textContent==='근거와 함께 예외도 설명해 주세요.');
  await ext.locator('#generate').click();await ext.locator('#prompt').fill('사용자가 미리보기에서 수정한 요청');await ext.locator('#preview-close').click();await ext.locator('#preview').waitFor({state:'hidden'});
  await ext.locator('#quick-copy').click();assert.ok((await p.evaluate(()=>navigator.clipboard.readText())).includes('근거와 함께 예외도 설명해 주세요.'));assert.equal(await first.locator('.prompt-include').isChecked(),true);
  await p.locator('#prompt-textarea').fill('기존 입력');await ext.locator('#quick-insert').click();await p.waitForFunction(()=>!document.querySelector('#question-basket-extension').shadowRoot.querySelector('.prompt-include').checked);assert.ok((await p.locator('#prompt-textarea').innerText()).startsWith('기존 입력'));assert.ok(!(await p.locator('#prompt-textarea').innerText()).includes(notes[1].question));assert.equal(await ext.locator('#count').textContent(),'2');
  check('Compact color disclosure and editing synchronize with inline notes; copy preserves selection; verified insert appends only selected Qs and clears choices without deleting records');
  await p.emulateMedia({colorScheme:'dark'});await p.evaluate(()=>{document.documentElement.className='dark';document.body.style.background='#111216';document.body.style.color='#eceef4';const input=document.querySelector('#prompt-textarea');input.style.background='#202127';input.style.color='#eceef4';input.style.borderColor='#373a45';});await p.waitForFunction(()=>document.querySelector('#question-basket-extension').dataset.theme==='dark');
  await ext.locator('#select-all').click();await ext.locator('#toast').waitFor({state:'hidden'});await panel.screenshot({path:path.join(out,'panel-dark.png'),animations:'disabled'});await p.screenshot({path:path.join(out,'implementation-dark.png'),fullPage:true,animations:'disabled'});
  await ext.locator('#settings-toggle').click();await ext.locator('#language').selectOption('en');await ext.locator('#font-size-mode').selectOption('custom');await ext.locator('#font-size-number').fill('160');await ext.locator('#font-size-number').dispatchEvent('change');await p.setViewportSize({width:390,height:650});
  assert.ok(await panel.evaluate(el=>el.scrollWidth<=el.clientWidth+1));await ext.locator('#records-toggle').click();await p.waitForTimeout(200);await ext.locator('#archive-open').scrollIntoViewIfNeeded();assert.equal(await ext.locator('#archive-open').isVisible(),true);assert.ok(await ext.locator('#archive-open').evaluate(el=>{const r=el.getBoundingClientRect(),b=el.getRootNode().getElementById('body').getBoundingClientRect();return r.top>=b.top&&r.bottom<=b.bottom;}));await panel.screenshot({path:path.join(out,'settings-english-160.png'),animations:'disabled'});
  await p.emulateMedia({reducedMotion:'reduce'});await ext.locator('#close').scrollIntoViewIfNeeded();await ext.locator('#close').click();assert.equal(await panel.evaluate(el=>el.hidden),true);await ext.locator('#launcher').click();assert.equal(await panel.evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
  check('Light/dark snapshots, narrow 160% English layout and advanced controls remain reachable; reduced-motion disables animation');
  await p.reload();await ext.locator('#launcher').click();assert.equal(await ext.locator('#settings-toggle').getAttribute('aria-expanded'),'false');assert.equal(await ext.locator('#language').inputValue(),'en');assert.equal(await ext.locator('#count').textContent(),'2');assert.equal(await ext.locator('#list .question').first().textContent(),'근거와 함께 예외도 설명해 주세요.');
  assert.deepEqual(errors,[]);check('Reload restores preferences and saved Qs while secondary sections start closed; no runtime errors');
  fs.writeFileSync(path.join(out,'qubble-ui-results.json'),JSON.stringify({version:'0.12.0',environment:'Actual MV3 in an isolated Chromium-family browser, synthetic HTML; no live AI or OAuth',browser:ctx.browser().version(),executable:path.basename(process.env.QA_BROWSER||'chromium'),checks,errors},null,2));
 }finally{await ctx.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
