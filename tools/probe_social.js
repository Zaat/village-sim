// how much of the day do villagers spend with others: node tools/probe_social.js SEED MAP  -> samples at days 300, 700, 1100
const fs=require('fs'),vm=require('vm'),path=require('path');
const code=['config','animals','villager','town','society','techtree','tech','water','trade','projects','history','buildings','places','neighbours','diplomacy','routes','mapgen','character','regime','strife','lives','livelihoods','stats','concerns','outposts','bridges','save','world'].map(f=>fs.readFileSync(path.join(__dirname,'..','src',f+'.js'),'utf8')).join('\n')+'\n;Object.assign(globalThis,{World,CFG});';
const ctx={console:{log(){},error(){}},Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
const w=new ctx.World(+process.argv[2],{map:process.argv[3]||'island'});
const marks=new Set([1100,1500]);let tally=null,n=0;
for(let d=1;d<=1520;d++){if(marks.has(d)){tally={};n=0}for(let t=0;t<1200;t++){w.step();
  if(tally&&t%100===50&&t>=250&&t<1000){for(const v of w.vills){if(v.isChild&&v.isChild())continue;n++;const l=(v.label||'').toLowerCase();const k=/talk|chat|gossip|drink|tavern|square|visit|market|festival|feast|dance|play/.test(l)?'social':/sleep|bed/.test(l)?'sleep':/idle|wander|stroll|rest|sit/.test(l)?'idle':/walk|to the|heading|go/.test(l)?'travel':'work';tally[k]=(tally[k]||0)+1}}}
  if(tally&&[1102,1502].includes(d)){const o={};for(const k in tally)o[k]=Math.round(100*tally[k]/n)+'%';console.log('year',Math.round(d/32),'pop',w.vills.length,'daytime share',JSON.stringify(o));tally=null}}
