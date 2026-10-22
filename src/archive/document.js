'use strict';
function text(value){return value==null?'확인 불가 / Unavailable':String(value);}
// Fenced blocks prevent source text from impersonating document headings or links.
function literal(value){const s=text(value),runs=s.match(/`+/g)||[],n=Math.max(3,...runs.map(x=>x.length+1)),fence='`'.repeat(n);return fence+'text\n'+s+'\n'+fence;}
function toMarkdown(snapshot){const m=snapshot.meta;let parts=['# '+text(m.service)+' · '+text(m.title),'대화 / Conversation: '+text(m.url),'식별자 / ID: '+text(m.id),'기록 시각 / Captured: '+snapshot.capturedAt,'내보내기 승인 / Approved: '+text(snapshot.approvedAt),'시간대 / Time zone: '+snapshot.timezone,'Snapshot: '+snapshot.id,'수집 범위 / Coverage: '+snapshot.coverage,'제목 보완 / Title correction: '+text(snapshot.titleCorrection||'none')];
 if(snapshot.captureIssue)parts.push('수집 누락 / Capture limitation: '+snapshot.captureIssue);
 if(snapshot.userClarification)parts.push('사용자 보완 설명 / User clarification (not observed evidence)',literal(snapshot.userClarification));
 snapshot.marks.forEach((n,i)=>parts.push('## Q'+(n.number||i+1),'선택한 내용 / Selected text',literal(n.quote),'내 코멘트 / My comment',literal(n.comment),'원본 기록 시각 / Original record time: '+text(n.createdAt)));
 for(const b of snapshot.requests){parts.push('## 요청 묶음 / Request batch '+b.id,'Q IDs: '+b.markIds.join(', '),'프롬프트 생성 / Generated: '+text(b.generated?.at),literal(b.generated?.text));if(b.inserted)parts.push('입력창 삽입 / Inserted: '+b.inserted.at,literal(b.inserted.text));parts.push('실제 전송 확인 / Send confirmation: '+(b.sent?'화면의 사용자 메시지로 확인 / verified in rendered user message':'확인 불가 / unverified'));
  if(b.sent)parts.push('관찰 시각 / Observed: '+b.sent.observedAt+' · 서버 전송 시각 / Server timestamp: '+text(b.sent.serverTime),'삽입 후 수정 / Edited after insertion: '+String(b.sent.editedAfterInsertion),literal(b.sent.text));
  for(const a of b.answers)parts.push('### AI 답변 / AI response (request batch)','상태 / Status: '+a.status+' · partial: '+a.partial,'관찰 / Observed: '+a.observedAt,'변형 / Variant: '+a.variant,literal(a.text));
 }
 return parts.join('\n\n')+'\n';
}
function project(seed,{markIds=[],requestIds=[],title=null}={}){const marks=seed.marks.filter(n=>markIds.includes(n.id)),requests=seed.requests.filter(n=>requestIds.includes(n.id));return {schema:1,id:crypto.randomUUID(),epoch:seed.epoch||0,meta:{...seed.meta,title:title?.trim()||seed.meta.title},captureIssue:seed.captureIssue||null,titleCorrection:title&&title!==seed.meta.title?title:null,capturedAt:seed.capturedAt,approvedAt:null,timezone:seed.timezone,coverage:'User-selected Qs and observed request batches only; partial rendered DOM, not the whole conversation. Unobserved history, attachments and hidden branches excluded.',marks,requests};}
module.exports={toMarkdown,project,literal};
