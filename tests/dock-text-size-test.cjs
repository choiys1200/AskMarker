// Real unpacked MV3 extension, isolated Chromium, synthetic HTML only.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.QA_OUTPUT||'work/dock-size');fs.mkdirSync(out,{recursive:true});
 const ctx=await chromium.launchPersistentContext(fs.mkdtempSync(path.join(out,'profile-')),{headless:true,executablePath:process.env.QA_BROWSER,viewport:{width:1560,height:1200},args:[`--disable-extensions-except=${root}`,`--load-extension=${root}`]});
 const checks=[],errors=[],check=s=>{checks.push(s);console.log('PASS',s);};
 try{
  const worker=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker'),scope='https://chatgpt.com/c/dock-size';
  const quote='AI 답변을 읽다가 궁금한 문장을 드래그합니다.',note={id:'saved',scope,messageId:'answer-one',quote,context:quote,question:'글씨를 바꾸어도 보존할 질문',color:'yellow',created:1};
  await worker.evaluate(n=>chrome.storage.local.set({['qb:note:'+encodeURIComponent(n.scope)+':'+n.id]:n,['qb:prompt-choice:'+encodeURIComponent(n.scope)+':'+n.id]:false}),note);
  await ctx.route('https://chatgpt.com/**',r=>r.fulfill({contentType:'text/html',body:fs.readFileSync(path.join(__dirname,'fixture.html'),'utf8')}));
  const p=ctx.pages()[0];p.on('pageerror',e=>errors.push(e.message));const cdp=await ctx.newCDPSession(p);await cdp.send('Runtime.enable');cdp.on('Runtime.exceptionThrown',e=>errors.push(e.exceptionDetails.exception?.description||e.exceptionDetails.text));await p.goto(scope);
  const ext=p.locator('#question-basket-extension'),dock=ext.locator('#dock'),handle=ext.locator('#dock-handle');
  const data=()=>worker.evaluate(async()=>Object.fromEntries(Object.entries(await chrome.storage.local.get(null)).filter(([k])=>k.startsWith('qb:note:')||k.startsWith('qb:prompt-choice:'))));
  await p.waitForFunction(()=>document.querySelector('#question-basket-extension')?.shadowRoot.getElementById('count').textContent==='1');
  const original=await data(),fontSize=loc=>loc.evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
  assert.equal(await fontSize(ext.locator('#mode-compact')),13);
  assert.equal(await ext.locator('#launcher').evaluate(el=>getComputedStyle(el,'::after').content),'none');
  const initial=await dock.boundingBox();
  async function dragTo(y){const b=await handle.boundingBox();await p.mouse.move(b.x+b.width/2,b.y+b.height/2);await p.mouse.down();await p.mouse.move(b.x+b.width/2,y,{steps:12});await p.mouse.up();}
  await dragTo(320);const moved=await dock.boundingBox();assert.ok(moved.y<initial.y-300);assert.equal(moved.x,initial.x);assert.equal(await ext.locator('#mode-compact').getAttribute('aria-pressed'),'false');assert.equal(await ext.locator('#panel').isVisible(),false);
  await p.waitForFunction(()=>document.querySelector('#question-basket-extension').shadowRoot.getElementById('dock').dataset.dragging!== 'true');
  await ext.locator('#launcher').click();assert.equal(await ext.locator('#close').evaluate(el=>getComputedStyle(el,'::after').content),'none');await ext.locator('#close').click();assert.ok(Math.abs((await dock.boundingBox()).y-moved.y)<1);
  await p.reload();await handle.waitFor();await p.waitForFunction(y=>Math.abs(document.querySelector('#question-basket-extension').shadowRoot.getElementById('dock').getBoundingClientRect().top-y)<1,moved.y);
  check('Real mouse drag moves only vertically; reading/panel state unchanged; position survives expand/collapse and reload; arrows removed; controls 13px');
  await dragTo(0);assert.ok((await dock.boundingBox()).y>=7.9);await dragTo(1199);let b=await dock.boundingBox();assert.ok(b.y+b.height<=1192.1);
  await handle.focus();await handle.press('Home');assert.ok(Math.abs((await dock.boundingBox()).y-8)<1);await handle.press('ArrowDown');assert.ok(Math.abs((await dock.boundingBox()).y-18)<1);await handle.press('End');b=await dock.boundingBox();assert.ok(b.y+b.height<=1192.1);
  // A cancelled pointer gesture must release drag state and restore its location.
  const cancelTop=b.y,h=await handle.boundingBox();await p.mouse.move(h.x+10,h.y+9);await p.mouse.down();await p.mouse.move(h.x+10,h.y-80,{steps:5});await handle.dispatchEvent('pointercancel');await p.mouse.up();assert.ok(Math.abs((await dock.boundingBox()).y-cancelTop)<1);
  await p.setViewportSize({width:900,height:420});await p.waitForFunction(()=>{const r=document.querySelector('#question-basket-extension').shadowRoot.getElementById('dock').getBoundingClientRect();return r.top>=8&&r.bottom<=innerHeight-7;});await p.setViewportSize({width:1560,height:1200});
  check('Top/bottom clamp, keyboard movement, injected pointer cancellation and viewport resize keep the dock reachable');
  await ext.locator('#mode-compact').click();await ext.locator('#launcher').click();
  const downloaded=p.waitForEvent('download');await ext.locator('#export').click();const file=await downloaded,backup=JSON.parse(fs.readFileSync(await file.path(),'utf8'));
  assert.equal(backup.format,'question-basket-backup');for(const [key,value]of Object.entries(original))assert.deepEqual(backup.data[key],value);assert.deepEqual(await data(),original);
  check('Backup download still exports exact saved notes and prompt membership after presentation changes');
  assert.equal(await ext.locator('#font-size-mode').inputValue(),'current');assert.equal(await ext.locator('#font-size-custom').isVisible(),false);
  const saved=p.locator('[data-qb-inline="saved"]'),nativeSource=await fontSize(p.locator('#second'));
  assert.equal(await fontSize(saved.locator('.question')),14);
  await p.locator('#second').evaluate(el=>{const r=document.createRange();r.selectNodeContents(el);getSelection().removeAllRanges();getSelection().addRange(r);});await ext.locator('#use-selection').click();const draft=p.locator('[data-qb-inline^="draft-"]');await draft.getByRole('textbox').fill('설정 변경 중에도 지킬 초안');const id=await draft.getAttribute('data-qb-inline'),exact=await draft.locator('blockquote').textContent();
  await ext.locator('#font-size-mode').selectOption('custom');
  for(const value of [80,160,100]){
   await ext.locator('#font-size-scale').focus();await p.keyboard.press('Home');for(let i=80;i<value;i+=5)await p.keyboard.press('ArrowRight');await p.keyboard.press('Tab');
   assert.equal(await ext.locator('#font-size-value').textContent(),value+'%');
   assert.ok(Math.abs(await fontSize(saved.locator('.question'))-14*value/100)<.01);
   assert.ok(Math.abs(await fontSize(ext.locator('#reading-mode'))-13*value/100)<.01);
   assert.equal(await fontSize(p.locator('#second')),nativeSource);assert.equal(await draft.getAttribute('data-qb-inline'),id);assert.equal(await draft.getByRole('textbox').inputValue(),'설정 변경 중에도 지킬 초안');assert.equal(await draft.locator('blockquote').textContent(),exact);assert.deepEqual(await data(),original);
   assert.equal(await p.evaluate(()=>[...CSS.highlights.values()].reduce((n,h)=>n+h.size,0)),2);
  }
  check('80–160% UI scaling preserves draft text/identity, exact quote, highlights, question/check data and native source font size');
  // CDP changes the browser default, independently of the site's own font sizes.
  await cdp.send('Page.setFontSizes',{fontSizes:{standard:20,fixed:13}});const nativeSystemSize=await fontSize(p.locator('#second'));await ext.locator('#font-size-mode').selectOption('system');
  await p.waitForFunction(()=>Math.abs(parseFloat(getComputedStyle(document.querySelector('#question-basket-extension').shadowRoot.getElementById('reading-mode')).fontSize)-13*20/14)<.02);
  assert.equal(await fontSize(saved.locator('.question')),20);assert.equal(await fontSize(p.locator('#second')),nativeSystemSize);
  await cdp.send('Page.setFontSizes',{fontSizes:{standard:18,fixed:13}});await p.waitForFunction(()=>Math.abs(parseFloat(getComputedStyle(document.querySelector('[data-qb-inline="saved"]').shadowRoot.querySelector('.question')).fontSize)-18)<.02);
  await ext.locator('#font-size-mode').selectOption('current');assert.equal(await fontSize(saved.locator('.question')),14);assert.equal(await fontSize(ext.locator('#reading-mode')),13);await cdp.send('Page.setFontSizes',{fontSizes:{standard:16,fixed:13}});
  check('System size follows browser default 20px and live change to 18px; Current restores original 14px UI and 13px controls');
  await ext.locator('#font-size-mode').selectOption('custom');await ext.locator('#font-size-scale').focus();await p.keyboard.press('End');await p.keyboard.press('Tab');
  const p2=await ctx.newPage();await p2.goto(scope);const ext2=p2.locator('#question-basket-extension');await ext2.locator('#launcher').click();await p2.waitForFunction(()=>document.querySelector('#question-basket-extension').shadowRoot.getElementById('font-size-scale').value==='160');assert.equal(await ext2.locator('#font-size-mode').inputValue(),'custom');
  await ext2.locator('#font-size-mode').selectOption('current');await p.waitForFunction(()=>document.querySelector('#question-basket-extension').shadowRoot.getElementById('font-size-mode').value==='current');await p2.close();
  await draft.getByRole('button',{name:'취소',exact:true}).click();await p.reload();await ext.locator('#launcher').click();assert.equal(await ext.locator('#font-size-mode').inputValue(),'current');await ext.locator('#reading-mode').click();assert.deepEqual(await data(),original);
  check('Text-size mode and custom value synchronize between tabs and persist on reload; cancelling the draft leaves all saved data intact');
  await ext.locator('#font-size-mode').selectOption('custom');await ext.locator('#font-size-scale').focus();await p.keyboard.press('End');await p.keyboard.press('Tab');
  await p.screenshot({path:path.join(out,'size-160-light.png'),fullPage:true,animations:'disabled'});await ext.locator('#panel').screenshot({path:path.join(out,'panel-160-light.png'),animations:'disabled'});
  // At 701–800px the old <=700px media query did not cover 160% text.
  // Exercise wheel scrolling, rather than Playwright's automatic element scroll.
  for(const height of [800,760,720,701]){
   await p.setViewportSize({width:1100,height});await ext.locator('#panel').evaluate(el=>el.scrollTop=0);
   assert.match(await ext.locator('#panel').evaluate(el=>getComputedStyle(el).overflowY),/auto|scroll/);
   const r=await ext.locator('#panel').boundingBox();await p.mouse.move(r.x+r.width/2,r.y+r.height-20);await p.mouse.wheel(0,2000);
   await p.waitForFunction(()=>{const root=document.querySelector('#question-basket-extension').shadowRoot,panel=root.getElementById('panel'),r=panel.getBoundingClientRect(),last=panel.querySelector('footer>p:last-child').getBoundingClientRect();return last.bottom<=r.bottom&&last.top>=r.top;});
  }
  await p.setViewportSize({width:1560,height:1200});await ext.locator('#panel').evaluate(el=>el.scrollTop=0);
  check('160% text at 701/720/760/800px: real wheel scrolling reaches footer; no hidden-overflow trap');
  await p.emulateMedia({colorScheme:'dark'});await p.addStyleTag({content:'body{background:#14161d;color:#edf0f8}'});await ext.locator('#panel').screenshot({path:path.join(out,'panel-160-dark.png'),animations:'disabled'});
  await ext.locator('#close').click();await handle.focus();await handle.press('Home');for(let i=0;i<12;i++)await handle.press('ArrowDown');await dock.screenshot({path:path.join(out,'dock-dark.png'),animations:'disabled'});
  await p.setViewportSize({width:440,height:420});await handle.press('End');b=await dock.boundingBox();assert.ok(b.y>=8&&b.y+b.height<=412.1);await ext.locator('#launcher').click();await ext.locator('#font-size-mode').scrollIntoViewIfNeeded();await ext.locator('#font-size-mode').selectOption('current');await ext.locator('#quick-copy').scrollIntoViewIfNeeded();assert.equal(await ext.locator('#quick-copy').isVisible(),true);
  assert.deepEqual(errors,[]);check('Light/dark 160% rendering, movable compact dock and short/narrow-window settings/actions remain accessible; no runtime errors');
  fs.writeFileSync(path.join(out,'dock-text-size-results.json'),JSON.stringify({version:'0.7.7',environment:'Actual MV3 extension in isolated Chromium with synthetic HTML; browser default-size changes via CDP and one injected pointercancel; not live AI/user Chrome',checks,errors},null,2));
 }finally{await ctx.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
