'use strict';
const {LANGUAGE_KEY,languageOf,translate,hasMessage}=require('../i18n/index');
// Own setting only. No access to notes, selections, source anchors or AI input.
function createLanguage({host,$,storage,enqueue,tell,onChange}){
  let language='ko',revision=0,pending=0;
  const bindings=new WeakMap();
  const t=(key,params)=>translate(language,key,params);
  function apply(root){
    for(const binding of bindings.get(root)||[]){
      if(binding.attribute)binding.node.setAttribute(binding.attribute,t(binding.key));
      else binding.node.nodeValue=binding.before+t(binding.key)+binding.after;
    }
    // Each inline bubble has its own shadow host. Do not change the site's lang.
    (root.host||host).lang=language;
  }
  function bind(root){
    if(bindings.has(root)){apply(root);return;}
    const list=[];
    function visit(node){
      if(node.nodeType===1){
        if(node.matches('style,script,[data-i18n-dynamic]'))return;
        for(const attribute of ['title','aria-label','placeholder']){
          const key=node.getAttribute(attribute);if(hasMessage(key))list.push({node,attribute,key});
        }
      }
      if(node.nodeType===3){
        const key=node.nodeValue.trim();
        if(hasMessage(key))list.push({node,key,before:node.nodeValue.match(/^\s*/)[0],after:node.nodeValue.match(/\s*$/)[0]});
      }
      for(const child of node.childNodes)visit(child);
    }
    visit(root);bindings.set(root,list);apply(root);
  }
  function render(){host.lang=language;$('language').value=language;onChange();}
  async function select(value){
    const token=++revision;pending=token;language=languageOf(value);render();
    try{await enqueue(LANGUAGE_KEY,()=>storage.set({[LANGUAGE_KEY]:languageOf(value)}));}
    catch{tell('화면 설정을 저장하지 못했습니다. 다시 조정해 주세요.',true);}
    finally{if(pending===token)pending=0;}
  }
  $('language').onchange=()=>select($('language').value);
  return {t,bind,apply,current:()=>language,revision:()=>revision,
    hydrate(data,readRevision){if(!pending&&revision<=readRevision){language=languageOf(data[LANGUAGE_KEY]);render();}},
    applyChanges(changes){if(changes[LANGUAGE_KEY]&&!pending){++revision;language=languageOf(changes[LANGUAGE_KEY].newValue);render();}}
  };
}
module.exports={createLanguage};
