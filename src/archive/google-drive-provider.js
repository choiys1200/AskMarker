'use strict';
const {request,ArchiveError,ambiguous}=require('./http');
const API='https://www.googleapis.com/drive/v3';
class GoogleDriveProvider{
 constructor({token,fetcher=fetch,guard=()=>{},signal}){this.token=token;this.fetcher=fetcher;this.guard=guard;this.signal=signal;}
 async call(path,options={}){await this.guard();return request(path.startsWith('https:')?path:API+path,{...options,signal:this.signal,headers:{Authorization:'Bearer '+this.token,...options.headers}},this.fetcher);}
 async destinations(){const list=[];let token='';do{const x=await this.call('/files?'+new URLSearchParams({q:"mimeType = 'application/vnd.google-apps.folder' and trashed = false",fields:'files(id,name),nextPageToken',pageSize:'100',...(token?{pageToken:token}:{})}));list.push(...x.files);token=x.nextPageToken;}while(token&&list.length<1000);return list.map(f=>({id:f.id,name:f.name}));}
 async get(id){try{return await this.call('/files/'+encodeURIComponent(id)+'?fields=id,name,mimeType,parents,appProperties,webViewLink,trashed');}catch(e){if(e.code==='NOT_FOUND')return null;throw e;}}
 async save(job,persist){const snapshot=job.snapshot;
  if(!job.remoteId){const x=await this.call('/files/generateIds?count=1&space=drive&type=files');job.remoteId=x.ids[0];await persist();}
  const previous=await this.get(job.remoteId);if(previous){if(previous.trashed||previous.appProperties?.snapshot!==snapshot.id||previous.appProperties?.digest!==job.digest)throw new ArchiveError('REMOTE_MISMATCH');return {id:previous.id,url:previous.webViewLink||'https://drive.google.com/file/d/'+previous.id+'/view'};}
  let parent=job.destination.id;
  if(parent==='new'){
   if(!job.folderId){const x=await this.call('/files/generateIds?count=1&space=drive&type=files');job.folderId=x.ids[0];await persist();}
   const folder=await this.get(job.folderId);
   if(!folder)await this.call('/files',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:job.folderId,name:'AskMarker',mimeType:'application/vnd.google-apps.folder'})});
   parent=job.folderId;
  }else{const folder=await this.get(parent);if(!folder||folder.trashed||folder.mimeType!=='application/vnd.google-apps.folder')throw new ArchiveError('DESTINATION_UNAVAILABLE');}
  const boundary='askmarker_'+snapshot.id.replaceAll('-','');
  const metadata={id:job.remoteId,name:(snapshot.meta.service+'_'+(snapshot.meta.title||'Unavailable')).slice(0,140)+'_'+snapshot.capturedAt.slice(0,10)+'.md',parents:[parent],mimeType:'text/markdown',appProperties:{snapshot:snapshot.id,digest:job.digest}};
  const body='--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify(metadata)+'\r\n--'+boundary+'\r\nContent-Type: text/markdown; charset=UTF-8\r\n\r\n'+job.markdown+'\r\n--'+boundary+'--';
  job.attempted=true;await persist();
  try{const x=await this.call('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+boundary},body});return {id:x.id,url:x.webViewLink||'https://drive.google.com/file/d/'+x.id+'/view'};}
  catch(e){if(ambiguous(e)){const x=await this.get(job.remoteId);if(x?.appProperties?.snapshot===snapshot.id&&x.appProperties.digest===job.digest)return {id:x.id,url:x.webViewLink||'https://drive.google.com/file/d/'+x.id+'/view'};}throw e;}
 }
}
module.exports={GoogleDriveProvider};
