// v0.40 farming ladder: the multiplier matches what the farmers apply and rises with each technology; the next step is named
const fs=require('fs'),vm=require('vm'),path=require('path');
const code=require('./lib').SRC.map(f=>fs.readFileSync(path.join(__dirname,'..','src',f+'.js'),'utf8')).join('\n')+'\n;Object.assign(globalThis,{World,CFG,TECHS,farmLadder,farmLadderText,farmMult,FARM_STEPS,resourceInfo,techFx});';
const ctx={console:{log(){},error(){}},Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m)}};
const w=new ctx.World(12,{map:'island'});
let L=ctx.farmLadder(w);ok(Math.abs(L.mult-1)<1e-9&&L.next==='rotation','a new village farms with bare technology: x'+L.mult+', next '+L.next);
let prev=L.mult;for(const id of ctx.FARM_STEPS){w.tech.known[id]=1;const m=ctx.farmMult(w);ok(m>prev,'each step raises the yield: '+id+' '+m.toFixed(2));prev=m}
L=ctx.farmLadder(w);ok(L.next===null&&L.done.length===ctx.FARM_STEPS.length,'complete ladder has no next step');
// the multiplier equals the factor in the farmers' formula
const f=1.25*1.25*(1+ctx.techFx(w,'farm'));ok(Math.abs(ctx.farmMult(w)-f)<1e-9,'same product the farmers use: '+ctx.farmMult(w)+' vs '+f);
const w2=new ctx.World(12,{map:'island'});const g1=ctx.farmLadder(w2).nextGain;ok(g1>0.2&&g1<0.3,'the first step (rotation) is about a quarter: '+g1);
ok(/Technology multiplies a harvest by 1.00/.test(ctx.farmLadderText(w2))&&/Next: crop rotation/.test(ctx.farmLadderText(w2)),'text: '+ctx.farmLadderText(w2));
ok(/Next: crop rotation/.test(ctx.resourceInfo(w2,'food').note),'the Food row note carries the ladder');
console.log(fail?'FAILED '+fail:'farm_ladder ok');process.exit(fail?1:0);
