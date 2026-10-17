'use strict';
const DEFAULT_COLOR='purple';
const COLORS = {red:['빨강','#ff414b','rgba(255,65,75,.30)'],orange:['주황','#ff9528','rgba(255,149,40,.30)'],yellow:['노랑','#e6b92d','rgba(250,204,21,.32)'],indigo:['남색','#696ef0','rgba(105,110,240,.30)'],purple:['보라','#6554e8','rgba(101,84,232,.30)'],blue:['파랑','#60a5fa','rgba(96,165,250,.32)'],green:['초록','#4ade80','rgba(74,222,128,.28)'],pink:['핑크','#f472b6','rgba(244,114,182,.30)']};
const COLOR_ORDER=['red','orange','yellow','green','blue','indigo','purple','pink'];
const rgbOf=color=>COLORS[color][1].slice(1).match(/../g).map(v=>parseInt(v,16)).join(',');
const colorOf = n => COLORS[n.color] ? n.color : 'yellow';
module.exports={COLORS,COLOR_ORDER,DEFAULT_COLOR,rgbOf,colorOf};
