const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1500,height:950}});
  await p.goto('file:///home/claude/village-sim/index.html'); await p.waitForTimeout(600);
  await p.evaluate((s)=>{localStorage.clear();__sim.newWorld(s);__sim.setSpeed(1)}, 132475851);
  for(let k=1;k<=58;k++){const r=await p.evaluate((t)=>{const w=__sim.world;const t0=performance.now(),n=w.tick;while(w.day<t)w.step();return {day:w.day,ms:(performance.now()-t0)/Math.max(1,w.tick-n),pop:w.vills.length}},k*16);if(k%4==0)console.log(JSON.stringify(r))}
  await p.evaluate(()=>{const c=document.querySelector('canvas');});
  const cdp=await p.context().newCDPSession(p); await cdp.send('Profiler.enable'); await cdp.send('Profiler.start');
  const fr=await p.evaluate(()=>new Promise(r=>{const t=[];let l=performance.now();const w=__sim.world,tk=w.tick;const f=()=>{const n=performance.now();t.push(n-l);l=n;if(t.length<150)requestAnimationFrame(f);else r({avg:t.reduce((a,b)=>a+b)/t.length,max:Math.max(...t),ticks:w.tick-tk,day:w.day})};requestAnimationFrame(f)}));
  const {profile}=await cdp.send('Profiler.stop');
  console.log('frames',JSON.stringify(fr));
  const self=new Map();const dt=profile.timeDeltas;const idx=new Map(profile.nodes.map(n=>[n.id,n]));
  profile.samples.forEach((id,i)=>{const n=idx.get(id);const k=n.callFrame.functionName+':'+n.callFrame.url.split('/').pop()+':'+n.callFrame.lineNumber;self.set(k,(self.get(k)||0)+dt[i])});
  [...self.entries()].sort((a,b)=>b[1]-a[1]).slice(0,18).forEach(([k,v])=>console.log((v/1000).toFixed(0).padStart(6),'ms',k));
  await b.close();
})();
