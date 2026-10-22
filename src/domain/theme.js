'use strict';
const {COLORS,DEFAULT_COLOR}=require('./colors');
const rgb=hex=>hex.slice(1).match(/../g).map(v=>parseInt(v,16));
const mix=(a,b,f)=>a.map((n,i)=>Math.round(n*f+b[i]*(1-f)));
const css=c=>'rgb('+c.join(', ')+')';
function luminance(c){return c.map(n=>{const v=n/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((v,n,i)=>v+n*[.2126,.7152,.0722][i],0);}
function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
function ink(c){return contrast(c,[0,0,0])>=contrast(c,[255,255,255])?'#000000':'#ffffff';}
function themePalette(value){
 const color=COLORS[value]?value:DEFAULT_COLOR,solid=COLORS[color][1],c=rgb(solid),light=[255,255,255],dark=[25,27,34];
 // Quiet surfaces preserve the note's hue without filling the editor with its accent.
 const commentLight=mix(c,light,.07),commentDark=mix(c,dark,.14);
 return {color,solid,rgb:c.join(','),ink:ink(c),commentLightInk:'#232835',commentDarkInk:'#eceef4',
  commentLightBackground:css(commentLight),commentDarkBackground:css(commentDark),
  commentLightMuted:css(mix([35,40,53],commentLight,.76)),commentDarkMuted:css(mix([236,238,244],commentDark,.76)),
  commentLightLine:css(mix(c,commentLight,.32)),commentDarkLine:css(mix(c,commentDark,.38)),
  commentLightField:css(mix(c,light,.025)),commentDarkField:css(mix(c,[17,19,26],.10)),tokens:{
  '--askmark-brand':solid,'--askmark-brand-ink':ink(c),'--askmark-brand-hover':css(mix(c,[0,0,0],.88)),
  '--askmark-page-light':css(mix(c,light,.06)),'--askmark-page-dark':css(mix(c,dark,.12)),
  '--askmark-paper-light':css(mix(c,light,.025)),'--askmark-paper-dark':css(mix(c,[32,33,39],.06)),
  '--askmark-line-light':css(mix(c,[225,227,233],.28)),'--askmark-line-dark':css(mix(c,[55,58,69],.28)),
  '--askmark-hover-light':css(mix(c,light,.12)),'--askmark-hover-dark':css(mix(c,dark,.22)),
  '--askmark-link-light':css(mix(c,[0,0,0],.55)),'--askmark-link-dark':css(mix(c,light,.55))
 }};
}
module.exports={themePalette,contrast,rgb,mix};
