const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.QA_OUTPUT||'work/appearance');fs.mkdirSync(out,{recursive:true});
 const ctx=await chromium.launchPersistentContext(fs.mkdtempSync(path.join(out,'profile-')),{headless:true,executablePath:process.env.QA_BROWSER,viewport:{width:1560,height:1200},permissions:['clipboard-read','clipboard-write'],args:[`--disable-extensions-except=${root}`,`--load-extension=${root}`]});
 const checks=[],errors=[],check=n=>{checks.push(n);console.log('PASS',n);};
 try{
  const worker=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker');
  const scope='https://chatgpt.com/c/appearance-delivery',quote='AI 답변을 읽다가 궁금한 문장을 드래그합니다.';
  const notes=[1,2].map(i=>({id:'appearance-'+i,scope,messageId:'answer-one',quote,context:quote,question:'질문 '+i+'의 정확한 내용',color:i===1?'yellow':'blue',created:i}));
  await worker.evaluate(notes=>chrome.storage.local.set(Object.fromEntries(notes.map(n=>['qb:note:'+encodeURIComponent(n.scope)+':'+n.id,n]))),notes);
  const html=fs.readFileSync(path.join(__dirname,'fixture.html'),'utf8').replace('</article>','<pre><code id="code-font">const hello = "world";</code></pre></article>');
  await ctx.route('https://chatgpt.com/**',r=>r.fulfill({contentType:'text/html',body:html}));
  const p=ctx.pages()[0];p.on('pageerror',e=>errors.push(e.message));const cdp=await ctx.newCDPSession(p);cdp.on('Runtime.exceptionThrown',e=>errors.push(e.exceptionDetails.exception?.description||e.exceptionDetails.text));await cdp.send('Runtime.enable');await p.goto(scope);
  const ext=p.locator('#question-basket-extension'),composer=p.locator('#prompt-textarea'),boxes=ext.locator('#list .prompt-include');
  const selected=n=>p.waitForFunction(n=>document.querySelector('#question-basket-extension').shadowRoot.querySelectorAll('#list .prompt-include:checked').length===n,n);
  const noteData=()=>worker.evaluate(async()=>Object.fromEntries(Object.entries(await chrome.storage.local.get(null)).filter(([k])=>k.startsWith('qb:note:'))));
  await ext.locator('#mode-compact').click();await ext.locator('#launcher').click();await selected(2);
  assert.equal(await ext.locator('#close').textContent(),'AskMarker 접기');assert.equal(await ext.locator('#reading-mode').textContent(),'읽기 모드 ON');
  const computed=el=>{const s=getComputedStyle(el);return {border:s.borderRadius,font:s.fontFamily,size:s.fontSize,height:s.minHeight}};
  const modeStyle=await ext.locator('#reading-mode').evaluate(computed),controlStyle=await ext.locator('#close').evaluate(computed);
  await ext.locator('#close').click();assert.deepEqual(await ext.locator('#mode-compact').evaluate(computed),modeStyle);assert.deepEqual(await ext.locator('#launcher').evaluate(computed),controlStyle);assert.equal(await ext.locator('#launcher').textContent(),'AskMarker 펼치기');
  await ext.locator('#mode-compact').click();await ext.locator('#launcher').click();assert.equal(await ext.locator('#reading-mode').textContent(),'읽기 모드 OFF');assert.equal(await p.locator('[data-qb-inline]').count(),0);await ext.locator('#reading-mode').click();
  check('Expanded/collapsed controls share styles and labels; reading mode remains independent and available');
  const before=await noteData(),nativeFont=await p.locator('#first').evaluate(el=>getComputedStyle(el).fontFamily),codeFont=await p.locator('#code-font').evaluate(el=>getComputedStyle(el).fontFamily);
  assert.equal(await ext.locator('#font-family').inputValue(),'system');
  // Keep an in-progress draft while changing appearance; no re-render or lost text.
  await p.locator('#second').evaluate(el=>{const r=document.createRange();r.selectNodeContents(el);getSelection().removeAllRanges();getSelection().addRange(r);});await ext.locator('#use-selection').click();const draft=p.locator('[data-qb-inline^="draft-"]');await draft.getByRole('textbox').fill('글꼴을 바꿔도 보존할 초안');
  const draftId=await draft.getAttribute('data-qb-inline');
  for(const font of ['serif','mono','sans','system']){
   await ext.locator('#font-family').selectOption(font);assert.equal(await draft.getByRole('textbox').inputValue(),'글꼴을 바꿔도 보존할 초안');assert.equal(await draft.getAttribute('data-qb-inline'),draftId);
   assert.equal(await p.locator('#code-font').evaluate(el=>getComputedStyle(el).fontFamily),codeFont);assert.deepEqual(await noteData(),before);assert.equal(await boxes.filter({visible:true}).count(),2);
   assert.equal(await p.evaluate(()=>[...CSS.highlights.values()].reduce((n,h)=>n+h.size,0)),3);
  }
  await ext.locator('#font-family').selectOption('serif');assert.match(await p.locator('#first').evaluate(el=>getComputedStyle(el).fontFamily),/Batang/);assert.match(await draft.getByRole('textbox').evaluate(el=>getComputedStyle(el).fontFamily),/Batang/);
  await ext.locator('#reading-mode').click();assert.equal(await p.locator('#first').evaluate(el=>getComputedStyle(el).fontFamily),nativeFont);await ext.locator('#reading-mode').click();assert.equal(await draft.getByRole('textbox').inputValue(),'글꼴을 바꿔도 보존할 초안');
  await ext.locator('#laser-opacity').focus();await ext.locator('#laser-opacity').press('Home');for(let i=0;i<4;i++)await ext.locator('#laser-opacity').press('ArrowRight');
  assert.equal(await ext.locator('#laser-opacity-value').textContent(),'20%');assert.equal(await ext.locator('#laser').evaluate(el=>getComputedStyle(el).opacity),'0.2');assert.equal(await ext.locator('#laser').evaluate(el=>getComputedStyle(el).pointerEvents),'none');
  await ext.locator('#color-palette').getByRole('button',{name:'핑크',exact:true}).click();assert.equal(await ext.locator('#laser').evaluate(el=>el.style.getPropertyValue('--laser-rgb')),'244,114,182');assert.equal(await ext.locator('#laser').evaluate(el=>getComputedStyle(el).opacity),'0.2');
  await draft.getByRole('button',{name:'취소',exact:true}).click();assert.deepEqual(await noteData(),before);check('Four fonts and opacity affect only presentation; draft, source anchors, notes, highlights, choices and code font survive');
  await p.reload();await ext.locator('#launcher').click();assert.equal(await ext.locator('#font-family').inputValue(),'serif');assert.equal(await ext.locator('#laser-opacity').inputValue(),'20');await selected(2);
  const p2=await ctx.newPage();await p2.goto(scope);const ext2=p2.locator('#question-basket-extension');await ext2.locator('#launcher').click();await ext2.locator('#font-family').selectOption('sans');await p.waitForFunction(()=>document.querySelector('#question-basket-extension').shadowRoot.getElementById('font-family').value==='sans');await p2.close();
  check('Appearance persists on reload and synchronizes across tabs independently of note data');
  await ext.locator('#quick-copy').click();await selected(2);assert.ok((await p.evaluate(()=>navigator.clipboard.readText())).includes(notes[0].question));
  // Failure: editor rejects synthetic input. Checkboxes must remain checked.
  await composer.evaluate(el=>{el.addEventListener('input',()=>{if(el.dataset.reject==='true')el.textContent='기존 내용';});el.dataset.reject='true';el.textContent='기존 내용';});
  await ext.locator('#quick-insert').click();await p.waitForFunction(()=>document.querySelector('#question-basket-extension').shadowRoot.getElementById('status').textContent.includes('입력 결과'));await selected(2);
  await composer.evaluate(el=>delete el.dataset.reject);await ext.locator('#quick-insert').click();await selected(0);assert.ok((await composer.innerText()).startsWith('기존 내용'));for(const n of notes)assert.ok((await composer.innerText()).includes(n.question));assert.deepEqual(await noteData(),before);
  await composer.fill('');await composer.click();assert.equal(await ext.locator('#insert-offer').isVisible(),false);await p.reload();await ext.locator('#launcher').click();await selected(0);
  check('Copy/failure retain choices; verified append clears all consumed choices, persists on reload and never removes notes');
  // A new question starts selected; only it is offered for the next response.
  const fresh={...notes[0],id:'fresh-round',question:'이번 답변에서 새로 모은 질문',created:3};await worker.evaluate(n=>chrome.storage.local.set({['qb:note:'+encodeURIComponent(n.scope)+':'+n.id]:n}),fresh);await selected(1);
  await composer.fill('다음 요청');await composer.click();await ext.locator('#insert-offer').waitFor();assert.match(await ext.locator('#offer-title').textContent(),/1개/);await ext.locator('#offer-accept').click();await selected(0);const inserted=await composer.innerText();assert.ok(inserted.includes(fresh.question));for(const n of notes)assert.ok(!inserted.includes(n.question));
  await boxes.first().check();await ext.locator('#generate').click();await ext.locator('#prompt').fill('사용자가 수정한 최종 프롬프트');await ext.locator('#insert').click();await selected(0);assert.ok((await composer.innerText()).includes('사용자가 수정한 최종 프롬프트'));
  check('Next round includes only new questions; explicit reselection and edited preview both clear on successful insertion');
  await ext.locator('#select-all').click();await ext.locator('#reading-mode').click();await ext.locator('#font-family').selectOption('system');
  await p.screenshot({path:path.join(out,'appearance-light.png'),fullPage:true,animations:'disabled'});
  await p.emulateMedia({colorScheme:'dark'});await p.addStyleTag({content:'body{background:#14161d;color:#edf0f8}#prompt-textarea{background:#202127;color:#edf0f8}'});
  await p.screenshot({path:path.join(out,'appearance-dark.png'),fullPage:true,animations:'disabled'});await ext.locator('#panel').screenshot({path:path.join(out,'panel-dark.png'),animations:'disabled'});
  await ext.locator('#close').click();await p.screenshot({path:path.join(out,'compact-dark.png'),animations:'disabled'});
  await p.setViewportSize({width:850,height:600});await ext.locator('#launcher').click();await ext.locator('#font-family').selectOption('mono');await ext.locator('#select-all').scrollIntoViewIfNeeded();assert.equal(await ext.locator('#reading-mode').count(),1);
  assert.deepEqual(errors,[]);check('Light/dark and compact screenshots; short-window controls remain reachable; no runtime errors');
  fs.writeFileSync(path.join(out,'appearance-delivery-results.json'),JSON.stringify({version:'0.7.5',environment:'Actual MV3 extension in isolated Chromium with synthetic HTML; not live ChatGPT',checks,errors},null,2));
 }finally{await ctx.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
