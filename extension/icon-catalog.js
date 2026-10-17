// Local, fixed assets only. No note data or website DOM dependencies.
export const ICON_KEY = 'qb:appearance:icon:v1';
export const DEFAULT_ICON = 'markchat';
export const ICONS = Object.freeze([
  {id:'markchat', title:'MarkChat', description:'말풍선 + 형광펜. 표시한 문장에서 질문 시작', recommended:true},
  {id:'asktag', title:'AskTag', description:'북마크 안에 담은 질문'},
  {id:'askstroke', title:'AskStroke', description:'형광펜으로 그린 물음표'},
  {id:'quoteask', title:'QuoteAsk', description:'인용 문장과 질문의 연결'},
  {id:'am-mark', title:'AM Mark', description:'Ask와 Mark를 하나의 심벌로'}
]);
export const iconOf = id => ICONS.find(icon => icon.id === id) || ICONS[0];
export const iconPaths = id => Object.fromEntries([16,24,32,48,128].map(size => [size, `assets/icons/${iconOf(id).id}-${size}.png`]));
