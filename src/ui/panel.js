'use strict';
// Panel visibility and reading mode are independent controls with shared styling.
function createPanel($){
  function open(){
    $('panel').hidden=false;$('dock').hidden=true;
    $('launcher').setAttribute('aria-expanded','true');
  }
  function collapse(){
    $('panel').hidden=true;$('dock').hidden=false;
    $('launcher').setAttribute('aria-expanded','false');
  }
  function showReadingMode(enabled){
    for(const id of ['reading-mode','mode-compact']){
      $(id).textContent='읽기 모드 '+(enabled?'ON':'OFF');
      $(id).setAttribute('aria-pressed',String(enabled));
    }
  }
  return {open,collapse,showReadingMode};
}
module.exports={createPanel};
