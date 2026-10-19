'use strict';
const {request,ArchiveError,ambiguous}=require('./http');
function rich(content){return [{type:'text',text:{content}}];}
function blocks(markdown){const result=[];let code=false;for(const line of markdown.split('\n')){if(/^`{3,}/.test(line)){code=!code;continue;}if(!line)continue;let type=!code&&/^#{1,3} /.test(line)?'heading_'+Math.min(3,line.indexOf(' ')):'paragraph';const raw=type==='paragraph'?line:line.replace(/^#+ /,'');const chars=Array.from(raw);for(let i=0;i<chars.length;i+=750)result.push({object:'block',type,[type]:{rich_text:rich(chars.slice(i,i+750).join(''))}});}return result;}
const blockText=b=>(b[b.type]?.rich_text||[]).map(x=>x.plain_text??x.text?.content??'').join('');
class NotionProvider{
 constructor({token,fetcher=fetch,guard=()=>{},signal}){this.token=token;this.fetcher=fetcher;this.guard=guard;this.signal=signal;}
 async call(path,method='GET',body){await this.guard();return request('https://api.notion.com/v1'+path,{method,signal:this.signal,headers:{Authorization:'Bearer '+this.token,'Notion-Version':'2022-06-28','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})},this.fetcher);}
 async destinations(){const list=[];let cursor;do{const x=await this.call('/search','POST',{filter:{property:'object',value:'page'},page_size:100,...(cursor?{start_cursor:cursor}:{})});list.push(...x.results.filter(p=>!p.archived&&!p.in_trash).map(p=>({id:p.id,name:Object.values(p.properties||{}).filter(v=>v.type==='title').flatMap(v=>v.title).map(x=>x.plain_text||x.text?.content||'').join('')||'Untitled'})));cursor=x.has_more?x.next_cursor:null;}while(cursor&&list.length<1000);return list;}
 async children(id){let list=[],cursor;do{const x=await this.call('/blocks/'+encodeURIComponent(id)+'/children?page_size=100'+(cursor?'&start_cursor='+encodeURIComponent(cursor):''));list.push(...x.results);cursor=x.has_more?x.next_cursor:null;if(list.length>10000)throw new ArchiveError('REMOTE_TOO_LARGE');}while(cursor);return list;}
 async save(job,persist){const marker='AskMarker '+job.snapshot.id;const title=(job.snapshot.meta.service+' · '+(job.snapshot.meta.title||'Unavailable')).slice(0,160)+' · '+marker;
  if(!job.remoteId){
   if(job.attempted){const children=await this.children(job.destination.id),matches=children.filter(b=>b.type==='child_page'&&b.child_page.title===title);if(matches.length===1){job.remoteId=matches[0].id;await persist();}else throw new ArchiveError('OUTCOME_UNKNOWN');}
   else{job.attempted=true;await persist();try{const page=await this.call('/pages','POST',{parent:{page_id:job.destination.id},properties:{title:{type:'title',title:rich(title)}},children:[{object:'block',type:'paragraph',paragraph:{rich_text:rich(marker+' '+job.digest)}}]});job.remoteId=page.id;await persist();}catch(e){if(!ambiguous(e)){job.attempted=false;await persist();}throw e;}}
  }
  const page=await this.call('/pages/'+encodeURIComponent(job.remoteId));if(page.archived||page.in_trash||page.parent?.page_id?.replaceAll('-','')!==job.destination.id.replaceAll('-',''))throw new ArchiveError('REMOTE_MISMATCH');
  const content=blocks(job.markdown),existing=await this.children(job.remoteId);if(blockText(existing[0]||{})!==marker+' '+job.digest)throw new ArchiveError('REMOTE_MISMATCH');
  const body=existing.slice(1);if(body.length>content.length||body.some((b,i)=>b.type!==content[i].type||blockText(b)!==blockText(content[i])))throw new ArchiveError('REMOTE_MISMATCH');
  // An ambiguous append may have committed. Only exact observed prefixes reconcile it.
  if(job.pendingEnd&&body.length<job.pendingEnd)throw new ArchiveError('OUTCOME_UNKNOWN');
  job.pendingEnd=null;await persist();
  for(let i=body.length;i<content.length;i+=50){job.pendingEnd=Math.min(i+50,content.length);await persist();try{await this.call('/blocks/'+encodeURIComponent(job.remoteId)+'/children','PATCH',{children:content.slice(i,i+50)});job.pendingEnd=null;await persist();}catch(e){if(!ambiguous(e)){job.pendingEnd=null;await persist();}throw e;}}
  return {id:job.remoteId,url:'https://www.notion.so/'+job.remoteId.replaceAll('-','')};
 }
}
module.exports={NotionProvider,blocks,blockText};
