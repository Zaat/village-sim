const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1500,height:950}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); 
  await p.goto('file:///home/claude/village-sim/index.html'); await p.waitForTimeout(600);
  await p.evaluate(()=>{localStorage.clear();__sim.newWorld(777);__sim.setSpeed(10)}); await p.waitForTimeout(500);
  await p.click('#gear'); await p.selectOption('#ttSel','32'); 
  const before=await p.evaluate(()=>({day:__sim.world.day,pop:__sim.world.vills.length}));
  await p.click('#ttGo'); await p.waitForTimeout(1500);
  console.log('mid:',await p.innerText('#ttInfo'),'| go disabled',await p.$eval('#ttGo',e=>e.disabled),'| stop enabled',!await p.$eval('#ttCancel',e=>e.disabled));
  await p.waitForFunction(()=>document.getElementById('ttInfo').textContent==='Done.',null,{timeout:240000});
  const after=await p.evaluate(()=>({day:__sim.world.day,pop:__sim.world.vills.length,speed:document.querySelector('[data-sp].on')&&document.querySelector('[data-sp].on').dataset.sp}));
  console.log('before',JSON.stringify(before),'after',JSON.stringify(after));
  console.log('result:',(await p.innerText('#ttResult')).replace(/\n/g,' | '));
  
  // load saved returns to the earlier day
  await p.click('#ttUndo'); await p.waitForTimeout(500); console.log('after Undo day:',await p.evaluate(()=>__sim.world.day));
  await p.screenshot({path:'tests/ui_timetravel.png'});
  // stop works
  await p.click('#ttGo'); await p.waitForTimeout(800); await p.click('#ttCancel'); await p.waitForTimeout(500); console.log('after Stop:',await p.innerText('#ttInfo'));
  console.log('errors:',errs,'| world errors',await p.evaluate(()=>__sim.world.dbg.total)); await b.close();
})();
