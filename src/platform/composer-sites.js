'use strict';
const {COMPOSER_SELECTOR}=require('./selectors');
// Gemini/Grok editor attributes observed read-only in live Chrome on 2026-10-17.
// No network access or site scripts; each adapter operates on visible DOM only.
const EDITABLE='[contenteditable="true"],[contenteditable="plaintext-only"]';
const GENERIC='textarea,[contenteditable="true"][role="textbox"],[contenteditable="plaintext-only"][role="textbox"],[contenteditable="true"][role="combobox"],.ProseMirror[contenteditable="true"]';
function composerSite(hostname){
  if(hostname==='chatgpt.com')return {name:'ChatGPT',selector:COMPOSER_SELECTOR,shell:'[data-composer-input]'};
  if(hostname==='gemini.google.com')return {name:'Gemini',selector:'rich-textarea .ql-editor:is('+EDITABLE+'),textarea',shell:'rich-textarea'};
  if(hostname==='grok.com'||hostname==='www.grok.com')return {name:'Grok',selector:'.query-bar-editor:is('+EDITABLE+'),textarea',shell:null};
  return {name:hostname==='claude.ai'?'Claude':'AI',selector:GENERIC,shell:null};
}
module.exports={composerSite};
