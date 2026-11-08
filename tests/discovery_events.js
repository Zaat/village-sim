// v0.28 sites, materials, rumours, expeditions, lore, fish stocks, migration, research deals, unlock toasts, statistics
const fs=require('fs'),vm=require('vm');
const code=['config','animals','villager','town','society','techtree','unlocks','tech','water','trade','projects','history','buildings','places','neighbours','diplomacy','routes','mapgen','character','regime','strife','lives','livelihoods','stats','concerns','outposts','bridges','terraform','discovery','save','world'].map(f=>fs.readFileSync(__dirname+'/../src/'+f+'.js','utf8')).join('\n')+'\n;Object.assign(globalThis,{World,CFG,TERR,TECHS,GATES,SHIPS,SITE_KINDS,MAT_LIST,matOk,matSource,localMats,neighMats,loreFind,fishSpawn,deerHub,deerHubs,researchDealDay,rumourDay,discoveryDay,techGaps,techCost,discover,STAT_SERIES,serializeWorld,deserializeWorld,landRegions,compass,expedPending,SURVEY,triggerDay,worldTraits,expedFind,expedEnd,TRIGGERS});';
const ctx={console,Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('FAIL',m)}};
const faults=[];const run=(w,days)=>{const f0=w.fault.bind(w);w.fault=(k,e,en)=>{faults.push(k+': '+((e&&e.message)||e));return f0(k,e,en)};for(let d=0;d<days;d++)for(let t=0;t<1200;t++)w.step()};
// sites: deterministic, well placed, spaced
const a=new ctx.World(12,{});a.disc.gen||ctx.discoveryDay(a);const b=new ctx.World(12,{});ctx.discoveryDay(b);
ok(a.disc.sites.length>=12,'a map holds a dozen or more sites: '+a.disc.sites.length);
ok(JSON.stringify(a.disc.sites)===JSON.stringify(b.disc.sites),'sites come from the seed alone');
const reg=ctx.landRegions(a),home=reg.label[a.cy*ctx.CFG.W+a.cx];
ok(a.disc.sites.every(s=>{const i=s.y*ctx.CFG.W+s.x,K=ctx.SITE_KINDS[s.kind];return K.sea?a.terr[i]<=ctx.TERR.SHALLOW:reg.label[i]===home}),'land sites on the home landmass, sea sites on water');
ok(a.disc.sites.every((s,i)=>a.disc.sites.every((o,j)=>i===j||Math.hypot(s.x-o.x,s.y-o.y)>=9)),'sites keep their distance');
ok(a.disc.sites.every(s=>!s.known),'every seeded site starts hidden');
const c=new ctx.World(13,{});ctx.discoveryDay(c);ok(JSON.stringify(c.disc.sites)!==JSON.stringify(a.disc.sites),'other seed, other sites');
// materials
const lm=ctx.localMats(a);ok(lm.length===2&&lm[0]!==lm[1]&&lm.every(m=>ctx.MAT_LIST.includes(m)),'two different local materials: '+lm);
const w=new ctx.World(41,{});for(const id of Object.keys(ctx.TECHS))if(ctx.TECHS[id].age<=3)w.tech.known[id]=1;delete w.tech.known.steam;
for(const bld of w.of('minecamp'))w.buildings.delete(bld.id);
ok(!ctx.matOk(w,'coal')&&ctx.techGaps(w,'steam').includes('coal'),'steam is gated by coal when there is none');
w.disc.mats.coal=1;ok(ctx.matOk(w,'coal')&&!ctx.techGaps(w,'steam').includes('coal'),'a found source opens the gate');
ok(ctx.matSource(w,'coal')==='found','source reads found');
ok(['saltpetre','coal','copper','oil'].every(m=>ctx.GATES[m]),'a gate exists for each material');
// rumours
const r=new ctx.World(12,{});ctx.discoveryDay(r);r.tick=1200*20;r.disc.nextRumour=0;ctx.rumourDay(r);
const known=r.disc.sites.filter(s=>s.known);ok(known.length===1&&!ctx.SITE_KINDS[known[0].kind].sea,'the first rumour is a nearby land site (no boats yet): '+known.map(s=>s.kind));
// lore
const l=new ctx.World(41,{});l.tech.known.tools=1;l.tech.known.plow=1;delete l.tech.known.plow;l.tech.lostIds=['plow'];
const lr=ctx.loreFind(l,{kind:'ruin'});ok(l.tech.known.plow&&/lost knowledge/.test(lr),'old writings give back a forgotten technology');
// fish
const f=new ctx.World(12,{});let wi=-1;for(let i=0;i<f.terr.length;i++)if(f.terr[i]===ctx.TERR.SHALLOW&&f.terr[i+1]===ctx.TERR.SHALLOW&&f.terr[i-1]===ctx.TERR.SHALLOW){wi=i;break}
ok(wi>0,'found shallows');f.tick=0;const rate=()=>{let n=0;for(let t=0;t<200;t++){f.tick=t*7;if(ctx.fishSpawn(f,wi))n++}return n};
f.fish[wi]=0;f.fish[wi-1]=0;f.fish[wi+1]=0;f.fish[wi-ctx.CFG.W]=0;f.fish[wi+ctx.CFG.W]=0;const empty=rate();for(const k of [wi,wi-1,wi+1,wi-ctx.CFG.W,wi+ctx.CFG.W])f.fish[k]=ctx.CFG.FISH_MAX;const full=rate();
ok(full>empty+40,'emptied water recovers more slowly: '+empty+' vs '+full+' of 200');ok(empty>40,'but it does recover: '+empty);
f.tick=999;ok(ctx.fishSpawn(f,wi)===ctx.fishSpawn(f,wi),'fish spawning is deterministic');
// migration
const m=new ctx.World(12,{});const an={id:5};m.tick=1200*26;const hw=ctx.deerHub(m,an);m.tick=1200*10;const hs=ctx.deerHub(m,an);
ok(hw&&Math.hypot(hw.x-m.cx,hw.y-m.cy)>=14,'winter hub is well away from the village');ok(hs===null,'no drift in summer');m.tick=1200*2;ok(ctx.deerHub(m,an)&&Math.hypot(ctx.deerHub(m,an).x-m.cx,ctx.deerHub(m,an).y-m.cy)<14,'spring pulls herds back');
// research deal
const d=new ctx.World(41,{});d.tech.known.trade=1;d.tech.known.coinage=1;for(const id of ['tools','carpentry','oral','pottery'])d.tech.known[id]=1;
const nb=d.neigh[0];nb.found=true;nb.met=true;nb.rel=60;nb.kind=nb.kind||'scholars';const open=ctx.TECHS&&Object.keys(ctx.TECHS).filter(id=>!d.tech.known[id]&&ctx.TECHS[id].req.every(q=>d.tech.known[q]));
nb.knows=open.slice(0,2);d.econ.treasury=5000;d.disc.nextDeal=0;d.gov.council=[];ctx.researchDealDay(d);
ok(d.disc.deals===1&&nb.knows.some(id=>d.tech.known[id]),'a friendly neighbour sells lessons for coins');ok(d.econ.treasury<5000,'lessons cost coins');
// toast
const ds=new ctx.World(41,{});ds.tech.focus='nets';ds.tech.points=9999;ds.tech.known.tools=1;const said=[];const em=ds.emit.bind(ds);ds.emit=(t,x,dd)=>{said.push(x);return em(t,x,dd)};ctx.discover(ds);
ok(said.some(x=>/Discovery!.*It opens: /.test(x||'')),'the discovery message says what the technology opens: '+said[0]);
// stats series
ok(['blocked','caphit','works','wontiles','sitesknown','finds','mats','fishstock','deernear'].every(id=>ctx.STAT_SERIES.some(s=>s.id===id)),'new statistics series exist');
ok(ctx.STAT_SERIES.every(s=>!s.get||Number.isFinite(s.get(a))),'every series computes');
ok(ctx.SHIPS.barge&&ctx.SHIPS.barge.cap>0,'barge exists');
// v0.28.1: scarce deposits, survey crafts, triggered sites, world traits
{ const x=new ctx.World(12,{});ctx.discoveryDay(x);const dep=x.disc.sites.filter(q=>q.mat);
  ok(dep.length>=2&&dep.length<=4,'only a few deposits per map: '+dep.length);ok(new Set(dep.map(q=>q.mat)).size===dep.length,'one deposit per material');
  const loc=ctx.localMats(x);ok(loc.every(m=>dep.some(q=>q.mat===m&&Math.hypot(q.x-x.cx,q.y-x.cy)>=24&&Math.hypot(q.x-x.cx,q.y-x.cy)<=66)),'local materials have a deposit within reach');
  ok(x.disc.sites.filter(q=>!q.mat&&(q.kind==='cave'||q.kind==='outcrop')).length>=1,'most caves and outcrops hold nothing');
  const q=dep[0],v={health:100,name:'T',hunger:90,energy:90,mood:50},ex={site:q.id,mode:'land',state:'running'};const need=ctx.SURVEY[q.mat];delete x.tech.known[need];x.settings.disasters=false;
  ctx.expedFind(x,ex,v,q);ok(!x.disc.mats[q.mat]&&ex.unnamed,'without the craft the deposit is not recognised');
  ctx.expedEnd(x,ex,v,'ok');ok(!q.done&&q.uses>=1,'an unrecognised site can be visited again');
  x.tech.known[need]=1;const ex2={site:q.id,mode:'land',state:'running'};ctx.expedFind(x,ex2,v,q);ok(x.disc.mats[q.mat],'with the craft the deposit is found');
  // friendly-only trade
  const y=new ctx.World(41,{});y.tech.known.trade=1;const n=y.neigh[0];n.found=true;n.met=true;n.rel=30;const m=ctx.neighMats(y,n)[0];ok(!ctx.matOk(y,m),'a cool neighbour sells nothing');n.rel=60;ok(ctx.matOk(y,m),'a friendly one does');
  // triggered sites
  const z=new ctx.World(12,{});ctx.discoveryDay(z);const n0=z.disc.sites.length;z.tech.known.divingbell=1;ctx.discoveryDay(z);ok(z.disc.sites.some(q=>q.kind==='deepwreck'&&q.known),'diving bells reveal deep wrecks');
  ok(z.disc.sites.length>n0,'new sites were added');const n1=z.disc.sites.length;ctx.discoveryDay(z);ok(z.disc.sites.length===n1,'a trigger fires once');
  // world traits
  const tr=ctx.worldTraits(new ctx.World(5,{map:'continent'}));ok(tr.length>=6&&tr.every(r=>r[0]&&r[1]),'world traits list: '+tr.map(r=>r[0]).join(','));ok(tr.some(r=>r[0]==='Barges'),'barge line present');
}
// a long run: expeditions happen, nobody breaks, save and load keep the book
const g=new ctx.World(12,{});run(g,32*10);const D=g.disc;
ok(D.done>=3,'the village sends expeditions: '+D.done);ok(D.sites.some(s=>s.done&&ctx.SITE_KINDS[s.kind].sea)||D.sites.some(s=>s.done&&!ctx.SITE_KINDS[s.kind].sea),'at least one site visited');
ok(Object.keys(D.mats).length>0||D.done>0,'finds recorded');ok(faults.length===0,'no faults: '+faults.slice(0,3).join(' | '));
const s=ctx.serializeWorld(g),g2=ctx.deserializeWorld(JSON.parse(JSON.stringify(s)));
ok(g2.disc.sites.length===D.sites.length&&g2.disc.done===D.done&&JSON.stringify(g2.disc.mats)===JSON.stringify(D.mats),'save keeps sites, finds and materials');
ok(g2.disc.exped.every(e=>e.state==='done'),'a running expedition is cancelled on load');
console.log(`discovery_events: ${pass} passed, ${fail} failed`);process.exit(fail?1:0);
