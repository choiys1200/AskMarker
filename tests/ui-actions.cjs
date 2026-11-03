// Exercise the real disclosure buttons before accessing secondary controls.
// Old fixtures/releases without disclosures pass straight through.
async function reveal(locator){
 const steps=await locator.evaluate(el=>{
  const result=[];for(let n=el;n;n=n.parentElement){if(n.dataset?.disclosure&&n.dataset.open!=='true')result.unshift(n.dataset.disclosure);if(n.id==='panel'&&(n.hidden||n.inert))result.unshift('launcher');}
  return result;
 });
 for(const id of steps)await locator.page().locator('#question-basket-extension').locator('[id="'+id+'"]').click();
 return locator;
}
module.exports={reveal};
