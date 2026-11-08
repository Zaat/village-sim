// node tools/probe_growth.js SEED MAP YEARS : why growth stalls. Counts conception attempts by outcome, tracks pop, beds, food, house blueprints.
const fs=require('fs'),vm=require('vm'),path=require('path');
const files=['config','animals','villager','town','society','techtree','unlocks','tech','water','trade','projects','history','buildings','places','neighbours','diplomacy','routes','mapgen','character','regime','strife','lives','livelihoods','stats','concerns','outposts','bridges','terraform','discovery','save','world'];
const code=files.map(f=>fs.readFileSync(path.join(process.env.SRC||path.join(__dirname,'..','src'),f+'.js'),'utf8')).join('\n')+'\n;Object.assign(globalThis,{World,CFG});';
const ctx={console:{log(){},error(){}},Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
const seed=+process.argv[2]||12,map=process.argv[3]||'island',years=+process.argv[4]||20;
const R={attempt:0,notAdultOrPartner:0,pregnantOrCooldownOrAge:0,noBed:0,noFood:0,rolled:0,conceived:0};
const P=ctx.World.prototype,orig=P.tryConceive;
P.tryConceive=function(f,m){R.attempt++;
 if(!f.isAdult()||!m.isAdult()||f.partner!==m.id){R.notAdultOrPartner++;return}
 if(f.preg>0||this.tick-f.lastBirth<ctx.CFG.BIRTH_COOLDOWN||f.age>ctx.CFG.FERTILE_MAX){R.pregnantOrCooldownOrAge++;return}
 if(this.vills.length+1>this.beds()){R.noBed++;return}
 const gp=this.gov.policy.growth; if(this.stock.food<this.vills.length*3.5*(1-0.25*gp)*(this.settings.survival?1.3:1)){R.noFood++;return}
 R.rolled++;const b=this.births;orig.call(this,f,m);if(f.preg>0)R.conceived++};
const w=new ctx.World(seed,{map});let t0=Date.now(),lastB=0,lastD=0,spare=0,noSpare=0,foodLow=0,days=0;
for(let d=1;d<=years*32;d++){for(let t=0;t<1200;t++)w.step();days++;
 const pop=w.vills.length,beds=w.beds();if(beds>pop+1)spare++;else noSpare++;
 if(w.stock.food<pop*3.5)foodLow++;
 if(d%64===0){const ad=w.vills.filter(v=>v.isAdult()),pairs=ad.filter(v=>v.partner!=null).length/2,fert=ad.filter(v=>v.sex==='f'&&v.age<=ctx.CFG.FERTILE_MAX).length;
  console.log(`Y${d/32} pop ${pop} beds ${beds} houses ${w.houses().length} bps ${w.bps.filter(b=>b.type==='house').length} food/pop ${(w.stock.food/pop).toFixed(1)} wood ${Math.round(w.stock.wood)} adults ${ad.length} couples ${pairs} fertileF ${fert} born ${w.births-lastB} died ${w.deaths-lastD} | spareDays ${spare}/${days} foodLowDays ${foodLow}/${days} | ${((Date.now()-t0)/d).toFixed(0)}ms/day`);lastB=w.births;lastD=w.deaths}}
console.log('conceive',JSON.stringify(R));console.log('causes',JSON.stringify(w.causes));
console.log('errors',w.dbg.total,'pop',w.vills.length,'tickMs',(w.dbg.tickMs||0).toFixed?.(2),'tickMax',(w.dbg.tickMax||0).toFixed?.(1));
