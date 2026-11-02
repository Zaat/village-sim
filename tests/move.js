// Movement checks: node tests/move.js [SEED] [DAYS]  - smoothing is valid (nobody walks through walls) and shortens trips
const fs=require('fs'),vm=require('vm'),path=require('path');
const code=['config','animals','villager','town','society','tech','water','trade','projects','history','buildings','places','neighbours','diplomacy','mapgen','character','regime','strife','save','world'].map(f=>fs.readFileSync(path.join(__dirname,'..','src',f+'.js'),'utf8')).join('\n')+'\n;Object.assign(globalThis,{World,CFG,Villager,TERR});';
const seed=+process.argv[2]||777,days=+process.argv[3]||100;
function run(smooth){
  const ctx={console,Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
  const w=new ctx.World(seed);if(!smooth)w.smoothPath=(sx,sy,p)=>p;
  let bad=0,dist=0,moves=0;const seen=new Set(),why={};const V=ctx.Villager.prototype,om=V.move;
  V.move=function(){const x=this.x,y=this.y,pi=Math.floor(y)*ctx.CFG.W+Math.floor(x),pok=w.walkable(pi)||w.passable(pi);om.call(this);dist+=Math.hypot(this.x-x,this.y-y);moves++;const i=Math.floor(this.y)*ctx.CFG.W+Math.floor(this.x);if(pok&&i!==pi&&!w.walkable(i)&&!w.passable(i)&&!this.boat&&this.jobKind!=='voyage'){const key=this.id+':'+i;if(!seen.has(key)){seen.add(key);bad++;const l=this.label+'/'+(w.bmap[i]?'bld':'terr'+w.terr[i]);why[l]=(why[l]||0)+1}}};
  const t0=Date.now();for(let t=0;t<1200*days;t++)w.step();
  const out=[...w.buildings.values()].reduce((s,b)=>s+(b.otot||0),0);
  return {smooth,pop:w.vills.length,houses:w.houses().length,bad,moves,dist:Math.round(dist),out:Math.round(out),why,errors:w.dbg.total,wall:((Date.now()-t0)/1000).toFixed(1)+'s',unstuck:w.dbg.unstuck||0,msTick:+(w.dbg.tickMs/w.dbg.ticks).toFixed(3)}
}
const a=run(true),b=run(false);console.log(JSON.stringify(a));console.log(JSON.stringify(b));
let ok=0,bad=0;const check=(n,c,x)=>{console.log((c?'PASS ':'FAIL ')+n+(x?'  '+x:''));c?ok++:bad++};
check('nobody walks through walls',a.bad===0,'violations '+a.bad);
check('no errors',a.errors===0&&b.errors===0);
check('trips are shorter with smoothing',a.dist/Math.max(1,a.moves)>=0&&a.dist<b.dist*0.995,'distance '+a.dist+' vs '+b.dist);
check('the village is not harmed (pop within 25%)',Math.abs(a.pop-b.pop)<=0.25*b.pop,a.pop+' vs '+b.pop);
console.log(`\n${ok} passed, ${bad} failed`);process.exit(bad?1:0);
