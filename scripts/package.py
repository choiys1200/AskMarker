import hashlib,json,zipfile,os,subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[1]
version=json.loads((root/'manifest.json').read_text(encoding='utf-8'))['version']
subprocess.run([os.environ.get('NODE_BINARY','node'),str(root/'scripts/build.cjs'),'--check'],check=True)
out=root/'releases';out.mkdir(exist_ok=True)
def pack(name,files):
 archive=out/name
 with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
  for file in files:z.write(root/file,'askmarker/'+file)
 with zipfile.ZipFile(archive) as z:
  assert z.testzip() is None
  for file in files:assert z.read('askmarker/'+file)==(root/file).read_bytes()
 archive.with_suffix('.sha256').write_text(hashlib.sha256(archive.read_bytes()).hexdigest()+'  '+archive.name+'\n',encoding='utf-8')
 print(archive.name)
files=['manifest.json','content.js','background.js','README.md','README.ko.md','docs/VALIDATION.md','docs/ARCHITECTURE.md']
files += [p.relative_to(root).as_posix() for folder in ['assets'] for p in sorted((root/folder).rglob('*')) if p.is_file() and p.suffix != '.svg']
pack(f'askmarker-v{version}.zip',files)
sources=[p.relative_to(root).as_posix() for p in sorted(root.rglob('*')) if p.is_file() and not p.relative_to(root).as_posix().startswith('docs/images/') and p.relative_to(root).parts[0] in {'src','tests','scripts','docs','assets'}]
sources += ['manifest.json','content.js','background.js','README.md','README.ko.md','package.json','.gitignore','.gitattributes']
pack(f'askmarker-v{version}-source.zip',sorted(sources))
