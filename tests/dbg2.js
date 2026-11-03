const fs=require('fs'),vm=require('vm'),path=require('path');const dir=path.join(__dirname,'..','src');
const code=['config','animals','villager','town','society','techtree','tech','water','trade','projects','history','buildings','places','neighbours','diplomacy','routes','mapgen','character','regime','strife','lives','stats','outposts','bridges','save','world'].map(f=>fs.readFileSync(path.join(dir,f+'.js'),'utf8')).join('\n')+'\n;globalThis.World=World;globalThis.CFG=CFG;globalThis.NB=NB;';
const ctx={console};vm.createContext(ctx);vm.runInContext(code,ctx);
const w=new ctx.World(12345);let shown=0;
for(let t=0;t<1200*40&&shown<3;t++){w.step();
  for(const v of w.vills){ if(v.hunger<6&&w.stock.food>0&&v.label==='To the stores'&&shown<3){
    const i=v.ty*160+v.tx; const p=w.search(v.tx,v.ty,(x,y,j)=>w.nearStock(x,y,j));
    console.log(`D${w.day} ${v.name} at (${v.tx},${v.ty}) terr=${w.terr[i]} feat=${w.feat[i]} blk=${w.blk[i]} bmap=${w.bmap[i]} pathFound=${!!p} len=${p&&p.length}`);
    const nb=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>{const j=(v.ty+dy)*160+v.tx+dx;return `${w.terr[j]}/${w.feat[j]}/${w.blk[j]}/w${w.walkable(j)?1:0}`}); console.log(' neighbors',nb.join(' '));
    console.log(' storeAdj count',w.storeAdj.reduce((a,b)=>a+b,0),'stores',w.of('store').map(s=>s.x+','+s.y).join(' '),'steps',v.steps.length,'cur',v.cur&&v.cur.type,'failUntil',JSON.stringify(v.failUntil));
    shown++; }}
}
