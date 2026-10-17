'use strict';
const {MESSAGE_ATTRS,ANSWER_SELECTORS,NON_ANSWER,COMPOSER_SELECTOR,WRITING_BOX}=require('./selectors');
const elOf=n=>n?.nodeType===1?n:n?.parentElement;
function createSourceAdapter({own,chatGPT,getScope,sameConversation,beforeRead,tell}) {
  function blockedInput(node) {
    const el=elOf(node);if(!el)return false;
    if(el.closest('input,textarea,select,'+COMPOSER_SELECTOR))return true;
    const editor=el.closest('[contenteditable]:not([contenteditable="false"])');
    // Permission is narrow: a writing box inside a positively identified answer.
    return !!editor && !(chatGPT&&editor.closest(WRITING_BOX)&&answerIdentity(el));
  }
  // Every text index excludes our UI and the site's composer; raw text is never normalized.
  function indexText(root,includeButtons=false,includeWriting=false) {
    const entries=[]; let text='',node;
    const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>own(n)||elOf(n)?.closest('script,style,noscript,input,textarea')||(includeWriting?blockedInput(n):elOf(n)?.closest('[contenteditable]:not([contenteditable="false"])'))||(!includeButtons&&elOf(n)?.closest('button'))?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
    while ((node=w.nextNode())) { entries.push({node,start:text.length,end:text.length+node.length}); text+=node.data; }
    return {text,entries};
  }
  function offsetAt(data,node,offset) {
    if(node.nodeType===3) { const entry=data.entries.find(e=>e.node===node); return entry ? entry.start+offset : null; }
    const r=document.createRange(); r.setStart(node,offset); r.collapse(true);
    for(const entry of data.entries) if(r.comparePoint(entry.node,0)>=0) return entry.start;
    return data.text.length;
  }
  function rangeAt(data,start,end) {
    if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end>data.text.length||end<=start)return null;
    const a=data.entries.find(e=>e.end>start), b=data.entries.find(e=>e.end>=end && e.start<end);
    if(!a||!b||end<=start) return null;
    const r=document.createRange();r.setStart(a.node,start-a.start);r.setEnd(b.node,end-b.start);return r;
  }
  function answerIdentity(el) {
    if(!el||own(el)||el.closest(NON_ANSWER)||el.closest(COMPOSER_SELECTOR))return null;
    // Renderer IDs must agree when both are present. Missing wrappers are different
    // from contradictory IDs: ChatGPT serves more than one answer renderer.
    const dil=el.closest('[data-dil-message-id]');
    const container=el.closest('[data-chatgpt-selection-message-id]'),source=el.closest('[data-dil-source-message-id]');
    const ids=[dil?.getAttribute('data-dil-message-id'),source?.getAttribute('data-dil-source-message-id'),container?.getAttribute('data-chatgpt-selection-message-id')].filter(Boolean);
    if(new Set(ids).size>1)return null;
    const explicit=el.closest(ANSWER_SELECTORS.join(','));
    if(explicit)return dil||explicit;
    if(dil&&ids.length>=2)return dil;
    // Some versions put the assistant role on a sibling accessibility heading.
    // Scope this fallback to one turn and one markdown body, never the entire main.
    const turn=el.closest('[data-testid^="conversation-turn-"],[data-content-search-unit-key]');
    const body=el.closest('.markdown');
    if(turn&&body&&turn.contains(body)){
      const roles=[...turn.querySelectorAll('[data-conversation-role]')];
      if(roles.length===1&&roles[0].getAttribute('data-conversation-role')==='assistant')return body;
    }
    return null;
  }
  function answerRoot(el) {return blockedInput(el)?null:answerIdentity(el);}
  function selectedTextRange(range) {
    // Browser selection endpoints may be parent elements (triple-click, paragraph
    // boundaries, keyboard selection). Resolve the text actually covered by Range.
    const root=range.commonAncestorContainer;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const parts=[];let node=root.nodeType===3?root:walker.nextNode();
    while(node){
      if(range.intersectsNode(node)){
        const start=node===range.startContainer?range.startOffset:0,end=node===range.endContainer?range.endOffset:node.length;
        if(end>start)parts.push({node,start,end});
      }
      node=walker.nextNode();
    }
    // Ignore only whitespace outside answers at the selection's outer edges.
    if(chatGPT){
      const blank=p=>!p.node.data.slice(p.start,p.end).trim()&&!answerRoot(p.node.parentElement);
      while(parts.length&&blank(parts[0]))parts.shift();
      while(parts.length&&blank(parts[parts.length-1]))parts.pop();
    }
    if(!parts.length)return null;
    const first=parts[0],last=parts[parts.length-1],answer=answerRoot(first.node.parentElement);
    if(chatGPT&&(!answer||parts.some(p=>!answer.contains(p.node)||!answerRoot(p.node.parentElement))))return null;
    const resolved=document.createRange();resolved.setStart(first.node,first.start);resolved.setEnd(last.node,last.end);
    return {range:resolved,answer};
  }
  function elementPath(el) {
    const path=[];while(el&&el!==document.body){const parent=el.parentElement;if(!parent)return null;path.unshift([...parent.children].filter(n=>!own(n)).indexOf(el));el=parent;}
    return el===document.body?path:null;
  }
  function elementAt(path) {
    if(!Array.isArray(path))return null;
    let el=document.body;for(const index of path){if(!Number.isInteger(index)||index<0)return null;el=el&&[...el.children].filter(n=>!own(n))[index];}return el||null;
  }
  function readSelection(report=false) {
    beforeRead();
    const scope=getScope();
    const sel=getSelection(); if(!sel?.rangeCount||sel.isCollapsed) return null;
    const original=sel.getRangeAt(0).cloneRange();
    if(original.toString().length>30000){if(report)tell('선택 범위가 너무 큽니다. 답변의 일부를 선택해 주세요.',true);return null;}
    if(own(original.startContainer)||own(original.endContainer)||blockedInput(original.startContainer)||blockedInput(original.endContainer))return null;
    const selected=selectedTextRange(original);
    if(!selected) {
      if(report)tell('답변 영역을 확인하지 못했습니다. 한 답변 안에서 원문을 다시 선택해 주세요.',true);
      return null;
    }
    const r=selected.range,a=elOf(r.startContainer),b=elOf(r.endContainer),answerA=selected.answer;
    let root=answerA?.closest(MESSAGE_ATTRS.map(attr=>'['+attr+']').join(','))||answerA||a.closest('[data-message-id]');
    if(!root?.contains(b)) root=document.querySelector('main') || document.body;
    if(!root.contains(a)||!root.contains(b)) return null;
    const data=indexText(root,true,true), start=offsetAt(data,r.startContainer,r.startOffset),end=offsetAt(data,r.endContainer,r.endOffset);
    const exact=r.toString(),quote=sel.toString();
    if(start===null||end===null||!quote.trim()||data.text.slice(start,end)!==exact){if(report)tell('선택 영역이 변경되어 원문 위치를 확인하지 못했습니다. 문장을 다시 선택해 주세요.',true);return null;}
    if(quote.length>30000 || data.text.length>500000) {tell('선택 범위가 너무 큽니다. 답변의 일부를 선택해 주세요.',true);return null;}
    const rootAttribute=MESSAGE_ATTRS.find(attr=>root.hasAttribute(attr))||null,messageId=rootAttribute?root.getAttribute(rootAttribute):null;
    const rootSelector=!messageId&&chatGPT?(ANSWER_SELECTORS.find(selector=>root.matches(selector))||(root.matches('.markdown')?'.markdown':null)):null;
    return {quote,scope,url:location.href,title:document.title,messageId,anchor:{version:1,textMode:'answer-content',messageId,rootAttribute,rootSelector,rootPath:rootSelector?elementPath(root):null,rootTag:root.tagName.toLowerCase(),sourceText:data.text,start,end,exact,selectedText:quote},range:r};
  }
  function locate(note) {
    if(!sameConversation(note.scope)) return null;
    let roots;
    const id=note.anchor?.messageId || note.messageId;
    if(id){const attr=MESSAGE_ATTRS.includes(note.anchor?.rootAttribute)?note.anchor.rootAttribute:'data-message-id';roots=Array.from(document.querySelectorAll('['+attr+']')).filter(el=>el.getAttribute(attr)===id);}
    else if(note.anchor?.rootSelector&&[...ANSWER_SELECTORS,'.markdown'].includes(note.anchor.rootSelector))roots=[...document.querySelectorAll(note.anchor.rootSelector)].filter(el=>answerRoot(el)&&indexText(el,['include-buttons','answer-content'].includes(note.anchor.textMode),note.anchor.textMode==='answer-content').text===note.anchor.sourceText);
    else roots=[document.querySelector('main')||document.body];
    if(roots.length!==1) return null;
    // No-ID renderer: require the same structural position as well as a unique
    // exact body. Never search a different message merely because its text matches.
    if(note.anchor?.rootSelector&&roots[0]!==elementAt(note.anchor.rootPath))return null;
    // Preserve the original index rules for 0.2–0.6 records; no migration rewrites.
    const data=indexText(roots[0],['include-buttons','answer-content'].includes(note.anchor?.textMode),note.anchor?.textMode==='answer-content');
    if(note.anchor?.version===1) {
      const a=note.anchor;
      // Fail closed. Even an identical quote elsewhere is not evidence of the same source.
      if(data.text!==a.sourceText || data.text.slice(a.start,a.end)!==a.exact || (a.selectedText??a.exact)!==note.quote) return null;
      return rangeAt(data,a.start,a.end);
    }
    // v0.2 records have no offsets. Require an exact quote and unambiguous context.
    let pos=data.text.indexOf(note.quote);
    if(pos<0) return null;
    if(data.text.indexOf(note.quote,pos+1)>=0) {
      const context=note.context;
      if(!context) return null;
      const c=data.text.indexOf(context);
      if(c<0||data.text.indexOf(context,c+1)>=0) return null;
      pos=data.text.indexOf(note.quote,c);
      if(pos<c||pos+note.quote.length>c+context.length||data.text.indexOf(note.quote,pos+1)<c+context.length && data.text.indexOf(note.quote,pos+1)>=0) return null;
    }
    // Legacy records without a message id/context are retained in the list, not guessed.
    if(!id && !note.context) return null;
    return rangeAt(data,pos,pos+note.quote.length);
  }
  function anchorBlock(range) {
    const end=elOf(range.endContainer);if(!end?.isConnected)return null;
    // Keep annotations outside ProseMirror/scrolling code surfaces: inserting a
    // child inside the site's editor can alter its document or clip the bubble.
    const writing=end.closest(WRITING_BOX);
    if(writing)return {element:writing,inside:false};
    const code=end.closest('pre');
    if(code){
      let element=code,parent=code.parentElement;
      const answer=answerRoot(end);
      while(parent&&parent!==answer&&answer?.contains(parent)){
        const style=getComputedStyle(parent);
        if(/auto|scroll|hidden|clip/.test(style.overflowX+' '+style.overflowY)){element=parent;}
        parent=parent.parentElement;
      }
      return {element,inside:false};
    }
    const table=end.closest('table');if(table)return {element:table,inside:false};
    const block=end.closest('p,li,pre,blockquote,h1,h2,h3,h4,h5,h6,figure,div,article,section');
    if(!block||block===document.body||block===document.documentElement)return null;
    // A sibling in a row/grid/contents layout can become a side column. Keep the
    // bubble in the selected text block in that case, without moving site nodes.
    let parent=block.parentElement;
    while(parent&&getComputedStyle(parent).display==='contents')parent=parent.parentElement;
    const layout=parent&&getComputedStyle(parent),display=getComputedStyle(block).display;
    const sideLayout=layout&&(layout.display.includes('grid')||layout.display.includes('flex')&&!layout.flexDirection.startsWith('column'));
    return {element:block,inside:!!sideLayout||display==='contents'||display.startsWith('inline')||block.matches('li,[data-message-id],[data-message-author-role],[data-dil-message-id]')};
  }
  return {readSelection,locate,answerRoot,anchorBlock,indexText,blockedInput};
}
module.exports={createSourceAdapter};
