'use strict';
const PREFIX = 'qb:note:', PREF = 'qb:preferences:v3', LASER_PREF = 'qb:laser-color:v1', AUTO_PREF='qb:auto-insert:v1', CHOICE_PREFIX='qb:prompt-choice:';
const storageKey = n => PREFIX + encodeURIComponent(n.scope) + ':' + n.id;
const choiceKey = n => CHOICE_PREFIX + encodeURIComponent(n.scope) + ':' + n.id;
function validNote(n) {return n && typeof n.id==='string'&&typeof n.scope==='string'&&typeof n.quote==='string'&&n.quote.trim()&&typeof n.question==='string'&&n.question.trim();}
module.exports={PREFIX,PREF,LASER_PREF,AUTO_PREF,CHOICE_PREFIX,storageKey,choiceKey,validNote};
