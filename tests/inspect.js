const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1500,height:950}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message+' @ '+(e.stack||'').split('\n')[1]));
  await p.goto('file:///home/claude/village-sim/index.html'); await p.waitForTimeout(500);
  await p.evaluate(()=>localStorage.clear());
  const r = await p.evaluate(()=>{__sim.setSpeed(0);__sim.newWorld(777);const w=__sim.world;
    for(let t=0;t<1200*150;t++){w.step(); if(t===1200*24)for(const id of Object.keys(TECHS))w.tech.known[id]=24}
    const vis=[...w.buildings.values()].filter(b=>b.vtot).map(b=>b.type+':'+b.vtot+' '+JSON.stringify(b.vh));
    const old=[...w.buildings.values()].map(b=>w.day-(b.built??w.day)).sort((a,b)=>b-a)[0];
    return {day:w.day,pop:w.vills.length,vis,oldest:old,favs:w.vills.filter(v=>v.fav).length}});
  console.log(JSON.stringify(r));
  const shot=async(name,fn,arg)=>{await p.evaluate(fn,arg);await p.evaluate(()=>{document.getElementById('side').scrollTop=200});await p.waitForTimeout(300);await p.screenshot({path:`tests/ui_insp_${name}.png`,clip:{x:1160,y:0,width:340,height:950}})};
  for(const t of ['tavern','plaza','house','dock','logcamp','farm','minecamp','hall']) await shot(t,t=>{const w=__sim.world;const b=w.of(t)[0];if(b)__sim.select(b)},t);
  // the generic click-through: select a house, click a resident link
  await p.evaluate(()=>{const w=__sim.world;__sim.select(w.of('house')[0])}); await p.waitForTimeout(300);
  const link=await p.$('#sel a.lnk'); if(link){await link.click();await p.waitForTimeout(300)}
  console.log('after link click shows villager:',await p.evaluate(()=>document.getElementById('sel').innerText.startsWith('VILLAGER')||document.getElementById('sel').innerText.includes('Life story')));
  await p.evaluate(()=>{document.getElementById('side').scrollTop=250});await p.waitForTimeout(200);await p.screenshot({path:'tests/ui_insp_villager.png',clip:{x:1160,y:0,width:340,height:950}});
  await p.evaluate(()=>{document.getElementById('side').scrollTop=250});await shot('animal',()=>{const w=__sim.world;const a=w.animals.find(a=>a.alive);if(a)__sim.select(a)});
  // save/load keeps usage
  const sv=await p.evaluate(()=>{const w=__sim.world;const t=w.of('tavern')[0]||w.of('plaza')[0];const L=deserializeWorld(JSON.parse(JSON.stringify(serializeWorld(w))));const t2=L.buildings.get(t.id);return {before:t.vtot,after:t2.vtot,vh:t2.vh}});
  console.log('save keeps usage:',JSON.stringify(sv));
  console.log('errors:',errs,'| world errors',await p.evaluate(()=>__sim.world.dbg.total)); await b.close();
})();
