// Actual MV3 extension and mouse/keyboard UI; controlled HTML, NOT live ChatGPT.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.QA_OUTPUT||'work/prompt-selection');fs.mkdirSync(out,{recursive:true});
 const ctx=await chromium.launchPersistentContext(fs.mkdtempSync(path.join(out,'profile-')),{headless:true,executablePath:process.env.QA_BROWSER,viewport:{width:1560,height:1300},permissions:['clipboard-read','clipboard-write'],acceptDownloads:true,args:[`--disable-extensions-except=${root}`,`--load-extension=${root}`]});
 const checks=[],errors=[],check=n=>{checks.push(n);console.log('PASS',n);};
 try{
  const worker=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker');assert.equal(await worker.evaluate(()=>chrome.runtime.getManifest().version),'0.7.7');
  const scope='https://chatgpt.com/c/prompt-selection',key=n=>'qb:note:'+encodeURIComponent(n.scope)+':'+n.id,choice=n=>'qb:prompt-choice:'+encodeURIComponent(n.scope)+':'+n.id;
  const quotes=['AI 답변을 읽다가 궁금한 문장을 드래그합니다.','읽던 흐름을 유지하면서 여러 개의 질문을 모을 수 있습니다.','저장한 질문에는 선택한 원문이 함께 남습니다.'];
  const seeds=quotes.map((quote,i)=>({id:'selection-'+i,scope,quote,context:quote,messageId:'answer-one',question:['첫 번째 설명의 근거는 무엇인가요?','두 번째 설명을 쉽게 풀어 주세요.','세 번째 설명은 어떤 조건에서 성립하나요?'][i],color:['yellow','blue','green'][i],created:i+1}));
  await worker.evaluate(data=>chrome.storage.local.set(data),Object.fromEntries(seeds.map(n=>[key(n),n])));
  await ctx.route('https://chatgpt.com/**',r=>r.fulfill({contentType:'text/html',body:fs.readFileSync(path.join(__dirname,'fixture.html'),'utf8')}));
  const p=ctx.pages()[0];p.on('pageerror',e=>errors.push(e.message));const cdp=await ctx.newCDPSession(p);cdp.on('Runtime.exceptionThrown',e=>errors.push(e.exceptionDetails.exception?.description||e.exceptionDetails.text));await cdp.send('Runtime.enable');await p.goto(scope);
  const ext=p.locator('#question-basket-extension'),cards=ext.locator('#list>article'),boxes=cards.locator('.prompt-include'),composer=p.locator('#prompt-textarea'),offer=ext.locator('#insert-offer');
  const waitCount=n=>p.waitForFunction(n=>document.querySelector('#question-basket-extension').shadowRoot.getElementById('count').textContent===String(n),n);
  const waitSelected=n=>p.waitForFunction(n=>document.querySelector('#question-basket-extension').shadowRoot.querySelectorAll('#list .prompt-include:checked').length===n,n);
  const allNotes=()=>worker.evaluate(async()=>Object.fromEntries(Object.entries(await chrome.storage.local.get(null)).filter(([k])=>k.startsWith('qb:note:'))));
  const assertPairs=(text,yes,no=[])=>{for(const n of yes)assert.ok(text.includes('- 인용 원문: '+n.quote+'\n- 내 질문: '+n.question));for(const n of no)assert.ok(!text.includes(n.question));};
  await waitCount(3);await ext.locator('#mode-compact').click();await ext.locator('#launcher').click();await waitSelected(3);
  assert.equal(await ext.locator('#selection-diagnostic').count(),0);assert.equal(await ext.locator('#diagnostic-output').count(),0);
  const box=await boxes.first().boundingBox(),tag=await cards.first().locator('.tag').boundingBox();assert.ok(box.x+box.width<=tag.x);assert.ok(Math.abs(box.y+box.height/2-tag.y-tag.height/2)<3);
  assert.deepEqual(await allNotes(),Object.fromEntries(seeds.map(n=>[key(n),n])));check('Legacy records unchanged; checked by default; [ ] before question title; diagnostic UI absent');

  await cards.nth(0).locator('.tag').click();await boxes.nth(1).uncheck();await waitSelected(1);
  assert.equal(await boxes.nth(0).isChecked(),false);assert.equal(await p.locator('[data-qb-inline]').count(),3);
  assert.equal(await p.evaluate(()=>[...CSS.highlights.values()].reduce((n,h)=>n+h.size,0)),3);
  await ext.locator('#generate').click();let prompt=await ext.locator('#prompt').inputValue();assertPairs(prompt,[seeds[2]],seeds.slice(0,2));assert.ok(prompt.includes('질문 3\n'));
  await ext.locator('#copy').click();assert.equal((await p.evaluate(()=>navigator.clipboard.readText())).replace(/\r\n/g,'\n'),prompt);await ext.locator('#preview-close').click();
  await ext.locator('#quick-copy').click();assert.equal((await p.evaluate(()=>navigator.clipboard.readText())).replace(/\r\n/g,'\n'),prompt);
  check('Mouse label/checkbox exclusion keeps notes, bubbles and highlights; preview and both copy paths include checked pairs only');

  await composer.fill('기존 입력을 유지합니다.');await ext.locator('#quick-insert').click();let text=await composer.innerText();assert.ok(text.startsWith('기존 입력을 유지합니다.'));assertPairs(text,[seeds[2]],seeds.slice(0,2));
  await waitSelected(0);assert.equal(await ext.locator('#quick-insert').isDisabled(),true);assert.equal(await composer.innerText(),text);await boxes.nth(2).check();
  await composer.fill('다음 프롬프트');await composer.click();await offer.waitFor({state:'visible'});assert.match(await ext.locator('#offer-title').textContent(),/선택한 질문 1개/);assert.equal(await composer.innerText(),'다음 프롬프트');await ext.locator('#offer-accept').click();assertPairs(await composer.innerText(),[seeds[2]],seeds.slice(0,2));
  await waitSelected(0);await boxes.nth(2).check();await composer.fill('미리보기에서도 유지');await ext.locator('#generate').click();await ext.locator('#insert').click();assertPairs(await composer.innerText(),[seeds[2]],seeds.slice(0,2));
  check('Manual append, input-click confirmation and preview append exclude old unchecked questions, preserve input and prevent duplicates');

  await waitSelected(0);
  for(const id of ['generate','quick-insert','quick-copy'])assert.equal(await ext.locator('#'+id).isDisabled(),true);
  await composer.fill('아무것도 선택하지 않음');await composer.click();assert.equal(await offer.isVisible(),false);assert.equal(await composer.innerText(),'아무것도 선택하지 않음');
  await boxes.nth(1).focus();await boxes.nth(1).press('Space');await waitSelected(1);await boxes.nth(1).press('Space');await waitSelected(0);
  await ext.locator('#select-all').click();await waitSelected(3);await ext.locator('#deselect-all').click();await boxes.nth(2).check();await waitSelected(1);
  await cards.first().getByRole('button',{name:'파랑',exact:true}).click();assert.equal(await boxes.first().isChecked(),false);
  await cards.first().getByRole('button',{name:'수정',exact:true}).click();await cards.first().getByRole('textbox').fill('취소할 편집 내용');await cards.first().getByRole('button',{name:'취소',exact:true}).click();assert.equal(await boxes.first().isChecked(),false);
  check('Deselect all, select all and keyboard Space work; zero selection disables output; color/edit activation never reselects a question');

  const p2=await ctx.newPage();await p2.goto(scope);const ext2=p2.locator('#question-basket-extension');await ext2.locator('#launcher').click();await ext2.locator('#list .prompt-include').nth(2).waitFor();
  assert.equal(await ext2.locator('#list .prompt-include:checked').count(),1);
  await ext.locator('#generate').click();await ext2.locator('#list .prompt-include').nth(1).check();await waitSelected(2);await ext.locator('#preview').waitFor({state:'hidden'});await p2.close();
  await boxes.nth(1).uncheck();await waitSelected(1);await p.reload();await waitCount(3);await ext.locator('#launcher').click();await waitSelected(1);assert.equal(await boxes.nth(2).isChecked(),true);
  await p.evaluate(()=>history.pushState({},'', '/c/another-selection'));await waitCount(0);
  const other={...seeds[0],scope:'https://chatgpt.com/c/another-selection',question:'다른 대화의 별도 질문'};await worker.evaluate(({k,n})=>chrome.storage.local.set({[k]:n}),{k:key(other),n:other});await waitCount(1);await waitSelected(1);await boxes.first().uncheck();await waitSelected(0);
  await p.evaluate(()=>history.pushState({},'', '/c/prompt-selection'));await waitCount(3);await waitSelected(1);assert.equal(await boxes.nth(2).isChecked(),true);
  check('Selection persists after reload/route return; same IDs in different conversations stay separate; other-tab changes synchronize and invalidate an open preview');

  await ext.locator('#deselect-all').click();await ext.locator('#reading-mode').click();
  const el=p.locator('#first');await el.scrollIntoViewIfNeeded();const rect=await el.boundingBox();await p.mouse.move(rect.x+2,rect.y+15);await p.mouse.down();await p.mouse.move(rect.x+245,rect.y+15,{steps:12});await p.mouse.up();
  await ext.locator('#selection-add').click();const draft=p.locator('[data-qb-inline^="draft-"]');await draft.waitFor();await draft.getByRole('textbox').fill('이번에 새로 저장한 질문만 추가해 주세요.');await draft.getByRole('button',{name:'질문 저장',exact:true}).click();await waitCount(4);await waitSelected(1);
  const saved=Object.values(await allNotes()).filter(n=>n.scope===scope).sort((a,b)=>a.created-b.created||a.id.localeCompare(b.id)),newNote=saved[3];assert.equal(await boxes.last().isChecked(),true);
  await ext.locator('#generate').click();assertPairs(await ext.locator('#prompt').inputValue(),[newNote],seeds);await ext.locator('#preview-close').click();
  await ext.locator('#reading-mode').click();assert.equal(await p.locator('[data-qb-inline]').count(),0);await waitSelected(1);await ext.locator('#reading-mode').click();await p.locator('[data-qb-inline]').last().waitFor();
  await ext.locator('#close').click();await composer.fill('');await composer.click();await offer.waitFor({state:'visible'});assert.match(await ext.locator('#offer-title').textContent(),/1개/);await ext.locator('#offer-dismiss').click();await ext.locator('#launcher').click();
  check('New saved question starts checked while old exclusions persist; reading mode and panel collapse preserve prompt choices');

  const downloadPromise=p.waitForEvent('download');await ext.locator('#export').click();const download=await downloadPromise,backupPath=path.join(out,'selection-backup.json');await download.saveAs(backupPath);
  const backup=JSON.parse(fs.readFileSync(backupPath,'utf8'));assert.equal(backup.data[choice(seeds[0])],false);assert.equal(backup.data[key(seeds[1])].question,seeds[1].question);
  await worker.evaluate(()=>chrome.storage.local.clear());await waitCount(0);await ext.locator('#import-file').setInputFiles(backupPath);await waitCount(4);await waitSelected(1);
  await ext.locator('#import-file').setInputFiles(backupPath);await waitCount(4);assert.equal(await cards.count(),4);
  assert.equal(await boxes.nth(0).isChecked(),false);assert.equal(await boxes.nth(1).isChecked(),false);assert.equal(await boxes.nth(2).isChecked(),false);assert.equal(await boxes.nth(3).isChecked(),true);
  check('Backup/import restores checked/excluded choices without dropping, rewriting or duplicating saved questions');

  await boxes.nth(1).check();await waitSelected(2);await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:path.join(out,'prompt-selection-light.png'),fullPage:true});
  await p.emulateMedia({colorScheme:'dark'});await p.evaluate(()=>document.documentElement.classList.add('dark'));await p.addStyleTag({content:'body{background:#171c1a;color:#eef4ef}#prompt-textarea{background:#202a27;color:#eee}'});await p.screenshot({path:path.join(out,'prompt-selection-dark.png'),fullPage:true});
  await ext.locator('#panel').screenshot({path:path.join(out,'prompt-selection-panel.png')});
  await composer.fill('다음 요청의 기존 내용');await composer.click();await offer.waitFor({state:'visible'});assert.match(await ext.locator('#offer-title').textContent(),/2개/);await p.screenshot({path:path.join(out,'selected-prompt-offer.png'),fullPage:false,animations:'disabled'});await ext.locator('#offer-dismiss').click();
  assert.equal((await cards.first().locator('.swatch').first().boundingBox()).width,12);
  await cards.nth(2).getByRole('button',{name:'삭제',exact:true}).click();await waitCount(3);await waitSelected(2);assert.equal(await p.locator('[data-qb-inline]').count(),3);assert.equal(await p.locator('[data-qb-inline="selection-0"]').count(),1);
  assert.deepEqual(errors,[]);check('Current light/dark implementation screenshots; compact colors retained; deleting an unchecked note keeps other annotations and selected choices; no runtime errors');
  fs.writeFileSync(path.join(out,'prompt-selection-results.json'),JSON.stringify({version:'0.7.7',environment:'Real unpacked MV3 extension in Chromium; controlled HTML fixture; NOT live ChatGPT or company PC',checks,errors},null,2));
 }finally{await ctx.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
