const { chromium } = require('playwright');
(async () => { const b = await chromium.launch();
  for (const [w,h] of [[1500,900],[1000,760],[800,700],[650,700],[520,700],[420,700]]) {
    const p = await b.newPage({viewport:{width:w,height:h}});
    await p.goto('file:///home/claude/village-sim/index.html'); await p.waitForTimeout(600);
    await p.evaluate(()=>{localStorage.clear();__sim.newWorld(5);__sim.setSpeed(10)}); await p.waitForTimeout(500);
    const r=await p.evaluate(()=>{const q=id=>{const r=document.getElementById(id).getBoundingClientRect();return [Math.round(r.left),Math.round(r.top),Math.round(r.right),Math.round(r.bottom)]};return {hud:q('hud'),ctl:q('ctl'),stage:document.getElementById('side')?Math.round(document.getElementById('side').getBoundingClientRect().left):0}});
    const ov=!(r.hud[2]<=r.ctl[0]||r.ctl[2]<=r.hud[0]||r.hud[3]<=r.ctl[1]||r.ctl[3]<=r.hud[1]);
    console.log(w,JSON.stringify(r),'overlap',ov,'height used',Math.max(r.hud[3],r.ctl[3]));
    await p.screenshot({path:`tests/ui_bars_${w}.png`,clip:{x:0,y:0,width:Math.min(w,700),height:130}}); await p.close(); }
  await b.close() })();
