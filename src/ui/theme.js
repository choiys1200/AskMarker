'use strict';
const {themePalette}=require('../domain/theme');
// Namespaced inherited tokens affect extension-owned CSS only. No record writes.
function applyTheme(node,color){const palette=themePalette(color);for(const[key,value]of Object.entries(palette.tokens))node.style.setProperty(key,value);return palette;}
function applyCommentColor(card,color){
 const p=themePalette(color);card.style.setProperty('--accent',p.solid);card.style.setProperty('--comment-accent-ink',p.ink);
 for(const scheme of ['Light','Dark'])for(const token of ['Ink','Background','Muted','Line','Field'])card.style.setProperty('--comment-'+scheme.toLowerCase()+'-'+token.toLowerCase(),p['comment'+scheme+token]);
}
module.exports={applyTheme,applyCommentColor};
