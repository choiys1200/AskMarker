'use strict';
const {composerSite}=require('./composer-sites');
const {normalized}=require('../domain/prompt');
function createComposerAdapter({own,tell}) {
  const site=composerSite(location.hostname);let chosen=null;
  function usableComposer(el){
    if(!(el instanceof Element)||!el.isConnected||own(el)||!el.matches(site.selector)||el.disabled||el.readOnly||el.getAttribute('aria-disabled')==='true'||el.closest('[inert],[aria-hidden="true"],nav,aside,[role="search"],form[role="search"]'))return false;
    const label=[el.getAttribute('aria-label'),el.getAttribute('placeholder'),el.getAttribute('data-placeholder')].filter(Boolean).join(' ');
    if(/search|검색|찾기/i.test(label))return false;
    const style=getComputedStyle(el);
    return style.visibility!=='hidden'&&style.visibility!=='collapse'&&[...el.getClientRects()].some(r=>r.width>0&&r.height>0)&&(el instanceof HTMLTextAreaElement||el.isContentEditable);
  }
  function findComposer(root=document) {
    if(root===document&&usableComposer(chosen))return chosen;
    const candidates=[...root.querySelectorAll(site.selector)].filter(usableComposer);
    // Re-rendered editors may keep a stable ID while the old node disconnects.
    // Retain the explicitly chosen identity only when that ID/tag/label match
    // one eligible node; never guess between multiple unrelated editors.
    if(root===document&&chosen?.id){
      const same=candidates.filter(el=>el.id===chosen.id&&el.tagName===chosen.tagName&&el.getAttribute('aria-label')===chosen.getAttribute('aria-label'));
      if(same.length===1){chosen=same[0];return chosen;}
    }
    return candidates.length===1?candidates[0]:null;
  }
  function fromEvent(e){
    const path=e.composedPath();
    for(const node of path)if(node instanceof Element){const target=node.closest(site.selector);if(usableComposer(target))return target;}
    if(path.some(n=>n instanceof Element&&n.matches('button,a,input,select')))return null;
    const shell=site.shell&&path.find(n=>n instanceof Element&&n.matches(site.shell));
    return shell?findComposer(shell):null;
  }
  async function appendPrompt(text,target=findComposer()) {
    if(!text.trim()){tell('프롬프트가 비어 있습니다.',true);return false;}
    if(!usableComposer(target)){tell('AI 입력창을 찾지 못했습니다. 대상 입력창을 클릭한 뒤 다시 시도하거나 복사를 이용해 주세요.',true);return false;}
    const previous=target instanceof HTMLTextAreaElement?target.value:target.innerText;
    if(normalized(previous).includes(normalized(text))){tell('같은 프롬프트가 이미 입력창에 있습니다.');return;}
    const addition=(previous.trim()?'\n\n':'')+text;target.focus();
    if(target instanceof HTMLTextAreaElement){Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(target,previous+addition);target.dispatchEvent(new Event('input',{bubbles:true}));}
    else if(target.isContentEditable){const r=document.createRange();r.selectNodeContents(target);r.collapse(false);getSelection().removeAllRanges();getSelection().addRange(r);if(!document.execCommand('insertText',false,addition)){tell('입력을 지원하지 않는 편집기입니다. 복사를 이용해 주세요.',true);return;}}
    else{tell('지원하지 않는 입력창입니다. 복사를 이용해 주세요.',true);return;}
    // Give controlled editors a chance to accept/revert/re-render the input.
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const current=usableComposer(target)?target:findComposer();
    if(!current){tell('입력창이 바뀌었습니다. 코멘트 선택은 유지됩니다.',true);return false;}
    const after=current instanceof HTMLTextAreaElement?current.value:current.innerText;
    if(!normalized(after).includes(normalized(previous+addition))){tell('입력 결과를 확인해 주세요. 필요하면 복사를 이용해 주세요.',true);return;}
    return true;
  }
  return {usableComposer,findComposer,fromEvent,choose:target=>{if(usableComposer(target))chosen=target;},name:site.name,append:appendPrompt};
}
module.exports={createComposerAdapter};
