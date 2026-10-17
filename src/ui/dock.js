'use strict';
// Layout-only state: never reads notes, selections, drafts or reading mode.
const POSITION_KEY='qb:appearance:dock-position:v1';
const positionOf=value=>typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.min(1,value)):null;
function createDock({$,storage,enqueue,tell}){
  const dock=$('dock'),handle=$('dock-handle'),margin=8;
  let position=null,revision=0,pending=0,drag=null;
  function bounds(){const min=margin,max=Math.max(min,innerHeight-dock.getBoundingClientRect().height-margin);return {min,max};}
  function place(top){const {min,max}=bounds();dock.style.top=Math.max(min,Math.min(max,top))+'px';dock.style.bottom='auto';}
  function layout(){
    if(dock.hidden||drag)return;
    const {min,max}=bounds();place(position===null?innerHeight-dock.getBoundingClientRect().height-84:min+position*(max-min));
  }
  function capturePosition(){const {min,max}=bounds();position=max===min?0:(dock.getBoundingClientRect().top-min)/(max-min);}
  async function persist(){
    const token=++revision,value=position;pending=token;
    try{await enqueue(POSITION_KEY,()=>storage.set({[POSITION_KEY]:value}));}
    catch{if(revision===token)tell('메뉴 위치를 저장하지 못했습니다. 다시 이동해 주세요.',true);}
    finally{if(pending===token)pending=0;}
  }
  handle.addEventListener('pointerdown',e=>{
    if(e.button!==0||drag)return;
    e.preventDefault();e.stopPropagation();handle.focus({preventScroll:true});
    drag={id:e.pointerId,y:e.clientY,top:dock.getBoundingClientRect().top,previous:position,moved:false};
    ++revision;dock.dataset.dragging='true';handle.setPointerCapture(e.pointerId);
  });
  handle.addEventListener('pointermove',e=>{
    if(!drag||e.pointerId!==drag.id)return;
    e.preventDefault();
    if(Math.abs(e.clientY-drag.y)>3)drag.moved=true;
    if(drag.moved)place(drag.top+e.clientY-drag.y);
  });
  function finish(cancelled){
    if(!drag)return;
    const previous=drag;drag=null;delete dock.dataset.dragging;
    if(handle.hasPointerCapture(previous.id))handle.releasePointerCapture(previous.id);
    if(cancelled||!previous.moved){position=previous.previous;layout();return;}
    capturePosition();layout();persist();
  }
  handle.addEventListener('pointerup',e=>{if(drag?.id===e.pointerId)finish(false);});
  handle.addEventListener('pointercancel',()=>finish(true));
  handle.addEventListener('lostpointercapture',()=>finish(true));
  window.addEventListener('blur',()=>finish(true));
  handle.addEventListener('keydown',e=>{
    if(!['ArrowUp','ArrowDown','Home','End'].includes(e.key))return;
    e.preventDefault();e.stopPropagation();if(drag)finish(true);
    const {min,max}=bounds(),step=e.shiftKey?50:10;
    place(e.key==='Home'?min:e.key==='End'?max:dock.getBoundingClientRect().top+(e.key==='ArrowUp'?-step:step));
    capturePosition();persist();
  });
  window.addEventListener('resize',layout);
  new ResizeObserver(layout).observe(dock);
  layout();
  return {
    revision:()=>revision,
    hydrate(data,readRevision){if(revision<=readRevision&&!pending&&!drag){position=positionOf(data[POSITION_KEY]);layout();}},
    applyChanges(changes){if(changes[POSITION_KEY]&&!pending&&!drag){++revision;position=positionOf(changes[POSITION_KEY].newValue);layout();}}
  };
}
module.exports={createDock};
