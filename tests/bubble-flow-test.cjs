// Real extension + real mouse gestures in controlled layout variants.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.QA_OUTPUT||'work/askmark-flow');fs.mkdirSync(out,{recursive:true});
 const fixture=fs.readFileSync(path.join(__dirname,'fixture.html'),'utf8'),results=[];
 const cases=[['block',''],['column','article{display:flex;flex-direction:column;align-items:center}'],['row','article{display:flex;gap:12px}article>p{flex:1;min-width:0}'],['grid','article{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}'],['contents','article{display:flex}#first{display:contents}'],['inline','article{display:flex;flex-direction:column}#first{display:inline-flex;min-width:0;width:100%}']];
 async function run(dir,baseline){
  const ctx=await chromium.launchPersistentContext(fs.mkdtempSync(path.join(out,'profile-')),{headless:true,executablePath:process.env.QA_BROWSER,viewport:{width:1560,height:1100},args:[`--disable-extensions-except=${dir}`,`--load-extension=${dir}`]});
  const errors=[];let html=fixture;
  try{
   const worker=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker'),version=await worker.evaluate(()=>chrome.runtime.getManifest().version);await ctx.route('https://chatgpt.com/**',r=>r.fulfill({contentType:'text/html',body:html}));const p=ctx.pages()[0];p.on('pageerror',e=>errors.push(e.message));const ext=p.locator('#question-basket-extension'),draft=()=>p.locator('[data-qb-inline^="draft-"]');
   async function firstLine(){return p.locator('#first').evaluate(el=>{const r=document.createRange();r.setStart(el.firstChild,0);r.setEnd(el.firstChild,1);const rect=r.getClientRects()[0];return {x:rect.x,y:rect.y,width:rect.width,height:rect.height};});}
   async function drag(){const b=await firstLine();await p.mouse.move(b.x+1,b.y+b.height/2);await p.mouse.down();await p.mouse.move(b.x+b.width-1,b.y+b.height/2,{steps:12});await p.mouse.up();if(await ext.locator('#selection-add').isVisible())await ext.locator('#selection-add').click();await draft().waitFor();}
   async function geometry(){return p.locator('#first').evaluate(el=>{const r=document.createRange();r.selectNodeContents(el.firstChild);const lines=[...r.getClientRects()],text=lines.at(-1),bubble=document.querySelector('[data-qb-inline]')?.getBoundingClientRect();return {parent:document.querySelector('[data-qb-inline]')?.parentElement.id,anchorDisplay:getComputedStyle(el).display,marked:el.hasAttribute('data-qb-flow-block'),quote:document.querySelector('[data-qb-inline]')?.shadowRoot.querySelector('blockquote').textContent,textBottom:text.bottom,textLeft:Math.min(...lines.map(r=>r.left)),textRight:Math.max(...lines.map(r=>r.right)),bubble:bubble&&{top:bubble.top,left:bubble.left,right:bubble.right,bottom:bubble.bottom}};});}
   for(const [name,css]of cases){
    html=fixture.replace('</style>',css+'</style>');await p.goto('https://chatgpt.com/c/flow-'+name);await ext.locator('#mode-compact').click();await drag();const g=await geometry(),below=g.bubble.top>=g.textBottom-1,aligned=g.bubble.left<=g.textRight&&g.bubble.right>=g.textLeft;
    if(!baseline){assert.ok(below&&aligned,name+': bubble must follow text vertically: '+JSON.stringify(g));await draft().getByRole('textbox').fill('아래에 달린 코멘트');assert.ok((await geometry()).bubble.top>=g.textBottom-1);await draft().getByRole('button',{name:'취소',exact:true}).click();await draft().waitFor({state:'detached'});assert.equal(await p.locator('[data-qb-flow-block]').count(),0);await drag();await draft().getByRole('button',{name:'취소',exact:true}).click();}
    results.push({version,name,baseline,below,aligned,geometry:g,result:baseline?(below&&aligned?'UNCHANGED':'REPRODUCED_SIDE_PLACEMENT'):'PASS'});console.log(version,name,below,aligned);
   }
   if(!baseline){
    html=fixture.replace('</style>','article{display:grid;grid-template-columns:1fr 1fr}#second{grid-column:1 / -1}</style>');await p.goto('https://chatgpt.com/c/flow-multi');await ext.locator('#mode-compact').click();
    // Multi-paragraph Range setup is synthetic, separate from real mouse cases above.
    await p.evaluate(()=>{const a=document.getElementById('first').firstChild,b=document.getElementById('second').firstChild,r=document.createRange();r.setStart(a,4);r.setEnd(b,16);getSelection().removeAllRanges();getSelection().addRange(r);});await ext.locator('#launcher').click();await ext.locator('#use-selection').click();await draft().waitFor();
    const id=await draft().getAttribute('data-qb-inline');await draft().getByRole('textbox').fill('여러 문단 코멘트');await draft().getByRole('button',{name:'코멘트 저장',exact:true}).click();await p.locator(`[data-qb-inline="${id}"]`).waitFor({state:'detached'});
    const bubble=p.locator('[data-qb-inline]');const verify=async()=>{const b=await bubble.boundingBox(),bottom=await p.locator('#second').evaluate(el=>{const r=document.createRange();r.selectNodeContents(el.firstChild);return [...r.getClientRects()].at(-1).bottom;});assert.ok(b.y>=bottom-1);};
    await verify();await p.setViewportSize({width:1000,height:850});await verify();await p.locator('main').evaluate(el=>{el.style.height='420px';el.style.overflow='auto';el.scrollTop=50;});await verify();await p.reload();await ext.locator('#mode-compact').click();await bubble.waitFor();await verify();
    await p.setViewportSize({width:1560,height:1100});await p.locator('#second').scrollIntoViewIfNeeded();await p.screenshot({path:path.join(out,'grid-bubble-below.png'),fullPage:true});
    results.push({version,name:'multi-paragraph-grid',result:'PASS',rangeSetup:'synthetic',resize:true,internalScroll:true,reload:true});
   }
   assert.deepEqual(errors,[]);
  }finally{await ctx.close();}
 }
 if(process.env.QA_BASELINE){await run(path.resolve(process.env.QA_BASELINE),true);assert.ok(results.some(r=>r.result==='REPRODUCED_SIDE_PLACEMENT'));}
 await run(root,false);fs.writeFileSync(path.join(out,'bubble-flow-results.json'),JSON.stringify({environment:'Unpacked MV3 extension; synthetic layout fixtures, not live ChatGPT',results},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
