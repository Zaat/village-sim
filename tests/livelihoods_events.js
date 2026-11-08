// Livelihoods (v0.25): trades unlock, demand, goods and saturation, pay, inventions, overtime, dreams, save
const fs=require('fs'),vm=require('vm'),path=require('path');
const files=['config','animals','villager','town','society','techtree','unlocks','tech','water','trade','projects','history','buildings','places','neighbours','diplomacy','routes','mapgen','character','regime','strife','lives','livelihoods','stats','concerns','outposts','bridges','terraform','discovery','save','world'];
const code=files.map(f=>fs.readFileSync(path.join(__dirname,'..','src',f+'.js'),'utf8')).join('\n')+'\n;Object.assign(globalThis,{World,CFG,LIV,TRADES,allTrades,census,demandOf,livelihoodsDay,jobEffect,tradeOf,overtimeMode,dreamsDay,judgeInventions,serializeWorld,deserializeWorld,CN,concernsDay,planLivelihood,livelihoodSummary,tradeLook,holdings});';
const ctx={console:{log(){},error(){}},Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
let pass=0,fail=0;const ok=(c,m)=>{if(c){pass++}else{fail++;console.log('FAIL',m)}};
const day=(w,n=1)=>{for(let d=0;d<n;d++)for(let t=0;t<1200;t++)w.step()};
const w=new ctx.World(41,{map:'island'});day(w,70);const L=ctx.LIV(w);
const ids=()=>ctx.allTrades(w).map(x=>x.id);
// 1. unlock by technology and population
ok(ids().includes('minder')&&ids().includes('porter'),'odd jobs are open from the start');
delete w.tech.known.bronze;ok(!ids().includes('smith'),'smith is closed without bronze');
w.tech.known.bronze=1;ok(ids().includes('smith')===(w.vills.length>=ctx.TRADES.smith.pop),'smith opens with bronze and enough people');
// 2. demand follows the village
const cen=ctx.census(w);const dm=ctx.demandOf(w,'minder',ctx.TRADES.minder,{...cen,kids:10}),dm0=ctx.demandOf(w,'minder',ctx.TRADES.minder,{...cen,kids:0});
ok(dm>dm0,'childminding demand grows with the number of children ('+dm0+' -> '+dm+')');
// 3. goods and saturation
const smith=ctx.TRADES.smith,v=w.vills.find(x=>x.isAdult());L.goods.tools=0;const d0=ctx.demandOf(w,'smith',smith,cen);ctx.jobEffect(w,v,smith,'smith');
ok(L.goods.tools===1,'a smith job makes a tool');ok(v.tskill&&v.tskill.smith>0,'the worker gains skill');
L.goods.tools=w.vills.length*5;const d1=ctx.demandOf(w,'smith',smith,cen);ok(d1<d0*0.2,'a market full of tools wants few more ('+d0.toFixed(2)+' -> '+d1.toFixed(2)+')');L.goods.tools=0;
// 4. pay: service income moves coins from customers to the worker
w.tech.known.coinage=1;for(const x of w.vills){x.coins=40;x.tj=0}const worker=w.vills.find(x=>x.isAdult()&&!x.role&&!x.isElder())||w.vills.find(x=>x.isAdult()&&!x.isElder());
for(const x of w.vills){if(x.trade)x.trade=null;if(x.side)x.side=null}
worker.trade='musician';w.tech.known.oral=1;worker.tj=6;L.jobs={musician:6};const before=worker.coins,sum0=w.vills.reduce((a,x)=>a+x.coins,0);ctx.livelihoodsDay(w);
ok(worker.coins>before,'a service worker is paid ('+before+' -> '+worker.coins.toFixed(1)+')');
const sum1=w.vills.reduce((a,x)=>a+x.coins,0);ok(Math.abs(sum1-sum0)<sum0*0.05+4,'service pay moves coins, it does not create them ('+sum0+' -> '+sum1.toFixed(1)+')');
// 5. employment: adults without a role find work
day(w,12);const S=ctx.livelihoodSummary(w);ok(S.adults>0&&S.idle<=Math.ceil(S.adults*0.2),'few adults are left without work ('+S.idle+' of '+S.adults+')');
// 6. inventions: a good idea catches on, a poor one fails
const by=w.vills.find(x=>x.isAdult()&&!x.isElder());
L.inv.push({id:'xa',name:'Test goods',fx:'goods',k:0.02,price:1,appeal:1.8,by:by.id,since:w.day-30,ok:false});by.trade='xa';by.inc=2;ctx.judgeInventions(w);
ok(L.inv.find(i=>i.id==='xa')&&L.inv.find(i=>i.id==='xa').ok,'a profitable invention catches on');
const by2=w.vills.find(x=>x!==by&&x.isAdult()&&!x.isElder());L.inv.push({id:'xb',name:'Test dud',fx:'goods',k:0.02,price:1,appeal:0.15,by:by2.id,since:w.day-30,ok:false});by2.trade='xb';by2.inc=0;const f0=L.stats.failed;ctx.judgeInventions(w);
ok(!L.inv.some(i=>i.id==='xb')&&L.stats.failed===f0+1&&!by2.trade,'an unprofitable invention fails and its maker moves on');
// 7. overtime: free councils volunteer, strict ones compel
const C=ctx.CN(w);w.stock.food=Math.floor(w.vills.length*0.8);ctx.concernsDay(w);ok(C.list.some(c=>c.key==='food'),'food concern exists for the overtime test');
w.regime.ax.auth=0.05;L.ot={until:0,mode:0,cd:0};const mood0=w.vills.reduce((a,x)=>a+x.mood,0);ctx.livelihoodsDay(w);for(let i=0;i<8&&ctx.overtimeMode(w)!==1;i++){L.ot={until:0,mode:0,cd:0};ctx.livelihoodsDay(w)}ok(ctx.overtimeMode(w)===1,'a free council gets volunteers');
w.regime.ax.auth=0.95;L.ot={until:0,mode:0,cd:0};w.gov.approval=10;let got=0;for(let i=0;i<8&&!got;i++){L.ot={until:0,mode:0,cd:0};ctx.livelihoodsDay(w);got=ctx.overtimeMode(w)===2?1:0}
ok(got===1,'a strict council compels longer hours');const m1=w.vills.reduce((a,x)=>a+x.mood,0);ctx.livelihoodsDay(w);ok(w.vills.reduce((a,x)=>a+x.mood,0)<m1,'compelled hours cost mood');
// 8. aspirations
const d=w.vills.find(x=>x.isAdult()&&!x.isElder());d.asp={k:'wealth',text:'to make their fortune',day:w.day-20,done:0};d.coins=200;w.stock.food=w.vills.length*8;ctx.dreamsDay(w);
ok(d.asp.done>0,'a met aspiration is achieved');
// 9. looks
ok(ctx.tradeLook(w,{trade:'smith',side:null})[0]==='hammer','smiths carry a hammer');
// 10. save round trip keeps trades, goods and dreams
const jv=JSON.stringify(ctx.serializeWorld(w));const w2=ctx.deserializeWorld(JSON.parse(jv));
ok(JSON.stringify(w2.liv.goods)===JSON.stringify(w.liv.goods)&&w2.liv.inv.length===w.liv.inv.length,'livelihood state survives a save');
ok(w2.vills.find(x=>x.id===d.id).asp.done===d.asp.done&&w2.vills.find(x=>x.id===worker.id).trade===worker.trade,'villager trades and dreams survive a save');
// 11. old saves: no liv key -> fresh state
const old=JSON.parse(jv);delete old.liv;const w3=ctx.deserializeWorld(old);ok(w3.liv&&Array.isArray(w3.liv.inv),'an old save gets a fresh livelihoods state');day(w3,3);ok(true,'old save keeps running');
console.log(`livelihoods_events: ${pass} passed, ${fail} failed`);process.exit(fail?1:0);
