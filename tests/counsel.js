const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1500,height:1000}});
  const errs=[]; p.on('pageerror',e=>errs.push('PAGE: '+e.message+' @ '+(e.stack||'').split('\n').slice(1,4).join(' | '))); p.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE: '+m.text())});
  await p.addInitScript(()=>{
    window.__calls=[]; let mode='good';
    window.__setMode=m=>mode=m;
    window.claude={use:async n=>{ if(n!=='sample')return null; return async (prompt)=>{
      window.__calls.push(prompt.slice(0,60));
      if(/exactly one word/.test(prompt)) return {text:'ready'};
      if(mode==='bad') return {text:'I think the council should do something sensible.'};
      const opts=[...prompt.matchAll(/^- ([a-z_]+): /gm)].map(m=>m[1]).filter(id=>!['growth'].includes(id));
      const ids=(prompt.split('Options (choose exactly one id):')[1]||'').match(/^- ([a-z_]+):/gm).map(s=>s.slice(2,-1));
      const names=[...prompt.matchAll(/^- ([A-Z][a-z_]+) \((Chief|Warden|Steward|Speaker|Councillor)/gm)].map(m=>m[1]);
      const choice=ids.includes('pass')?'pass':ids.includes('mediation')?'mediation':ids.includes('warning')?'warning':ids[0];
      return {text:JSON.stringify({choice,speeches:[{who:names[0],line:'We should act with care for everyone here.'},{who:names[1]||names[0],line:'I fear this will cost us more than it saves.'},{who:'Nobody Real',line:'ignored'}],reason:'The members lean toward '+choice+'.'})};
    }}};
  });
  await p.goto('file:///home/claude/village-sim/index.html'); await p.waitForTimeout(500); await p.click('#gear');
  console.log('initial:',(await p.innerText('#mindStatus')).slice(0,90),'| disabled',await p.isDisabled('#mindToggle'));
  await p.click('.tog:has(#mindToggle)'); await p.waitForTimeout(500); await p.click('#gear');
  console.log('after enable: checked',await p.isChecked('#mindToggle'),'|',(await p.innerText('#mindStatus')).slice(0,80));
  await p.evaluate(()=>{__sim.setSpeed(0);__sim.newWorld(777);});
  for(let i=0;i<100;i++){ await p.evaluate(()=>__sim.run(1200)); await p.waitForTimeout(40); }
  const r=await p.evaluate(()=>{const w=__sim.world;return {day:w.day,pop:w.vills.length,calls:window.__calls.length,mindCount:__sim.MIND.count,entries:__sim.MIND.entries.length,
    decisions:w.gov.decisions.slice(0,6).map(d=>`D${d.day} [${d.source}] ${d.text.slice(0,110)} | speeches ${d.speeches.length}`),policy:w.gov.policy,council:w.gov.council.map(c=>c.title)}});
  console.log(JSON.stringify(r,null,1));
  // bad answers must fall back to rules
  await p.evaluate(()=>{window.__setMode('bad')}); const before=await p.evaluate(()=>__sim.world.gov.decisions.length);
  for(let i=0;i<40;i++){ await p.evaluate(()=>__sim.run(1200)); await p.waitForTimeout(40); }
  console.log('bad-mode:',await p.evaluate(()=>({status:document.getElementById('mindStatus').textContent.slice(0,110),decisionsNow:__sim.world.gov.decisions.length,sources:[...new Set(__sim.world.gov.decisions.map(d=>d.source))]})), 'before',before);
  // select a villager and screenshot
  await p.evaluate(()=>{const w=__sim.world,R=__sim.R;const v=w.vills.find(v=>v.isAdult()&&w.gov.council.some(c=>c.id===v.id))||w.vills[0];window.__v=v;R.cam.z=3;R.cam.x=v.x*16;R.cam.y=v.y*16});
  await p.waitForTimeout(300);
  const pos=await p.evaluate(()=>{const R=__sim.R,v=window.__v,z=R.cam.z,r=document.getElementById('cv').getBoundingClientRect();return {x:r.left+(v.x*16-(R.cam.x-R.vw/(2*z)))*z,y:r.top+(v.y*16-6-(R.cam.y-R.vh/(2*z)))*z}});
  await p.mouse.click(pos.x,pos.y); await p.waitForTimeout(400);
  await p.screenshot({path:'tests/p2_ui.png',fullPage:false});
  console.log('errors:',errs);
  await b.close();
})();
