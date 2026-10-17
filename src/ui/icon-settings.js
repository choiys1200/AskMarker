'use strict';
// Open the independent extension settings page without touching reading state.
function bindIconSettings({button,runtime,tell}) {
  button.addEventListener('click',async()=>{
    try {
      const response=await runtime.sendMessage({type:'askmarker:open-icon-options'});
      if(!response?.ok)throw Error('Options page unavailable');
    }catch{tell('아이콘 설정을 열지 못했습니다. 확장을 새로고침하거나 Chrome 확장 메뉴의 옵션을 열어 주세요.',true);}
  });
}
module.exports={bindIconSettings};
