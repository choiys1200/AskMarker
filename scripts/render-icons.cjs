// Optional developer command: recreate the packaged PNGs from original SVGs.
// Uses the same Playwright dev dependency as tests. Never runs in the extension.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const dir=path.resolve(__dirname,'../assets/icons'),browser=await chromium.launch({headless:true,executablePath:process.env.QA_BROWSER});
 try{
  const page=await browser.newPage({deviceScaleFactor:1});
  for(const file of fs.readdirSync(dir).filter(f=>f.endsWith('.svg'))){
   for(const size of [16,24,32,48,128,256]){
    await page.setViewportSize({width:size,height:size});
    await page.setContent('<html><head><style>html,body{padding:0;margin:0;line-height:0;background:transparent}svg{display:block;width:100vw;height:100vh}</style></head><body>'+fs.readFileSync(path.join(dir,file),'utf8')+'</body></html>');
    await page.screenshot({path:path.join(dir,file.replace('.svg',`-${size}.png`)),omitBackground:true});
   }
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
