const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1500,height:950}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message+' @ '+(e.stack||'').split('\n')[1]));
  await p.goto('file:///home/claude/village-sim/index.html'); await p.waitForTimeout(500);
  for (const arch of ['island','archipelago','continent','peninsula','lakeland','river']) {
    await p.evaluate(a=>{localStorage.clear();localStorage.setItem('villagesim.maptype',a)},arch);
    const r=await p.evaluate(()=>{__sim.setSpeed(0);__sim.newWorld(101);const w=__sim.world;for(let t=0;t<1200*30;t++)w.step();w.seen.fill(1);w.seenVer++;const R=__sim.R;R.cam.x=(w.cx+1)*16;R.cam.y=(w.cy+1)*16;R.cam.z=2.2;return {arch:w.arch,start:[w.cx,w.cy],neigh:w.neigh.map(n=>n.name+':'+n.reach+':'+n.dist).join(' '),pop:w.vills.length}});
    console.log(JSON.stringify(r)); await p.waitForTimeout(700);
    await p.screenshot({path:`tests/map_${arch}.png`});
    await p.evaluate(()=>{const m=document.getElementById('mini');});
  }
  console.log('errors:',errs); await b.close();
})();
