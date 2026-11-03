const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1500,height:950}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.goto('file:///home/claude/village-sim/index.html'); await p.waitForTimeout(600);
  await p.evaluate(()=>{localStorage.clear()});
  await p.click('#gear'); await p.waitForTimeout(300); await p.click('#restart'); await p.waitForTimeout(300);
  await p.screenshot({path:'tests/ui_newworld.png'});
  await p.click('#nw_types button[data-t=continent]'); await p.click('#nw_sizes button[data-s=large]'); await p.fill('#nw_seed','4242'); await p.screenshot({path:'tests/ui_newworld2.png'});
  await p.click('#nw_go'); await p.waitForTimeout(800);
  console.log(await p.evaluate(()=>({W:CFG.W,H:CFG.H,arch:__sim.world.arch,seed:__sim.world.seed,vis:document.getElementById('nw').style.display,now:document.getElementById('mapnow').textContent})));
  await p.evaluate(()=>{__sim.setSpeed(10)}); await p.waitForTimeout(4000);
  // compact + island falls back to standard
  await p.click('#restart'); await p.click('#nw_types button[data-t=island]'); await p.click('#nw_sizes button[data-s=compact]'); console.log('note:',await p.innerText('#nw_note')); await p.fill('#nw_seed','9'); await p.click('#nw_go'); await p.waitForTimeout(600);
  console.log(await p.evaluate(()=>({W:CFG.W,arch:__sim.world.arch})));
  await p.click('#restart'); await p.click('#nw_types button[data-t=lakeland]'); await p.click('#nw_sizes button[data-s=compact]'); await p.fill('#nw_seed','31'); await p.click('#nw_go'); await p.waitForTimeout(600);
  console.log(await p.evaluate(()=>({W:CFG.W,H:CFG.H,arch:__sim.world.arch,errs:__sim.world.dbg.total})));
  await p.screenshot({path:'tests/ui_newworld3.png'}); console.log('errors',errs); await b.close();
})();
