const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({viewport:{width:1500,height:950}}); const p = await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/village-sim/index.html'); await p.waitForTimeout(500);
  await p.evaluate(()=>{localStorage.clear();__sim.setSpeed(0);__sim.newWorld(2024);const w=__sim.world;for(let t=0;t<1200*70;t++){w.step();if(t===1200*20)for(const id of Object.keys(TECHS))w.tech.known[id]=20}__sim.setSpeed(10)});
  await p.waitForTimeout(4000);
  await p.evaluate(()=>{document.getElementById('diagCard').open=true;const s=document.getElementById('side');s.scrollTop=document.getElementById('diagCard').getBoundingClientRect().top+s.scrollTop-70});
  await p.waitForTimeout(1500); await p.screenshot({path:'tests/p7_diag.png'});
  console.log('errors',errs,'| diag text:',(await p.innerText('#diagBody')).replace(/\n+/g,' · ').slice(0,420));
  await b.close();
})();
