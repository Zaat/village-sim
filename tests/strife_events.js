// Forces each strife event and checks it behaves: node tests/strife_events.js
const fs=require('fs'),vm=require('vm'),path=require('path');
const code=require('./lib').SRC.map(f=>fs.readFileSync(path.join(__dirname,'..','src',f+'.js'),'utf8')).join('\n')+'\n;Object.assign(globalThis,{World,CFG,vOf,regimeDay,strifeDay,shadowDay,respondShadow,startCivil,civilDay,secede,sectDay,strikeDay,respondStrike,secessionTalks,adultsOf,chiefOf,serializeWorld,deserializeWorld,projBuilt,projAvailable,rxFrom,rxBuildings,deliberate,ISSUES,PROJECTS,NEIGH_PROFILE});';
const ctx={console,Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
const w=new ctx.World(777);for(let d=1;d<=90;d++){for(let t=0;t<1200;t++)w.step()}
const log=[];w.listeners.push((t,txt)=>{if(t==='regime'||t==='diplomacy')log.push(`[${t}] ${txt}`)});
const R=w.regime,S=w.strife,ad=()=>ctx.adultsOf(w),realDeliberate=ctx.deliberate;
const choose=id=>{ctx.deliberate=(w_,req)=>req.apply(id,[],'','rules')};const restore=()=>{ctx.deliberate=realDeliberate};
let ok=0,bad=0;const check=(name,cond,extra)=>{console.log((cond?'PASS ':'FAIL ')+name+(extra?'  '+extra:''));cond?ok++:bad++};
// a discontented circle of the first adults who are not on the council
const mkCircle=(n,name)=>{const council=new Set(w.gov.council.map(c=>c.id)),taken=new Set(w.vills.filter(v=>v.partner==null&&false).map(v=>v.id));const ms=ad().filter(v=>!council.has(v.id)&&v.age<60&&!taken.has(v.id)).slice(0,n);const g={id:-5,members:ms.map(v=>v.id),name,op:{growth:0.8,labor:-0.6,law:0.2,defense:0,tax:-0.7},leader:ms[0].id};for(const v of ms){v.group=null;v.mood=15;v.op={growth:0.8,labor:-0.6,law:0.2,defense:0,tax:-0.7}}return {g,ms}};
let C=mkCircle(7,'The Hearth Keepers');
const pop0=w.vills.length;
// 1 rival council forms
{R.ax.cohes=0.3;S.lastShadow=-999;S.shadow=null;S.truceUntil=0;const o=w.rng;w.rng=()=>0.0005;try{ctx.shadowDay(w,ad())}finally{w.rng=o}check('rival council forms',!!S.shadow&&S.shadow.ids.filter(i=>C.g.members.includes(i)).length>=5,S.shadow&&S.shadow.name+' / '+S.shadow.leaderName+' / '+(S.shadow&&S.shadow.ids.length))}
// 2 seat at the table absorbs it
{const sh=S.shadow,bl={name:sh.name,members:sh.ids,op:sh.op};choose('seat');const n0=w.gov.council.length,pol0=w.gov.policy.growth;ctx.respondShadow(w,sh,bl,w.vills.find(v=>v.id===sh.leader),C.ms,ctx.chiefOf(w));restore();check('seating the rival ends the rival council',!S.shadow&&w.gov.council.some(c=>c.id===sh.leader),'policy growth '+pol0.toFixed(2)+' -> '+w.gov.policy.growth.toFixed(2))}
// 3 crushing it
{S.lastShadow=-999;S.shadow={ids:C.g.members,op:C.g.op,name:C.g.name,leader:C.ms[0].id,leaderName:C.ms[0].name,since:w.day-5,days:5,asked:true};choose('crush');const p0=R.purges,o3=w.rng;w.rng=()=>0.97;try{ctx.respondShadow(w,S.shadow,C.g,C.ms[0],C.ms,ctx.chiefOf(w))}finally{w.rng=o3}restore();check('crushing it jails the leader',!S.shadow&&C.ms[0].stocksUntil>w.tick&&R.purges>p0)}
// 4 strike
{S.lastStrike=-999;S.strike=null;w.regime.ax.auth=0.5;w.regime.ax.cohes=0.4;for(const v of C.ms){v.mood=15}const o=w.rng;w.rng=()=>0.0005;try{ctx.strikeDay(w,ad())}finally{w.rng=o}check('strike begins',!!S.strike&&S.strike.ids.length>=3&&ctx.vOf(w,S.strike.ids).every(v=>v.strikeUntil>w.tick),S.strike&&S.strike.issue);
  // a striker walks to the square and idles
  for(let t=0;t<1200*0.5;t++)w.step();const kinds=S.strike?S.strike.ids.map(i=>w.vills.find(v=>v.id===i)).filter(Boolean).map(v=>v.jobKind):[];check('strikers go idle',kinds.filter(k=>k==='strike').length>=1||!S.strike,kinds.join(','));
  if(S.strike){const issue=S.strike.issue,p0=w.gov.policy[issue],dir=S.strike.dir;choose('concede');ctx.respondStrike(w,S.strike);restore();check('conceding shifts policy and ends the strike',!S.strike&&Math.sign(w.gov.policy[issue]-p0)===dir||p0===w.gov.policy[issue],`${issue} ${p0.toFixed(2)} -> ${w.gov.policy[issue].toFixed(2)}`)}
  S.strike={gid:C.g.id,name:C.g.name,ids:C.ms.map(v=>v.id),issue:'tax',dir:1,since:w.day,until:w.day+5,asked:true};choose('break');ctx.respondStrike(w,S.strike);restore();check('breaking the strike jails leaders',!S.strike&&C.ms.some(v=>v.stocksUntil>w.tick))}
// 5 civil strife runs to an end
{for(const v of C.ms){v.trait.brave=0.9;v.health=100}S.shadow={ids:C.g.members,op:C.g.op,name:C.g.name,leader:C.ms[0].id,leaderName:C.ms[0].name,since:w.day-9,days:9,asked:true};S.truceUntil=0;ctx.startCivil(w,ad(),C.g,C.ms[0],C.ms);check('civil strife starts',!!S.civil);
  const cl0=S.clashes;let n=0;while(S.civil&&n++<12){ctx.civilDay(w,ad())}check('civil strife ends and costs something',!S.civil&&S.clashes>cl0&&S.truceUntil>w.day,`rounds ${n}, dead ${S.casualties}, label ${R.label}`)}
// 6 secession founds a neighbour
{C=mkCircle(6,'The Salt Walkers');const nn0=w.neigh.length,pop1=w.vills.length,rel=C.ms[0];ctx.secede(w,C.g,rel,'peace');const nb=w.neigh[w.neigh.length-1];
  check('secession founds a settlement',w.neigh.length===nn0+1&&nb.colony&&nb.found&&nb.met,nb.name+' '+nb.kind+' pop '+nb.pop);
  check('the seceders left the village',w.vills.length<=pop1-6&&!w.vills.some(v=>v.id===C.ms[0].id));
  check('peaceful parting is warm',nb.rel>0&&nb.rel<=40,'rel '+nb.rel);
  C=mkCircle(5,'The Bitter Shore');ctx.secede(w,C.g,C.ms[0],'flight');const nb2=w.neigh[w.neigh.length-1];check('bitter parting is cold',nb2.colony&&nb2.rel<0,nb2.name+' rel '+nb2.rel);
  // neighbour life carries on with it
  for(let d=0;d<30;d++){for(let t=0;t<1200;t++)w.step()}check('colonies live on without errors',w.dbg.total===0,w.dbg.total+' errors')}
// 7 save/load keeps the colonies and the strife record
{const json=JSON.stringify(ctx.serializeWorld(w));const L=ctx.deserializeWorld(JSON.parse(json));check('save keeps colonies',L.neigh.filter(n=>n.colony).length===w.neigh.filter(n=>n.colony).length&&L.strife.secessions===w.strife.secessions,L.neigh.filter(n=>n.colony).length+' colonies');for(let t=0;t<1200*5;t++)L.step();check('loaded world runs',L.dbg.total===0)}
// 8 sects
{S.sect=null;S.lastSchism=-999;const f=ad().filter(v=>v.age<65).sort((a,b)=>b.charisma()-a.charisma())[0];f.char.piety=0.95;f.char.ruth=0.9;R.prophet={id:f.id,name:f.name,since:w.day-30};for(const v of ad())if(v!==f&&v.age<60)v.char.piety=Math.max(v.char.piety,0.7);
  choose('suppress');const o=w.rng;w.rng=()=>0.0005;try{ctx.sectDay(w,ad())}finally{w.rng=o}restore();check('a sect is founded',!!S.sect&&['zealots','ascetics','reformers'].includes(S.sect.doctrine)&&S.sect.members.length>=4,S.sect&&S.sect.name+' '+S.sect.doctrine+' '+S.sect.members.length);
  check('suppression is applied',S.sect&&S.sect.stance==='suppressed'&&f.stocksUntil>w.tick);
  const ms=S.sect.members.map(i=>w.vills.find(v=>v.id===i)).filter(Boolean);for(let i=0;i<5;i++)ctx.sectDay(w,ad());check('sect daily effects run',S.sect&&w.dbg.total===0);
  S.sect.stance='embraced';S.sect.doctrine='zealots';const p0=R.ax.pious;for(let i=0;i<20;i++)ctx.sectDay(w,ad());check('an embraced zealot sect pushes faith up',R.ax.pious>=p0,p0.toFixed(3)+' -> '+R.ax.pious.toFixed(3));
  S.sect.members=S.sect.members.slice(0,2);ctx.sectDay(w,ad());check('a sect with no followers dies out',!S.sect)}
// 9 regime buildings
{w.proj.done={};R.ax.indus=0.8;R.ax.auth=0.8;R.ax.pious=0.8;w.tech.known.ironwork=24;w.tech.known.masonry=24;w.tech.known.watchtowers=24;ctx.regimeDay(w);const base={prod:w.rx.prod,crime:w.rx.crime,def:w.rx.def};
  w.proj.done.foundry={day:1};w.proj.done.temple={day:1};w.proj.done.citadel={day:1};w.proj.done.bastion={day:1};ctx.regimeDay(w);
  check('foundry speeds work',w.rx.prod>base.prod*1.05,base.prod.toFixed(3)+' -> '+w.rx.prod.toFixed(3));check('temple and citadel cow crime',w.rx.crime<base.crime*0.8,base.crime.toFixed(3)+' -> '+w.rx.crime.toFixed(3));check('citadel adds defence',w.rx.def>=base.def+1.4);
  w.proj.done={};R.ax.indus=0.9;const av=ctx.projAvailable(w);check('regime buildings become available for a fitting regime',av.includes('foundry')&&av.includes('temple'),av.join(','))}
console.log('\nrecent events:\n  '+log.slice(-10).join('\n  '));
console.log(`\n${ok} passed, ${bad} failed`);process.exit(bad?1:0);
