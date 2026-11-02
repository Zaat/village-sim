const fs=require('fs'),vm=require('vm'),path=require('path');const dir=path.join(__dirname,'..','src');
const code=['config','animals','villager','town','society','tech','water','trade','projects','history','places','neighbours','diplomacy','save','world'].map(f=>fs.readFileSync(path.join(dir,f+'.js'),'utf8')).join('\n')+'\n;globalThis.World=World;globalThis.CFG=CFG;';
const ctx={console};vm.createContext(ctx);vm.runInContext(code,ctx);
const w=new ctx.World(+process.argv[2]||12345);
const origKill=w.kill.bind(w);let n=0;
w.kill=(v,why)=>{ if(why==='starved'&&n++<12)console.log(`D${w.day} STARVED ${v.name} age=${v.age.toFixed(0)} stage=${v.stage()} hunger=${v.hunger.toFixed(0)} food=${w.stock.food} label=${v.label} job=${v.jobKind} wait=${v.wait} sleeping=${v.sleeping} steps=${v.steps.length} cur=${v.cur&&v.cur.type} role=${v.role} cold=${w.cold} season=${w.season} health=${v.health.toFixed(0)} cause=${v.cause}`); if(why==='starved'&&n<=12){const i=v.ty*160+v.tx;const nb=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>{const j=(v.ty+dy)*160+v.tx+dx;return `t${w.terr[j]}/f${w.feat[j]}/b${w.blk[j]}/bp${w.bpAt.has(j)?1:0}`});const p=w.search(v.tx,v.ty,(x,y,j)=>w.nearStock(x,y,j));console.log('   at',v.tx,v.ty,'tile terr',w.terr[i],'feat',w.feat[i],'blk',w.blk[i],'pathToStore',p?p.length:null,'nbrs',nb.join(' '))} origKill(v,why)};
for(let t=0;t<1200*(+process.argv[3]||60);t++)w.step();
console.log('pop',w.vills.length,'causes',JSON.stringify(w.causes));
