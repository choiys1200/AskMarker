'use strict';
const {COLORS,COLOR_ORDER}=require('../domain/colors');
const {baseCSS}=require('./shell');
const elOf=n=>n?.nodeType===1?n:n?.parentElement;
function createCards({getNotes,getSession,choosePrompt,activate,cancel,save,remove,edit,jump,setColor,syncCardText,language}) {
  function makeCard(id,inline=false) {
    const outer=document.createElement(inline?'div':'article');let root=outer;
    if(inline){
      outer.dataset.qbInline=id;outer.style.cssText='display:block!important;position:relative!important;box-sizing:border-box!important;width:100%!important;max-width:680px!important;min-width:0!important;flex:0 0 auto!important;grid-column:1 / -1!important;align-self:stretch!important;margin:12px 0 16px!important;padding:0!important;border:0!important;clear:both!important;overflow:visible!important;';
      root=outer.attachShadow({mode:'open'});
      root.innerHTML=`<style>${baseCSS}.card{margin:0;position:relative;box-shadow:0 3px 9px #1635290b}.card:before{content:'';position:absolute;left:19px;top:-7px;width:11px;height:11px;background:var(--paper);border-left:1px solid var(--line);border-top:1px solid var(--line);transform:rotate(45deg)}blockquote{max-height:58px}</style>`;
    }
    const card=document.createElement('section');card.className='card surface';
    card.innerHTML=`<div class="row">${inline?'<span class="tag"></span>':'<label class="prompt-choice" title="체크한 코멘트만 프롬프트에 포함합니다. 해제해도 기록은 남습니다."><input class="prompt-include" type="checkbox"><span class="tag"></span></label>'}<button class="cancel quiet" aria-label="작성 취소" hidden>닫기</button></div><blockquote></blockquote><p class="location" hidden>원문 위치를 확인할 수 없습니다. 기록은 보존됩니다.</p><p class="question"></p>${inline?'':'<div class="palette" role="group" aria-label="코멘트 색상"></div>'}<div class="editor" hidden><label>코멘트<textarea aria-label="코멘트" placeholder="이 부분에서 코멘트를 적어 주세요."></textarea></label><div class="tools"><button class="save primary" data-i18n-dynamic>코멘트 저장</button><button class="cancel">취소</button></div><p class="hint">Ctrl + Enter 저장 · Esc 취소 · 패널을 접어도 작성은 유지됩니다.</p></div><div class="actions tools"><button class="jump quiet">원문으로 이동</button><button class="edit quiet">수정</button><button class="delete quiet danger">삭제</button></div>`;
    root.append(card);
    const rec={host:outer,root,card,id,inline};
    if(!inline)for(const color of COLOR_ORDER){
      const [name,solid]=COLORS[color];
      const b=document.createElement('button');b.className='swatch';b.dataset.color=color;b.style.background=solid;b.title=name;b.setAttribute('aria-label',name);b.setAttribute('aria-pressed','false');
      b.addEventListener('click',()=>setColor(id,color));card.querySelector('.palette').append(b);
    }
    if(!inline){const name=document.createElement('span');name.className='color-name';card.querySelector('.palette').append(name);}
    if(!inline)card.querySelector('.prompt-include').addEventListener('change',e=>{const n=getNotes().find(n=>n.id===id);if(n)choosePrompt([n],e.target.checked);});
    for(const type of ['pointerdown','focusin'])card.addEventListener(type,e=>{if(!elOf(e.target)?.closest('.prompt-choice'))activate(id);});
    card.querySelectorAll('.cancel').forEach(b=>b.addEventListener('click',()=>cancel(id)));
    card.querySelector('.save').addEventListener('click',()=>save(id));
    card.querySelector('.delete').addEventListener('click',()=>{const n=getNotes().find(n=>n.id===id);if(n)remove(n);});
    card.querySelector('.edit').addEventListener('click',()=>{const n=getNotes().find(n=>n.id===id);if(n)edit(n,inline?'inline':'panel');});
    card.querySelector('.jump').addEventListener('click',()=>{const n=getNotes().find(n=>n.id===id)||getSession(id)?.note;if(n)jump(n);});
    const input=card.querySelector('textarea');
    input.addEventListener('input',()=>{const s=getSession(id);if(s){s.question=input.value;syncCardText(id);}});
    input.addEventListener('keydown',e=>{if(e.isComposing)return;if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();save(id);}if(e.key==='Escape'){e.preventDefault();cancel(id);}});
    language.bind(card);
    return rec;
  }
  return {makeCard};
}
module.exports={createCards};
