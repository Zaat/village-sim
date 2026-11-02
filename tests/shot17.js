const { chromium } = require('playwright'); const fs=require('fs');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1500,height:950}});
  await p.goto('file:///home/claude/village-sim/index.html'); await p.waitForTimeout(500);
  for (const arch of ['island','archipelago','continent','peninsula','lakeland','river']) {
    await p.evaluate(a=>{localStorage.clear();localStorage.setItem('villagesim.maptype',a)},arch);
    await p.evaluate(()=>{__sim.setSpeed(0);__sim.newWorld(101);const w=__sim.world;for(let t=0;t<1200*3;t++)w.step();w.seen.fill(1);w.seenVer++;});
    await p.waitForTimeout(800);
    const url=await p.evaluate(()=>{const R=__sim.R,w=__sim.world,c=document.createElement('canvas');c.width=520;c.height=360;const g=c.getContext('2d');g.imageSmoothingEnabled=true;g.drawImage(R.terr,0,0,520,360);const k=520/CFG.W;
      g.fillStyle='#ff0';g.fillRect(w.cx*k-3,w.cy*k-3,6,6);for(const n of w.neigh){g.fillStyle=n.reach==='land'?'#f55':'#fff';g.fillRect(n.x*k-3,n.y*k-3,6,6)}return c.toDataURL()});
    fs.writeFileSync(`tests/overview_${arch}.png`,Buffer.from(url.split(',')[1],'base64'));
  }
  await b.close();
})();
