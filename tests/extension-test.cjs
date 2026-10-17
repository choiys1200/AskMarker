const {chromium}=require('playwright');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const out=path.resolve(process.env.QA_OUTPUT||path.join(root,'..','validation'));
const browserPath=process.env.QA_BROWSER;
const fixture=fs.readFileSync(path.join(__dirname,'fixture.html'),'utf8');
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const ctx=await chromium.launchPersistentContext(fs.mkdtempSync(path.join(out,'browser-profile-')),{headless:true,executablePath:browserPath,viewport:{width:1560,height:1100},permissions:['clipboard-read','clipboard-write'],args:[`--disable-extensions-except=${root}`,`--load-extension=${root}`]});
 const results=[],errors=[];
 const check=(name,details)=>{results.push({name,result:'PASS',details});console.log('PASS',name);};
 try{
 const worker=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker');
 const manifest=await worker.evaluate(()=>chrome.runtime.getManifest());assert.equal(manifest.version,'0.8.0');check('Real extension loaded',{version:manifest.version,browser:ctx.browser()?.version(),extensionId:await worker.evaluate(()=>chrome.runtime.id)});
 await ctx.route('https://chatgpt.com/**',r=>r.fulfill({status:200,contentType:'text/html',body:fixture}));
 const page=ctx.pages()[0]||await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto('https://chatgpt.com/c/local-fixture');
 const ext=page.locator('#question-basket-extension');await ext.waitFor();if(await ext.locator('#mode-compact').count())await ext.locator('#mode-compact').click();
 const inline=()=>page.locator('[data-qb-inline]');
 const drafts=()=>page.locator('[data-qb-inline^="draft-"]');
 const storage=async()=>worker.evaluate(async()=>await chrome.storage.local.get(null));
 async function drag(id='first'){
  const loc=page.locator('#'+id);await loc.scrollIntoViewIfNeeded();
  const p=await loc.boundingBox();
  await page.mouse.move(p.x+2,p.y+15);await page.mouse.down();await page.mouse.move(p.x+285,p.y+15,{steps:16});await page.mouse.up();await ext.locator('#selection-add').click();
  await drafts().last().waitFor({state:'visible'});return drafts().last();
 }
 async function exactSelect(from,to=from,start=0,end=null){
  await page.locator('#'+from).scrollIntoViewIfNeeded();
  await page.evaluate(({from,to,start,end})=>{const a=document.getElementById(from),b=document.getElementById(to);const r=document.createRange();r.setStart(a.firstChild,start);r.setEnd(b.lastChild,end??b.lastChild.length);getSelection().removeAllRanges();getSelection().addRange(r);a.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0}));b.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,button:0}));},{from,to,start,end});
  await ext.locator('#selection-add').click();await drafts().last().waitFor({state:'visible'});return drafts().last();
 }
 async function saveDraft(b,q){const id=await b.getAttribute('data-qb-inline');await b.getByRole('textbox',{name:'궁금한 점'}).fill(q);await b.getByRole('button',{name:'질문 저장',exact:true}).click();await page.locator(`[data-qb-inline="${id}"]`).waitFor({state:'detached'});}
 async function countSaved(n){await page.waitForFunction(n=>document.querySelector('#question-basket-extension').shadowRoot.getElementById('count').textContent===String(n),n);}
 async function hcount(){return page.evaluate(()=>[...CSS.highlights.values()].reduce((a,h)=>a+h.size,0));}
 // 10 real mouse cycles: alternate same and different source; use cancel, close, Escape.
 for(let i=0;i<10;i++){
  const b=await drag(i%3===2?'second':'first');assert.equal(await hcount(),1);
  if(i%3===0)await b.getByRole('button',{name:'취소',exact:true}).click();
  else if(i%3===1)await b.getByRole('button',{name:'작성 취소',exact:true}).click();
  else await b.getByRole('textbox',{name:'궁금한 점'}).press('Escape');
  await drafts().waitFor({state:'detached'});assert.equal(await hcount(),0);
 }
 check('01–03: ten actual mouse drag/cancel cycles; same and different text');
 await ext.locator('#launcher').click();
 let b=await drag();await b.getByRole('textbox',{name:'궁금한 점'}).fill('첫 질문의 근거를 알려 주세요.');
 assert.equal(await page.evaluate(()=>getSelection().toString()),'');assert.equal(await hcount(),1);check('05: highlight remains with textarea focus and no native selection');
 for(const [name,key]of [['노랑','yellow'],['보라','purple'],['파랑','blue'],['초록','green'],['핑크','pink']]){
  await ext.locator('#color-palette').getByRole('button',{name,exact:true}).click();assert.equal(await ext.locator('#color-palette').getByRole('button',{name,exact:true}).getAttribute('aria-pressed'),'true');assert.equal(await page.evaluate(k=>CSS.highlights.get('qb-'+k).size,key),1);
 }
 await saveDraft(b,'첫 질문의 근거를 알려 주세요.');await countSaved(1);
 b=await drag('second');assert.equal(await ext.locator('#color-palette').getByRole('button',{name:'핑크',exact:true}).getAttribute('aria-pressed'),'true');await ext.locator('#color-palette').getByRole('button',{name:'보라',exact:true}).click();await saveDraft(b,'두 번째 원문을 더 쉽게 설명해 주세요.');await countSaved(2);
 await ext.getByRole('button',{name:'AskMarker 접기',exact:true}).click();
 b=await drag('third');await ext.locator('#launcher').click();await ext.locator('#color-palette').getByRole('button',{name:'파랑',exact:true}).click();await saveDraft(b,'세 번째 질문입니다.');await countSaved(3);assert.equal(await inline().count(),3);assert.equal(await hcount(),3);
 check('04,06,07: three successive notes, five colors, last-color default, collapsed panel');
 // A nonempty draft must keep its source and input while another selection is made.
 const d1=await drag('first');const d1id=await d1.getAttribute('data-qb-inline');await d1.getByRole('textbox',{name:'궁금한 점'}).fill('아직 저장하지 않은 원래 질문');const d1quote=await d1.locator('blockquote').textContent();
 const d2=await drag('second');await d2.getByRole('button',{name:'취소',exact:true}).click();
 const kept=page.locator(`[data-qb-inline="${d1id}"]`);assert.equal(await kept.getByRole('textbox',{name:'궁금한 점'}).inputValue(),'아직 저장하지 않은 원래 질문');assert.equal(await kept.locator('blockquote').textContent(),d1quote);
 await kept.getByRole('button',{name:'취소',exact:true}).click();check('Independent draft source ownership');
 if(await ext.locator('#launcher').isVisible())await ext.locator('#launcher').click();
 let bubble=inline().first();const firstId=await bubble.getAttribute('data-qb-inline');
 await bubble.getByRole('button',{name:'수정',exact:true}).click();await bubble.getByRole('textbox',{name:'궁금한 점'}).fill('말풍선에서 수정한 질문');await bubble.getByRole('button',{name:'수정 저장',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#question-basket-extension').shadowRoot.querySelector('.question').textContent==='말풍선에서 수정한 질문');
 let card=ext.locator('#list > article').first();await card.getByRole('button',{name:'수정',exact:true}).click();await card.getByRole('textbox',{name:'궁금한 점'}).fill('목록에서 수정한 질문');await card.getByRole('button',{name:'수정 저장',exact:true}).click();
 await page.waitForFunction(id=>document.querySelector(`[data-qb-inline="${id}"]`).shadowRoot.querySelector('.question').textContent==='목록에서 수정한 질문',firstId);
 await card.getByRole('button',{name:'초록',exact:true}).click();assert.equal(await bubble.locator('.card').evaluate(el=>el.style.getPropertyValue('--accent')),'#4ade80');
 await ext.locator('#color-palette').getByRole('button',{name:'노랑',exact:true}).click();assert.equal(await card.getByRole('button',{name:'노랑',exact:true}).getAttribute('aria-pressed'),'true');
 check('08: edits and saved colors synchronize both directions');
 b=await drag('first');await saveDraft(b,'같은 문장의 또 다른 질문');await countSaved(4);
 await page.locator(`[data-qb-inline="${firstId}"]`).getByRole('button',{name:'삭제',exact:true}).click();await countSaved(3);assert.equal(await hcount(),3);assert.equal(await drafts().count(),0);
 const leftFirst=page.locator('#first + [data-qb-inline]');await leftFirst.waitFor();check('09: deleting one of shared-source notes retains other highlight and bubble');
 // Actual flow layout + window/internal scroll + resize.
 await page.evaluate(()=>scrollTo(0,0));
 let pbox=await page.locator('#first').boundingBox(),bbox=await leftFirst.boundingBox(),next=await page.locator('#second').boundingBox();assert.ok(bbox.y>=pbox.y+pbox.height-1);assert.ok(next.y>=bbox.y+bbox.height-1);
 await page.evaluate(()=>{const m=document.querySelector('main');m.style.height='400px';m.style.overflow='auto';m.scrollTop=80;});
 const sp=await page.locator('#first').boundingBox(),sb=await leftFirst.boundingBox();assert.ok(Math.abs((sb.y-sp.y)-(bbox.y-pbox.y))<2);
 await page.evaluate(()=>{const m=document.querySelector('main');m.style.height='';m.style.overflow='';m.scrollTop=0;});
 const wp=await page.locator('#first').boundingBox(),wb=await leftFirst.boundingBox();
 await page.mouse.wheel(0,240);await page.waitForTimeout(200);
 const wp2=await page.locator('#first').boundingBox(),wb2=await leftFirst.boundingBox();assert.ok(Math.abs((wb2.y-wp2.y)-(wb.y-wp.y))<2);await page.evaluate(()=>scrollTo(0,0));
 await page.setViewportSize({width:1000,height:850});
 pbox=await page.locator('#first').boundingBox();bbox=await leftFirst.boundingBox();assert.ok(bbox.y>=pbox.y+pbox.height-1);
 await page.setViewportSize({width:1560,height:1100});
 await leftFirst.evaluate(el=>el.remove());await leftFirst.waitFor({state:'attached'});await page.locator('#first').evaluate(el=>el.outerHTML=el.outerHTML);await page.waitForTimeout(300);assert.equal(await hcount(),3);
 await page.reload();await ext.waitFor();if(await ext.locator('#mode-compact').count())await ext.locator('#mode-compact').click();await countSaved(3);assert.equal(await inline().count(),3);assert.equal(await hcount(),3);check('10: flow layout, internal scroll, resize, React-like replacement and reload');
 await ext.locator('#launcher').click();
 await page.evaluate(()=>scrollTo(0,0));
 await page.screenshot({path:path.join(out,'implementation-light.png')});
 await page.evaluate(()=>document.documentElement.classList.add('dark'));await page.emulateMedia({colorScheme:'dark'});await page.addStyleTag({content:'body{background:#171c1a;color:#e3eee7}#prompt-textarea{background:#202a27;color:#eee}'});
 await page.screenshot({path:path.join(out,'implementation-dark.png')});
 await page.evaluate(()=>document.documentElement.classList.remove('dark'));await page.emulateMedia({colorScheme:'light'});
 // Prompt should exactly contain saved quote/question pairs and no canceled drafts.
 const all=await storage();const saved=Object.values(all).filter(n=>n?.scope==='https://chatgpt.com/c/local-fixture'&&n.question).sort((a,b)=>a.created-b.created||a.id.localeCompare(b.id));
 await ext.locator('#generate').click();const preview=ext.locator('#prompt');const prompt=await preview.inputValue();
 for(let i=0;i<saved.length;i++)assert.ok(prompt.includes('질문 '+(i+1)+'\n\n- 인용 원문: '+saved[i].quote+'\n- 내 질문: '+saved[i].question));assert.ok(!prompt.includes('아직 저장하지'));
 await preview.fill(prompt+'\n검증용 추가 지시');
 await ext.locator('#copy').click();assert.equal((await page.evaluate(()=>navigator.clipboard.readText())).replace(/\r\n/g,'\n'),prompt+'\n검증용 추가 지시');
 await page.locator('#prompt-textarea').fill('기존 입력은 그대로 유지');await ext.locator('#insert').click();const inserted=await page.locator('#prompt-textarea').innerText();assert.ok(inserted.startsWith('기존 입력은 그대로 유지'));assert.ok(inserted.includes('검증용 추가 지시'));
 await ext.locator('#select-all').click();await ext.locator('#generate').click();await preview.fill(prompt+'\n검증용 추가 지시');await ext.locator('#insert').click();assert.equal(await page.locator('#prompt-textarea').innerText(),inserted);await ext.locator('#preview-close').click();check('11–12: exact pairs, editable preview, clipboard, preserve composer, prevent duplicate');
 // Strict source restoration: changed root, even unchanged quote, must not bind to another occurrence.
 await page.locator('#first').evaluate(el=>el.firstChild.textContent='수정된 답변입니다. '+el.firstChild.textContent);await page.waitForTimeout(400);assert.equal(await inline().count(),0);assert.equal(await hcount(),0);await countSaved(3);
 assert.equal(await ext.locator('.location:visible').count(),3);check('Changed source remains in list without guessing a match');
 // SPA separation and return.
 await page.evaluate(()=>history.pushState({},'', '/c/another-conversation'));await countSaved(0);assert.equal(await inline().count(),0);await page.evaluate(()=>history.pushState({},'', '/c/local-fixture'));await countSaved(3);check('Conversation isolation on SPA navigation');
 // Reload restores unmodified source fixture. Multi paragraph and repeated exact text offsets.
 await page.reload();await ext.waitFor();if(await ext.locator('#mode-compact').count())await ext.locator('#mode-compact').click();await countSaved(3);
 b=await exactSelect('first','second',3);const multiQuote=await b.locator('blockquote').textContent();assert.ok(multiQuote.includes('이 문장')&&multiQuote.includes('읽던 흐름')&&multiQuote.includes('\n\n'));assert.ok(!multiQuote.includes('같은 문장의 또 다른 질문'));await saveDraft(b,'여러 문단에 대한 질문');await countSaved(4);await page.reload();await ext.waitFor();if(await ext.locator('#mode-compact').count())await ext.locator('#mode-compact').click();await countSaved(4);assert.equal(await hcount(),4);check('Multi-paragraph selection and reload preserves exact quote');
 // v0.2 schema migration is read-only and defaults to yellow.
 const legacy={id:'legacy-note',scope:'https://chatgpt.com/c/legacy',quote:'AI 답변을 읽다가 궁금한 문장을 드래그합니다.',question:'기존 0.2 기록',context:'AI 답변을 읽다가 궁금한 문장을 드래그합니다. 이 문장의 근거가 궁금하면 질문을 남겨 보세요.',messageId:'answer-one',created:1};
 await worker.evaluate(async n=>chrome.storage.local.set({['qb:note:'+encodeURIComponent(n.scope)+':'+n.id]:n}),legacy);
 await page.goto(legacy.scope);await ext.waitFor();if(await ext.locator('#mode-compact').count())await ext.locator('#mode-compact').click();await countSaved(1);assert.equal(await inline().count(),1);assert.equal(await inline().first().locator('.card').evaluate(el=>el.style.getPropertyValue('--accent')),'#e6b92d');assert.deepEqual((await storage())['qb:note:'+encodeURIComponent(legacy.scope)+':'+legacy.id],legacy);check('v0.2 storage retained byte-for-byte, yellow fallback, exact legacy locate');
 // New page exception recovery: editor lifetime survives panel collapse.
 await ext.locator('#launcher').click();b=await drag();await ext.locator('#close').click();assert.equal(await drafts().count(),1);await b.getByRole('textbox',{name:'궁금한 점'}).fill('접어도 보존');await b.getByRole('button',{name:'취소',exact:true}).click();check('Panel collapse and draft cancellation are independent');
 assert.deepEqual(errors,[]);check('No page errors');
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({environment:'Real unpacked MV3 extension + real Chromium; local fixture routed under chatgpt.com. NOT the live ChatGPT service.',results,errors},null,2));
 }finally{await ctx.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
