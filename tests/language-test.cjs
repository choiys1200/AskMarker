// Real unpacked MV3 in isolated Chromium. The answer/editor HTML is synthetic;
// this does not claim live ChatGPT, Gemini, or the user's Chrome was tested.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {LANGUAGE_KEY,translate,languageOf}=require('../src/i18n/index');
const {formatPrompt,containsPair}=require('../src/domain/prompt');
const {createLanguage}=require('../src/ui/language');
(async()=>{
 const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.QA_OUTPUT||'work/language');fs.mkdirSync(out,{recursive:true});const checks=[],errors=[];
 const check=name=>{checks.push(name);console.log('PASS',name);};
 assert.equal(languageOf('fr'),'ko');assert.equal(translate('en','질문 {number}',{number:4}),'Question 4');
 const nodes={language:{}},data={},tasks=[];
 const setting=createLanguage({host:{},$:id=>nodes[id],storage:{set:entry=>new Promise(resolve=>tasks.push(()=>{Object.assign(data,entry);resolve();}))},enqueue:(_,fn)=>fn(),tell:()=>{},onChange:()=>{}});
 const revision=setting.revision();nodes.language.value='en';const pending=nodes.language.onchange();setting.hydrate({},revision);assert.equal(setting.current(),'en');tasks.shift()();await pending;setting.hydrate({},revision);assert.equal(setting.current(),'en');setting.applyChanges({[LANGUAGE_KEY]:{newValue:'unknown'}});assert.equal(setting.current(),'ko');
 const note={id:'a',quote:'원문\n  그대로 👀',question:'질문 추가\nEnglish words remain.'};for(const lang of ['ko','en']){const prompt=formatPrompt([note],[note],lang);assert.ok(prompt.includes(note.quote));assert.ok(prompt.includes(note.question));assert.ok(containsPair(prompt,note));}
 check('Pure language fallback, delayed hydration protection, and exact quote/question preservation in both prompt languages');
 const extension=path.join(out,'test-extension');fs.mkdirSync(extension,{recursive:true});const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));manifest.host_permissions=['https://chatgpt.com/*'];fs.writeFileSync(path.join(extension,'manifest.json'),JSON.stringify(manifest));for(const file of ['content.js','background.js'])fs.copyFileSync(path.join(root,file),path.join(extension,file));fs.cpSync(path.join(root,'assets'),path.join(extension,'assets'),{recursive:true});
 const ctx=await chromium.launchPersistentContext(fs.mkdtempSync(path.join(out,'profile-')),{headless:true,executablePath:process.env.QA_BROWSER,locale:'en-US',viewport:{width:1560,height:1100},args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
 try{
  const worker=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker'),p=ctx.pages()[0];p.on('pageerror',e=>errors.push(e.message));const cdp=await ctx.newCDPSession(p);await cdp.send('Runtime.enable');cdp.on('Runtime.exceptionThrown',e=>errors.push(e.exceptionDetails.exception?.description||e.exceptionDetails.text));
  const url='https://chatgpt.com/c/language-test',html=fs.readFileSync(path.join(__dirname,'fixture.html'),'utf8');await ctx.route(url,r=>r.fulfill({contentType:'text/html',body:html}));await p.goto(url);
  const ext=p.locator('#question-basket-extension'),lang=ext.locator('#language'),panel=ext.locator('#panel');await ext.locator('#launcher').click();await lang.waitFor();assert.equal(await lang.inputValue(),'ko');assert.equal(await ext.locator('#close').textContent(),'AskMarker 접기');assert.equal(await p.locator('html').getAttribute('lang'),'ko');
  check('Korean is the default even in an English browser');
  await ext.locator('#reading-mode').click();
  async function drag(id){const source=p.locator('#'+id);await source.scrollIntoViewIfNeeded();const b=await source.boundingBox();await p.mouse.move(b.x+2,b.y+14);await p.mouse.down();await p.mouse.move(b.x+250,b.y+14,{steps:12});await p.mouse.up();await ext.locator('#selection-add').click();const draft=p.locator('[data-qb-inline^="draft-"]');await draft.waitFor();return draft;}
  // Ten cancel/reselect gestures in each language, alternating the same/other text.
  for(const locale of ['ko','en']){
   await lang.selectOption(locale);
   for(let i=0;i<10;i++){const draft=await drag(i%3===0?'second':'first');await draft.getByRole('button',{name:locale==='ko'?'취소':'Cancel',exact:true}).click();await draft.waitFor({state:'detached'});}
  }
  check('20 real mouse drag → add → empty cancel → reselect cycles pass in Korean/English');
  let draft=await drag('first');const quote=await draft.locator('blockquote').textContent(),draftId=await draft.getAttribute('data-qb-inline');await draft.getByRole('textbox').fill('질문 추가');await draft.getByRole('textbox').evaluate(el=>{globalThis.qaDraftInput=el;el.focus();el.setSelectionRange(1,3);});
  const before=await worker.evaluate(()=>chrome.storage.local.get(null));
  // External preference changes exercise the same path as a second open tab,
  // without moving focus away from the active question editor.
  await worker.evaluate(key=>chrome.storage.local.set({[key]:'ko'}),LANGUAGE_KEY);await p.waitForFunction(()=>document.querySelector('#question-basket-extension').lang==='ko');
  assert.equal(await draft.getByRole('textbox').inputValue(),'질문 추가');assert.equal(await draft.getAttribute('data-qb-inline'),draftId);assert.equal(await draft.locator('blockquote').textContent(),quote);
  assert.deepEqual(await draft.getByRole('textbox').evaluate(el=>({same:globalThis.qaDraftInput===el,focused:el.getRootNode().activeElement===el,start:el.selectionStart,end:el.selectionEnd})),{same:true,focused:true,start:1,end:3});
  const after=await worker.evaluate(()=>chrome.storage.local.get(null));delete before[LANGUAGE_KEY];delete after[LANGUAGE_KEY];assert.deepEqual(after,before);assert.ok(await p.evaluate(()=>CSS.highlights.get('qb-purple').size>0));
  await lang.selectOption('en');assert.equal(await draft.getByRole('textbox').inputValue(),'질문 추가');assert.equal(await draft.getByRole('textbox').getAttribute('aria-label'),'Your question');assert.equal(await draft.getByRole('textbox').getAttribute('placeholder'),'What would you like to ask about this passage?');
  assert.equal(await ext.locator('#generate').textContent(),'Preview / edit prompt');
  check('Language changes retain the same focused draft node, caret, source, highlight, and non-language storage; user text matching a UI label is untouched');
  await draft.getByRole('button',{name:'Save question',exact:true}).click();await draft.waitFor({state:'detached'});await p.waitForFunction(()=>document.querySelector('#question-basket-extension').shadowRoot.getElementById('count').textContent==='1');
  const card=ext.locator('#list .card'),saved=p.locator('[data-qb-inline]').first();assert.equal(await card.locator('.question').textContent(),'질문 추가');assert.equal(await card.locator('.tag').textContent(),'Question 1');assert.equal(await card.locator('.prompt-include').getAttribute('aria-label'),'Include question 1 in the prompt');assert.equal(await saved.getAttribute('lang'),'en');
  await card.getByRole('button',{name:'Pink',exact:true}).click();assert.equal(await card.locator('.color-name').textContent(),'Pink');assert.equal(await ext.locator('#active-color-name').textContent(),'Pink');assert.equal(await ext.locator('#laser-opacity').getAttribute('aria-valuetext'),'60% opacity');assert.equal(await ext.locator('#font-family option').first().textContent(),'System default');
  await card.locator('.prompt-include').uncheck();const records=await worker.evaluate(()=>chrome.storage.local.get(null));await lang.selectOption('ko');assert.equal(await card.locator('.tag').textContent(),'질문 1');assert.equal(await saved.getByRole('button',{name:'수정',exact:true}).count(),1);assert.equal(await card.locator('.prompt-include').isChecked(),false);
  const records2=await worker.evaluate(()=>chrome.storage.local.get(null));delete records[LANGUAGE_KEY];delete records2[LANGUAGE_KEY];assert.deepEqual(records2,records);
  check('Saved inline/sidebar labels, accessible names, fonts and color names translate together; question content and checkbox remain unchanged');
  await lang.selectOption('en');await card.locator('.prompt-include').check();await ext.locator('#generate').click();const prompt=ext.locator('#prompt');assert.ok((await prompt.inputValue()).includes('Question 1\n\n- Quoted passage: '+quote+'\n- My question: 질문 추가'));
  const edited=(await prompt.inputValue())+'\nUser-edited preview';await prompt.fill(edited);await worker.evaluate(key=>chrome.storage.local.set({[key]:'ko'}),LANGUAGE_KEY);await p.waitForFunction(()=>document.querySelector('#question-basket-extension').lang==='ko');assert.equal(await prompt.inputValue(),edited);assert.equal(await ext.locator('#preview-close').textContent(),'닫기');await ext.locator('#preview-close').click();
  check('New prompts use the selected language with exact originals; switching languages never overwrites an edited preview');
  // Leave a Korean version of this exact pair in the AI input, select English,
  // and ensure quick insert detects the pair across the locale switch.
  const storedNotes=Object.values(await worker.evaluate(()=>chrome.storage.local.get(null))).filter(n=>n&&typeof n==='object'&&n.id&&n.question),original=storedNotes[0];await p.locator('#prompt-textarea').fill('Existing text\n'+formatPrompt([original]));await lang.selectOption('en');await ext.locator('#quick-insert').click();assert.equal(await ext.locator('#status').textContent(),'These questions are already in the AI input.');assert.equal(await card.locator('.prompt-include').isChecked(),true);
  await p.locator('#prompt-textarea').fill('Existing text');await ext.locator('#quick-insert').click();await p.waitForFunction(()=>!document.querySelector('#question-basket-extension').shadowRoot.querySelector('#list .prompt-include').checked);const input=await p.locator('#prompt-textarea').innerText();assert.ok(input.startsWith('Existing text'));assert.ok(input.includes(quote));assert.ok(input.includes('질문 추가'));assert.ok(input.includes('Quoted passage:'));assert.equal(await card.locator('.question').textContent(),'질문 추가');
  check('Cross-language duplicate protection; English quick insert preserves existing AI input and deselects only delivered questions');
  await ext.locator('#close').click();await ext.locator('#hide-menu').click();await worker.evaluate(async url=>{const tab=(await chrome.tabs.query({})).find(t=>t.url===url);await chrome.scripting.executeScript({target:{tabId:tab.id},files:['content.js']});},url);await ext.locator('#dock').waitFor();assert.equal(await ext.locator('#hide-menu').textContent(),'Hide');assert.equal(await ext.locator('#mode-compact').textContent(),'Reading mode ON');
  await p.reload();await ext.locator('#launcher').click();await lang.waitFor();assert.equal(await lang.inputValue(),'en');assert.equal(await ext.locator('#list .prompt-include').isChecked(),false);assert.equal(await ext.locator('#list .question').textContent(),'질문 추가');
  const p2=await ctx.newPage();await p2.goto(url);await p2.locator('#question-basket-extension #launcher').click();assert.equal(await p2.locator('#question-basket-extension #language').inputValue(),'en');await lang.selectOption('ko');await p2.waitForFunction(()=>document.querySelector('#question-basket-extension').shadowRoot.getElementById('hide-menu').textContent==='숨기기');await p2.close();
  check('Selected language survives hide/reinjection, reload and a new tab; preference changes synchronize between tabs');
  await lang.selectOption('en');await p.waitForTimeout(100);assert.equal(await worker.evaluate(()=>chrome.action.getTitle({})),'Enable / open AskMarker');await ext.locator('#reading-mode').click();
  await ext.locator('#font-size-mode').selectOption('custom');await ext.locator('#font-size-number').fill('160');await ext.locator('#font-size-number').dispatchEvent('change');await p.setViewportSize({width:800,height:1050});await p.emulateMedia({colorScheme:'dark'});await panel.screenshot({path:path.join(out,'english-panel-dark-160.png')});
  assert.ok(await panel.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'English panel must not overflow horizontally at 160%');await ext.locator('#font-size-mode').selectOption('system');await p.setViewportSize({width:1560,height:1100});await p.emulateMedia({colorScheme:'light'});await p.screenshot({path:path.join(out,'english-implementation.png'),fullPage:true});
  check('English toolbar title, 160% narrow-panel layout, dark/light UI and restored saved annotations');
  draft=await drag('third');await draft.getByRole('button',{name:'Save question',exact:true}).click();assert.equal(await ext.locator('#status').textContent(),'Enter a question before saving.');await lang.selectOption('ko');assert.equal(await ext.locator('#status').textContent(),'질문을 입력한 뒤 저장해 주세요.');await draft.getByRole('button',{name:'취소',exact:true}).click();
  check('Validation status and toast translate, including the last displayed message after a locale change');
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'language-results.json'),JSON.stringify({version:'0.9.1',environment:'Node language contracts + actual MV3 in isolated Chromium with synthetic ChatGPT HTML, real mouse gestures and real extension storage; test-only ChatGPT host grant for script reinjection. Not actual toolbar click, live AI service or user Chrome.',checks,errors},null,2));
 }finally{await ctx.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
