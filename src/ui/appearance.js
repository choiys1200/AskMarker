'use strict';
const {FONTS,FONT_KEY,OPACITY_KEY,fontOf,opacityOf}=require('../domain/appearance');
const {ANSWER_SELECTORS,WRITING_BOX}=require('../platform/selectors');
// Presentation-only dependency boundary: no notes, choices, drafts or anchor APIs.
// Settings mutate CSS and their own keys, never call the annotation renderer.
function createAppearance({host,$,storage,enqueue,tell}){
  let font='system',opacity=60,revision=0,reading=false;
  const changed=new Map(),pending=new Set();
  const style=document.createElement('style');style.dataset.qbAppearance='';
  const text=':is(p,li,blockquote,h1,h2,h3,h4,h5,h6,td,th):not(pre *,code *)';
  const answers=':is('+ANSWER_SELECTORS.join(',')+','+WRITING_BOX+')';
  style.textContent='html[data-askmark-reading="true"][data-askmark-font]:not([data-askmark-font="system"]) '+answers+' '+text+'{font-family:var(--askmark-font)!important}';
  document.documentElement.append(style);
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
    $('laser-opacity').setAttribute('aria-valuetext',opacity+'% 진하기');
    $('laser').style.opacity=String(opacity/100);
  }
  async function save(key,value){
    const token=++revision;changed.set(key,token);pending.add(key);
    if(key===FONT_KEY)font=fontOf(value);else opacity=opacityOf(value);apply();
    try{await enqueue(key,()=>storage.set({[key]:value}));}
    catch{
      if(changed.get(key)===token){tell('화면 설정을 저장하지 못했습니다. 다시 조정해 주세요.',true);}
    }finally{if(changed.get(key)===token)pending.delete(key);}
  }
  $('font-family').onchange=()=>save(FONT_KEY,$('font-family').value);
  // Preview the slider immediately; persist only the completed gesture.
  $('laser-opacity').oninput=()=>{opacity=opacityOf(Number($('laser-opacity').value));changed.set(OPACITY_KEY,++revision);apply();};
  $('laser-opacity').onchange=()=>save(OPACITY_KEY,opacity);
  function hydrate(data,readRevision){
    if((changed.get(FONT_KEY)||0)<=readRevision&&!pending.has(FONT_KEY))font=fontOf(data[FONT_KEY]);
    if((changed.get(OPACITY_KEY)||0)<=readRevision&&!pending.has(OPACITY_KEY))opacity=opacityOf(data[OPACITY_KEY]);
    apply();
  }
  function applyChanges(changes){
    for(const key of [FONT_KEY,OPACITY_KEY])if(changes[key]&&!pending.has(key)){
      changed.set(key,++revision);
      if(key===FONT_KEY)font=fontOf(changes[key].newValue);else opacity=opacityOf(changes[key].newValue);
    }
    apply();
  }
  apply();
  return {revision:()=>revision,hydrate,applyChanges,setReadingMode:value=>{reading=value;apply();}};
}
module.exports={createAppearance};
