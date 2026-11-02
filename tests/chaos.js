const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({viewport:{width:1500,height:950}}); const p = await ctx.newPage();
  const pageErrs=[]; p.on('pageerror',e=>pageErrs.push(e.message));
  await p.goto('file:///home/claude/village-sim/index.html'); await p.waitForTimeout(500);
  const st=()=>p.evaluate(()=>{const w=__sim.world;return {tick:w.tick,day:w.day,pop:w.vills.length,errs:w.dbg.total,session:__sim.DBG.session.size,restarts:__sim.DBG.restarts}});
  await p.evaluate(()=>{__sim.setSpeed(0);__sim.newWorld(777);__sim.run(1200*30);__sim.setSpeed(10)}); await p.waitForTimeout(1200);
  console.log('1 baseline running:',JSON.stringify(await st()));
  // sabotage 1: one villager throws every time
  await p.evaluate(()=>{const w=__sim.world;const v=w.vills[2];window.__badName=v.name;v.update=function(){throw new Error('boom from '+this.name)}});
  await p.waitForTimeout(2500); const s2=await st();
  console.log('2 villager sabotage: sim still advancing =',s2.tick>0,'| errors logged =',s2.errs,'| villager removed =',!(await p.evaluate(()=>__sim.world.vills.some(v=>v.name===window.__badName))),'| pop',s2.pop);
  // sabotage 2: renderer throws
  await p.evaluate(()=>{window.__oldRender=render;window.render=()=>{throw new Error('render boom')}}); const t1=(await st()).tick; await p.waitForTimeout(1500); const t2=(await st()).tick;
  console.log('3 render sabotage: ticks kept advancing =',t2>t1,'| session errors =',(await st()).session); await p.evaluate(()=>{window.render=window.__oldRender});
  // sabotage 3: simulation stops advancing
  await p.evaluate(()=>{__sim.saveToStorage(true);window.__realStep=__sim.world.step;__sim.world.step=function(){}}); 
  const tA=(await st()).tick; await p.waitForTimeout(10500); console.log('4a stalled world, after ~10s: restarts =',(await st()).restarts,'(stage 1: repair + reset jobs)');
  await p.waitForTimeout(9500); const s4=await st(); console.log('4b after ~20s: restarts =',s4.restarts,'| reloaded from autosave and running again =',await p.evaluate(()=>typeof __sim.world.step==='function'&&__sim.world.step!==undefined&&__sim.world.step.toString().length>30));
  await p.waitForTimeout(1500); const s5=await st(); console.log('   tick now',s5.tick,'(advancing:',s5.tick>tA,')| status:',(await p.innerText('#saveInfo')).slice(0,110));
  // report
  const rep=await p.evaluate(()=>__sim.dbgReport()); console.log('5 report: sections =',rep.sections.map(s=>s.name).join(','),'| errors =',rep.errors.map(e=>e.where+':'+e.message.slice(0,24)).join(' ; '),'| watchdog =',rep.watchdogEvents.length);
  console.log('   diag badge:',await p.innerText('#diagBadge'),'| hud warn:',await p.innerText('#hudWarn'));
  // auto-resume after reload
  await p.evaluate(()=>{__sim.saveToStorage(true)}); const before=await st(); await p.reload(); await p.waitForTimeout(900);
  const after=await st(); console.log('6 auto-resume after reload: banner shown =',await p.isVisible('#resume'),'| same village =',await p.evaluate(()=>__sim.world.seed===777),'| day',before.day,'->',after.day,'| running =',await p.evaluate(()=>!document.querySelector('[data-sp="0"]').classList.contains('on')),'| previous-session errors listed =',(await p.innerText('#diagBody')).includes('Previous session'));
  await p.screenshot({path:'tests/p6_diag.png'});
  console.log('uncaught page errors:',pageErrs); await b.close();
})();
