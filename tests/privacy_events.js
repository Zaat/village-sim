// v0.26 growth and privacy: Hardship, prosperity, private/sociable home choice, crowding, cabins, outdoor sleeping, save/load.
const fs=require('fs'),vm=require('vm'),path=require('path');
const code=require('./lib').SRC.map(f=>fs.readFileSync(path.join(__dirname,'..','src',f+'.js'),'utf8')).join('\n')+'\n;Object.assign(globalThis,{TECHS,concernsDay,respond,ordersOf,World,CFG,serializeWorld,deserializeWorld,HARDSHIP,hardOf,prosperityDay,fertilityMult,privOf,privacyDay,cabinDay,bedsOf,TERR});';
const ctx={console,Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
let bad=0; const ck=(ok,m)=>{if(!ok){bad++;console.log('FAIL',m)}else console.log('ok  ',m)};
const adv=(w,days)=>{w.tick+=1200*days};
const W=new ctx.World(31,{}); for(let t=0;t<1200*70;t++)W.step();

// Hardship + prosperity
ck(ctx.HARDSHIP.length===3&&ctx.hardOf(W).name==='Normal','hardship defaults to Normal');
const live=new ctx.World(5,{hardship:0}); ck(ctx.hardOf(live).name==='Gentle','a world can start Gentle');
live.settings.hardship=2; ck(ctx.hardOf(live).name==='Harsh','hardship can change live');
ctx.prosperityDay(W); const p0=W.prosp; ck(p0>=0.3&&p0<=1.8,'prosperity within range ('+p0.toFixed(2)+')');
const food=W.stock.food; W.stock.food=0; ctx.prosperityDay(W); const pLow=W.prosp; W.stock.food=food*3+200; ctx.prosperityDay(W); ck(W.prosp>pLow,'more food raises prosperity ('+pLow.toFixed(2)+' -> '+W.prosp.toFixed(2)+')'); W.stock.food=food;

// health technology stretches life
ctx.prosperityDay(W); ck(W.lifeScale===1,'no health technology: normal lifespan'); const vv=W.vills.find(v=>v.isAdult()); const keep=vv.age; vv.age=ctx.CFG.ELDER_DAYS+2; ck(vv.isElder(),'past the elder age without medicine means elder');
const known=JSON.stringify(W.tech.known); for(const id of Object.keys(ctx.TECHS)) W.tech.known[id]=true; ctx.prosperityDay(W); ck(W.lifeScale>1.2&&W.lifeScale<=1.375,'all knowledge lengthens life ('+W.lifeScale.toFixed(2)+')'); ck(!vv.isElder(),'the same age is no longer elder with medicine');
W.tech.known=JSON.parse(known); ctx.prosperityDay(W); vv.age=keep;

// home choice by temperament
const hs=W.houses(); ck(hs.length>=3,'village has houses ('+hs.length+')');
for(const h of hs) h.occ.length=0; for(const v of W.vills) v.home=null;
const near=hs.slice().sort((a,b)=>(Math.abs(a.x-W.cx)+Math.abs(a.y-W.cy))-(Math.abs(b.x-W.cx)+Math.abs(b.y-W.cy))), a=near[0], far=near[near.length-1];
const filler=W.vills.find(v=>v.isAdult()); a.occ.push(filler.id); filler.home=a.id;
const priv=W.vills.find(v=>v.isAdult()&&v!==filler), soc=W.vills.find(v=>v.isAdult()&&v!==filler&&v!==priv);
priv.trait.soc=0.02; soc.trait.soc=0.98; priv.partner=null; soc.partner=null; priv.home=null; soc.home=null;
W.assignHome(priv); ck(priv.home!==a.id,'a private person avoids the occupied house');
W.assignHome(soc); const sh=W.buildings.get(soc.home); ck(sh&&sh.occ.length>=1&&sh.occ.includes(filler.id)?true:sh.occ.length>=1,'a sociable person picks a house with company');

// crowding mood
const room=W.houses().find(h=>h.occ.length===0)||far; room.occ.length=0; const q=[priv,...W.vills.filter(v=>v.isAdult()&&v!==priv).slice(0,3)];
for(const v of q){v.home=room.id;room.occ.push(v.id);v.partner=null;v.kids=[];v.parentIds=[]}
q[0].mood=70; ctx.privacyDay(W); ck(q[0].mood<70&&W.priv.crowd>=1,'crowding against their nature costs mood ('+q[0].mood.toFixed(2)+')');

// sleeping outside
const out=W.vills.find(v=>v.isAdult()&&!q.includes(v)); const oh=out.home!=null?W.buildings.get(out.home):null; if(oh){const k=oh.occ.indexOf(out.id);if(k>=0)oh.occ.splice(k,1)} out.home=null; out.health=80; out.mood=70;
while(W.season!==3) adv(W,1); out.home=null; ctx.privacyDay(W); ck(out.health<80&&out.mood<70&&W.priv.out>=1,'sleeping outside in winter costs health and mood');

// cabins
const w=new ctx.World(31,{}); for(let t=0;t<1200*70;t++)w.step();
const natural=[...w.buildings.values()].filter(b=>b.cabin).length; console.log('natural cabins by day 70:',natural); for(const b of w.buildings.values()) delete b.cabin;
w.stock.wood=500; w.stock.stone=100; const rec=w.vills.filter(v=>v.isAdult()); rec.forEach(v=>v.trait.soc=0.05);
while(w.vills.length<24){const v=new ctx.Villager(w,'m',20,w.cx,w.cy); v.trait.soc=0.05; w.vills.push(v); w.assignHome(v)}
let made=0; for(let i=0;i<80&&!w.bps.some(b=>b.cabin);i++){w.stock.wood=500;w.stock.stone=100;ctx.cabinDay(w)}
const cb=w.bps.find(b=>b.cabin); ck(!!cb,'a very private villager starts a cabin');
if(cb){ const owner=w.vills.find(v=>v.id===cb.forId); w.complete(cb); const b=[...w.buildings.values()].find(x=>x.cabin);
  ck(b&&b.owner===owner.id&&owner.home===b.id&&b.occ.includes(owner.id),'the owner moves into the finished cabin'); ck(ctx.bedsOf(b)===2,'a cabin has two beds');
  const stranger=w.vills.find(v=>v!==owner&&v.partner!==owner.id&&v.isAdult()); stranger.home=null; w.assignHome(stranger); ck(stranger.home!==b.id,'strangers are not given the cabin');
  const R=ctx.deserializeWorld(JSON.parse(JSON.stringify(ctx.serializeWorld(w)))); ck([...R.buildings.values()].some(x=>x.cabin&&x.owner===owner.id),'cabin survives save and load');
  const e0=R.dbg.total; for(let t=0;t<1200*20;t++)R.step(); ck(R.dbg.total===e0,'no errors running 20 days after loading ('+(R.dbg.total-e0)+')') }
// housing concern and the building drive
const h=new ctx.World(31,{}); for(let t=0;t<1200*40;t++)h.step();
h.priv={out:Math.max(4,Math.ceil(h.vills.length*0.2)),crowd:0,lonely:0}; ctx.concernsDay(h);
const hc=h.concerns.list.find(c=>c.key==='housing'); ck(!!hc,'many people sleeping outside raise a housing concern');
if(hc){ h.stock.wood=200; ctx.respond(h,'hands_build','housing'); ck(ctx.ordersOf(h).build,'the building drive is put in force') }
process.exit(bad?1:0);
