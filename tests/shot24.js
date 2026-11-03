const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1500,height:1100}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.goto('file:///home/claude/village-sim/index.html'); await p.waitForTimeout(600);
  await p.evaluate(()=>{localStorage.clear();__sim.newWorld(555);__sim.setSpeed(0)});
  await p.evaluate(()=>{__sim.run(1200*300)});
  await p.click('#tabbar button[data-tab=stats]'); await p.waitForTimeout(700);
  const box=await p.locator('#statChart').boundingBox(); await p.mouse.move(box.x+box.width*0.6,box.y+80); await p.waitForTimeout(300);
  await p.screenshot({path:'tests/art_stats.png'});
  await p.click('#statViews button[data-view=regime]'); await p.click('#statWin button[data-win="5"]'); await p.waitForTimeout(300); await p.screenshot({path:'tests/art_stats2.png',clip:{x:1160,y:0,width:340,height:1100}});
  console.log('errors',errs,'world errors',await p.evaluate(()=>__sim.world.dbg.total)); await b.close();
})();
