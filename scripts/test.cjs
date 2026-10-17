const {spawnSync}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const out=process.env.QA_OUTPUT||fs.mkdtempSync(path.join(os.tmpdir(),'askmark-tests-'));
for(const file of fs.readdirSync(path.join(root,'tests')).filter(f=>f.endsWith('-test.cjs')&&(!process.argv.slice(2).length||process.argv.slice(2).includes(f.replace('-test.cjs',''))))){
 const result=spawnSync(process.execPath,[path.join(root,'tests',file)],{cwd:root,stdio:'inherit',env:{...process.env,QA_OUTPUT:path.join(out,file.replace('.cjs',''))}});
 if(result.status!==0)process.exit(result.status||1);
}
console.log('Test artifacts:',out);
