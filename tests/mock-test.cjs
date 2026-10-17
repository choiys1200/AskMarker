// Real browser DOM, deliberately MOCKED chrome.storage for failure/latency injection.
const {chromium}=require('playwright');const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.QA_OUTPUT||'work/mock-validation');fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true,executablePath:process.env.QA_BROWSER});try{
 const context=await browser.newContext({viewport:{width:1500,height:1100}});await context.route('**/*',r=>r.fulfill({contentType:'text/html',body:fs.readFileSync(path.join(__dirname,'fixture.html'),'utf8')}));const p=await context.newPage();await p.goto('https://chatgpt.com/c/mock');
 await p.evaluate(()=>{const data={},listeners=[];window.fixture={data,fail:false,delay:0};window.chrome={storage:{local:{get:async()=>{const snapshot=structuredClone(data);if(fixture.holdNextRead){fixture.holdNextRead=false;return new Promise(resolve=>fixture.releaseRead=()=>resolve(snapshot));}return snapshot;},set:async o=>{await new Promise(r=>setTimeout(r,window.fixture.delay));if(window.fixture.fail){window.fixture.fail=false;throw Error('simulated quota failure');}Object.assign(data,o);listeners.forEach(f=>f(o,'local'));},remove:async k=>{for(const key of [].concat(k))delete data[key];listeners.forEach(f=>f(Object.fromEntries([].concat(k).map(k=>[k,{}])),'local'));}},onChanged:{addListener:f=>listeners.push(f)}}};});
 await p.addScriptTag({path:path.join(root,'content.js')});const ext=p.locator('#question-basket-extension');await ext.locator('#mode-compact').click();
 async function select(id){await p.evaluate(id=>{const el=document.getElementById(id),r=document.createRange();r.selectNodeContents(el);getSelection().removeAllRanges();getSelection().addRange(r);el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0}));el.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,button:0}));},id);await ext.locator('#selection-add').click();const b=p.locator('[data-qb-inline^="draft-"]').last();await b.waitFor();return b;}
 let b=await select('first');await b.getByRole('textbox',{name:'궁금한 점'}).fill('실패해도 남겨야 할 질문');await p.evaluate(()=>fixture.fail=true);await b.getByRole('button',{name:'질문 저장',exact:true}).click();await p.waitForFunction(()=>document.querySelector('#question-basket-extension').shadowRoot.getElementById('status').textContent.includes('저장하지 못했습니다'));
 assert.equal(await b.getByRole('textbox',{name:'궁금한 점'}).inputValue(),'실패해도 남겨야 할 질문');await b.getByRole('button',{name:'취소',exact:true}).click();b=await select('first');await b.getByRole('button',{name:'취소',exact:true}).click();
 const checks=['Storage failure retains input; cancel then select recovers'];
 b=await select('first');await b.getByRole('textbox',{name:'궁금한 점'}).fill('느리게 저장되는 첫 질문');await p.evaluate(()=>fixture.delay=500);await b.getByRole('button',{name:'질문 저장',exact:true}).click();
 const second=await select('second');await second.getByRole('textbox',{name:'궁금한 점'}).fill('별도로 작성한 두 번째 질문');await p.waitForFunction(()=>document.querySelector('#question-basket-extension').shadowRoot.getElementById('count').textContent==='1');assert.equal(await second.getByRole('textbox',{name:'궁금한 점'}).inputValue(),'별도로 작성한 두 번째 질문');await second.getByRole('button',{name:'질문 저장',exact:true}).click();await p.waitForFunction(()=>document.querySelector('#question-basket-extension').shadowRoot.getElementById('count').textContent==='2');
 const saved=await p.evaluate(()=>Object.values(fixture.data).filter(n=>n?.question));assert.equal(saved[0].quote,await p.locator('#first').textContent());assert.equal(saved[1].quote,await p.locator('#second').textContent());checks.push('Pending storage write does not block new selection or swap its source');
 // Force an older in-flight storage read to finish after a newer checkbox write.
 await ext.locator('#launcher').click();const choices=ext.locator('#list .prompt-include');
 await p.evaluate(()=>{fixture.delay=0;fixture.holdNextRead=true;});
 await ext.locator('#list>article').first().getByRole('button',{name:'파랑',exact:true}).click();
 await p.waitForFunction(()=>typeof fixture.releaseRead==='function');await choices.first().uncheck();
 await p.waitForFunction(()=>Object.entries(fixture.data).some(([k,v])=>k.startsWith('qb:prompt-choice:')&&v===false));
 await p.evaluate(async()=>{fixture.releaseRead();await new Promise(requestAnimationFrame);});
 assert.equal(await choices.first().isChecked(),false,'An old storage read must not undo a newer prompt exclusion');
 checks.push('Delayed storage read cannot reselect a question after its exclusion was saved');
 await p.evaluate(()=>fixture.fail=true);await choices.first().check();
 await p.waitForFunction(()=>document.querySelector('#question-basket-extension').shadowRoot.getElementById('status').textContent.includes('질문 선택을 저장하지 못했습니다'));
 assert.equal(await choices.first().isChecked(),false);assert.equal(await ext.locator('#count').textContent(),'2');
 checks.push('Prompt-choice storage failure restores the persisted checkbox without deleting notes');
 // Inspect native selection behavior with an injected shadow bubble between paragraphs.
 const selected=await p.evaluate(()=>{const r=document.createRange();r.setStart(document.getElementById('first').firstChild,0);r.setEnd(document.getElementById('second').lastChild,document.getElementById('second').lastChild.length);getSelection().removeAllRanges();getSelection().addRange(r);return{selection:getSelection().toString(),range:r.toString()};});
 assert.ok(!selected.range.includes('느리게 저장'));checks.push('Raw source extraction excludes extension UI across paragraphs');
 fs.writeFileSync(path.join(out,'mock-results.json'),JSON.stringify({environment:'Browser DOM with mocked chrome.storage; not extension integration and not live ChatGPT',checks,selectionComparison:selected},null,2));console.log(checks);console.log(selected);
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
