// v0.21 bridges: crossings found, built tile by tile, walkable, kept by saves, docks stay open
const fs=require('fs'),vm=require('vm');
const code=['config','animals','villager','town','society','tech','water','trade','projects','history','buildings','places','neighbours','diplomacy','routes','mapgen','character','regime','strife','outposts','bridges','save','world'].map(f=>fs.readFileSync(__dirname+'/../src/'+f+'.js','utf8')).join('\n')+'\n;Object.assign(globalThis,{World,CFG,TERR,serializeWorld,deserializeWorld,findCrossings,bankReachable,bridgeValue,seaStaysOpen,BR,nextTile,landRegions});';
const ctx={console,Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('FAIL',m)}};
let found=null;
for(const [seed,map] of [[11,'river'],[12,'lakeland'],[13,'archipelago'],[14,'peninsula'],[15,'river'],[16,'lakeland'],[17,'island'],[18,'archipelago'],[19,'river'],[20,'lakeland']]){
  const w=new ctx.World(seed,{map});for(let t=0;t<1200*50;t++)w.step();
  const cs=ctx.findCrossings(w).filter(c=>c.near<48&&ctx.bankReachable(w,c));console.log(map,seed,'crossings',cs.length);
  if(cs.length){ const c=cs.sort((a,b)=>(b.newLand-a.newLand)||a.L-b.L)[0];const v=ctx.bridgeValue(w,c);console.log(' best L',c.L,'newLand',c.newLand,'same',c.same,'ratio',v.ratio.toFixed(2),'go',v.go,'open',ctx.seaStaysOpen(w,c.tiles));found={w,c,v};break}
}
ok(!!found,'some map offers a crossing');
if(found){const {w,c,v}=found;const B=ctx.BR(w);
  const b={id:B.next++,ax:c.ax,ay:c.ay,bx:c.bx,by:c.by,dx:c.dx,dy:c.dy,tiles:c.tiles.slice(),done:0,state:'building',mat:'timber',cost:{wood:3,stone:0},day:w.day,bp:null};B.list.push(b);ctx.nextTile(w,b);w.stock.wood=Math.max(w.stock.wood,120);
  for(let d=0;d<60&&b.state==='building';d++){for(let t=0;t<1200;t++)w.step();w.stock.wood=Math.max(w.stock.wood,80)}
  ok(b.state==='done','bridge finished: '+b.state+' '+b.done+'/'+b.tiles.length);
  ok(b.tiles.every(i=>w.terr[i]===ctx.TERR.BRIDGE),'tiles are bridge');
  const goal=(x,y)=>x===c.bx&&y===c.by;const p=w.search(c.ax,c.ay,goal,60);ok(p&&p.length<=c.L+2,'walkable straight across: '+(p&&p.length));
  const d=ctx.serializeWorld(w);const w2=ctx.deserializeWorld(JSON.parse(JSON.stringify(d)));ok(b.tiles.every(i=>w2.terr[i]===ctx.TERR.BRIDGE),'save keeps bridge');for(let t=0;t<1200*5;t++)w2.step();ok(w2.dbg.total===0,'no errors after load');
  ok(w.dbg.total===0,'no errors: '+[...w.dbg.errors.values()].map(e=>e.where+' '+e.msg).join(';'));
}
console.log(fail?'FAILED '+fail:'bridges passed '+pass);process.exit(fail?1:0);
