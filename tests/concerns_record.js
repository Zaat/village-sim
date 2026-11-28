// v0.40 council record: outcomes (answered, eased, ended badly), severity points, rating and title, no effect on the random stream
const fs=require('fs'),vm=require('vm'),path=require('path');
const code=require('./lib').SRC.map(f=>fs.readFileSync(path.join(__dirname,'..','src',f+'.js'),'utf8')).join('\n')+'\n;Object.assign(globalThis,{World,CFG,CN,concernsDay,respond,councilRecord,concernRecord,concernPoints});';
const ctx={console:{log(){},error(){}},Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m)}};
const day=(w,n=1)=>{for(let d=0;d<n;d++){for(let t=0;t<1200;t++)w.step()}};
const nextDay=w=>ctx.concernsDay(w);
require('./lib').oldPace(ctx.CFG);const w=new ctx.World(32,{map:'island'});day(w,60);const C=ctx.CN(w);
ok(Array.isArray(C.log),'the record list exists');
const fake=(key,sev,since,acts,extra)=>Object.assign({id:900+Math.random(),key,title:'Test '+key,sev,max:sev,since,text:'t',acts:acts||[],miss:0,base:{sec:0,op:0,pop:w.pop},deep:0},extra||{});
// points: watch 1, critical 3, +1 for a month, +1 for a full gauge, never above 5
ok(ctx.concernPoints({max:1,since:10,deep:0},20)===1,'a short watch is worth 1');
ok(ctx.concernPoints({max:2,since:10,deep:0},20)===3,'a critical concern is worth 3');
ok(ctx.concernPoints({max:2,since:10,deep:1},60)===5,'critical, long and deep is worth 5 and no more');
// outcomes
let r;const base0=ctx.councilRecord(w).n;
r=ctx.concernRecord(w,C,fake('a',2,w.day-10,[{status:'heeded'}]));ok(r.out==='answered'&&r.pts===3,'a response was tried: answered');
r=ctx.concernRecord(w,C,fake('b',1,w.day-10,[]));ok(r.out==='eased','no response: eased on its own');
r=ctx.concernRecord(w,C,fake('c',1,w.day-10,[{status:'declined'}]));ok(r.out==='eased','a declined request does not count as an answer');
w.strife.secessions++;r=ctx.concernRecord(w,C,fake('d',2,w.day-10,[{status:'heeded'}]));ok(r.out==='bad','a circle sailing away during the concern: ended badly');
w.strife.secessions--;
const last=C.log[C.log.length-1];ok(last.out==='bad'&&last.got===-3,'an ending badly takes the points away: '+last.got);
// rating and title
const rec=ctx.councilRecord(w);ok(rec.total>=4&&rec.poss>0&&rec.rating>=0&&rec.rating<=1,'record adds up: '+JSON.stringify({t:rec.total,g:rec.got,p:rec.poss,r:rec.rating}));
ok(rec.n.answered-base0.answered===1&&rec.n.eased-base0.eased===2&&rec.n.bad-base0.bad===1,'counts per outcome');ok(typeof rec.title==='string'&&rec.title.length>3,'a title is given: '+rec.title);
const fresh=new ctx.World(5,{map:'island'});ok(ctx.councilRecord(fresh).title==='Too early to say','a new village has no rating yet');
// a real concern runs its course into the record
w.stock.food=Math.floor(w.vills.length*0.8);nextDay(w);const f=C.list.find(c=>c.key==='food');ok(f&&f.base&&f.base.pop===w.pop,'a raised concern remembers the start');
ctx.respond(w,'ration','food');w.stock.food=w.vills.length*8;C.snap=[{d:w.day-20,c:{...w.causes}}];const n0=C.log.length;for(let i=0;i<5;i++)nextDay(w);
const fe=C.log.slice(n0).find(e=>e.k==='food');ok(fe&&fe.out==='answered','the food concern ended as answered in the record: '+JSON.stringify(C.log.slice(n0).map(e=>e.k+':'+e.out)));
const fh=C.hist.find(h=>h.key==='food');ok(fh&&fh.out==='answered'&&fh.pts>=1,'the recent list carries the outcome and points');
// no random numbers: the record does not move the random stream
const a=new ctx.World(77,{map:'island'}),b2=new ctx.World(77,{map:'island'});day(a,8);day(b2,8);ctx.councilRecord(a);ctx.councilRecord(a);
ok(a.r()===b2.r(),'reading the record does not change the random stream');
// an old save without a record list loads
delete C.log;ok(ctx.councilRecord(w).total>=0&&Array.isArray(ctx.CN(w).log),'a concerns state without a record list is repaired');
console.log(fail?'FAILED '+fail:'concerns_record ok');process.exit(fail?1:0);
