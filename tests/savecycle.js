const { chromium } = require('playwright'); const fs=require('fs');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({viewport:{width:1500,height:950},acceptDownloads:true}); const p = await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push('PAGE: '+e.message)); p.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE: '+m.text())});
  const state=()=>p.evaluate(()=>{const w=__sim.world;return {seed:w.seed,day:w.day,year:w.year,pop:w.vills.length,food:w.stock.food,houses:w.houses().length,council:w.gov.council.length}});
  await p.goto('file:///home/claude/village-sim/index.html'); await p.waitForTimeout(500);
  console.log('1 fresh start: banner visible =',await p.isVisible('#resume'),'| autosave info:',await p.innerText('#saveInfo'));
  await p.evaluate(()=>{__sim.setSpeed(0);__sim.newWorld(777);__sim.run(1200*45)});
  await p.evaluate(()=>localStorage.setItem('villagesim.autoresume','0')); const s1=await state(); await p.click('#saveNow'); console.log('2 saved:',JSON.stringify(s1),'\n   ',await p.innerText('#saveInfo'));
  await p.reload(); await p.waitForTimeout(600);
  console.log('3 after reload: banner =',await p.isVisible('#resume'),'|',(await p.innerText('#resumeInfo')).replace(/\n/g,' ').slice(0,110),'| paused speed button on =',await p.evaluate(()=>document.querySelector('[data-sp="0"]').classList.contains('on')));
  const before=await state(); await p.waitForTimeout(800); const still=await state(); console.log('   world frozen while banner shown:',before.day===still.day);
  await p.click('#resumeBtn'); await p.waitForTimeout(500);
  const s2=await state(); console.log('4 resumed:',JSON.stringify(s2),'| matches saved village:',s1.seed===s2.seed&&s1.pop===s2.pop&&s1.houses===s2.houses&&s1.year===s2.year,'| banner gone:',!(await p.isVisible('#resume')));
  await p.evaluate(()=>{__sim.setSpeed(10)}); await p.waitForTimeout(1500); console.log('   still running after resume, day',(await state()).day);
  // export
  await p.evaluate(()=>__sim.setSpeed(0));
  const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#exportBtn')]); const fn=dl.suggestedFilename(); await dl.saveAs('/tmp/'+fn); const sz=fs.statSync('/tmp/'+fn).size;
  console.log('5 exported file:',fn,(sz/1024).toFixed(0)+' KB');
  // import into a different world
  await p.evaluate(()=>{__sim.newWorld(42);}); console.log('   switched to new world seed',(await state()).seed);
  await p.setInputFiles('#importFile','/tmp/'+fn); await p.waitForTimeout(700);
  const s3=await state(); console.log('6 imported:',JSON.stringify(s3),'| matches export:',s3.seed===s2.seed&&s3.pop===s2.pop&&s3.day===s2.day,'|',await p.innerText('#saveInfo'));
  // bad file
  fs.writeFileSync('/tmp/bad.json','{"hello":"world"}'); await p.setInputFiles('#importFile','/tmp/bad.json'); await p.waitForTimeout(400); console.log('7 bad file ->',await p.innerText('#saveInfo'),'| world untouched:',(await state()).seed===s3.seed);
  // start fresh keeps a backup
  await p.reload(); await p.waitForTimeout(500); await p.click('#resumeNo'); await p.waitForTimeout(300);
  console.log('8 start fresh: backup stored =',await p.evaluate(()=>!!localStorage.getItem('villagesim.backup')),'| running =',await p.evaluate(()=>!document.querySelector('[data-sp="0"]').classList.contains('on')));
  await p.screenshot({path:'tests/p4_save.png'});
  console.log('errors:',errs); await b.close();
})();
