const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1500,height:950}});
  await p.goto('file:///home/claude/village-sim/index.html'); await p.waitForTimeout(600);
  await p.evaluate((s)=>{localStorage.clear();__sim.newWorld(s);__sim.setSpeed(1)}, 132475851);
  const cdp=await p.context().newCDPSession(p); await cdp.send('Profiler.enable');
  let profiling=false, slow=0;
  for(let d=16;d<=1000;d+=1){
    const r=await p.evaluate((t)=>{const w=__sim.world;const t0=performance.now(),n=w.tick;while(w.day<t)w.step();return {day:w.day,ms:(performance.now()-t0)/Math.max(1,w.tick-n),pop:w.vills.length}},d);
    if(r.ms>2){console.log('slow',JSON.stringify(r)); if(d>800&&!profiling){}}
    if(r.ms>3&&d>700&&!profiling){profiling=true;await cdp.send('Profiler.start');slow=d}
    if(profiling&&d>=slow+3){const {profile}=await cdp.send('Profiler.stop');
      const self=new Map();const dt=profile.timeDeltas;const idx=new Map(profile.nodes.map(n=>[n.id,n]));
      profile.samples.forEach((id,i)=>{const n=idx.get(id);const k=n.callFrame.functionName+':'+n.callFrame.url.split('/').pop()+':'+n.callFrame.lineNumber;self.set(k,(self.get(k)||0)+dt[i])});
      [...self.entries()].sort((a,b)=>b[1]-a[1]).slice(0,15).forEach(([k,v])=>console.log((v/1000).toFixed(0).padStart(7),'ms',k));break}
    if(d%64==0)console.log('day',d,JSON.stringify(r));
  }
  await b.close();
})();
