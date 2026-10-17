'use strict';
// Panel visibility and reading mode are independent controls with shared styling.
function createPanel($,t){
  let hiddenByUser=false;
  function open(){
    if(hiddenByUser)return;
    $('panel').hidden=false;$('dock').hidden=true;
    $('launcher').setAttribute('aria-expanded','true');
  }
  function collapse(){
    if(hiddenByUser)return;
    $('panel').hidden=true;$('dock').hidden=false;
    $('launcher').setAttribute('aria-expanded','false');
  }
  function hide(){
    hiddenByUser=true;$('panel').hidden=true;$('dock').hidden=true;
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
  return {open,collapse,hide,fromToolbar,showReadingMode};
}
module.exports={createPanel};
