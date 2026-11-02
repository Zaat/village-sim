const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1500,height:1000}});
  p.on('pageerror',e=>console.log('PAGEERR',e.message,'\n',(e.stack||'').split('\n').slice(0,6).join('\n')));
  await p.goto('file:///home/claude/village-sim/index.html'); await p.waitForTimeout(400);
  for(const seed of [777,12345,2024,5]){
    await p.evaluate(s=>{__sim.setSpeed(0);__sim.newWorld(s);},seed);
    for(let i=0;i<110;i++){ await p.evaluate(()=>__sim.run(1200)); }
    console.log('seed',seed,'ok day',await p.evaluate(()=>__sim.world.day),'pop',await p.evaluate(()=>__sim.world.vills.length));
  }
  await b.close();
})();
