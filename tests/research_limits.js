// v0.27 unlocks registry, research limits (gates, rising cost, scholar capacity), Open knowledge, council voice, terraforming
const fs=require('fs'),vm=require('vm');
const code=['config','animals','villager','town','society','techtree','unlocks','tech','water','trade','projects','history','buildings','places','neighbours','diplomacy','routes','mapgen','character','regime','strife','lives','livelihoods','stats','concerns','outposts','bridges','terraform','save','world'].map(f=>fs.readFileSync(__dirname+'/../src/'+f+'.js','utf8')).join('\n')+'\n;Object.assign(globalThis,{World,CFG,TECHS,GATES,UNLOCK_ROWS,unlocksOf,techGaps,techAvailable,techAvailableRaw,techBlocked,techCost,scholarCap,addKnowledge,grantTech,openLevel,voiceNeed,techNeed,PHILOSOPHIES,TERRA,TERR,serializeWorld,deserializeWorld,villageAge});';
const ctx={console,Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('FAIL',m)}};
const T=ctx.TECHS,ids=Object.keys(T);
// registry
ok(ids.every(id=>ctx.UNLOCK_ROWS[id]),'every technology has a registry row: '+ids.filter(id=>!ctx.UNLOCK_ROWS[id]).join(','));
ok(Object.keys(ctx.UNLOCK_ROWS).every(id=>T[id]),'no registry row for an unknown technology');
ok(ids.every(id=>{const u=ctx.unlocksOf(id);return u.gives.length>0&&u.needs.every(g=>ctx.GATES[g])}),'every row has gives and valid gates');
ok(ctx.unlocksOf('masonry').gives.some(g=>/Library/.test(g)),'projects a tech opens are listed automatically');
// gates
const w=new ctx.World(41,{});w.stock.wood=0;w.stock.stone=0;for(const l of w.of('logcamp'))w.buildings.delete(l.id);
for(const id of ['tools','carpentry','oral'])w.tech.known[id]=1;
ok(ctx.techGaps(w,'lodges').includes('timber')||w.of('logcamp').length>0,'lodges need timber when there is none');
w.stock.wood=0;ok(!ctx.techAvailable(w).includes('lodges')||!ctx.techGaps(w,'lodges').length,'a gated technology is not offered');
ok(ctx.techBlocked(w).every(id=>ctx.techGaps(w,id).length>0),'blocked list holds only gated technologies');
w.stock.wood=200;ok(!ctx.techGaps(w,'lodges').length,'timber in store opens the gate');
// cost rises
const c0=ctx.techCost(w,'lodges');for(const id of ids.filter(i=>T[i].age===1).slice(0,6))w.tech.known[id]=1;ok(ctx.techCost(w,'lodges')>c0,'cost rises with knowledge: '+c0+' -> '+ctx.techCost(w,'lodges'));
w.settings.openKnowledge=1;const cr=ctx.techCost(w,'lodges');w.settings.openKnowledge=2;const cu=ctx.techCost(w,'lodges');w.settings.openKnowledge=0;
ok(cr<ctx.techCost(w,'lodges')&&cu<cr,'relaxed and unlimited are cheaper: '+ctx.techCost(w,'lodges')+'/'+cr+'/'+cu);
// scholar capacity
const w1=new ctx.World(42,{});w1.tech.today=0;w1.tech.points=0;const cap=ctx.scholarCap(w1);ctx.addKnowledge(w1,cap*10);
ok(w1.tech.points<cap*3,'a day cannot give much more than the scholar capacity: '+w1.tech.points.toFixed(1)+' vs cap '+cap.toFixed(1));
w1.settings.openKnowledge=1;ok(ctx.scholarCap(w1)>1.9*cap,'relaxed doubles capacity');
// open knowledge levels and Grant
const w5=new ctx.World(43,{});ok(!ctx.grantTech(w5,'plow'),'no grant while Open knowledge is off');
w5.settings.openKnowledge=1;ok(ctx.grantTech(w5,'plow')&&w5.tech.known.plow&&w5.tech.known.rotation&&w5.tech.known.granary&&w5.tech.known.ironwork,'grant also learns what it builds on');
w5.settings.openKnowledge=2;ok(ctx.techAvailable(w5).length===ids.length-Object.keys(w5.tech.known).length,'unlimited opens every unknown technology');
const w6=new ctx.World(44,{openKnowledge:2});ok(w6.sandbox===true,'a world created with Open knowledge is marked sandbox');
// council voice
const w7=new ctx.World(45,{});for(let i=0;i<30;i++)w7.stock.food=50;const base=ctx.voiceNeed(w7,'bows');w7.settings.philosophy='martial';ok(ctx.voiceNeed(w7,'bows')>base+0.2,'martial philosophy tilts toward war technologies');
w7.settings.philosophy='balanced';const members=w7.vills.slice(0,12).map(v=>v.id);w7.groups=[{id:99,members,platform:{focus:'safety'}}];w7.gov.ruling={gid:99};
ok(ctx.voiceNeed(w7,'bows')>base+0.05&&ctx.voiceNeed(w7,'bows')>ctx.voiceNeed(w7,'tools'),'a ruling circle pulls the agenda toward its platform');
w7.gov.ruling=null;const nr=ctx.voiceNeed(w7,'bows');ok(nr>base&&nr<ctx.voiceNeed.call(null,Object.assign(w7,{gov:{...w7.gov,ruling:{gid:99}}}),'bows'),'the ruling circle counts more than the others');
// research pace over a few years: gated or not, no errors
const w8=new ctx.World(46,{});for(let t=0;t<1200*40;t++)w8.step();ok(w8.dbg.total===0,'no errors in 40 days');
// terraforming
const w9=new ctx.World(47,{openKnowledge:2});for(const id of ['grading','drainage','terracing','dikes','reclamation','earthworks'])ctx.grantTech(w9,id);
w9.stock.wood=900;w9.stock.stone=900;w9.terra.next=0;const before=Array.from(w9.terr);let ev=0;w9.on&&0;
for(let d=0;d<260&&!w9.terra.built;d++){w9.stock.wood=Math.max(w9.stock.wood,500);w9.stock.stone=Math.max(w9.stock.stone,500);for(let t=0;t<1200;t++)w9.step()}
ok(w9.terra.built>0,'a terraforming work was done: '+w9.terra.built);
let changed=0;for(let i=0;i<before.length;i++)if(before[i]!==w9.terr[i])changed++;ok(changed>=3,'terrain changed: '+changed+' tiles');
const d=ctx.serializeWorld(w9);const w10=ctx.deserializeWorld(JSON.parse(JSON.stringify(d)));let same=0;for(const o of w9.terra.done)for(const i of o.tiles)if(w10.terr[i]===o.to)same++;
ok(w10.terra.done.length===w9.terra.done.length&&same>0&&w10.sandbox===true,'save keeps the works and the sandbox mark');
ok(w10.terr.every((v,i)=>v===w9.terr[i]),'loaded terrain equals saved terrain');
for(let t=0;t<1200*6;t++)w10.step();ok(w10.dbg.total===0,'no errors after load: '+[...w10.dbg.errors.values()].map(e=>e.where+' '+e.msg).join(';'));
console.log('research_limits: passed',pass,'failed',fail);process.exit(fail?1:0);
