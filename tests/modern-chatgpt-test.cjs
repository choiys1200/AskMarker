// Uses minimal structure observed in live ChatGPT on 2026-10-11, with synthetic text.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.QA_OUTPUT||'work/modern-v041');fs.mkdirSync(out,{recursive:true});
 let fixture=fs.readFileSync(path.join(__dirname,'fixture.html'),'utf8').replace('<article data-message-id="answer-one" data-message-author-role="assistant">','<div data-user-message-bubble="true"><p id="user-text">사용자가 입력한 문장은 질문 대상으로 선택하지 않습니다.</p></div><div data-chatgpt-selection-message-id="answer-one"><div data-dil-source-message-id="answer-one"><div data-dil-message-id="answer-one">').replace('</article>','</div></div></div>').replace('AI 답변을 읽다가 궁금한 문장을 드래그합니다.', '<span data-d-text-flow>AI 답변을 읽다가 </span><span data-d-default-strong>궁금한 문장을 드래그합니다.</span>');
 const results=[];
 async function run(dir,fixed){
 const ctx=await chromium.launchPersistentContext(fs.mkdtempSync(path.join(out,'profile-')),{headless:true,executablePath:process.env.QA_BROWSER,viewport:{width:1560,height:1100},args:[`--disable-extensions-except=${dir}`,`--load-extension=${dir}`]});
 const errors=[];
 try{
 const worker=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker'),version=await worker.evaluate(()=>chrome.runtime.getManifest().version);const checks=[];const check=n=>{checks.push(n);console.log(version,n);};
 await ctx.route('https://chatgpt.com/**',r=>r.fulfill({contentType:'text/html',body:fixture}));const p=ctx.pages()[0];p.on('pageerror',e=>errors.push(e.message));const cdp=await ctx.newCDPSession(p);cdp.on('Runtime.exceptionThrown',e=>errors.push(e.exceptionDetails.exception?.description||e.exceptionDetails.text));await cdp.send('Runtime.enable');await p.goto('https://chatgpt.com/g/g-p-fixture-title/c/modern');const ext=p.locator('#question-basket-extension');await ext.locator('#mode-compact').click();const drafts=()=>p.locator('[data-qb-inline^="draft-"]');
 async function drag(id='first'){await p.locator('#'+id).scrollIntoViewIfNeeded();const b=await p.locator('#'+id).boundingBox();await p.mouse.move(b.x+2,b.y+15);await p.mouse.down();await p.mouse.move(b.x+275,b.y+15,{steps:15});await p.mouse.up();if(await ext.locator('#selection-add').isVisible())await ext.locator('#selection-add').click();}
 const count=async n=>p.waitForFunction(n=>document.querySelector('#question-basket-extension').shadowRoot.getElementById('count').textContent===String(n),n);
 await drag();
 if(!fixed){await p.waitForTimeout(150);assert.ok(await p.evaluate(()=>getSelection().toString().length>0));assert.equal(await drafts().count(),0);results.push({version,status:'REPRODUCED',selectedTextPresent:true,bubbles:0,checks:['New answer DOM is rejected by old assistant-role guard'],errors});return;}
 await drafts().waitFor();
 for(let i=0;i<10;i++){if(i)await drag(i%2?'second':'first');await drafts().waitFor();await drafts().getByRole('button',{name:i%2?'작성 취소':'취소',exact:true}).click();await drafts().waitFor({state:'detached'});}
 check('New ChatGPT structure: 10 actual drag/cancel cycles with nested spans, same/different text');
 await ext.locator('#launcher').click();
 const initialHighlight=await worker.evaluate(()=>chrome.storage.local.get('qb:preferences:v3'));
 for(const [key,name]of [['red','빨강'],['orange','주황'],['yellow','노랑'],['green','초록'],['blue','파랑'],['indigo','남색'],['purple','보라'],['pink','핑크']]){
  const button=ext.locator('#color-palette').getByRole('button',{name:name,exact:true});await button.click();assert.equal(await button.getAttribute('aria-pressed'),'true');await p.waitForFunction(key=>document.querySelector('#question-basket-extension').shadowRoot.querySelector('#color-palette button[aria-pressed=true]').dataset.color===key,key);
  const b=await p.locator('#first').boundingBox();await p.mouse.move(b.x+200,b.y+15);await ext.locator('#laser').waitFor({state:'visible'});const css=await ext.locator('#laser').evaluate(el=>({background:getComputedStyle(el).backgroundImage,border:getComputedStyle(el).borderWidth,events:getComputedStyle(el).pointerEvents,opacity:Number(getComputedStyle(el).opacity)}));assert.ok(css.background.includes('radial-gradient'));const centerAlpha=Number(css.background.match(/rgba\([^)]+,\s*([\d.]+)\) 0%/)[1])*css.opacity;assert.ok(centerAlpha>0.5&&centerAlpha<0.65);assert.ok(css.background.includes('0) 75%'));assert.equal(css.border,'0px');assert.equal(css.events,'none');
 }
 assert.equal((await worker.evaluate(()=>chrome.storage.local.get('qb:preferences:v3')))['qb:preferences:v3'].lastColor,'pink');check('Eight shared box and laser colors, filled translucent radial fade, no border, pointer-events none');
 await ext.locator('#color-palette').getByRole('button',{name:'파랑',exact:true}).click();await drag();await drafts().getByRole('textbox').fill('첫 번째 새 구조 질문');await ext.locator('#color-palette').getByRole('button',{name:'보라',exact:true}).click();await drafts().getByRole('button',{name:'질문 저장',exact:true}).click();await count(1);await drag('second');await drafts().getByRole('textbox').fill('두 번째 새 구조 질문');await drafts().getByRole('button',{name:'질문 저장',exact:true}).click();await count(2);
 const saved=await worker.evaluate(async()=>Object.values(await chrome.storage.local.get(null)).filter(n=>n?.question));assert.equal(saved.length,2);assert.ok(saved.every(n=>n.anchor.rootAttribute==='data-dil-message-id'&&n.anchor.messageId==='answer-one'));check('New renderer IDs and exact offsets persisted with independent highlight colors');
 await p.evaluate(()=>scrollTo(0,0));await p.mouse.move(330,220);await p.screenshot({path:path.join(out,'modern-answer-laser.png')});
 await ext.locator('#reading-mode').click();assert.equal(await p.locator('[data-qb-inline]').count(),0);await ext.locator('#reading-mode').click();assert.equal(await p.locator('[data-qb-inline]').count(),2);
 await p.reload();await ext.locator('#mode-compact').click();await count(2);assert.equal(await p.locator('[data-qb-inline]').count(),2);await ext.locator('#launcher').click();assert.equal(await ext.locator('#color-palette').getByRole('button',{name:'보라',exact:true}).getAttribute('aria-pressed'),'true');check('Reload restores laser setting, saved source positions and questions after enabling');
 await p.evaluate(()=>history.replaceState({},'', '/g/g-p-fixture-renamed/c/modern'));await p.waitForTimeout(450);await count(2);assert.equal(await p.locator('[data-qb-inline]').count(),2);await p.evaluate(()=>history.replaceState({},'', '/c/modern'));await p.waitForTimeout(450);await count(2);check('Project slug changes preserve the same conversation; original storage keys unchanged');
 await p.evaluate(()=>{const el=document.querySelector('[data-dil-message-id]');el.outerHTML=el.outerHTML;});await p.waitForTimeout(250);assert.equal(await p.locator('[data-qb-inline]').count(),2);
 const before=await p.locator('[data-qb-inline]').first().locator('blockquote').textContent();await drag('user-text');assert.equal(await drafts().count(),0);assert.equal(await p.locator('[data-qb-inline]').first().locator('blockquote').textContent(),before);check('User bubble rejected without overwriting source; regenerated answer DOM restores');
 await ext.locator('#generate').click();const prompt=await ext.locator('#prompt').inputValue();for(const n of saved)assert.ok(prompt.includes('- 인용 원문: '+n.quote+'\n- 내 질문: '+n.question));await ext.locator('#preview-close').click();
 await p.evaluate(()=>document.querySelector('[data-dil-message-id]').setAttribute('data-dil-message-id','different-answer'));await p.waitForTimeout(250);assert.equal(await p.locator('[data-qb-inline]').count(),0);await count(2);check('Wrong message ID never reattaches; records stay in panel');
 assert.deepEqual(errors,[]);results.push({version,status:'PASS',checks,errors});
 }finally{await ctx.close();}
 }
 if(process.env.QA_BASELINE)await run(path.resolve(process.env.QA_BASELINE),false);await run(root,true);
 fs.writeFileSync(path.join(out,'modern-results.json'),JSON.stringify({environment:'Actual unpacked MV3 extension + synthetic HTML reproducing DOM attributes inspected on live ChatGPT. Not a live-site success test.',results},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
