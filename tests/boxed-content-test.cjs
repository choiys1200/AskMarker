// Real MV3 in isolated Chromium; synthetic boxes matching observed live DOM.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.QA_OUTPUT||'work/boxes');fs.mkdirSync(out,{recursive:true});
 const checks=[],results=[];
 const html=`<!doctype html><html><head><meta charset="utf-8"><style>
 body{font:16px/1.9 system-ui;padding:40px 430px 200px 80px;margin:0;background:#f8f9fc;color:#242938}main{max-width:720px}
 .box{border:1px solid #ccd1dc;border-radius:12px;background:white;margin:20px 0;padding:16px;overflow:clip}pre{font:14px/1.8 monospace;overflow:auto;margin:0}p{margin:16px 0}
 [contenteditable]{outline:none}#prompt-textarea{min-height:90px;background:white;border:1px solid #aaa;padding:16px}
 </style></head><body><main><small>검증용 예시 · 실제 ChatGPT가 아닙니다</small><h1>코드와 메일 예시에도 질문을 남기세요.</h1>
 <article data-chatgpt-selection-message-id="boxed-answer"><div data-dil-source-message-id="boxed-answer"><div data-dil-message-id="boxed-answer">
 <p id="normal">이 답변은 코드와 메일 예시를 함께 설명합니다.</p>
 <div class="box" id="code-box"><div>JavaScript <button>복사</button></div><pre><code><span id="code-line">const answer = questions.map(question =&gt; question.text);</span>\nconsole.log(answer);</code></pre></div>
 <div class="box" id="mail-box" data-oai-writing-block-surface data-testid="chatgpt-writing-block" data-writing-block-variant="email"><div>메일 예시 <button>복사</button></div><div class="writing-block-editor"><div contenteditable="true" role="textbox" class="ProseMirror"><p id="mail-line">안녕하세요. 제안해 주신 내용을 검토하고 다음 단계에 대해 질문드립니다.</p><p id="mail-second">가능한 일정과 필요한 자료를 알려 주시면 준비하겠습니다.</p></div></div></div>
 <p id="after">이 문장은 질문 말풍선 뒤에도 가려지지 않아야 합니다.</p>
 </div></div></article>
 <div contenteditable="true" id="other-editor"><p>답변 밖의 편집기에서는 질문이 생기지 않습니다.</p></div>
 <div id="prompt-textarea" contenteditable="true" role="textbox"></div></main></body></html>`;
 async function run(dir,baseline){
  const ctx=await chromium.launchPersistentContext(fs.mkdtempSync(path.join(out,'profile-')),{headless:true,executablePath:process.env.QA_BROWSER,viewport:{width:1560,height:1200},args:[`--disable-extensions-except=${dir}`,`--load-extension=${dir}`]});
  try{
   const worker=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker'),version=await worker.evaluate(()=>chrome.runtime.getManifest().version);
   await ctx.route('https://chatgpt.com/**',r=>r.fulfill({contentType:'text/html',body:html}));const p=ctx.pages()[0],errors=[];
   p.on('pageerror',e=>errors.push(e.message));const cdp=await ctx.newCDPSession(p);cdp.on('Runtime.exceptionThrown',e=>errors.push(e.exceptionDetails.exception?.description||e.exceptionDetails.text));await cdp.send('Runtime.enable');
   await p.goto('https://chatgpt.com/c/boxed-content');const ext=p.locator('#question-basket-extension'),draft=()=>p.locator('[data-qb-inline^="draft-"]');
   await ext.locator('#mode-compact').click();
   async function drag(id){
    const el=p.locator('#'+id);await el.scrollIntoViewIfNeeded();const b=await el.evaluate(el=>{const r=document.createRange();r.setStart(el.firstChild,0);r.setEnd(el.firstChild,Math.min(15,el.firstChild.length));const a=r.getClientRects()[0];return {x:a.x,y:a.y,w:a.width,h:a.height};});
    await p.mouse.move(b.x+1,b.y+b.h/2);await p.mouse.down();await p.mouse.move(b.x+b.w-1,b.y+b.h/2,{steps:14});await p.mouse.up();
   }
   await drag('mail-line');
   if(baseline){assert.equal(await ext.locator('#selection-add').isVisible(),false);results.push({version,result:'REPRODUCED: editable answer writing block excluded'});return;}
   await ext.locator('#selection-add').waitFor();
   for(let i=0;i<10;i++){if(i)await drag(i%2?'code-line':'mail-line');await ext.locator('#selection-add').click();await draft().waitFor();await draft().getByRole('button',{name:'취소',exact:true}).click();await draft().waitFor({state:'detached'});}
   checks.push('Ten real mouse drag/add/cancel cycles in editable mail and syntax-highlighted code');
   const textBefore=await p.locator('#mail-box .ProseMirror').textContent();
   for(const[id,question,box]of [['code-line','이 코드의 map은 어떤 결과를 만드나요?','code-box'],['mail-line','이 메일을 조금 더 구체적으로 쓰려면 무엇을 추가하나요?','mail-box']]){
    await drag(id);await ext.locator('#selection-add').click();await draft().getByRole('textbox').fill(question);await draft().getByRole('button',{name:'질문 저장',exact:true}).click();await draft().waitFor({state:'detached'});
    const bubble=p.locator('[data-qb-inline]').filter({hasText:question});await bubble.waitFor();const b=await bubble.boundingBox(),a=await p.locator('#'+box).boundingBox();assert.ok(b.y>=a.y+a.height-1,'Bubble below complete box');
   }
   assert.equal(await p.locator('#mail-box .ProseMirror').textContent(),textBefore);assert.equal(await p.locator('#mail-box [data-qb-inline],pre [data-qb-inline]').count(),0);
   assert.equal(await p.evaluate(()=>[...CSS.highlights.values()].reduce((n,h)=>n+h.size,0)),2);
   await ext.locator('#launcher').click();assert.equal(await ext.locator('#count').textContent(),'2');
   checks.push('Saved box notes highlight source and sit below the box; source editor/code contents untouched');
   // A preserved legacy v1 source index excluded the writing editor. It must
   // remain valid after the new version includes writing content for new notes.
   const legacy=await p.evaluate(()=>{const root=document.querySelector('[data-dil-message-id]');let text='',n;const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement.closest('[data-qb-inline],[contenteditable],style,script')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});while(n=w.nextNode())text+=n.data;const quote=document.getElementById('normal').textContent,start=text.indexOf(quote);return{id:'legacy-v064',scope:location.origin+location.pathname,quote,question:'기존 기록',created:1,anchor:{version:1,textMode:'include-buttons',messageId:'boxed-answer',rootAttribute:'data-dil-message-id',sourceText:text,start,end:start+quote.length,exact:quote,selectedText:quote}};});
   await worker.evaluate(n=>chrome.storage.local.set({['qb:note:'+encodeURIComponent(n.scope)+':'+n.id]:n}),legacy);await p.locator('[data-qb-inline="legacy-v064"]').waitFor();
   await p.reload();await ext.locator('#mode-compact').click();await p.waitForFunction(()=>document.querySelectorAll('[data-qb-inline]').length===3);await ext.locator('#launcher').click();
   await p.setViewportSize({width:1100,height:850});await p.locator('main').evaluate(el=>{el.style.height='570px';el.style.overflow='auto';el.scrollTop=100;});
   for(const box of ['code-box','mail-box']){const b=await p.locator('#'+box).evaluate(el=>({source:el.getBoundingClientRect().bottom,bubble:el.nextElementSibling?.getBoundingClientRect().top}));assert.ok(b.bubble>=b.source-1);}
   checks.push('New and v0.6.4 anchors coexist; reload, narrow viewport and internal scroll preserve box connection');
   await p.setViewportSize({width:1560,height:1200});await p.locator('main').evaluate(el=>{el.style.height='';el.style.overflow='';});await p.screenshot({path:path.join(out,'boxed-light.png'),fullPage:true,animations:'disabled'});
   await p.emulateMedia({colorScheme:'dark'});await p.addStyleTag({content:'body{background:#15171e;color:#eef0f6}.box,#prompt-textarea{background:#20232c;border-color:#3d4251;color:#eef0f6}'});await p.screenshot({path:path.join(out,'boxed-dark.png'),fullPage:true,animations:'disabled'});
   const beforeNotes=await worker.evaluate(async()=>Object.entries(await chrome.storage.local.get(null)).filter(([k])=>k.startsWith('qb:note:')));
   await p.locator('#mail-line').evaluate(el=>{el.firstChild.data='원문을 수정했습니다. 기존 인용과 달라졌습니다.';});await p.waitForFunction(()=>document.querySelectorAll('[data-qb-inline]').length===1);
   assert.equal(await ext.locator('#count').textContent(),'3');assert.deepEqual(await worker.evaluate(async()=>Object.entries(await chrome.storage.local.get(null)).filter(([k])=>k.startsWith('qb:note:'))),beforeNotes);
   // No false positives for an unrelated editor or the actual composer.
   await p.locator('#other-editor').evaluate(el=>{const r=document.createRange();r.selectNodeContents(el);getSelection().removeAllRanges();getSelection().addRange(r);});await ext.locator('#use-selection').click();assert.equal(await draft().count(),0);
   assert.deepEqual(errors,[]);checks.push('Edited source detaches only affected modern anchors without deleting notes; unrelated editor rejected; no errors');
   results.push({version,result:'PASS',checks,errors});
  }finally{await ctx.close();}
 }
 if(process.env.QA_BASELINE)await run(path.resolve(process.env.QA_BASELINE),true);
 await run(root,false);fs.writeFileSync(path.join(out,'boxed-content-results.json'),JSON.stringify({environment:'MV3 + synthetic boxes based on live observed DOM; not live installed-version validation',results},null,2));console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
