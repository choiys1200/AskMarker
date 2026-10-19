'use strict';
const {serviceOf,cleanTitle}=require('../domain/backup');
// Only rendered, public DOM. No cookies, internal endpoints or conversation crawl.
const SITES={
 ChatGPT:{match:/\/(?:c)\/([^/]+)/,user:'[data-message-author-role="user"],[data-user-message-bubble]',answer:'[data-message-author-role="assistant"],[data-dil-message-id]:not([data-user-message-bubble])',stop:'[data-testid="stop-button"]',send:'[data-testid="send-button"]'},
 Gemini:{match:/\/app\/([^/]+)/,user:'user-query .query-text,user-query [data-test-id="user-query"]',answer:'model-response .model-response-text,model-response message-content',stop:'[aria-label*="Stop response"],[aria-label*="응답 중지"]',send:'button.send-button,[aria-label="Send message"],[aria-label="메시지 보내기"]'},
 Grok:{match:/\/(?:chat|c)\/([^/]+)/,user:'[data-message-author-role="user"],[data-testid="user-message"]',answer:'[data-message-author-role="assistant"],[data-testid="assistant-message"]',stop:'[aria-label="Stop generating"]',send:'[aria-label="Send"],[aria-label="보내기"]'},
 Claude:{match:/\/chat\/([^/]+)/,user:'[data-testid="user-message"]',answer:'[data-is-streaming] .font-claude-response,[data-testid="assistant-message"]',stop:'[data-is-streaming="true"]',send:'[aria-label="Send message"]'}
};
const normalize=s=>String(s||'').replace(/\r\n/g,'\n').trim();
function createConversationAdapter(doc,loc){
 function identity(){const service=serviceOf(loc.href),spec=SITES[service];let u=new URL(loc.href);const id=spec?.match.exec(u.pathname)?.[1]||null;return {service,id,url:u.origin+u.pathname,scope:(id?service+':'+id:u.origin+u.pathname)+u.search+u.hash,title:cleanTitle(doc.title,service)||null,titleSource:'document.title',identityVerified:!!id};}
 function visible(el){return !el.closest('[data-qb-inline],#question-basket-extension,[hidden],[aria-hidden="true"]')&&el.getClientRects().length>0;}
 function text(el){if(!el.querySelector('[data-qb-inline],button,[aria-hidden="true"]'))return normalize(el.innerText||el.textContent);function walk(n){if(n.nodeType===3)return n.data;if(n.nodeType!==1||n.matches('[data-qb-inline],button,[aria-hidden="true"],[hidden]'))return '';if(n.tagName==='BR')return '\n';const s=[...n.childNodes].map(walk).join('');return /^(P|DIV|LI|PRE|H[1-6]|TR)$/.test(n.tagName)?'\n'+s+'\n':s;}return normalize(walk(el));}
 function read(){const meta=identity(),spec=SITES[meta.service];if(!spec)return {meta,messages:[],streaming:null,coverage:'unsupported-adapter'};
  const roots=[...doc.querySelectorAll(spec.user+','+spec.answer)].filter(visible).filter((el,i,a)=>!a.some((p,j)=>i!==j&&p.contains(el)));
  return {meta,streaming:!![...doc.querySelectorAll(spec.stop)].find(visible),coverage:'rendered-dom-only; may be virtualized or partial',messages:roots.map((el,index)=>({role:el.matches(spec.user)?'user':'assistant',id:el.getAttribute('data-message-id')||el.getAttribute('data-dil-message-id')||el.closest('[data-message-id],[data-turn-id]')?.getAttribute('data-message-id')||el.closest('[data-turn-id]')?.getAttribute('data-turn-id')||null,index,text:text(el)})).filter(m=>m.text).map((m,index)=>({...m,index}))};
 }
 return {identity,read,isSend:el=>{const spec=SITES[identity().service];return !!spec&&!!el?.closest?.(spec.send);}};
}
module.exports={createConversationAdapter,SITES,normalize};
