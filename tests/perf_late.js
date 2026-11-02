const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1500,height:950}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/village-sim/index.html'); await p.waitForTimeout(600);
  await p.evaluate((s)=>{localStorage.clear();__sim.newWorld(s);__sim.setSpeed(1)}, +process.argv[2]||132475851);
  const target=+process.argv[3]||920;
  for(;;){const d=await p.evaluate((t)=>{const w=__sim.world;for(let i=0;i<24000&&w.day<t;i++)w.step();return w.day},target); if(d>=target)break}
  const cdp=await p.context().newCDPSession(p); await cdp.send('Profiler.enable'); await cdp.send('Profiler.start');
  const fr=await p.evaluate(()=>new Promise(r=>{const t=[];let l=performance.now();const w=__sim.world,tk=w.tick;const f=()=>{const n=performance.now();t.push(n-l);l=n;if(t.length<120)requestAnimationFrame(f);else r({avg:t.reduce((a,b)=>a+b)/t.length,max:Math.max(...t),ticks:w.tick-tk,day:w.day})};requestAnimationFrame(f)}));
  const {profile}=await cdp.send('Profiler.stop');
  console.log('frames',JSON.stringify(fr));
  const self=new Map();const dt=profile.timeDeltas;const idx=new Map(profile.nodes.map(n=>[n.id,n]));
  profile.samples.forEach((id,i)=>{const n=idx.get(id);const k=n.callFrame.functionName+':'+n.callFrame.url.split('/').pop()+':'+n.callFrame.lineNumber;self.set(k,(self.get(k)||0)+dt[i])});
  [...self.entries()].sort((a,b)=>b[1]-a[1]).slice(0,15).forEach(([k,v])=>console.log((v/1000).toFixed(0).padStart(6),'ms',k));
  console.log('errors',errs); await b.close();
})();
