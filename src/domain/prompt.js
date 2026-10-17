'use strict';
const normalized=t=>t.replace(/\r\n/g,'\n').replace(/\s+/g,' ').trim();
function formatPrompt(entries,allNotes=entries){
  return ['아래 인용 원문과 내 질문을 번호별로 연결해 답해 주세요.','',
    ...entries.filter(n=>n.question.trim()).flatMap((n,i)=>[
      '질문 '+(allNotes.findIndex(x=>x.id===n.id)+1||i+1),'',
      '- 인용 원문: '+n.quote,'- 내 질문: '+n.question,''])].join('\n');
}
module.exports={formatPrompt,normalized};
