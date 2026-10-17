'use strict';
const {COLORS,COLOR_ORDER,rgbOf,colorOf}=require('./domain/colors');
const {PREFIX,PREF,LASER_PREF,AUTO_PREF,CHOICE_PREFIX,storageKey,choiceKey,validNote}=require('./domain/notes');
const {formatPrompt,normalized}=require('./domain/prompt');
const {COMPOSER_SELECTOR,MESSAGE_ATTRS}=require('./platform/selectors');
const {createSourceAdapter}=require('./platform/source');
const {createComposerAdapter}=require('./platform/composer');
const {createWriteQueue}=require('./storage/queue');
const {createPromptChoices}=require('./storage/prompt-choices');
const {mountShell}=require('./ui/shell');
const {createCards}=require('./ui/cards');
const {createPanel}=require('./ui/panel');
const {createAppearance}=require('./ui/appearance');
const {FONT_KEY,OPACITY_KEY}=require('./domain/appearance');
const VERSION='__ASKMARK_VERSION__'; // Replaced from manifest.json by the static build.
function start(){
  const FLAG = '__questionBasketV1';
  if (globalThis[FLAG]) { globalThis[FLAG].open(); return; }
  let activeId=null, autoInsert=true, autoPreferenceChosen=false;
  const firstMessageId=()=>{const el=document.querySelector('[data-message-id],[data-chatgpt-selection-message-id],[data-dil-message-id],[data-dil-source-message-id]');return el && (el.getAttribute('data-message-id')||el.getAttribute('data-chatgpt-selection-message-id')||el.getAttribute('data-dil-message-id')||el.getAttribute('data-dil-source-message-id'));};
  const conversationId=url=>{try{const u=new URL(url);return u.origin===location.origin?u.pathname.match(/\/c\/([^/]+)/)?.[1]:null;}catch{return null;}};
  const elOf = n => n?.nodeType === 1 ? n : n?.parentElement;
  const chatGPT = location.hostname === 'chatgpt.com';
  // Query strings and hashes on ChatGPT are view state, not conversation identity.
  const basePageKey = () => chatGPT ? location.origin + location.pathname.replace(/\/$/,'') : location.origin + location.pathname + location.search + location.hash;
  const pageKey = () => {
    const base=basePageKey();
    if(!chatGPT || /\/c\/[^/]+/.test(location.pathname))return base;
    const first=firstMessageId();
    return first ? base+'#qb-message='+encodeURIComponent(first) : base;
  };
  const writes=createWriteQueue(),enqueue=writes.enqueue;
  const choices=createPromptChoices({storage:chrome.storage.local,enqueue,
    onChange:()=>{hideOffer();$('preview').hidden=true;refreshPromptSelection();},
    onError:()=>{tell('질문 선택을 저장하지 못했습니다. 다시 선택해 주세요.',true);load();}});
  const included=choices.included,selectedEntries=()=>notes.filter(included);
  let scope = pageKey(), notes = [], lastColor = 'yellow', loadSerial = 0, refreshTimer, routeTimer;
  let readingMode = false, laserFrame = 0, laserPoint = null;
  let pointerStart = null, initialized = false, legacyReview = false, hasLegacy = false;
  let selectionOffer=null,selectionFrame=0;
  const viewKey = () => legacyReview ? basePageKey() : scope;
  function sameConversation(savedScope,target=scope) {
    if(savedScope===target)return true;
    // Project slugs may change while the conversation ID remains the same.
    if(chatGPT&&conversationId(target)&&conversationId(savedScope)===conversationId(target))return true;
    if(legacyReview||!chatGPT||target!==scope||!/\/c\/[^/]+/.test(location.pathname))return false;
    const first=firstMessageId();
    if(!first)return false;
    const suffix='#qb-message='+encodeURIComponent(first);
    return savedScope===location.origin+suffix || savedScope.startsWith(location.origin+'/')&&savedScope.endsWith(suffix);
  }
  const sessions = new Map(), bubbles = new Map(), panelCards = new Map(), ranges = new Map();
  const {host,shadow,$}=mountShell(VERSION);
  function activeColor() {return sessions.get(activeId)?.color||colorOf(notes.find(n=>n.id===activeId)||{color:lastColor});}
  function showActiveColor() {
    const color=activeColor(),n=notes.find(n=>n.id===activeId),draft=sessions.get(activeId);
    $('laser').style.setProperty('--laser-rgb',rgbOf(color));
    $('color-palette').querySelectorAll('button').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.color===color));b.disabled=!!draft?.saving;});
    $('color-target').textContent=(n?'질문 '+(notes.indexOf(n)+1):draft?'작성 중인 질문':'다음 질문')+' · 박스와 포인터 색상';
    $('active-color-name').textContent=COLORS[color][0];
    for(const [id,rec]of panelCards)rec.card.dataset.active=String(id===activeId);
  }
  function activate(id) {activeId=id;showActiveColor();}
  for(const key of COLOR_ORDER) {
    const [name,solid]=COLORS[key],b=document.createElement('button');b.className='swatch';b.dataset.color=key;
    b.style.background=solid;b.title=name;b.setAttribute('aria-label',name);
    b.onclick=()=>{if(activeId&&(sessions.has(activeId)||notes.some(n=>n.id===activeId)))setColor(activeId,key);else{rememberColor(key);showActiveColor();}};
    $('color-palette').append(b);
  }
  const colorName=document.createElement('span');colorName.id='active-color-name';colorName.className='color-name';$('color-palette').append(colorName);showActiveColor();
  const highlightStyle = document.createElement('style');
  highlightStyle.textContent = Object.entries(COLORS).map(([key,v]) => `::highlight(qb-${key}){background-color:${v[2]};}`).join('')+'[data-qb-flow-block]:has(> [data-qb-inline]){display:block!important}[data-qb-flow-block]:is(li):has(> [data-qb-inline]){display:list-item!important}';
  document.documentElement.append(highlightStyle);
  let toastTimer;
  function tell(text, error=false) { $('status').textContent=text; $('status').classList.toggle('error',error); $('toast').textContent=text; $('toast').hidden=false; clearTimeout(toastTimer); toastTimer=setTimeout(()=>{$('toast').hidden=true;},4500); }
  const panel=createPanel($),{open,collapse}=panel;
  const appearance=createAppearance({host,$,storage:chrome.storage.local,enqueue,tell});
  globalThis[FLAG]={open};
  // Mode changes presentation only. Sessions own their text/source independently.
  function setReadingMode(enabled) {
    readingMode=enabled;pointerStart=null;manualSelection=null;
    appearance.setReadingMode(enabled);
    hideSelectionOffer();
    // A leftover native selection can turn the next gesture into HTML drag-and-drop.
    getSelection()?.removeAllRanges();
    laserPoint=null;$('laser').hidden=true;
    refresh();
    tell(enabled?'읽기 모드 ON · 원문을 드래그하고 질문 추가를 누르세요.':'읽기 모드 OFF · 본문 표시를 숨겼습니다. 기록과 초안은 유지됩니다.');
  }
  function moveLaser(e) {
    if(!readingMode||e.pointerType==='touch'||ownEvent(e)||editable(e.target)) {
      laserPoint=null;$('laser').hidden=true;return;
    }
    laserPoint={x:e.clientX,y:e.clientY};
    if(laserFrame)return;
    laserFrame=requestAnimationFrame(()=>{
      laserFrame=0;if(!readingMode||!laserPoint)return;
      $('laser').style.transform=`translate(${laserPoint.x-15}px,${laserPoint.y-15}px)`;
      $('laser').hidden=false;
    });
  }
  window.addEventListener('pointermove',moveLaser,{capture:true,passive:true});
  function hideLaser(){laserPoint=null;$('laser').hidden=true;pointerStart=null;}
  window.addEventListener('blur',hideLaser);
  document.addEventListener('pointerleave',hideLaser);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)hideLaser();});
  window.addEventListener('pointercancel',hideLaser,true);
  // Document can expose a named `host` element/HTMLCollection. Only ShadowRoot.host is a shadow host.
  function own(node) {
    if (node === host || node === highlightStyle || node === shadow) return true;
    if (!(node instanceof Node)) return false; // composedPath also contains Window.
    const el = node instanceof Element ? node : node.parentElement;
    if (!el) return false; // Document, DocumentFragment, etc. are not extension elements.
    if (Element.prototype.closest.call(el, '[data-qb-inline]')) return true;
    const root = node.getRootNode();
    if (root === shadow) return true;
    return root instanceof ShadowRoot && root.host instanceof Element
      && Element.prototype.hasAttribute.call(root.host, 'data-qb-inline');
  }
  const ownEvent=e=>e.composedPath().some(own);
  const editable=n=>blockedInput(n);
  function theme(el) { const d=document.documentElement; el.dataset.theme=d.classList.contains('dark') || d.dataset.theme==='dark' ? 'dark' : d.classList.contains('light') || d.dataset.theme==='light' ? 'light' : ''; }

  const {readSelection,locate,answerRoot,anchorBlock,blockedInput}=createSourceAdapter({own,chatGPT,
    getScope:()=>scope,sameConversation,tell,beforeRead:()=>{checkRoute();if(legacyReview){legacyReview=false;notes=[];load();}}});
  // Selection is only a reading gesture until the user explicitly adds a question.
  // This candidate never enters sessions/storage or steals focus from the page.
  function hideSelectionOffer(){selectionOffer=null;$('selection-add').hidden=true;}
  function positionSelectionOffer(){
    if(!selectionOffer)return;
    if(!readingMode||selectionOffer.candidate.scope!==scope){hideSelectionOffer();return;}
    const range=locate(selectionOffer.candidate);
    if(!range){hideSelectionOffer();return;}
    const rects=[...range.getClientRects()].filter(r=>r.width>0&&r.height>0),last=rects.at(-1),button=$('selection-add');
    if(!last||last.bottom<=0||last.top>=innerHeight||last.right<=0||last.left>=innerWidth){button.hidden=true;return;}
    for(let el=elOf(range.endContainer);el&&el!==document.body;el=el.parentElement){
      const style=getComputedStyle(el),clip=el.getBoundingClientRect();
      if((/auto|scroll|hidden|clip/.test(style.overflowY)&&(last.bottom<=clip.top||last.top>=clip.bottom))||(/auto|scroll|hidden|clip/.test(style.overflowX)&&(last.right<=clip.left||last.left>=clip.right))){button.hidden=true;return;}
    }
    button.style.visibility='hidden';button.hidden=false;
    const box=button.getBoundingClientRect(),gap=6;
    button.style.left=Math.max(gap,Math.min(Math.max(last.left,last.right-box.width),innerWidth-box.width-gap))+'px';
    button.style.top=Math.max(gap,Math.min(last.bottom+gap+box.height<=innerHeight?last.bottom+gap:last.top-box.height-gap,innerHeight-box.height-gap))+'px';
    button.style.visibility='';
  }
  function queueSelectionPosition(){if(selectionFrame||!selectionOffer)return;selectionFrame=requestAnimationFrame(()=>{selectionFrame=0;positionSelectionOffer();});}
  function offerSelection(candidate){
    hideSelectionOffer();if(!readingMode||!candidate)return;
    const sel=getSelection();if(!sel?.rangeCount)return;
    selectionOffer={candidate,nativeRange:sel.getRangeAt(0).cloneRange()};
    positionSelectionOffer();
  }
  $('selection-add').addEventListener('pointerdown',e=>{if(e.button===0)e.preventDefault();});
  $('selection-add').onclick=()=>{
    const candidate=selectionOffer?.candidate;hideSelectionOffer();
    if(!candidate||!readingMode)return;
    checkRoute();const range=candidate.scope===scope&&locate(candidate);
    if(!range){tell('선택한 원문이 바뀌었습니다. 질문할 부분을 다시 드래그해 주세요.');return;}
    startSelection({...candidate,range});
  };
  document.addEventListener('selectionchange',()=>{
    if(!selectionOffer)return;
    const sel=getSelection(),original=selectionOffer.nativeRange,current=sel?.rangeCount?sel.getRangeAt(0):null;
    if(!current||sel.isCollapsed||current.startContainer!==original.startContainer||current.startOffset!==original.startOffset||current.endContainer!==original.endContainer||current.endOffset!==original.endOffset)hideSelectionOffer();
  });
  window.addEventListener('scroll',queueSelectionPosition,{capture:true,passive:true});
  window.addEventListener('resize',queueSelectionPosition);
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&selectionOffer){e.preventDefault();hideSelectionOffer();}},true);
  async function load() {
    const serial=++loadSerial,key=viewKey(),readRevision=choices.revision(),appearanceRevision=appearance.revision();
    try {
      const data=await chrome.storage.local.get(null);
      if(serial!==loadSerial||key!==viewKey())return;
      choices.hydrate(data,readRevision);
      appearance.hydrate(data,appearanceRevision);
      if(!initialized){lastColor=COLORS[data[PREF]?.lastColor]?data[PREF].lastColor:COLORS[data[LASER_PREF]]?data[LASER_PREF]:'yellow';if(!autoPreferenceChosen)autoInsert=data[AUTO_PREF]!==false;initialized=true;}
      hasLegacy=scope!==basePageKey()&&Object.entries(data).some(([k,n])=>k.startsWith(PREFIX)&&validNote(n)&&n.scope===basePageKey());
      notes=Object.entries(data).filter(([k,n])=>k.startsWith(PREFIX)&&validNote(n)&&sameConversation(n.scope,key)).map(([,n])=>n).sort((a,b)=>(a.created||0)-(b.created||0)||a.id.localeCompare(b.id));
      refresh();
    }catch {tell('저장소를 읽지 못했습니다. 확장을 업데이트했다면 이 탭을 새로고침해 주세요.',true);}
  }
  function refreshPromptSelection() {
    const count=selectedEntries().length;
    for(const n of notes){const input=panelCards.get(n.id)?.card.querySelector('.prompt-include');if(input)input.checked=included(n);}
    $('selection-tools').hidden=!notes.length;
    $('selected-count').textContent='프롬프트 '+count+' / '+notes.length+'개 선택';
    $('select-all').disabled=!notes.length||count===notes.length;$('deselect-all').disabled=!count;
    $('quick-insert').disabled=!count||!chatGPT||legacyReview;$('quick-copy').disabled=!count;$('generate').disabled=!count;
    $('generate').title=count?'체크한 질문 '+count+'개를 프롬프트로 만듭니다':'제목 앞 체크박스에서 질문을 선택해 주세요';
  }
  const choosePrompt=(entries,value)=>choices.set(entries,value);
  function rememberColor(color) {lastColor=color;chrome.storage.local.set({[PREF]:{lastColor:color}}).catch(()=>tell('기본 색상을 저장하지 못했습니다.',true));}
  function activeSessions(){return [...sessions.values()].filter(s=>sameConversation(s.note.scope));}
  function startSelection(candidate) {
    if(!readingMode||!candidate)return;
    hideSelectionOffer();
    hideOffer();
    // Only empty NEW drafts are disposable. Existing edits and typed drafts own their source.
    for(const s of activeSessions()) if(!s.existing && !s.question.trim() && !s.saving) finish(s.id,false);
    const id='draft-'+crypto.randomUUID();
    const {range,...source}=candidate;
    sessions.set(id,{id,note:{...source,id,color:lastColor},question:'',color:lastColor,existing:false,surface:'inline',saving:false});
    activeId=id;ranges.set(id,range);getSelection()?.removeAllRanges();$('preview').hidden=true;refresh();
    const b=bubbles.get(id);if(b)b.root.querySelector('textarea').focus({preventScroll:true});
  }
  function finish(id,refreshNow=true) {sessions.delete(id);ranges.delete(id);getSelection()?.removeAllRanges();if(refreshNow)refresh();}
  function cancel(id) {const s=sessions.get(id);if(!s||s.saving)return;finish(id);}
  function edit(note,surface) {
    activeId=note.id;
    if(!sessions.has(note.id))sessions.set(note.id,{id:note.id,note:{...note},question:note.question,color:colorOf(note),existing:true,surface,saving:false});
    else sessions.get(note.id).surface=surface;
    refresh();
    const rec=surface==='inline'?bubbles.get(note.id):panelCards.get(note.id);
    rec?.root.querySelector('textarea')?.focus({preventScroll:true});
  }
  async function save(id) {
    const s=sessions.get(id);if(!s||s.saving)return;
    if(!s.question.trim()){tell('질문을 입력한 뒤 저장해 주세요.',true);return;}
    if(s.question.length>20000){tell('질문은 20,000자 이내로 입력해 주세요.',true);return;}
    const note={...s.note,id:s.existing?s.note.id:crypto.randomUUID(),question:s.question,color:s.color,created:s.note.created||Date.now(),updated:Date.now(),schemaVersion:3};
    s.saving=true;refresh();
    try {
      await enqueue(storageKey(note),()=>chrome.storage.local.set({[storageKey(note)]:note}));
      finish(id,false);activeId=note.id;await load();tell('저장했습니다. 계속 읽고 다음 부분을 드래그하세요.');
    }catch{s.saving=false;refresh();tell('저장하지 못했습니다. 입력 내용은 말풍선에 남겨 두었습니다.',true);}
  }
  async function remove(note) {
    if(sessions.get(note.id)?.saving)return;
    try{await enqueue(storageKey(note),()=>chrome.storage.local.remove(storageKey(note)));finish(note.id,false);await load();tell('해당 질문과 표시를 삭제했습니다.');}
    catch{tell('삭제하지 못했습니다. 다시 시도해 주세요.',true);}
  }
  function setColor(id,color) {
    if(!COLORS[color])return;activeId=id;const s=sessions.get(id);if(s?.saving)return;rememberColor(color);
    if(s){s.color=color;refresh();return;}
    const n=notes.find(n=>n.id===id);if(!n)return;
    n.color=color;refresh();
    const value={...n,updated:Date.now()};
    enqueue(storageKey(n),()=>chrome.storage.local.set({[storageKey(value)]:value})).catch(()=>{tell('색상을 저장하지 못했습니다.',true);load();});
  }
  const {makeCard}=createCards({getNotes:()=>notes,getSession:id=>sessions.get(id),choosePrompt,
    activate,cancel,save,remove,edit,jump,setColor,syncCardText});
  function syncCardText(id) {
    const s=sessions.get(id);if(!s)return;
    for(const rec of [bubbles.get(id),panelCards.get(id)].filter(Boolean)){
      const area=rec.card.querySelector('textarea');if(area.value!==s.question)area.value=s.question;
      rec.card.querySelector('.question').textContent=s.question||'질문 작성 중';
    }
  }
  function updateCard(rec,n,index,located) {
    const s=sessions.get(rec.id), editing=!!s && (s.surface===(rec.inline?'inline':'panel') || ((!located||!readingMode)&&!rec.inline));
    const c=rec.card,color=s?.color||colorOf(n);theme(rec.host);
    c.style.setProperty('--accent',COLORS[color][1]);
    c.querySelector('.tag').textContent=(s&&!s.existing?'새 질문':'질문 '+index)+(s?' · 작성 중':'');
    if(!rec.inline){const input=c.querySelector('.prompt-include');input.hidden=!index;input.checked=!!index&&included(n);input.setAttribute('aria-label','질문 '+index+' 프롬프트에 포함');}
    c.querySelector('blockquote').textContent=n.quote;
    c.querySelector('.location').hidden=!!located;
    c.querySelector('.question').textContent=s?s.question||'다른 입력란에서 작성 중입니다.':n.question;
    c.querySelector('.question').hidden=editing;
    c.querySelector('.editor').hidden=!editing;
    c.querySelector('.actions').hidden=!!s&&!s.existing || editing;
    c.querySelector('.cancel.quiet').hidden=!editing;
    c.querySelectorAll('.swatch').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.color===color));b.disabled=!!s?.saving;});
    if(!rec.inline)c.querySelector('.color-name').textContent=COLORS[color][0];
    const input=c.querySelector('textarea');if(s&&input.value!==s.question)input.value=s.question;
    c.querySelector('.save').textContent=s?.saving?'저장 중…':s?.existing?'수정 저장':'질문 저장';
    c.querySelectorAll('.save,.cancel,textarea').forEach(el=>el.disabled=!!s?.saving);
  }
  function refresh() {
    // Some renderers clone light DOM while replacing a message. Shadow UI does not clone;
    // discard only empty cloned hosts belonging to an annotation we already own.
    for(const el of document.querySelectorAll('[data-qb-inline]'))if(!el.shadowRoot&&bubbles.has(el.dataset.qbInline)&&bubbles.get(el.dataset.qbInline).host!==el)el.remove();
    theme(host);
    panel.showReadingMode(readingMode);
    $('mode-hint').textContent=readingMode?'원문을 드래그한 뒤 질문 추가를 눌러 작성합니다.':'본문 표시만 숨겨져 있습니다. 기록과 초안은 유지됩니다.';
    $('use-selection').disabled=!readingMode;
    $('empty').textContent=readingMode?'원문을 드래그하고 작은 질문 추가 버튼을 누르세요. 글 아래에서 질문을 작성할 수 있습니다.':'읽기 모드를 켜고 궁금한 원문을 드래그하세요. 저장한 기록은 모드와 관계없이 보관됩니다.';
    const list=[...notes,...activeSessions().filter(s=>!s.existing).map(s=>s.note)];
    const present=new Set(),wanted=new Set(),cursors=new Map(),highlights=Object.fromEntries(Object.keys(COLORS).map(c=>[c,[]]));
    notes.forEach((n,i)=>{
      present.add(n.id);let card=panelCards.get(n.id);if(!card){card=makeCard(n.id);panelCards.set(n.id,card);$('list').append(card.host);}
      // appending an already placed editor would lose focus, so only reorder when necessary.
      const previous=i?panelCards.get(notes[i-1].id)?.host:null;
      if(previous && card.host.previousElementSibling!==previous)previous.after(card.host);
    });
    for(const n of list){
      const s=sessions.get(n.id),r=locate(n),block=r&&anchorBlock(r),index=notes.findIndex(x=>x.id===n.id)+1;
      if(r){ranges.set(n.id,r);if(readingMode)highlights[s?.color||colorOf(n)].push(r);}else ranges.delete(n.id);
      if(block && readingMode){
        wanted.add(n.id);let rec=bubbles.get(n.id);if(!rec){rec=makeCard(n.id,true);bubbles.set(n.id,rec);}
        updateCard(rec,n,index,true);
        const previous=cursors.get(block.element);
        if(previous){if(rec.host.previousElementSibling!==previous)previous.after(rec.host);}
        else if(block.inside){block.element.setAttribute('data-qb-flow-block','');if(rec.host.parentElement!==block.element)block.element.append(rec.host);}
        else if(rec.host.previousElementSibling!==block.element)block.element.after(rec.host);
        cursors.set(block.element,rec.host);
      }
      if(!index){present.add(n.id);if(!panelCards.has(n.id)){const rec=makeCard(n.id);panelCards.set(n.id,rec);$('draft-list').append(rec.host);}if(!block&&readingMode)open();}
      const panel=panelCards.get(n.id);if(panel)updateCard(panel,n,index,!!block);
    }
    for(const[id,b]of bubbles)if(!wanted.has(id)){b.host.remove();bubbles.delete(id);}
    for(const el of document.querySelectorAll('[data-qb-flow-block]'))if(![...el.children].some(n=>n.hasAttribute('data-qb-inline')))el.removeAttribute('data-qb-flow-block');
    for(const[id,c]of panelCards)if(!present.has(id)){c.host.remove();panelCards.delete(id);}
    if(globalThis.CSS?.highlights&&globalThis.Highlight)for(const [c,rs]of Object.entries(highlights))CSS.highlights.set('qb-'+c,new Highlight(...rs));
    if(!list.some(n=>n.id===activeId))activeId=null;showActiveColor();
    $('auto-insert').checked=autoInsert;refreshPromptSelection();
    $('count').textContent=String(notes.length);$('small-count').textContent=String(notes.length);$('empty').hidden=!!notes.length||!!activeSessions().length;$('clear').disabled=!notes.length;
    $('legacy').hidden=!hasLegacy&&!legacyReview;$('legacy').textContent=legacyReview?'현재 대화로 돌아가기':'이전 주소 기록 보기';
    if(legacyReview)$('status').textContent='이전 버전의 주소별 기록입니다. 현재 대화에 자동으로 연결하지 않습니다.';
    queueSelectionPosition();
  }
  function jump(note) {
    activate(note.id);
    const r=locate(note);if(!r){tell('원문 위치를 확인할 수 없습니다. 인용 원문과 질문은 목록에 남아 있습니다.',true);return;}
    elOf(r.startContainer)?.scrollIntoView({block:'center',behavior:'smooth'});
    // Do not make a native selection: keyboard/mouse listeners must not create a new draft.
    bubbles.get(note.id)?.card.animate([{outline:'3px solid #68a790'},{outline:'3px solid transparent'}],{duration:1200});
  }
  const buildPrompt=(entries=selectedEntries())=>formatPrompt(entries,notes);
  let previewEntries=[],inserting=false;
  function preview() {checkRoute();if(!selectedEntries().length)return;hideSelectionOffer();hideOffer();previewEntries=selectedEntries().map(n=>({...n}));$('prompt').value=buildPrompt(previewEntries);$('preview').hidden=false;$('insert').hidden=!chatGPT;}
  const composer=createComposerAdapter({own,tell});
  const {usableComposer,findComposer}=composer;
  async function appendPrompt(text,target=findComposer(),entries=selectedEntries()) {
    if(inserting)return false;
    if(pageKey()!==scope){checkRoute();tell('대화가 바뀌었습니다. 현재 대화에서 프롬프트를 다시 열어 주세요.');return false;}
    const batch=entries.map(n=>({...n})),startedScope=scope;
    inserting=true;
    try{
      const ok=await composer.append(text,target);
      if(!ok||pageKey()!==startedScope)return false;
      // Clear only the captured batch after verified delivery. New notes saved
      // while the editor accepts input keep their default checked state.
      const persisted=await choosePrompt(batch,false);
      $('preview').hidden=true;
      tell(persisted?'입력창에 추가하고 선택을 해제했습니다. 기록은 남아 있습니다. 확인 후 직접 전송해 주세요.':'입력창에는 추가했지만 선택 해제를 저장하지 못했습니다. 체크 상태를 확인해 주세요.',!persisted);
      return true;
    }catch{tell('입력창에 추가하지 못했습니다. 질문 선택은 유지됩니다. 복사를 이용해 주세요.',true);return false;}
    finally{inserting=false;}
  }
  function pendingEntries(target) {
    const text=normalized(target instanceof HTMLTextAreaElement?target.value:target.innerText);
    return selectedEntries().filter(n=>n.question.trim()&&!text.includes(normalized('- 인용 원문: '+n.quote+'\n- 내 질문: '+n.question)));
  }
  const unfinished=()=>activeSessions().some(s=>s.saving||s.existing||s.question.trim())||writes.hasPending(PREFIX);
  function insertSaved(confirmed=false,target=findComposer()) {
    checkRoute();if(!selectedEntries().length||legacyReview||!chatGPT)return;
    if(confirmed&&unfinished()){tell('작성 중인 질문을 저장하거나 취소한 뒤 입력창을 클릭해 주세요.');return;}
    if(!target)return appendPrompt(buildPrompt(),target);
    const entries=pendingEntries(target);
    if(!entries.length){tell('현재 질문들이 이미 추가되어 있습니다.');return;}
    return appendPrompt(buildPrompt(entries),target);
  }
  function insert() {return appendPrompt($('prompt').value,findComposer(),previewEntries);}
  async function copy(text=$('prompt').value,entries=previewEntries) {if(!text.trim())return;try{await navigator.clipboard.writeText(text);tell('프롬프트를 복사했습니다.');}catch{previewEntries=entries.map(n=>({...n}));$('prompt').value=text;$('preview').hidden=false;$('insert').hidden=!chatGPT;$('prompt').focus();$('prompt').select();try{if(!document.execCommand('copy'))throw Error();tell('프롬프트를 복사했습니다.');}catch{tell('Ctrl+C로 선택한 프롬프트를 복사해 주세요.',true);}}}
  // Clicking the composer offers insertion beside the pointer. Only the offer's
  // explicit button inserts text; focus, typing and IME never append anything.
  let composing=false,composerDown=null,offerContext=null;
  function composerAt(e) {
    const path=e.composedPath(),direct=path.find(n=>n instanceof Element&&n.matches(COMPOSER_SELECTOR));
    if(direct)return usableComposer(direct)?direct:null;
    if(path.some(n=>n instanceof Element&&n.matches('button,a,input,select')))return null;
    const shell=path.find(n=>n instanceof Element&&n.hasAttribute('data-composer-input'));
    return shell?findComposer(shell):null;
  }
  function hideOffer() {offerContext=null;$('insert-offer').hidden=true;}
  function showOffer(target,x,y) {
    checkRoute();
    if(!chatGPT||legacyReview||!notes.length||!usableComposer(target))return;
    const entries=pendingEntries(target);if(!entries.length)return;
    offerContext={target,scope};
    $('offer-title').textContent='선택한 질문 '+entries.length+'개를 모아서 입력할까요?';
    const busy=unfinished();
    $('offer-hint').textContent=busy?'작성 중인 질문을 먼저 저장하거나 취소해 주세요.':'인용 원문과 내 질문을 기존 입력 뒤에 추가합니다.';
    $('offer-accept').disabled=busy;
    const offer=$('insert-offer');offer.style.visibility='hidden';offer.hidden=false;
    const box=offer.getBoundingClientRect(),gap=12;
    offer.style.left=Math.max(gap,Math.min(x+gap,innerWidth-box.width-gap))+'px';
    offer.style.top=Math.max(gap,Math.min(y-box.height-gap>=gap?y-box.height-gap:y+gap,innerHeight-box.height-gap))+'px';
    offer.style.visibility='';
  }
  $('offer-dismiss').onclick=hideOffer;
  $('offer-accept').onclick=()=>{
    const context=offerContext;hideOffer();
    if(!context||!autoInsert||context.scope!==pageKey()){checkRoute();return;}
    const target=usableComposer(context.target)?context.target:findComposer();
    insertSaved(true,target);
  };
  window.addEventListener('compositionstart',e=>{if(composerAt(e)){composing=true;hideOffer();}},true);
  window.addEventListener('compositionend',()=>{composing=false;},true);
  window.addEventListener('pointerdown',e=>{
    if(!e.composedPath().includes($('insert-offer')))hideOffer();
    const target=composerAt(e);composerDown=target&&e.button===0?{target,x:e.clientX,y:e.clientY}:null;
  },true);
  window.addEventListener('click',e=>{
    const down=composerDown;composerDown=null;const target=composerAt(e);
    if(!e.isTrusted||!autoInsert||!target||!down||down.target!==target||composing||e.detail!==1||e.shiftKey||e.ctrlKey||e.metaKey||e.altKey||!$('preview').hidden)return;
    if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)return;
    showOffer(target,e.clientX,e.clientY);
  },true);
  window.addEventListener('input',e=>{if(composerAt(e))hideOffer();},true);
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('insert-offer').hidden){e.preventDefault();hideOffer();}},true);
  window.addEventListener('scroll',()=>{
    if(!offerContext)return;
    const rect=offerContext.target.getBoundingClientRect();
    // Focus and editor resizing can queue scroll events after a valid click.
    // Keep that offer beside the pointer while the composer remains visible.
    if(rect.bottom<=0||rect.top>=innerHeight)hideOffer();
  },{capture:true,passive:true});
  window.addEventListener('wheel',hideOffer,{capture:true,passive:true});
  window.addEventListener('touchmove',hideOffer,{capture:true,passive:true});
  window.addEventListener('resize',hideOffer);
  window.addEventListener('blur',()=>{composerDown=null;hideOffer();});
  async function exportData() {try{const all=await chrome.storage.local.get(null),data=Object.fromEntries(Object.entries(all).filter(([k])=>k.startsWith(PREFIX)||k.startsWith(CHOICE_PREFIX)||k===PREF||k===LASER_PREF||k===AUTO_PREF||k===FONT_KEY||k===OPACITY_KEY));const blob=new Blob([JSON.stringify({format:'question-basket-backup',version:3,data},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='question-basket-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch{tell('기록을 백업하지 못했습니다.',true);}}
  async function importData(file) {if(!file)return;try{if(file.size>20*1024*1024)throw Error();const backup=JSON.parse(await file.text());if(backup.format!=='question-basket-backup'||!backup.data)throw Error();const existing=await chrome.storage.local.get(null),incoming={};for(const[k,n]of Object.entries(backup.data))if(k.startsWith(PREFIX)&&validNote(n)&&k===storageKey(n)&&!existing[k])incoming[k]=n;for(const n of Object.values({...incoming}))if(validNote(n)&&typeof backup.data[choiceKey(n)]==='boolean'&&existing[choiceKey(n)]===undefined)incoming[choiceKey(n)]=backup.data[choiceKey(n)];const count=Object.keys(incoming).filter(k=>k.startsWith(PREFIX)).length;await chrome.storage.local.set(incoming);await load();tell(count+'개 기록을 가져왔습니다. 기존 기록은 유지됩니다.');}catch{tell('올바른 질문 바구니 백업 파일인지 확인해 주세요.',true);}finally{$('import-file').value='';}}
  let manualSelection=null;
  $('reading-mode').onclick=$('mode-compact').onclick=()=>setReadingMode(!readingMode);
  $('use-selection').addEventListener('pointerdown',e=>{if(!readingMode)return;e.preventDefault();manualSelection=readSelection(true);});
  $('use-selection').onclick=()=>{if(!readingMode)return;const candidate=manualSelection||readSelection(true);manualSelection=null;if(candidate)startSelection(candidate);else tell('먼저 답변의 원문을 드래그해 주세요. 질문은 원문 아래 말풍선에서 작성합니다.',true);};
  $('auto-insert').onchange=()=>{autoPreferenceChosen=true;autoInsert=$('auto-insert').checked;if(!autoInsert)hideOffer();chrome.storage.local.set({[AUTO_PREF]:autoInsert}).catch(()=>tell('입력 안내 설정을 저장하지 못했습니다.',true));};
  $('select-all').onclick=()=>choosePrompt(notes,true);$('deselect-all').onclick=()=>choosePrompt(notes,false);
  $('quick-insert').onclick=()=>insertSaved(false);$('quick-copy').onclick=()=>{checkRoute();if(selectedEntries().length)copy(buildPrompt(),selectedEntries());};
  $('launcher').onclick=open;$('close').onclick=collapse;$('generate').onclick=preview;$('preview-close').onclick=()=>{$('preview').hidden=true;};$('insert').onclick=insert;$('copy').onclick=()=>copy();$('export').onclick=exportData;$('import').onclick=()=>$('import-file').click();$('import-file').onchange=e=>importData(e.target.files[0]);
  $('legacy').onclick=()=>{legacyReview=!legacyReview;notes=[];$('preview').hidden=true;$('status').textContent=legacyReview?'이전 버전의 주소별 기록입니다.':'현재 대화의 질문을 표시합니다.';refresh();load();};
  $('clear').onclick=async()=>{
    if(activeSessions().some(s=>s.saving)){tell('저장이 끝난 뒤 다시 시도해 주세요.');return;}
    const deleting=[...notes];if(!deleting.length||!confirm('목록에 표시된 질문을 모두 삭제할까요?'))return;
    try{await Promise.all(deleting.map(n=>enqueue(storageKey(n),()=>chrome.storage.local.remove(storageKey(n)))));for(const n of deleting)finish(n.id,false);await load();tell('표시된 질문을 모두 삭제했습니다.');}catch{tell('일부 질문을 삭제하지 못했습니다.',true);await load();}
  };
  // A repeated backwards drag can leave Blink moving a collapsed caret instead
  // of extending the selection. Recover only this empty-selection case, within
  // the same answer, from the actual mouse-down text position. Never intercept
  // clicks, editable controls, existing text selections, or native link dragging.
  function recoverDrag(start,x,y) {
    const sel=getSelection();
    if(!start?.caret||!readingMode||!sel?.isCollapsed||Math.hypot(x-start.x,y-start.y)<5)return;
    const end=document.caretRangeFromPoint?.(x,y),a=start.caret,answer=answerRoot(elOf(a.node));
    if(!end||!a.node.isConnected||!answer||answer!==answerRoot(elOf(end.startContainer)))return;
    if(a.node===end.startContainer&&a.offset===end.startOffset)return;
    sel.setBaseAndExtent(a.node,a.offset,end.startContainer,end.startOffset);
  }
  window.addEventListener('pointerdown',e=>{
    if(!ownEvent(e))hideSelectionOffer();
    pointerStart=readingMode&&!ownEvent(e)&&!editable(e.target)&&e.button===0?{x:e.clientX,y:e.clientY}:null;
    if(pointerStart&&e.pointerType==='mouse'&&getSelection()?.isCollapsed&&!e.shiftKey&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!elOf(e.target)?.closest('a,button,[draggable="true"]')&&answerRoot(elOf(e.target))){
      const caret=document.caretRangeFromPoint?.(e.clientX,e.clientY);if(caret)pointerStart.caret={node:caret.startContainer,offset:caret.startOffset};
    }
  },true);
  window.addEventListener('pointermove',e=>{const started=pointerStart;if(started?.caret&&(e.buttons&1))requestAnimationFrame(()=>{if(pointerStart===started)recoverDrag(started,e.clientX,e.clientY);});},{capture:true,passive:true});
  // Capture the Range synchronously before focus/selection changes.
  window.addEventListener('pointerup',e=>{const started=pointerStart;pointerStart=null;if(!readingMode||!started||ownEvent(e)||!$('preview').hidden)return;recoverDrag(started,e.clientX,e.clientY);offerSelection(readSelection(false));},true);
  document.addEventListener('keyup',e=>{if(readingMode&&e.key==='Shift'&&!ownEvent(e)&&!editable(e.target)&&$('preview').hidden)offerSelection(readSelection(false));},true);
  chrome.storage.onChanged.addListener((changes,area)=>{if(area!=='local')return;appearance.applyChanges(changes);if(typeof changes[AUTO_PREF]?.newValue==='boolean'){autoInsert=changes[AUTO_PREF].newValue;$('auto-insert').checked=autoInsert;if(!autoInsert)hideOffer();}if(COLORS[changes[PREF]?.newValue?.lastColor]){lastColor=changes[PREF].newValue.lastColor;showActiveColor();}choices.applyChanges(changes,notes);if(Object.keys(changes).some(k=>k.startsWith(PREFIX)))load();});
  function checkRoute(){const next=pageKey();if(next===scope)return;hideSelectionOffer();hideOffer();scope=next;legacyReview=false;notes=[];ranges.clear();pointerStart=null;$('preview').hidden=true;refresh();load();}
  // ChatGPT navigates without reload. Drafts retain their original scope until you return.
  routeTimer=setInterval(checkRoute,350);window.addEventListener('popstate',checkRoute);
  const observer=new MutationObserver(records=>{
    const relevant=records.some(r=>{
      if(own(r.target)||editable(r.target))return false;
      if(r.type!=='childList')return true;
      const nodes=[...r.addedNodes,...r.removedNodes];
      if(nodes.some(n=>!own(n)))return true;
      return [...r.removedNodes].some(n=>!n.isConnected&&[...bubbles.values()].some(b=>b.host===n));
    });
    if(!relevant)return;clearTimeout(refreshTimer);refreshTimer=setTimeout(refresh,120);
  });
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:[...MESSAGE_ATTRS,'data-message-author-role','data-conversation-role','data-markdown-text-style','data-turn']});
  const themeObserver=new MutationObserver(()=>{theme(host);for(const b of bubbles.values())theme(b.host);});themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['class','data-theme']});
  load();
}
start();
