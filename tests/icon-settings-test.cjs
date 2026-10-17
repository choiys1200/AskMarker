// Actual MV3 options page + action.setIcon calls in isolated Chromium.
// The AI answer page is synthetic. This is not a user's live Chrome profile.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.QA_OUTPUT||'work/icon-settings');fs.mkdirSync(out,{recursive:true});
 const profile=fs.mkdtempSync(path.join(out,'profile-')),key='qb:appearance:icon:v1',checks=[],errors=[];
 const check=name=>{checks.push(name);console.log('PASS',name);};
 const launch=()=>chromium.launchPersistentContext(profile,{headless:true,executablePath:process.env.QA_BROWSER,viewport:{width:1120,height:940},args:[`--disable-extensions-except=${root}`,`--load-extension=${root}`]});
 let ctx=await launch();
 const instrument=worker=>worker.evaluate(()=>{
   const setIcon=chrome.action.setIcon.bind(chrome.action);
   chrome.action.setIcon=async details=>{await setIcon(details);globalThis.__appliedIcon=details;};
 });
 try{
  let worker=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker');await instrument(worker);
  const manifest=await worker.evaluate(()=>chrome.runtime.getManifest());assert.equal(manifest.version,'0.7.2');assert.equal(manifest.action.default_popup,undefined);
  assert.deepEqual(manifest.permissions,['activeTab','scripting','storage','clipboardWrite']);
  for(const [size,file]of Object.entries(manifest.icons)){const png=fs.readFileSync(path.join(root,file));assert.equal(png.readUInt32BE(16),+size);assert.equal(png.readUInt32BE(20),+size);}
  const scope='https://chatgpt.com/c/icon-settings',note={id:'preserved-note',scope,messageId:'answer-one',quote:'AI 답변을 읽다가 궁금한 문장을 드래그합니다.',question:'이 질문은 아이콘 변경과 무관하게 보존합니다.',color:'pink',created:1};
  await worker.evaluate(n=>chrome.storage.local.set({['qb:note:'+encodeURIComponent(n.scope)+':'+n.id]:n}),note);
  const data=()=>worker.evaluate(async key=>Object.fromEntries(Object.entries(await chrome.storage.local.get(null)).filter(([k])=>k!==key)),key);
  await ctx.route('https://chatgpt.com/**',r=>r.fulfill({contentType:'text/html',body:fs.readFileSync(path.join(__dirname,'fixture.html'),'utf8')}));
  const p=ctx.pages()[0];p.on('pageerror',e=>errors.push(e.message));await p.goto(scope);
  const ext=p.locator('#question-basket-extension');await ext.locator('#mode-compact').click();await ext.locator('#launcher').click();
  await p.locator('#second').evaluate(el=>{const range=document.createRange();range.selectNodeContents(el);getSelection().removeAllRanges();getSelection().addRange(range);});await ext.locator('#use-selection').click();const draft=p.locator('[data-qb-inline^="draft-"]');await draft.getByRole('textbox').fill('아이콘을 바꾸는 동안에도 유지할 초안');
  const before=await data();
  const opened=ctx.waitForEvent('page');await ext.locator('#icon-settings').click();let options=await opened;options.on('pageerror',e=>errors.push(e.message));await options.waitForURL('**/extension/options.html');
  await options.getByRole('radio',{name:'MarkChat',exact:true}).waitFor();await options.waitForFunction(()=>!document.getElementById('choices').disabled);
  assert.equal(await options.getByRole('radio',{name:'MarkChat',exact:true}).isChecked(),true);
  const currentIcon=()=>worker.evaluate(()=>globalThis.__appliedIcon);
  assert.equal((await currentIcon()).path['16'],'assets/icons/markchat-16.png');
  assert.equal(await options.locator('img').evaluateAll(imgs=>imgs.every(img=>img.complete&&img.naturalWidth>0)),true);
  check('Default MarkChat PNG sizes load; panel opens actual options page; Chrome accepts real setIcon; permissions and toolbar action unchanged');
  for(const [id,name]of [['asktag','AskTag'],['askstroke','AskStroke'],['quoteask','QuoteAsk'],['am-mark','AM Mark'],['markchat','MarkChat']]){
   await options.getByRole('radio',{name,exact:true}).check();await options.waitForFunction(name=>!document.getElementById('choices').disabled&&document.getElementById('status').textContent===name+' · 도구 모음에 적용됨',name);
   assert.equal((await currentIcon()).path['32'],`assets/icons/${id}-32.png`);assert.equal((await worker.evaluate(key=>chrome.storage.local.get(key),key))[key],id);
   assert.deepEqual(await data(),before);assert.equal(await draft.getByRole('textbox').inputValue(),'아이콘을 바꾸는 동안에도 유지할 초안');assert.equal(await ext.locator('#reading-mode').textContent(),'읽기 모드 ON');
  }
  check('All five choices update the actual action API and storage; existing notes, reading settings and unsaved draft are unchanged');
  const options2=await ctx.newPage();await options2.goto(options.url());await options2.waitForFunction(()=>!document.getElementById('choices').disabled);await options.getByRole('radio',{name:'QuoteAsk',exact:true}).check();await options2.waitForFunction(()=>document.querySelector('input[value="quoteask"]').checked);
  await options2.getByRole('radio',{name:'MarkChat',exact:true}).focus();await options2.getByRole('radio',{name:'MarkChat',exact:true}).press('Space');await options.waitForFunction(()=>document.querySelector('input[value="markchat"]').checked);await options.reload();await options.waitForFunction(()=>!document.getElementById('choices').disabled);assert.equal(await options.getByRole('radio',{name:'MarkChat',exact:true}).isChecked(),true);
  const rejected=await options.evaluate(()=>chrome.runtime.sendMessage({type:'askmarker:icon:set',id:'../../unknown'}));assert.equal(rejected.ok,false);assert.equal((await currentIcon()).path['16'],'assets/icons/markchat-16.png');
  check('Keyboard selection, settings-tab synchronization, reload persistence and invalid path rejection work');
  // Failure must retain the stored selection and restore its toolbar image.
  await worker.evaluate(()=>{globalThis.__realStorageSet=chrome.storage.local.set.bind(chrome.storage.local);chrome.storage.local.set=async data=>{if('qb:appearance:icon:v1' in data)throw Error('simulated storage failure');return globalThis.__realStorageSet(data);};});
  await options.getByRole('radio',{name:'AskTag',exact:true}).check();await options.getByText('아이콘을 바꾸지 못했습니다. 이전 선택을 유지합니다. 다시 선택해 주세요.',{exact:true}).waitFor();assert.equal(await options.getByRole('radio',{name:'MarkChat',exact:true}).isChecked(),true);assert.equal((await currentIcon()).path['16'],'assets/icons/markchat-16.png');
  await worker.evaluate(()=>{chrome.storage.local.set=globalThis.__realStorageSet;});
  check('Storage-write failure rolls back the real toolbar API and reports failure without changing questions');
  await options2.close();await options.reload();await options.waitForFunction(()=>!document.getElementById('choices').disabled);
  await options.emulateMedia({colorScheme:'light'});await options.screenshot({path:path.join(out,'icons-light.png'),fullPage:true});
  await options.emulateMedia({colorScheme:'dark'});await options.screenshot({path:path.join(out,'icons-dark.png'),fullPage:true});
  await options.setViewportSize({width:390,height:844});await options.screenshot({path:path.join(out,'icons-narrow.png'),fullPage:true});assert.equal(await options.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await options.getByRole('radio',{name:'AskStroke',exact:true}).check();await options.waitForFunction(()=>!document.getElementById('choices').disabled&&document.querySelector('input[value="askstroke"]').checked);
  const optionsURL=options.url();await ctx.close();ctx=await launch();worker=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker');await instrument(worker);options=await ctx.newPage();await options.goto(optionsURL);await options.waitForFunction(()=>!document.getElementById('choices').disabled);assert.equal(await options.getByRole('radio',{name:'AskStroke',exact:true}).isChecked(),true);assert.equal((await currentIcon()).path['16'],'assets/icons/askstroke-16.png');assert.deepEqual(await data(),before);
  await worker.evaluate(key=>chrome.storage.local.set({[key]:'unknown-legacy-value'}),key);await options.waitForFunction(()=>document.querySelector('input[value="markchat"]').checked);assert.equal((await currentIcon()).path['16'],'assets/icons/markchat-16.png');
  check('Light/dark/narrow renders; browser restart restores preference; unknown saved values safely fall back to MarkChat');
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,'icon-settings-results.json'),JSON.stringify({version:manifest.version,environment:'Real MV3 options page and action.setIcon in isolated Chromium; synthetic AI HTML; no live user toolbar inspection',checks,errors},null,2));
 }finally{await ctx.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
