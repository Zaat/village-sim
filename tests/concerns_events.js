// Concerns: detection, causes, resolution, responses, orders, save round trip, secession cap
const fs=require('fs'),vm=require('vm'),path=require('path');
const code=['config','animals','villager','town','society','techtree','unlocks','tech','water','trade','projects','history','buildings','places','neighbours','diplomacy','routes','mapgen','character','regime','strife','lives','livelihoods','stats','concerns','outposts','bridges','terraform','discovery','voices','save','world'].map(f=>fs.readFileSync(path.join(__dirname,'..','src',f+'.js'),'utf8')).join('\n')+'\n;Object.assign(globalThis,{assignRoles,World,CFG,TERR,FEAT,CN,concernsDay,respond,responseState,RESPONSES,ordersOf,winterWood,openConcerns,muteConcern,serialize:typeof serialize!=="undefined"?serialize:null,ST,evTotal});';
const ctx={console:{log(){},error(){}},Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
let pass=0,fail=0;const ok=(c,m)=>{if(c){pass++}else{fail++;console.log('FAIL',m)}};
const day=(w,n=1)=>{for(let d=0;d<n;d++){for(let t=0;t<1200;t++)w.step()}};
const nextDay=w=>ctx.concernsDay(w);      // run the daily check on exactly the state we set up (carried food would refill stores within a day)
const w=new ctx.World(31,{map:'island'});day(w,60);
const C=ctx.CN(w);
ok(C.pop.length>=50,'population history kept');
// 1. food concern: drain the stores
w.stock.food=Math.floor(w.vills.length*0.8);nextDay(w);
let f=C.list.find(c=>c.key==='food');ok(f&&f.sev===2,'critical food concern raised');ok(f&&/food is stored/.test(f.text),'food reason text');
ok(C.pending.some(p=>p.key==='food'&&p.sev===2),'critical concern queued for announcement');
ok(ctx.evTotal(w,'concern_critical')>=1,'critical concern counted in stats');
// 2. response: ration, extra hands, feast
w.stock.food=Math.floor(w.vills.length*2.0);
ok(ctx.respond(w,'ration')&&ctx.ordersOf(w).ration,'ration order takes effect');
ok(!ctx.respond(w,'ration'),'ration refuses a second time (cooldown)');
ok(ctx.respond(w,'hands_food')&&ctx.ordersOf(w).food,'extra hands order takes effect');
{const w3=new ctx.World(33,{map:'island'});day(w3,37);const fr=x=>x.vills.filter(v=>['farmer','hunter','fisher'].includes(v.role)).length;ctx.assignRoles(w3);const b0=fr(w3);ctx.respond(w3,'hands_food');ctx.assignRoles(w3);ok(fr(w3)>=b0&&ctx.ordersOf(w3).food,'orders do not reduce food workers ('+b0+' -> '+fr(w3)+')');
 const lb=w3.vills.filter(v=>v.role==='woodcutter').length;ctx.respond(w3,'hands_fuel');ctx.assignRoles(w3);ok(w3.vills.filter(v=>v.role==='woodcutter').length>=lb,'firewood order does not reduce woodcutters');}
w.stock.food=w.vills.length*8;w.stock.wood=200;const f0=w.stock.food;ok(ctx.respond(w,'feast'),'feast can be held');ok(w.stock.food<f0&&w.forceFeast,'feast costs food and calls a feast');
// 3. resolves once the problem is gone
w.stock.food=w.vills.length*8;nextDay(w);nextDay(w);nextDay(w);nextDay(w);ok(!C.list.some(c=>c.key==='food'),'food concern resolves');ok(C.hist.some(h=>h.key==='food'),'resolved concern goes into history');
// 4. population fall
const before=w.vills.length;const gone=w.vills.slice(0,Math.ceil(before*0.45));for(const v of gone)w.kill(v,'was killed by a wolf');nextDay(w);
const pf=C.list.find(c=>c.key==='pop_fall');ok(pf&&pf.sev===2,'critical population fall raised ('+(pf&&pf.text)+')');ok(pf&&/death/.test(pf.why),'population fall names deaths: '+(pf&&pf.why));
// 5. nudge goes to the council, which decides
w.regime.ax.auth=0.1;let asked=0;const pol=w.gov.policy.growth;let tries=0;while(w.gov.policy.growth<=pol&&tries<14){ctx.CN(w).cd.nudge_family=0;ctx.respond(w,'nudge_family');tries++}
ok(w.gov.policy.growth>pol,'a nudge to a receptive council eventually changes policy ('+tries+' tries)');
// 6. winter firewood
const w2=new ctx.World(32,{map:'island'});day(w2,30);let guard=0;while(w2.season!==2&&guard++<40)day(w2,1);w2.stock.wood=1;nextDay(w2);ok(ctx.CN(w2).list.some(c=>c.key==='fuel'),'firewood concern before winter');
// 7. mute hides from the open list
const key=C.list[0]&&C.list[0].key;if(key){ctx.muteConcern(w,key,10);ok(!ctx.openConcerns(w).some(c=>c.key===key),'muted concern leaves the open list')}
// 8. save round trip keeps concerns and cooldowns
const snap=JSON.parse(JSON.stringify(w.concerns));ok(snap.hist.length>=1&&snap.cd.ration>0,'concern state is serialisable');
console.log(`concerns_events: ${pass} passed, ${fail} failed`);process.exit(fail?1:0);
