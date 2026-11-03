// Checks the living-world rules: node tests/living.js
const fs=require('fs'),vm=require('vm'),path=require('path');
const code=['config','animals','villager','town','society','tech','water','trade','projects','history','buildings','places','neighbours','diplomacy','routes','mapgen','character','regime','strife','outposts','bridges','save','world'].map(f=>fs.readFileSync(path.join(__dirname,'..','src',f+'.js'),'utf8')).join('\n')+'\n;Object.assign(globalThis,{recordVisit,World,CFG,FEAT,TERR,serializeWorld,deserializeWorld,popularity,recordOutput,placeBuilding,soilDay,adultsOf});';
const ctx={console,Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
const w=new ctx.World(777);for(let d=1;d<=110;d++){for(let t=0;t<1200;t++)w.step()}
let ok=0,bad=0;const check=(n,c,x)=>{console.log((c?'PASS ':'FAIL ')+n+(x?'  '+x:''));c?ok++:bad++};
// saplings start small and mature over days
{let i=-1;for(let k=0;k<w.feat.length;k++)if(w.terr[k]===ctx.TERR.GRASS&&!w.feat[k]&&!w.bmap[k]&&!w.road[k]){i=k;break}
 w.feat[i]=ctx.FEAT.OAK;w.res[i]=1;w.young.push(i);const was=w.res[i];for(let t=0;t<4800*16;t++){w.tick++;w.nature()}
 check('a sapling grows to a full tree',w.res[i]>=4&&!w.young.includes(i),was+' -> '+w.res[i])}
// output tracking
{const farm=w.of('farm')[0];ctx.recordOutput(w,farm,12);ctx.recordOutput(w,farm,8);const P=ctx.popularity(w,farm,'oh');check('output is tallied',farm.otot>=20&&P.season>=20,JSON.stringify(farm.oh))}
// soil wears with harvests and recovers daily
{const farm=w.of('farm')[0];farm.fert=0.6;for(let d=0;d<10;d++)ctx.soilDay(w);check('soil recovers',farm.fert>0.69,farm.fert.toFixed(2))}
// natural run: harvests deplete but yield stays viable
{let tot=0,n=0;for(const b of w.of('farm')){tot+=b.fert??1;n++}check('fields have a soil value after play',n>0&&tot/n>0.5&&tot/n<=1.06,(tot/n).toFixed(2)+' avg over '+n+' fields')}
// landmarks draw visitors
{w.proj.done.monument={day:1};const b=ctx.placeBuilding(w,'monument');if(b){b.have={wood:999,stone:999};b.prog=b.time;w.complete(b)}const m=w.of('monument')[0];
 for(let d=0;d<12;d++){for(let t=0;t<1200;t++)w.step()}check('monument draws sightseers',!!m&&(m.vtot||0)>0,m?'visits '+(m.vtot||0):'no monument')}
// wolves return where there is game and breed with a cap
{for(const a of w.animals)if(a.kind==='wolf')a.alive=false;const d0=w.animals.filter(a=>a.alive&&a.kind==='deer').length;
 let packs=0;const so=w.rng;for(let d=0;d<400;d++){const before=w.animals.filter(a=>a.alive&&a.kind==='wolf').length;for(let t=0;t<1200;t++)w.step();const after=w.animals.filter(a=>a.alive&&a.kind==='wolf').length;if(after>before&&before===0)packs++}
 const wolves=w.animals.filter(a=>a.alive&&a.kind==='wolf').length;check('wolves come back over time',packs>=1,'new packs '+packs+', now '+wolves+', deer '+d0)}
// looking at a building before anyone has visited it must not break later visits (found by a player report)
{const pl=w.of('plaza')[0]||w.of('campfire')[0];delete pl.vh;delete pl.reg;delete pl.vtot;ctx.popularity(w,pl);let threw=null;try{ctx.recordVisit(w,pl,w.vills[0])}catch(e){threw=e}check('visits can be recorded after the building was inspected first',!threw&&pl.reg&&pl.vtot===1,String(threw))}
// save keeps all of it
{const L=ctx.deserializeWorld(JSON.parse(JSON.stringify(ctx.serializeWorld(w))));const f=w.of('farm')[0],g=L.buildings.get(f.id);check('save keeps output and soil',g.otot===f.otot&&g.fert===f.fert&&JSON.stringify(g.oh)===JSON.stringify(f.oh));const live=x=>new Set(x.young.filter(i=>(x.feat[i]===ctx.FEAT.OAK||x.feat[i]===ctx.FEAT.PINE)&&x.res[i]>0&&x.res[i]<4));check('young trees are rebuilt on load',live(L).size===live(w).size,live(L).size+' vs '+live(w).size);for(let t=0;t<1200*3;t++)L.step();check('loaded world runs',L.dbg.total===0)}
console.log('errors',w.dbg.total,JSON.stringify([...w.dbg.errors.values()].map(e=>e.where+': '+e.msg)));
console.log(`\n${ok} passed, ${bad} failed`);process.exit(bad||w.dbg.total?1:0);
