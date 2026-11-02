const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({viewport:{width:1500,height:950}}); const p = await ctx.newPage();
  await p.goto('file:///home/claude/village-sim/index.html'); await p.waitForTimeout(400);
  await p.evaluate(()=>{__sim.setSpeed(0);__sim.newWorld(2024);__sim.run(1200*60);__sim.saveToStorage(true)});
  await p.reload(); await p.waitForTimeout(700);
  await p.evaluate(()=>{const s=document.getElementById('side');s.scrollTop=s.scrollHeight});
  await p.waitForTimeout(300); await p.screenshot({path:'tests/p5_resume.png'});
  await b.close();
})();
