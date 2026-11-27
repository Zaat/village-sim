// v0.24 technology and ages: table, ages, availability, effects, house styles, loss, neighbours, save/load
const fs=require('fs'),vm=require('vm');
const code=require('./lib').SRC.map(f=>fs.readFileSync(__dirname+'/../src/'+f+'.js','utf8')).join('\n')+'\n;Object.assign(globalThis,{World,CFG,TECHS,AGES,AGE_COUNT,AGE_NEED,AGE_IDS,BRANCHES,LADDERS,villageAge,techAvailable,techFx,techLossDay,neighbourTechDay,ladderLevel,styleNow,serializeWorld,deserializeWorld,ST});';
const ctx={console,Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('FAIL',m)}};
const T=ctx.TECHS,ids=Object.keys(T);
ok(ids.length>=100,'at least 100 technologies: '+ids.length);
ok(ids.every(id=>T[id].req.every(r=>T[r]&&T[r].age<=T[id].age)),'prerequisites exist and are not from a later age');
ok(['nets','tools','granary','carpentry','forestry','mining','lodges','trade','coinage','seatrade','boats','rotation','masonry','medicine','watchtowers','ironwork','plow','navigation'].every(id=>T[id]),'the original 18 ids are kept');
ok(Object.keys(ctx.BRANCHES).length===8&&ids.every(id=>ctx.BRANCHES[T[id].branch]),'8 branches, every tech in one');
ok(ctx.AGES.length===11&&ctx.AGE_COUNT.every(n=>n>=10),'11 ages with 10+ techs each: '+ctx.AGE_COUNT.join(','));
ok(ctx.LADDERS.terra.length>=6&&ctx.LADDERS.explore.length>=8&&ctx.LADDERS.war.length>=4,'ladders for terraforming, exploration and war');
const w=new ctx.World(31,{});
ok(ctx.villageAge(w)===0,'starts in the Stone Age');ok(ctx.techAvailable(w).every(id=>T[id].age===0),'only Stone Age techs open at first');
// gating: know every Stone tech but one short of the need -> still Stone; reach the need -> Bronze
const stone=ctx.AGE_IDS[0];for(let i=0;i<ctx.AGE_NEED[0]-1;i++)w.tech.known[stone[i]]=1;ok(ctx.villageAge(w)===0,'one short of the need stays in the age');
w.tech.known[stone[ctx.AGE_NEED[0]-1]]=1;ok(ctx.villageAge(w)===1,'the age turns when 65% is known');ok(ctx.techAvailable(w).some(id=>T[id].age===1),'Bronze techs open');ok(!ctx.techAvailable(w).some(id=>T[id].age===2),'Iron techs still closed');
// effects add up
const w2=new ctx.World(32,{});for(const id of ids)w2.tech.known[id]=1;
ok(ctx.villageAge(w2)===10,'all known = last age');ok(ctx.techFx(w2,'farm')>0.9&&ctx.techFx(w2,'learn')>1.5&&ctx.techFx(w2,'work')>0.8,'effects accumulate: farm '+ctx.techFx(w2,'farm').toFixed(2)+' learn '+ctx.techFx(w2,'learn').toFixed(2)+' work '+ctx.techFx(w2,'work').toFixed(2));
ok(ctx.styleNow(w2)===8&&ctx.ladderLevel(w2,'terra')===ctx.LADDERS.terra.length,'house style and ladders');
// a world with everything known runs, builds better houses, keeps working
for(let t=0;t<1200*70;t++)w2.step();
const styles=[...w2.buildings.values()].filter(b=>b.type==='house').map(b=>b.style||0);ok(Math.max(...styles)>=3,'late house styles appear: '+[0,1,2,3,4,5].map(s=>styles.filter(x=>x===s).length).join('/'));
ok(w2.dbg.total===0,'no errors with all knowledge: '+[...w2.dbg.errors.values()].map(e=>e.where+' '+e.msg).join(';'));
console.log('all-knowledge world: pop',w2.vills.length,'food',w2.stock.food,'cap',w2.cap());
// save/load keeps techs and effects
const d=ctx.serializeWorld(w2);const w3=ctx.deserializeWorld(JSON.parse(JSON.stringify(d)));ok(Object.keys(w3.tech.known).length===ids.length&&ctx.villageAge(w3)===10,'save keeps technologies and the age');for(let t=0;t<1200*5;t++)w3.step();ok(w3.dbg.total===0,'no errors after load');
// knowledge loss after a collapse
const w4=new ctx.World(33,{});for(const id of ids.filter(i=>T[i].age<=3))w4.tech.known[id]=1;w4.tech.peak=100;const n0=Object.keys(w4.tech.known).length;w4.vills.length=Math.min(w4.vills.length,8);
for(let i=0;i<60;i++){ctx.techLossDay(w4)}ok(Object.keys(w4.tech.known).length<n0&&(w4.tech.lost||0)>0,'a collapsed village forgets: lost '+(w4.tech.lost||0));ok(ctx.ST(w4).ev.tech_lost&&ctx.ST(w4).ev.tech_lost.n>0,'knowledge loss is counted in the statistics');
// neighbours learn over time
const w5=new ctx.World(34,{map:'island'});const nb=w5.neigh[0];const k0=nb.knows.length;w5.tick=1200*900;for(let i=0;i<40;i++)ctx.neighbourTechDay(w5);ok(nb.knows.length>k0+6,'neighbours learn as the years pass: '+k0+' -> '+nb.knows.length);ok(nb.knows.every(id=>T[id]&&T[id].req.every(r=>nb.knows.includes(r))),'neighbour knowledge stays consistent');
ok(w.dbg.total===0,'no errors');console.log(fail?'FAILED '+fail:'tech passed '+pass);process.exit(fail?1:0);
