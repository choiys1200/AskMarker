// Real MV3 update from the packaged 0.7.3 release, using one isolated profile
// and the same unpacked path. Retained obsolete files simulate overwrite updates.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
(async()=>{
 const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.QA_OUTPUT||'work/icon-upgrade');fs.mkdirSync(out,{recursive:true});
 const temp=fs.mkdtempSync(path.join(out,'upgrade-')),extension=path.join(temp,'askmarker'),profile=path.join(temp,'profile'),checks=[];
 execFileSync(process.env.QA_PYTHON||'python',['-c',`import zipfile,sys; from pathlib import Path; dest=Path(sys.argv[2]).resolve(); z=zipfile.ZipFile(sys.argv[1]); assert all((dest/n).resolve().is_relative_to(dest) for n in z.namelist()); z.extractall(dest)`,path.join(root,'releases/askmarker-v0.7.3.zip'),temp]);
 const launch=()=>chromium.launchPersistentContext(profile,{headless:true,executablePath:process.env.QA_BROWSER,viewport:{width:1450,height:1000},args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
 let ctx=await launch();const check=name=>{checks.push(name);console.log('PASS',name);};
 const oldKey='qb:appearance:icon:v1',scope='https://chatgpt.com/c/fixed-icon-upgrade';
 try{
  let worker=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker');const id=await worker.evaluate(()=>chrome.runtime.id);assert.equal(await worker.evaluate(()=>chrome.runtime.getManifest().version),'0.7.3');
  // Preserve both an exact note payload and its explicit prompt membership.
  const note={id:'kept',scope,messageId:'answer-one',quote:'AI 답변을 읽다가 궁금한 문장을 드래그합니다.',question:'아이콘을 고정해도 남아야 하는 질문',color:'pink',created:1};
  const {choiceKey}=require('../src/domain/notes');const data={['qb:note:'+encodeURIComponent(scope)+':'+note.id]:note,[choiceKey(note)]:false,'qb:appearance:font:v1':'serif'};
  await worker.evaluate(data=>chrome.storage.local.set(data),data);
  const oldOptions=await ctx.newPage();await oldOptions.goto(`chrome-extension://${id}/extension/options.html`);await oldOptions.waitForFunction(()=>!document.getElementById('choices').disabled);await oldOptions.getByRole('radio',{name:'AskTag',exact:true}).check();await oldOptions.waitForFunction(()=>document.getElementById('status').textContent==='AskTag · 도구 모음에 적용됨');
  const before=await worker.evaluate(()=>chrome.storage.local.get(null));assert.equal(before[oldKey],'asktag');delete before[oldKey];
  await ctx.close();
  for(const f of ['manifest.json','background.js','content.js'])fs.copyFileSync(path.join(root,f),path.join(extension,f));fs.cpSync(path.join(root,'assets'),path.join(extension,'assets'),{recursive:true});
  // Observe successful real action API calls before the upgrade event fires.
  const background=path.join(extension,'background.js');fs.writeFileSync(background,`const testSetIcon=chrome.action.setIcon.bind(chrome.action);chrome.action.setIcon=async details=>{await testSetIcon(details);globalThis.testAppliedIcon=details;};\n`+fs.readFileSync(background,'utf8'));
  ctx=await launch();worker=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker');
  await worker.evaluate(async key=>{for(let i=0;i<100;i++){if(!(key in await chrome.storage.local.get(key))&&globalThis.testAppliedIcon)return;await new Promise(r=>setTimeout(r,20));}throw Error('Upgrade migration timed out: '+JSON.stringify({version:chrome.runtime.getManifest().version,background:chrome.runtime.getManifest().background,iconKey:(await chrome.storage.local.get(key))[key],applied:globalThis.testAppliedIcon}));},oldKey);
  assert.equal(await worker.evaluate(()=>chrome.runtime.id),id);const manifest=await worker.evaluate(()=>chrome.runtime.getManifest());assert.equal(manifest.version,'0.7.7');assert.equal(manifest.options_ui,undefined);assert.equal(manifest.options_page,undefined);assert.equal(manifest.action.default_popup,undefined);
  assert.deepEqual(await worker.evaluate(()=>chrome.storage.local.get(null)),before);
  assert.deepEqual(await worker.evaluate(()=>globalThis.testAppliedIcon.path),manifest.action.default_icon);
  assert.ok(Object.values(manifest.action.default_icon).every(p=>p.startsWith('assets/icons/markchat-')));
  assert.ok(fs.readdirSync(path.join(root,'assets/icons')).every(f=>f.startsWith('markchat')));
  check('0.7.3 → 0.7.7 update keeps extension ID and every non-icon storage value; Chrome accepts fixed MarkChat; options registration removed');
  await ctx.route('https://chatgpt.com/**',r=>r.fulfill({contentType:'text/html',body:fs.readFileSync(path.join(__dirname,'fixture.html'),'utf8')}));
  const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(scope);const ext=p.locator('#question-basket-extension');await ext.locator('#launcher').click();await ext.locator('#list').getByText(note.question,{exact:true}).waitFor();assert.equal(await ext.locator('#icon-settings').count(),0);assert.equal(await ext.getByRole('button',{name:'아이콘 선택',exact:true}).count(),0);assert.equal(await ext.locator('#list .prompt-include').isChecked(),false);
  assert.equal(await ext.locator('#reading-mode').isVisible(),true);assert.equal(await ext.locator('#font-family').isVisible(),true);await p.screenshot({path:path.join(out,'fixed-icon-panel.png'),fullPage:true});assert.deepEqual(errors,[]);
  check('Updated panel retains saved question, prompt membership and reading controls with no icon-choice button');
  const after=await worker.evaluate(()=>chrome.storage.local.get(null));await ctx.close();ctx=await launch();worker=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker');assert.deepEqual(await worker.evaluate(()=>chrome.storage.local.get(null)),after);assert.equal(await worker.evaluate(()=>chrome.runtime.getManifest().options_ui),undefined);
  check('Restart keeps the single manifest icon and preserved records; obsolete option files left by overwrite cannot restore the chooser');
  fs.writeFileSync(path.join(out,'icon-upgrade-results.json'),JSON.stringify({version:'0.7.7',environment:'Actual packaged 0.7.3 update in isolated Chromium, successful real action API instrumented; AI page is synthetic',checks},null,2));
 }finally{await ctx.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
