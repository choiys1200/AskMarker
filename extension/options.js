import {ICONS, ICON_KEY, iconOf} from './icon-catalog.js';
const $ = id => document.getElementById(id);
let selected = 'markchat', saving = false, revision = 0;
function render(id) {
  const icon = iconOf(id); selected = icon.id;
  for (const input of document.querySelectorAll('input[name="icon"]')) input.checked = input.value === selected;
  $('preview-icon').src = `../assets/icons/${selected}-256.png`;
  $('preview-icon').alt = `${icon.title} 아이콘`;
  $('preview-name').textContent = icon.title;
  $('preview-description').textContent = icon.description;
  for (const img of document.querySelectorAll('[data-sample]')) img.src = `../assets/icons/${selected}-${img.dataset.sample}.png`;
}
function tell(text, error = false) { $('status').textContent=text; $('status').classList.toggle('error',error); }
async function request(type, id) {
  const response = await chrome.runtime.sendMessage({type,id});
  if (!response?.ok) throw Error('Icon preference unavailable');
  return response.id;
}
async function refresh() {
  const current = ++revision;
  try {
    const id = await request('askmarker:icon:get');
    if (current !== revision) return;
    render(id); $('choices').disabled=false; $('retry').hidden=true;
    tell(`${iconOf(id).title} · 도구 모음에 적용됨`);
  } catch {
    if (current !== revision) return;
    $('choices').disabled=true; $('retry').hidden=false;
    tell('설정을 불러오지 못했습니다. 확장을 새로고침한 뒤 다시 시도해 주세요.',true);
  }
}
async function choose(id) {
  if (saving) return;
  saving=true; ++revision; $('choices').disabled=true; $('retry').hidden=true;
  tell('아이콘을 적용하는 중입니다.');
  let failed = false;
  try { render(await request('askmarker:icon:set',id)); }
  catch { failed=true; render(selected); }
  finally { saving=false; await refresh(); }
  if (failed) tell('아이콘을 바꾸지 못했습니다. 이전 선택을 유지합니다. 다시 선택해 주세요.',true);
}
for (const icon of ICONS) {
  const label=document.createElement('label'); label.className='icon-card';
  const input=document.createElement('input'); input.type='radio'; input.name='icon'; input.value=icon.id; input.setAttribute('aria-label',icon.title);
  input.addEventListener('change',()=>{if(input.checked) choose(icon.id);});
  const img=document.createElement('img'); img.src=`../assets/icons/${icon.id}-128.png`; img.alt=''; img.width=56; img.height=56;
  const name=document.createElement('span'); name.className='name'; name.textContent=icon.title;
  const detail=document.createElement('span'); detail.className='detail'; detail.textContent=icon.recommended?'기본 · 추천':'선택 가능';
  label.append(input,img,name,detail); $('icon-grid').append(label);
}
$('version').textContent='v'+chrome.runtime.getManifest().version;
$('retry').addEventListener('click',refresh);
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&Object.hasOwn(changes,ICON_KEY)&&!saving)refresh();});
render(selected); refresh();
