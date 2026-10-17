'use strict';
const FONT_KEY='qb:appearance:font:v1',OPACITY_KEY='qb:appearance:laser-opacity:v1',SIZE_KEY='qb:appearance:text-size:v1';
// Local/system fonts only. No font CDN or network request.
const FONTS={
  system:{label:'시스템 기본',family:'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'},
  sans:{label:'고딕 · 맑은 고딕',family:'"Malgun Gothic", "Apple SD Gothic Neo", sans-serif'},
  serif:{label:'명조 · 바탕',family:'Batang, "AppleMyungjo", Georgia, serif'},
  mono:{label:'고정폭 · Consolas',family:'Consolas, "SFMono-Regular", "Malgun Gothic", monospace'}
};
const fontOf=value=>Object.hasOwn(FONTS,value)?value:'system';
const opacityOf=value=>typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.min(100,Math.round(value))):60;
const sizeOf=value=>({
  mode:value?.mode==='custom'?'custom':'system',
  scale:typeof value?.scale==='number'&&Number.isFinite(value.scale)?Math.max(80,Math.min(160,Math.round(value.scale/5)*5)):100
});
module.exports={FONTS,FONT_KEY,OPACITY_KEY,SIZE_KEY,fontOf,opacityOf,sizeOf};
