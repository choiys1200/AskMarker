'use strict';
function createWriteQueue(){
 const queues=new Map();
  function enqueue(key,fn) {
    const promise=(queues.get(key)||Promise.resolve()).catch(()=>{}).then(fn);
    queues.set(key,promise);promise.finally(()=>{if(queues.get(key)===promise)queues.delete(key);}).catch(()=>{});return promise;
  }
 return {enqueue,hasPending:prefix=>[...queues.keys()].some(k=>k.startsWith(prefix))};
}
module.exports={createWriteQueue};
