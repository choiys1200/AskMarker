'use strict';
const {EN}=require('./messages');
const LANGUAGE_KEY='qb:appearance:language:v1';
const languageOf=value=>value==='en'?'en':'ko';
function translate(language,key,params={}){
  const message=languageOf(language)==='en'?(EN[key]||key):key;
  return message.replace(/\{(\w+)\}/g,(all,name)=>Object.hasOwn(params,name)?String(params[name]):all);
}
const hasMessage=key=>Object.hasOwn(EN,key);
module.exports={LANGUAGE_KEY,languageOf,translate,hasMessage};
