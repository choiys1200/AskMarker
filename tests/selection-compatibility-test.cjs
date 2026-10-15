// Real unpacked extension, synthetic DOM variants. Not a company-PC/live-site test.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.QA_OUTPUT||'work/selection-v051');fs.mkdirSync(out,{recursive:true});
 const fixture=fs.readFileSync(path.join(__dirname,'fixture.html'),'utf8');
 const variants=[
  ['assistant-style-source','<div data-dil-source-message-id="answer-one"><div data-markdown-text-style="assistant-message">','</div></div>','data-dil-source-message-id'],
  ['assistant-style-selection','<div data-chatgpt-selection-message-id="answer-one"><div data-markdown-text-style="assistant-message">','</div></div>','data-chatgpt-selection-message-id'],
  ['renderer-source-no-selection','<div data-dil-source-message-id="answer-one"><div data-dil-message-id="answer-one">','</div></div>','data-dil-message-id'],
  ['semantic-turn','<article data-testid="conversation-turn-1"><h4 data-conversation-role="assistant">ChatGPT 답변:</h4><div class="markdown">','</div></article>',null],
  ['assistant-style-no-id','<div data-markdown-text-style="assistant-message">','</div>',null],
  ['legacy-no-id','<div data-message-author-role="assistant">','</div>',null],
  ['assistant-turn-role','<article data-turn="assistant"><div class="markdown">','</div></article>',null]
 ];
 const results=[];
 async function run(dir,baseline=false){
  const ctx=await chromium.launchPersistentContext(fs.mkdtempSync(path.join(out,'profile-')),{headless:true,executablePath:process.env.QA_BROWSER,viewport:{width:1560,height:1100},args:[`--disable-extensions-except=${dir}`,`--load-extension=${dir}`]});
  const errors=[];
  try{
   const worker=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker'),version=await worker.evaluate(()=>chrome.runtime.getManifest().version);
   await ctx.grantPermissions(['clipboard-read','clipboard-write'],{origin:'https://chatgpt.com'});
   const p=ctx.pages()[0];p.on('pageerror',e=>errors.push(e.message));const cdp=await ctx.newCDPSession(p);cdp.on('Runtime.exceptionThrown',e=>errors.push(e.exceptionDetails.exception?.description||e.exceptionDetails.text));await cdp.send('Runtime.enable');
   let html;await ctx.route('https://chatgpt.com/**',r=>r.fulfill({contentType:'text/html',body:html}));
   const ext=p.locator('#question-basket-extension'),draft=()=>p.locator('[data-qb-inline^="draft-"]');
   const cancel=async()=>{await draft().getByRole('button',{name:'취소',exact:true}).click();await draft().waitFor({state:'detached'});};
   async function drag(id='first',reverse=false){const el=p.locator('#'+id);await el.scrollIntoViewIfNeeded();const b=await el.boundingBox();await p.mouse.move(b.x+(reverse?275:2),b.y+15);await p.mouse.down();await p.mouse.move(b.x+(reverse?2:275),b.y+15,{steps:12});await p.mouse.up();if(await ext.locator('#selection-add').isVisible())await ext.locator('#selection-add').click();}
   for(const [name,open,close,attr]of (baseline?variants.slice(0,3):variants)){
    console.log('START',version,name);
    html=fixture.replace('<article data-message-id="answer-one" data-message-author-role="assistant">','<div id="boundary">'+open).replace('</article>',close+'</div><div data-user-message-bubble="true"><p id="user">사용자가 쓴 질문은 답변이 아닙니다.</p></div>');
    await p.goto('https://chatgpt.com/c/'+name);await ext.locator('#mode-compact').click();await drag();
    if(baseline){assert.equal(await draft().count(),0);assert.match(await ext.locator('#status').textContent(),/본문으로 인식하지 못/);results.push({version,name,result:'REPRODUCED',selectedTextPresent:!!await p.evaluate(()=>getSelection().toString())});continue;}
    await draft().waitFor();await cancel();
    for(let i=1;i<10;i++){await drag(i%2?'second':'first',i%3===0);await draft().waitFor();await cancel();}
    // DOM endpoint regression: selected content is wholly an answer but endpoints are its parent.
    // This synthetic Range setup is reported separately from the 10 real mouse gestures above.
    await p.evaluate(()=>{const first=document.getElementById('first'),body=first.closest('.markdown')||first.parentElement,r=document.createRange();r.selectNode(body);getSelection().removeAllRanges();getSelection().addRange(r);});
    const expected=await p.evaluate(()=>getSelection().toString());await ext.locator('#launcher').click();await ext.locator('#use-selection').click();await draft().waitFor();assert.equal(await draft().locator('blockquote').textContent(),expected);await cancel();
    await drag();await draft().getByRole('textbox').fill('회사 PC 호환성 검증 질문');await draft().getByRole('button',{name:'질문 저장',exact:true}).click();await p.waitForFunction(()=>document.querySelector('#question-basket-extension').shadowRoot.getElementById('count').textContent==='1');
    const records=await worker.evaluate(async()=>Object.values(await chrome.storage.local.get(null)).filter(n=>n?.question));const note=records.find(n=>n.scope.endsWith('/'+name));assert.equal(note.anchor.rootAttribute,attr);
    await p.reload();await ext.locator('#mode-compact').click();await p.locator('[data-qb-inline]').waitFor();assert.equal(await p.locator('[data-qb-inline]').count(),1);
    if(!attr){
     await p.evaluate(selector=>{const el=document.querySelector(selector),clone=el.cloneNode(true);clone.id='duplicate-answer';el.after(clone);},note.anchor.rootSelector);await p.waitForFunction(()=>document.querySelectorAll('[data-qb-inline]').length===0);
     await p.locator('#duplicate-answer').evaluate(el=>el.remove());await p.locator('[data-qb-inline]').waitFor();
     await p.evaluate(selector=>{const el=document.querySelector(selector),spacer=document.createElement('div');spacer.id='structure-change';el.before(spacer);},note.anchor.rootSelector);await p.waitForFunction(()=>document.querySelectorAll('[data-qb-inline]').length===0);
     await p.locator('#structure-change').evaluate(el=>el.remove());await p.locator('[data-qb-inline]').waitFor();
    }
    await drag('user');assert.equal(await draft().count(),0);
    await ext.locator('#launcher').click();await ext.locator('#selection-diagnostic').click();const diagnostic=await p.evaluate(()=>navigator.clipboard.readText());assert.ok(!diagnostic.includes('사용자가 쓴'));assert.ok(!diagnostic.includes('https://'));assert.equal(JSON.parse(diagnostic).version,'0.6.3');
    await p.locator('#first').evaluate(el=>el.firstChild.textContent='원문 변경: '+el.firstChild.textContent);await p.waitForFunction(()=>document.querySelectorAll('[data-qb-inline]').length===0);assert.equal(await ext.locator('#count').textContent(),'1');
    results.push({version,name,result:'PASS',realMouseCancelCycles:10,syntheticElementBoundary:true,saveReload:true,userRejected:true,changedSourceRetained:true,diagnosticContainsNoText:true});console.log('PASS',name);
   }
   if(!baseline){
    // Selection crosses a user message, two answers, or sidebar content: never use main as a fallback.
    html=fixture.replace('</article>','</article><div data-user-message-bubble><p id="user">사용자 질문</p></div><article data-message-id="answer-two" data-message-author-role="assistant"><p id="other">두 번째 답변 문장입니다.</p></article>');
    await p.goto('https://chatgpt.com/c/reject-mixed');await ext.locator('#mode-compact').click();await ext.locator('#launcher').click();
    for(const target of ['user','other']){await p.evaluate(target=>{const r=document.createRange();r.setStart(document.getElementById('first').firstChild,0);const end=document.getElementById(target).firstChild;r.setEnd(end,end.length);getSelection().removeAllRanges();getSelection().addRange(r);},target);await ext.locator('#use-selection').click();assert.equal(await draft().count(),0);}
    // Contradictory IDs must still fail even with explicit assistant styling.
    html=fixture.replace('<article data-message-id="answer-one" data-message-author-role="assistant">','<div data-chatgpt-selection-message-id="one"><div data-markdown-text-style="assistant-message"><div data-dil-message-id="two">').replace('</article>','</div></div></div>');await p.goto('https://chatgpt.com/c/mismatch');await ext.locator('#mode-compact').click();await drag();assert.equal(await draft().count(),0);
    // A generic markdown class is not evidence of an answer.
    html=fixture.replace('data-message-id="answer-one" data-message-author-role="assistant"','class="markdown"');await p.goto('https://chatgpt.com/c/generic');await ext.locator('#mode-compact').click();await drag();assert.equal(await draft().count(),0);
    results.push({version,result:'PASS',negativeCases:['mixed user/assistant','two different answers','contradictory IDs','generic markdown without assistant evidence']});
   }
   assert.deepEqual(errors,[]);
  }finally{await ctx.close();}
 }
 if(process.env.QA_BASELINE)await run(path.resolve(process.env.QA_BASELINE),true);await run(root);
 fs.writeFileSync(path.join(out,'selection-results.json'),JSON.stringify({environment:'Real MV3 extension + synthetic DOM compatibility fixtures. Company PC and live installed 0.6.3 NOT tested.',results},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
