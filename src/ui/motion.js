'use strict';
// Presentation only. Never owns notes, drafts, reading mode or storage.
const DURATION=160;
const closing=new WeakMap();
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function isOpen(node){return !node.hidden&&node.dataset.state!=='closed';}
function setVisible(node,visible,{immediate=false}={}){
  if(visible===isOpen(node)&&!closing.has(node))return;
  clearTimeout(closing.get(node));closing.delete(node);
  node.inert=!visible;node.setAttribute('aria-hidden',String(!visible));
  if(visible){
    if(node.hidden){node.dataset.state='closed';node.hidden=false;node.getBoundingClientRect();}
    node.dataset.state='open';
  }else{
    node.dataset.state='closed';
    if(immediate||reduced()||node.hidden)node.hidden=true;
    else closing.set(node,setTimeout(()=>{node.hidden=true;closing.delete(node);},DURATION));
  }
}
function createDisclosure(toggle,content){
  function set(open){
    toggle.setAttribute('aria-expanded',String(open));
    content.dataset.open=String(open);content.inert=!open;
    content.setAttribute('aria-hidden',String(!open));
  }
  set(false);
  toggle.addEventListener('click',()=>set(toggle.getAttribute('aria-expanded')!=='true'));
  content.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();set(false);toggle.focus({preventScroll:true});}});
  return {set};
}
module.exports={setVisible,isOpen,createDisclosure};
