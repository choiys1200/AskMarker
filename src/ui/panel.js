'use strict';
const {setVisible,isOpen,createDisclosure}=require('./motion');
// Panel visibility and reading mode are independent controls with shared styling.
function createPanel($,t){
  let hiddenByUser=false;
  for(const name of ['settings','records','help'])createDisclosure($(name+'-toggle'),$(name+'-content'));
  function open(){
    if(hiddenByUser)return;
    const focus=$('dock').contains($('dock').getRootNode().activeElement);
    setVisible($('dock'),false);setVisible($('panel'),true);
    $('launcher').setAttribute('aria-expanded','true');
    if(focus)$('reading-mode').focus({preventScroll:true});
  }
  function collapse(){
    if(hiddenByUser)return;
    const focus=$('panel').contains($('panel').getRootNode().activeElement);
    setVisible($('panel'),false);setVisible($('dock'),true);
    $('launcher').setAttribute('aria-expanded','false');
    if(focus)$('launcher').focus({preventScroll:true});
  }
  function hide(){
    hiddenByUser=true;setVisible($('panel'),false);setVisible($('dock'),false);
    $('launcher').setAttribute('aria-expanded','false');
  }
  function fromToolbar(){
    if(hiddenByUser){hiddenByUser=false;collapse();}
    else open();
  }
  function showReadingMode(enabled){
    for(const id of ['reading-mode','mode-compact']){
      $(id).textContent=t('읽기 모드 {state}',{state:enabled?'ON':'OFF'});
      $(id).setAttribute('aria-pressed',String(enabled));
    }
  }
  $('panel').addEventListener('keydown',e=>{if(e.key==='Escape'&&!e.defaultPrevented&&isOpen($('panel'))){e.preventDefault();collapse();}});
  return {open,collapse,hide,fromToolbar,showReadingMode};
}
module.exports={createPanel};
