// v0.29 voices: thoughts from real state, three sizes, no effect on the simulation, chats, summaries, save, statistics
const fs=require('fs'),vm=require('vm');
const files=require('./lib').SRC;
const code=files.map(f=>fs.readFileSync(__dirname+'/../src/'+f+'.js','utf8')).join('\n')+'\n;Object.assign(globalThis,{World,CFG,TECHS,thinkOf,voiceChat,voicesTick,voicesDay,voiceDigest,VCATS,VCAT,WORRY,VOICE_PERIOD,serializeWorld,deserializeWorld,STAT_SERIES,ST,statsEnsure});';
const ctx={console,Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('FAIL',m)}};
const faults=[];const run=(w,days)=>{const f0=w.fault.bind(w);w.fault=(k,e,en)=>{faults.push(k+': '+((e&&e.message)||e));return f0(k,e,en)};for(let d=0;d<days;d++)for(let t=0;t<1200;t++)w.step()};
// a village that has lived a while
const w=new ctx.World(12,{});run(w,40);
ok(faults.length===0,'no faults: '+faults.slice(0,2));
ok(w.vills.filter(v=>v.th).length>=w.vills.length*0.8,'most villagers have had a thought: '+w.vills.filter(v=>v.th).length+'/'+w.vills.length);
ok(w.vills.filter(v=>v.th).every(v=>v.th.long&&v.th.short&&v.th.emo&&v.th.short.length<=14&&v.th.long.length<=110),'every thought has a full line, a few words and a glyph');
ok(w.vills.every(v=>!v.thh||v.thh.length<=8),'thought history is capped');
// pure: the same state and slot give the same thought, and no random numbers are used
{const v=w.vills.find(x=>x.age>=ctx.CFG.ADULT_DAYS&&!x.sleeping),r0=w.r;let calls=0;w.r=()=>{calls++;return r0.call(w)};const a=ctx.thinkOf(w,v,77),b=ctx.thinkOf(w,v,77);w.r=r0;ok(JSON.stringify(a)===JSON.stringify(b),'thinkOf is pure');ok(calls===0,'thinking consumes no random numbers');}
// content follows real state
const adult=()=>w.vills.find(x=>x.age>=ctx.CFG.ADULT_DAYS&&!x.sleeping&&x.partner==null);
const cats=(v,mut,n=40)=>{const save={...mut.keep};const o={};for(let s=0;s<n;s++){const t=ctx.thinkOf(w,v,s);if(t)o[t.cat]=(o[t.cat]||0)+1}return o};
{const v=adult(),h=v.hunger,dr=w.drought,hr=w.harsh;w.drought=false;w.harsh=false;v.hunger=8;const c=cats(v,{keep:{}});v.hunger=h;w.drought=dr;w.harsh=hr;ok((c.hunger||0)>=n(c,0.45),'a starving villager mostly thinks about hunger: '+JSON.stringify(c))}
function n(c,f){return Object.values(c).reduce((a,b)=>a+b,0)*f}
{const v=adult(),m=v.mournUntil;v.mournUntil=w.tick+5000;const c=cats(v,{keep:{}});v.mournUntil=m;ok((c.grief||0)>=n(c,0.3),'a mourner thinks of grief: '+JSON.stringify(c))}
{const v=adult(),p=v.preg;v.preg=3;const c=cats(v,{keep:{}});v.preg=p;ok((c.baby||0)>=n(c,0.2),'an expecting mother thinks of the baby: '+JSON.stringify(c))}
{const v=w.vills.find(x=>x.age>=ctx.CFG.INFANT_DAYS&&x.age<ctx.CFG.CHILD_DAYS*1.5&&(x.stage()==='child'||x.stage()==='youth')&&!x.sleeping);if(v){const c=cats(v,{keep:{}});ok((c.play||0)>=n(c,0.4),'children think of play and lessons: '+JSON.stringify(c))}else ok(true,'(no child in this run)')}
{const v=adult(),s=v.sleeping;v.sleeping=true;const t=ctx.thinkOf(w,v,3);v.sleeping=s;ok(t&&t.kind==='dream'&&t.emo==='z','the sleeping dream');}
{const v=adult();const fs0=w.festival,hd=w.holiday;w.festival=true;w.holiday='Harvest Festival';const c=cats(v,{keep:{}});w.festival=fs0;w.holiday=hd;ok((c.feast||0)>=n(c,0.15),'a festival is on their mind: '+JSON.stringify(c))}
{const v=adult();const sn=w.season,dr=w.drought,hr=w.harsh;w.drought=false;w.harsh=false;w.tick=1200*26;const f=w.stock.food;w.stock.food=2;const c=cats(v,{keep:{}});w.stock.food=f;w.drought=dr;w.harsh=hr;ok((c.winter||0)>=n(c,0.15),'thin stores in winter are a worry: '+JSON.stringify(c))}
// thoughts at a news item: a discovery in the last days
{const v=adult();w.tech.log.unshift({id:Object.keys(ctx.TECHS)[0],day:w.day,by:null});const c=cats(v,{keep:{}});w.tech.log.shift();ok((c.news||0)>0,'a fresh discovery is talked about: '+JSON.stringify(c))}
{const v=adult(),D=w.disc;D.log.unshift({day:w.day,text:'Marek returns from an outcrop of dark stone with 18 loads of goods, a source of copper.'});const c=cats(v,{keep:{}});D.log.shift();ok((c.finds||0)>0,'a new source of a material is talked about: '+JSON.stringify(c));D.log.unshift({day:w.day,text:'Eryk returns with strange stone nobody can name yet.'});const c2=cats(v,{keep:{}});D.log.shift();ok((c2.finds||0)>0,'strange stone is talked about')}
// chats: two lines, the answer a moment later; hostile pair is cold
{const A=w.vills.filter(x=>x.age>=ctx.CFG.ADULT_DAYS);const a=A[0],b=A[1];w.tick+=100;ctx.voiceChat(w,a,b);ok(a.th.kind==='say'&&b.th.kind==='say'&&b.th.at>a.th.at&&a.th.to===b.id,'a chat gives the first line now and the answer later');
 w.rel.set(w.relKey(a,b),-60);ctx.voiceChat(w,a,b);ok(/again|nothing/i.test(a.th.long),'a bitter pair speaks coldly: '+a.th.long);w.rel.set(w.relKey(a,b),0)}
// the village runs exactly as before: same seed in a context where voices.js is replaced by do-nothing stubs
{const stub='function voiceChat(){}function voicesTick(){}function voicesDay(){}function initVoices(){}';
 const code2=files.map(f=>f==='voices'?stub:fs.readFileSync(__dirname+'/../src/'+f+'.js','utf8')).join('\n')+'\n;Object.assign(globalThis,{World});';
 const c2={console,Buffer,performance};vm.createContext(c2);vm.runInContext(code2,c2);
 const A=new ctx.World(5,{}),B=new c2.World(5,{});for(let t=0;t<1200*30;t++){A.step();B.step()}
 const sig=x=>x.vills.length+':'+x.vills.slice(0,15).map(v=>v.id+','+v.age.toFixed(2)+','+Math.round(v.x*10)+','+Math.round(v.y*10)).join(';')+':'+Math.round(x.stock.food)+':'+(x.births||0)+':'+x.rel.size;
 ok(A.vills.length>5&&sig(A)===sig(B),'voices change nothing in the simulation (30 days, same seed against a stubbed build)')}
// summaries
{const S=w.voices.sum;ok(S.length>=30&&S.every(s=>s.text&&s.t&&typeof s.worry==='number'),'daily summaries kept: '+S.length);ok(/^The talk of the village:/.test(S[0].text),'summary text: '+S[0].text.slice(0,90));
 ok(S.length<=48,'summaries are capped');const d=ctx.voiceDigest(w,7);ok(d&&d.top.length>=2&&d.days>=5,'digest merges several days: '+JSON.stringify(d).slice(0,120))}
// statistics
{const s1=ctx.STAT_SERIES.find(x=>x.id==='worry'),s2=ctx.STAT_SERIES.find(x=>x.id==='chats');ok(s1&&s2,'worry and chats series registered');const S=ctx.ST(w);ok(S.s.worry.length===S.days.length&&S.s.chats.length===S.days.length,'series aligned');ok(S.s.chats.some(x=>x>0),'chats are counted')}
// save and legacy
{const d=ctx.serializeWorld(w);ok(d.voices&&d.voices.sum.length===w.voices.sum.length,'save keeps the summaries');const g=ctx.deserializeWorld(JSON.parse(JSON.stringify(d)));ok(g.voices.sum.length===w.voices.sum.length&&g.vills.every(v=>v.th===undefined||v.th===null),'load restores summaries; thoughts start fresh');run(g,3);ok(g.vills.some(v=>v.th),'thoughts resume after load');
 const d2=JSON.parse(JSON.stringify(d));delete d2.voices;const g2=ctx.deserializeWorld(d2);run(g2,3);ok(g2.voices&&g2.vills.some(v=>v.th),'a save from before voices loads and starts thinking')}
// cost
{const v0=performance.now();for(let i=0;i<200;i++){w.tick+=20;ctx.voicesTick(w)}const ms=(performance.now()-v0)/200;ok(ms<0.5,'voices tick costs '+ms.toFixed(3)+' ms per 20 ticks ('+w.vills.length+' people)')}
// variety: a thought carries other wordings for the same subject, none empty, none equal to the main line
{let n=0,withAlts=0,bad=0;for(const v of w.vills)for(let s=0;s<20;s++){const th=ctx.thinkOf(w,v,s);if(!th||th.kind!=='thought')continue;n++;if(th.alts&&th.alts.length){withAlts++;if(th.alts.some(a=>!a[0]||!a[1]||a[0]===th.long))bad++}}
 ok(n>50&&withAlts/n>0.8&&!bad,'thoughts carry alternative wordings: '+withAlts+' of '+n+', bad '+bad)}
ok(faults.length===0,'no faults at the end: '+faults.slice(0,2));
console.log(`voices_events: ${pass} passed, ${fail} failed`);process.exit(fail?1:0);
