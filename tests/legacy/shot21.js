const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1500,height:950}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.goto('file:///home/claude/village-sim/index.html'); await p.waitForTimeout(600);
  await p.evaluate(()=>{localStorage.clear();__sim.newWorld(555);__sim.setSpeed(1)});
  await p.evaluate(()=>{const w=__sim.world;while(w.day<70)w.step();const a=w.vills.filter(v=>v.isAdult()&&v.partner!=null);startFeud(w,a[0],a[2],'a disputed inheritance',0.75);__sim.select(a[0]);w.regime.ax.auth=0.9});
  await p.waitForTimeout(500); await p.screenshot({path:'tests/art_lives_inspector.png'});
  await p.click('#tabbar button[data-tab=society]'); await p.waitForTimeout(700); await p.screenshot({path:'tests/art_lives_society.png'});
  console.log('errors',errs,'world errors',await p.evaluate(()=>__sim.world.dbg.total)); await b.close();
})();
