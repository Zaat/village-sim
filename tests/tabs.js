const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1500,height:950}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/village-sim/index.html'); await p.waitForTimeout(600);
  await p.evaluate(()=>{localStorage.clear();__sim.newWorld(777);__sim.setSpeed(0);const w=__sim.world;for(let t=0;t<1200*110;t++){w.step();if(t===1200*24)for(const id of Object.keys(TECHS))w.tech.known[id]=24}});
  for (const t of ['village','society','progress','world','events']) {
    await p.click(`#tabbar [data-tab="${t}"]`); await p.waitForTimeout(400);
    const info=await p.evaluate(t=>{const s=document.getElementById('tab_'+t);const cards=[...s.querySelectorAll('.card')].map(c=>Math.round(c.getBoundingClientRect().height));return {visible:getComputedStyle(s).display,cards,text:s.innerText.length}},t);
    console.log(t,JSON.stringify(info)); await p.screenshot({path:`tests/ui_tab_${t}.png`,clip:{x:1160,y:0,width:340,height:950}});
  }
  // selecting something on the map switches back to Village
  await p.click('#tabbar [data-tab="events"]'); await p.evaluate(()=>{const w=__sim.world,R=__sim.R,v=w.vills[0];R.cam.x=v.x*16;R.cam.y=v.y*16;R.cam.z=3});await p.waitForTimeout(400);
  const box=await p.evaluate(()=>{const w=__sim.world,R=__sim.R,v=w.vills[0],c=R.cam;return {x:(v.x*16-c.x)*c.z+R.vw/2,y:(v.y*16-c.y)*c.z+R.vh/2}});
  await p.mouse.click(box.x,box.y-6); await p.waitForTimeout(400);
  console.log('after map click tab:',await p.evaluate(()=>document.querySelector('#tabbar button.on').dataset.tab),'selected',await p.evaluate(()=>!!document.querySelector('#sel .big')));
  console.log('errors:',errs,'| world errors',await p.evaluate(()=>__sim.world.dbg.total)); await b.close();
})();
