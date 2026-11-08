const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1500,height:950}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message+' @ '+(e.stack||'').split('\n')[1]));
  await p.goto('file:///home/claude/village-sim/index.html'); await p.waitForTimeout(500);
  await p.evaluate(()=>localStorage.clear());
  const r = await p.evaluate(()=>{__sim.setSpeed(0);__sim.newWorld(777);const w=__sim.world;
    for(let t=0;t<1200*110;t++){w.step(); if(t===1200*24)for(const id of Object.keys(TECHS))w.tech.known[id]=24}
    return {day:w.day,pop:w.vills.length}});
  console.log(JSON.stringify(r));
  for(const id of ['temple','foundry','citadel']){
    const ok=await p.evaluate(id=>{const w=__sim.world,R=__sim.R;let b=w.of(id)[0];if(!b){const pl=placeBuilding(w,id);if(!pl)return false;pl.have={wood:999,stone:999};pl.prog=pl.time;w.complete(pl);b=w.of(id)[0]}
      R.cam.x=(b.x+b.w/2)*16;R.cam.y=(b.y+b.h/2)*16;R.cam.z=4;return !!b},id);
    console.log(id,ok); await p.waitForTimeout(500); await p.screenshot({path:`tests/art_${id}.png`,clip:{x:200,y:200,width:700,height:500}});
  }
  // a village in conflict: show the regime card
  await p.evaluate(()=>{const w=__sim.world,S=w.strife,ad=w.vills.filter(v=>v.isAdult()),c=ad.slice(3,12);S.shadow={ids:c.map(v=>v.id),op:{},name:"Tilda’s Party",leader:c[0].id,leaderName:c[0].name,since:w.day-6,days:6,asked:true};S.strike={name:'The Hewers',ids:c.map(v=>v.id),issue:'labor',dir:1,since:w.day,until:w.day+4,asked:true};S.sect={name:'the Quiet Fast',doctrine:'ascetics',founder:c[1].id,founderName:c[1].name,members:c.map(v=>v.id),since:w.day-20,stance:'tolerated'};S.secessions=1;S.strikes=2;S.clashes=3;S.casualties=1;S.schisms=1;
    const f=w.neigh[0];w.neigh.push({...f,id:99,name:'Tobinstead',kind:'scholars',x:f.x+8,y:f.y+3,found:true,met:true,pop:14,rel:28,pact:0,colony:{day:w.day-10,year:w.year,leader:'Tobin',circle:'The Salt Walkers',mode:'peace',founders:14},hist:[]});
    document.querySelector('#tabbar [data-tab="society"]').click()});
  await p.waitForTimeout(500); await p.screenshot({path:'tests/ui_strife.png',clip:{x:1160,y:0,width:340,height:950}});
  await p.evaluate(()=>{document.querySelector('#tabbar [data-tab="world"]').click()}); await p.waitForTimeout(500); await p.screenshot({path:'tests/ui_colony.png',clip:{x:1160,y:0,width:340,height:950}});
  console.log('errors:',errs,'| world errors',await p.evaluate(()=>__sim.world.dbg.total)); await b.close();
})();
