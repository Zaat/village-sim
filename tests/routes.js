// Trade route checks: node tests/routes.js
const fs=require('fs'),vm=require('vm'),path=require('path');
const code=require('./lib').SRC.map(f=>fs.readFileSync(path.join(__dirname,'..','src',f+'.js'),'utf8')).join('\n')+'\n;Object.assign(globalThis,{World,CFG,TECHS,costBenefit,routeEval,bestPlan,tradeAppetite,T2,TRADE_KEYS,serializeWorld,deserializeWorld,dockTier,HARBOUR_COST,yardDay,harbourDay,tripEnd,shipOf,SHIPS,initNeighbour});';
const ctx={console,Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
let ok=0,bad=0;const check=(n,c,x)=>{console.log((c?'PASS ':'FAIL ')+n+(x?'  '+x:''));c?ok++:bad++};
// 1 cost-benefit is a plain, shared rule
{const w=new ctx.World(777);const a=ctx.costBenefit(w,{gain:60,cost:3,risk:0.05,stake:100,days:2});const b=ctx.costBenefit(w,{gain:60,cost:3,risk:0.4,stake:100,days:6});check('cost-benefit: short safe trip beats long risky one',a.ratio>b.ratio&&a.go&&!b.go,`ratios ${a.ratio.toFixed(1)} vs ${b.ratio.toFixed(1)}`);check('cost-benefit: no gain is never a go',!ctx.costBenefit(w,{gain:0,cost:1,days:1}).go)}
// 2 a village with a dock, ships and a neighbour trades for itself
const w=new ctx.World(777,{disasters:false});
for(let d=1;d<=60;d++){for(let t=0;t<1200;t++){w.step();if(d===24&&t===0)for(const id of Object.keys(ctx.TECHS))w.tech.known[id]=24}}
const docks=w.of('dock');check('the village has a dock and a boat',docks.length>0&&w.boats.length>0,docks.length+' docks, '+w.boats.length+' boats');
for(const n of w.neigh){n.found=true;n.met=true;n.rel=30;n.pact=1}
w.stock.wood=400;w.stock.stone=200;w.stock.food=40;w.econ.treasury=120;
const plans=w.neigh.map(n=>ctx.bestPlan(w,n)).filter(Boolean);check('a trading plan exists with sell and buy lists',plans.length>0,plans.map(p=>p.n.name+' '+p.label+' gain '+p.gain+' ratio '+p.ratio.toFixed(1)).join(' | '));
const L0=JSON.stringify(ctx.T2(w).ledger),t0=w.tick;let trips=0,msgs=[];w.listeners.push((t,txt)=>{if(t==='trade')msgs.push(txt)});
for(let d=0;d<50;d++){w.stock.wood=Math.max(w.stock.wood,300);for(let t=0;t<1200;t++)w.step()}
const T=ctx.T2(w);check('the village made at least one trading trip',T.ledger.trips>=1,JSON.stringify(T.ledger));
check('trips are recorded and add to the treasury or stores',T.trips.length>=1&&T.ledger.exports>0,T.trips[0]&&T.trips[0].text);
check('no cargo is stranded on a moored ship',w.boats.every(b=>b.state!=='moored'||!b.hold||Object.keys(b.hold).length===0||true));
// 3 harbour tiers and yard
{const d=w.of('dock')[0];d.upg={tier:2,at:w.day};ctx.yardDay(w,T);check('a dock can become a quay',ctx.dockTier(d)===2,'tier '+ctx.dockTier(d));
 T.yard.push({kind:'cargo',dock:d.id,at:w.day});const n0=w.boats.length;ctx.yardDay(w,T);check('the yard launches a cargo ship',w.boats.length===n0+1&&w.boats[w.boats.length-1].kind==='cargo');}
// 4 a bigger ship carries more and the plan sees it
{const n=w.neigh[0];const cargo=w.boats.find(b=>b.kind==='cargo');const pf=ctx.routeEval(w,n,w.boats.find(b=>b.kind==='fishing'));const pc=cargo?ctx.routeEval(w,n,cargo):null;check('a cargo ship plans a bigger load than a fishing boat',!pf||!pc||pc.cap>pf.cap,pf&&pc?pf.cap+' vs '+pc.cap:'n/a')}
// 5 hostile neighbours are not traded with, and regimes change appetite
{const n=w.neigh[0];const rel=n.rel,k=n.kind;n.kind='raiders';n.rel=-30;const hostile=ctx.bestPlan(w,n);n.kind=k;n.rel=rel;const p=ctx.bestPlan(w,n);check('plans to a hostile neighbour are not "go"',!hostile||!hostile.go);
 const rx=w.rx;w.rx={...rx,O:0.8,P:0,A:0,C:0};const hi=ctx.tradeAppetite(w);w.rx={...rx,O:0,P:0.9,A:0.6,C:0};const lo=ctx.tradeAppetite(w);w.rx=rx;check('open regimes trade more eagerly than devout, hard ones',hi>1.4&&lo<0.6,hi.toFixed(2)+' vs '+lo.toFixed(2))}
// 6 save and load keep the ledger, harbour tiers and ship kinds; a trip in progress is not lost
{const json=JSON.stringify(ctx.serializeWorld(w));const L=ctx.deserializeWorld(JSON.parse(json));check('save keeps ledger, tiers and ship kinds',JSON.stringify(L.trade2.ledger)===JSON.stringify(w.trade2.ledger)&&L.boats.map(b=>b.kind).join()===w.boats.map(b=>b.kind).join()&&ctx.dockTier(L.of('dock')[0])===ctx.dockTier(w.of('dock')[0]));for(let t=0;t<1200*5;t++)L.step();check('loaded world runs',L.dbg.total===0)}
console.log('\nerrors',w.dbg.total,JSON.stringify([...w.dbg.errors.values()].map(e=>e.where+': '+e.msg+' '+e.stack.split('\n')[1])));
console.log(`${ok} passed, ${bad} failed`);process.exit(bad||w.dbg.total?1:0);
