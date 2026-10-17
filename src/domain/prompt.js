'use strict';
const {translate}=require('../i18n/index');
const normalized=t=>t.replace(/\r\n/g,'\n').replace(/\s+/g,' ').trim();
function promptPair(note,language='ko'){
  return '- '+translate(language,'인용 원문')+': '+note.quote+'\n- '+translate(language,'내 질문')+': '+note.question;
}
function containsPair(text,note){
  return ['ko','en'].some(language=>normalized(text).includes(normalized(promptPair(note,language))));
}
function formatPrompt(entries,allNotes=entries,language='ko'){
  return [translate(language,'아래 인용 원문과 내 질문을 번호별로 연결해 답해 주세요.'),'',
    ...entries.filter(n=>n.question.trim()).flatMap((n,i)=>[
      translate(language,'질문 {number}',{number:allNotes.findIndex(x=>x.id===n.id)+1||i+1}),'',promptPair(n,language),''])].join('\n');
}
module.exports={formatPrompt,normalized,containsPair};
