'use strict';
const {COMPOSER_SELECTOR}=require('./selectors');
const {normalized}=require('../domain/prompt');
function createComposerAdapter({own,tell}) {
  function usableComposer(el){return el instanceof Element&&el.isConnected&&!own(el)&&el.matches(COMPOSER_SELECTOR)&&el.getClientRects().length&&!el.disabled&&el.getAttribute('aria-disabled')!=='true'&&(el instanceof HTMLTextAreaElement||el.isContentEditable);}
  function findComposer(root=document) {
    const candidates=[...root.querySelectorAll(COMPOSER_SELECTOR)].filter(usableComposer);
    return candidates.length===1?candidates[0]:null;
  }
  async function appendPrompt(text,target=findComposer()) {
    if(!text.trim()){tell('프롬프트가 비어 있습니다.',true);return false;}
    if(!usableComposer(target)){tell('ChatGPT 입력창을 찾지 못했습니다. 복사를 이용해 주세요.',true);return;}
    const previous=target instanceof HTMLTextAreaElement?target.value:target.innerText;
    if(normalized(previous).includes(normalized(text))){tell('같은 프롬프트가 이미 입력창에 있습니다.');return;}
    const addition=(previous.trim()?'\n\n':'')+text;target.focus();
    if(target instanceof HTMLTextAreaElement){Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(target,previous+addition);target.dispatchEvent(new Event('input',{bubbles:true}));}
    else if(target.isContentEditable){const r=document.createRange();r.selectNodeContents(target);r.collapse(false);getSelection().removeAllRanges();getSelection().addRange(r);if(!document.execCommand('insertText',false,addition)){tell('입력을 지원하지 않는 편집기입니다. 복사를 이용해 주세요.',true);return;}}
    else{tell('지원하지 않는 입력창입니다. 복사를 이용해 주세요.',true);return;}
    // Give controlled editors a chance to accept/revert/re-render the input.
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const current=usableComposer(target)?target:findComposer();
    if(!current){tell('입력창이 바뀌었습니다. 질문 선택은 유지됩니다.',true);return false;}
    const after=current instanceof HTMLTextAreaElement?current.value:current.innerText;
    if(!normalized(after).includes(normalized(previous+addition))){tell('입력 결과를 확인해 주세요. 필요하면 복사를 이용해 주세요.',true);return;}
    return true;
  }
  return {usableComposer,findComposer,append:appendPrompt};
}
module.exports={createComposerAdapter};
