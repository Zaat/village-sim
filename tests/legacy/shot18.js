const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1500,height:950}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message+' @ '+(e.stack||'').split('\n')[1]));
  await p.goto('file:///home/claude/village-sim/index.html'); await p.waitForTimeout(500);
  await p.evaluate(()=>{localStorage.clear()});
  await p.reload(); await p.waitForTimeout(600);
  await p.keyboard.press('g'); await p.waitForTimeout(400); await p.selectOption('#maptype','river'); await p.evaluate(()=>{__sim.setSpeed(0);document.getElementById('seed').value='101'}); await p.click('#restart'); await p.waitForTimeout(500); await p.keyboard.press('Escape');
  console.log('arch after New world:',await p.evaluate(()=>__sim.world.arch));
  await p.evaluate(()=>{const w=__sim.world;for(let t=0;t<1200*40;t++)w.step();const R=__sim.R;R.cam.x=(w.cx+1)*16;R.cam.y=(w.cy+1)*16;R.cam.z=2});
  await p.click('#tabbar [data-tab="world"]'); await p.keyboard.press('g'); await p.waitForTimeout(600);
  await p.screenshot({path:'tests/ui_maptype.png'});
  console.log('errors:',errs,'| world errors',await p.evaluate(()=>__sim.world.dbg.total)); await b.close();
})();
