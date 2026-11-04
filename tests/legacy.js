// Old-size worlds still work, and the home island is identical in the wider map.
const fs=require('fs'),vm=require('vm'),path=require('path');
const code=['config','animals','villager','town','society','techtree','tech','water','trade','projects','history','buildings','places','neighbours','diplomacy','routes','mapgen','character','regime','strife','lives','livelihoods','stats','concerns','outposts','bridges','save','world'].map(f=>fs.readFileSync(path.join(__dirname,'..','src',f+'.js'),'utf8')).join('\n')+'\n;Object.assign(globalThis,{World,CFG,serializeWorld,deserializeWorld});';
const ctx={console,Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
const a=new ctx.World(777,{}, [160,112]); const A=Array.from(a.terr), fa=Array.from(a.feat), ca=[a.cx,a.cy]; const wa=ctx.CFG.W;
const b=new ctx.World(777); const Wb=ctx.CFG.W, ox=b.ox, oy=b.oy; let diff=0,fdiff=0;
for(let y=0;y<112;y++)for(let x=0;x<160;x++){if(A[y*wa+x]!==b.terr[(y+oy)*Wb+x+ox])diff++;if(fa[y*wa+x]!==b.feat[(y+oy)*Wb+x+ox])fdiff++}
console.log('home camp legacy',ca,'wide',[b.cx-ox,b.cy-oy],'terrain diffs',diff,'feature diffs',fdiff);
// a legacy save: no dims/neigh/seen
const L=new ctx.World(31,{}, [160,112]); for(let t=0;t<1200*20;t++)L.step();
const d=JSON.parse(JSON.stringify(ctx.serializeWorld(L))); delete d.dims; delete d.neigh; delete d.seen;
ctx.CFG.W=260; ctx.CFG.H=180;                                  // as if a wide world were open
const R=ctx.deserializeWorld(d); console.log('legacy load dims',ctx.CFG.W+'x'+ctx.CFG.H,'fog',R.fog,'neigh',R.neigh,'pop',R.vills.length);
for(let t=0;t<1200*10;t++)R.step(); console.log('legacy ran 10 days, errors',R.dbg.total,'pop',R.vills.length);
