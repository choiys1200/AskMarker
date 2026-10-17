'use strict';
const {PREFIX,CHOICE_PREFIX,PREF,LASER_PREF,AUTO_PREF,storageKey,choiceKey,validNote}=require('./notes');
const {FONT_KEY,OPACITY_KEY,SIZE_KEY}=require('./appearance');
const {LANGUAGE_KEY,translate}=require('../i18n/index');
// Pure export projection. It never rewrites saved notes, choices or anchors.
const PREFERENCE_KEYS=[PREF,LASER_PREF,AUTO_PREF,FONT_KEY,OPACITY_KEY,SIZE_KEY,LANGUAGE_KEY];
function serviceOf(address){
  try{const host=new URL(address).hostname.toLowerCase();
    return ({'chatgpt.com':'ChatGPT','chat.openai.com':'ChatGPT','gemini.google.com':'Gemini','grok.com':'Grok','www.grok.com':'Grok','claude.ai':'Claude','www.perplexity.ai':'Perplexity','perplexity.ai':'Perplexity','chat.deepseek.com':'DeepSeek','copilot.microsoft.com':'Copilot'})[host]||host;
  }catch{return 'AI';}
}
function conversationKey(scope){
  try{const url=new URL(scope),id=serviceOf(scope)==='ChatGPT'&&url.pathname.match(/\/c\/([^/]+)/)?.[1];return id?url.origin+'/c/'+id:scope;}catch{return scope;}
}
function cleanTitle(value,service){
  if(typeof value!=='string')return '';
  // Strip only a recognizable product prefix/suffix; preserve original wording.
  let title=value.trim();
  for(const separator of [' - ',' – ',' — ',' | ']){
    if(title.toLowerCase().endsWith((separator+service).toLowerCase()))title=title.slice(0,-separator.length-service.length).trim();
    if(title.toLowerCase().startsWith((service+separator).toLowerCase()))title=title.slice(service.length+separator.length).trim();
  }
  return [service,'Google Gemini','ChatGPT','Gemini','Grok','Claude'].some(name=>title.toLowerCase()===name.toLowerCase())?'':title;
}
function dateInfo(now){
  const pad=n=>String(n).padStart(2,'0'),stamp=now.getFullYear()+'-'+pad(now.getMonth()+1)+'-'+pad(now.getDate())+'_'+pad(now.getHours())+'-'+pad(now.getMinutes())+'-'+pad(now.getSeconds());
  const offset=-now.getTimezoneOffset(),zone=(offset>=0?'+':'-')+pad(Math.floor(Math.abs(offset)/60))+':'+pad(Math.abs(offset)%60);
  return {createdAt:now.toISOString(),createdAtLocal:stamp.replace('_','T').replace(/T(\d+)-(\d+)-(\d+)/,'T$1:$2:$3')+zone,stamp};
}
function safePart(value,maxBytes=120){
  const text=String(value).normalize('NFC').replace(/[<>:"/\\|?*\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g,' ').replace(/\s+/g,' ').trim().replace(/[. ]+$/,'');
  let out='',bytes=0;const encoder=new TextEncoder();for(const char of text){const length=encoder.encode(char).length;if(bytes+length>maxBytes)break;out+=char;bytes+=length;}
  return out.trim().replace(/[. ]+$/,'')||'Untitled';
}
const isoOf=value=>typeof value==='number'&&Number.isFinite(value)&&!Number.isNaN(new Date(value).valueOf())?new Date(value).toISOString():null;
function createBackup(all,{kind='all',current=null,language='ko',now=new Date(),extensionVersion=''}={}){
  const t=(key,params)=>translate(language,key,params),entries=Object.entries(all).filter(([key,note])=>key.startsWith(PREFIX)&&validNote(note)&&key===storageKey(note)),groups=new Map();
  const selected=entries.filter(([,note])=>kind!=='conversation'||current?.includes(note.scope));
  for(const [key,note]of selected){
    const id=conversationKey(current?.scope&&current.includes(note.scope)?current.scope:note.scope);if(!groups.has(id))groups.set(id,[]);groups.get(id).push({key,note});
  }
  const conversations=[...groups].map(([id,items])=>{
    const latest=[...items].sort((a,b)=>(b.note.updated||b.note.created||0)-(a.note.updated||a.note.created||0));
    const isCurrent=!!current&&items.some(({note})=>current.includes(note.scope)),service=serviceOf(items[0].note.scope);
    const liveTitle=isCurrent?cleanTitle(current.title,service):'',stored=latest.find(({note})=>cleanTitle(note.title,service));
    const title=liveTitle||cleanTitle(stored?.note.title,service)||t('제목 미확인');
    let identifier='';try{const url=new URL(id);identifier=url.pathname.match(/\/(?:c|app|chat)\/([^/]+)/)?.[1]||url.hash.replace(/^#qb-message=/,'')||url.pathname;}catch{}
    return {service,title,titleSource:liveTitle?'current-page':stored?'saved-question':'unavailable',conversationId:identifier||null,url:isCurrent&&current.url?current.url:latest[0].note.url||items[0].note.scope,scopes:[...new Set(items.map(({note})=>note.scope))],questionCount:items.length,
      questions:[...items].sort((a,b)=>(a.note.created||0)-(b.note.created||0)||a.note.id.localeCompare(b.note.id)).map(({key,note})=>({storageKey:key,id:note.id,quote:note.quote,question:note.question,color:note.color||'yellow',createdAt:isoOf(note.created),updatedAt:isoOf(note.updated)}))};
  });
  const keys=new Set(selected.flatMap(([key,note])=>[key,choiceKey(note)]));
  const data=Object.fromEntries(Object.entries(all).filter(([key])=>kind==='conversation'?keys.has(key):key.startsWith(PREFIX)||key.startsWith(CHOICE_PREFIX)||PREFERENCE_KEYS.includes(key)));
  const date=dateInfo(now),single=conversations.length===1,services=[...new Set(conversations.map(c=>c.service))].sort();
  const title=single?conversations[0].service+' · '+conversations[0].title:t('전체 기록 · {count}개 대화',{count:conversations.length});
  let prefix;
  if(single){const c=conversations[0];prefix=safePart(c.service,32)+'_'+safePart(c.title+(c.titleSource==='unavailable'&&c.conversationId?' '+c.conversationId:''));}
  else prefix=safePart(services.join('+')||'AskMarker',70)+'_'+safePart(t('전체 기록 · {count}개 대화',{count:conversations.length}),80);
  if(kind==='all')prefix+='_'+safePart(t('전체 백업'),30);
  return {filename:prefix+'_'+date.stamp+'.json',backup:{format:'question-basket-backup',version:4,title,kind,extensionVersion,createdAt:date.createdAt,createdAtLocal:date.createdAtLocal,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,conversationCount:conversations.length,questionCount:selected.length,conversations,data}};
}
module.exports={createBackup,serviceOf,conversationKey,cleanTitle,safePart};
