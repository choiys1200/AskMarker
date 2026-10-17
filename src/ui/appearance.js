'use strict';
const {FONTS,FONT_KEY,OPACITY_KEY,SIZE_KEY,fontOf,opacityOf,sizeOf}=require('../domain/appearance');
const {ANSWER_SELECTORS,WRITING_BOX}=require('../platform/selectors');
// Presentation-only dependency boundary: no notes, choices, drafts or anchor APIs.
// Settings mutate CSS and their own keys, never call the annotation renderer.
function createAppearance({host,$,storage,enqueue,tell,t}){
  let font='system',opacity=60,size=sizeOf(),revision=0,reading=false;
  const changed=new Map(),pending=new Set();
  const style=document.createElement('style');style.dataset.qbAppearance='';
  const text=':is(p,li,blockquote,h1,h2,h3,h4,h5,h6,td,th):not(pre *,code *)';
  const answers=':is('+ANSWER_SELECTORS.join(',')+','+WRITING_BOX+')';
  style.textContent='html[data-askmark-reading="true"][data-askmark-font]:not([data-askmark-font="system"]) '+answers+' '+text+'{font-family:var(--askmark-font)!important}';
  document.documentElement.append(style);
  // CSS medium follows the browser's default font-size preference. No OS API,
  // page font-size or viewport zoom is mistaken for that preference.
  const probe=document.createElement('span');probe.setAttribute('aria-hidden','true');
  probe.style.cssText='all:initial;position:absolute;visibility:hidden;pointer-events:none;display:block;font-size:medium;width:1em;height:1em';
  host.shadowRoot.append(probe);
  for(const[value,item]of Object.entries(FONTS)){
    const option=document.createElement('option');option.value=value;option.textContent=item.label;$('font-family').append(option);
  }
  function apply(){
    document.documentElement.style.setProperty('--askmark-font',FONTS[font].family);
    document.documentElement.dataset.askmarkFont=font;
    document.documentElement.dataset.askmarkReading=String(reading);
    host.style.setProperty('--askmark-font',FONTS[font].family);
    $('font-family').value=font;$('laser-opacity').value=String(opacity);
    $('laser-opacity-value').textContent=opacity+'%';
    $('laser-opacity').setAttribute('aria-valuetext',t('{value}% 진하기',{value:opacity}));
    $('laser').style.opacity=String(opacity/100);
    const scale=size.mode==='custom'?size.scale/100:size.mode==='system'?parseFloat(getComputedStyle(probe).fontSize)/14:1;
    document.documentElement.style.setProperty('--askmark-ui-scale',String(scale));
    host.style.setProperty('--askmark-ui-scale',String(scale));
    $('font-size-mode').value=size.mode;$('font-size-custom').hidden=size.mode!=='custom';
    $('font-size-scale').value=String(size.scale);$('font-size-value').textContent=size.scale+'%';
    $('font-size-number').value=String(size.scale);
    $('font-size-scale').setAttribute('aria-valuetext',size.scale+'%');
  }
  async function save(key,value){
    const token=++revision;changed.set(key,token);pending.add(key);
    if(key===FONT_KEY)font=fontOf(value);else if(key===SIZE_KEY)size=sizeOf(value);else opacity=opacityOf(value);apply();
    try{await enqueue(key,()=>storage.set({[key]:value}));}
    catch{
      if(changed.get(key)===token){tell('화면 설정을 저장하지 못했습니다. 다시 조정해 주세요.',true);}
    }finally{if(changed.get(key)===token)pending.delete(key);}
  }
  $('font-family').onchange=()=>save(FONT_KEY,$('font-family').value);
  // Preview the slider immediately; persist only the completed gesture.
  $('laser-opacity').oninput=()=>{opacity=opacityOf(Number($('laser-opacity').value));changed.set(OPACITY_KEY,++revision);apply();};
  $('laser-opacity').onchange=()=>save(OPACITY_KEY,opacity);
  $('font-size-mode').onchange=()=>save(SIZE_KEY,sizeOf({...size,mode:$('font-size-mode').value}));
  $('font-size-scale').oninput=()=>{size=sizeOf({mode:'custom',scale:Number($('font-size-scale').value)});changed.set(SIZE_KEY,++revision);apply();};
  $('font-size-scale').onchange=()=>save(SIZE_KEY,size);
  $('font-size-number').onchange=()=>save(SIZE_KEY,sizeOf({mode:'custom',scale:Number($('font-size-number').value)}));
  new ResizeObserver(()=>{if(size.mode==='system')apply();}).observe(probe);
  function hydrate(data,readRevision){
    if((changed.get(FONT_KEY)||0)<=readRevision&&!pending.has(FONT_KEY))font=fontOf(data[FONT_KEY]);
    if((changed.get(OPACITY_KEY)||0)<=readRevision&&!pending.has(OPACITY_KEY))opacity=opacityOf(data[OPACITY_KEY]);
    if((changed.get(SIZE_KEY)||0)<=readRevision&&!pending.has(SIZE_KEY))size=sizeOf(data[SIZE_KEY]);
    apply();
  }
  function applyChanges(changes){
    for(const key of [FONT_KEY,OPACITY_KEY,SIZE_KEY])if(changes[key]&&!pending.has(key)){
      changed.set(key,++revision);
      if(key===FONT_KEY)font=fontOf(changes[key].newValue);else if(key===SIZE_KEY)size=sizeOf(changes[key].newValue);else opacity=opacityOf(changes[key].newValue);
    }
    apply();
  }
  apply();
  return {render:apply,revision:()=>revision,hydrate,applyChanges,setReadingMode:value=>{reading=value;apply();}};
}
module.exports={createAppearance};
