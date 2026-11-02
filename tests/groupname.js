// Reproduces the freeze: naming a 6th circle that shares a base name with five others
const fs=require('fs'),vm=require('vm'),path=require('path');
const code=['config','animals','villager','town','society','tech','water','trade','projects','history','buildings','places','neighbours','diplomacy','character','regime','save','world'].map(f=>fs.readFileSync(path.join(__dirname,'..','src',f+'.js'),'utf8')).join('\n')+'\n;Object.assign(globalThis,{groupName});';
const ctx={console,Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
const mk=()=>({family:'Brook',role:null,trait:{soc:.9,ind:.1,cur:.1,brave:.1,kind:.1}});
const members=[mk(),mk(),mk(),mk()];   // dominated by one family -> "House Brook"
const taken=new Set();const names=[];
for(let i=0;i<9;i++){
  try{ const n=vm.runInContext('groupName(null,{},M,T)',Object.assign(ctx,{M:members,T:taken}),{timeout:2000}); names.push(n); taken.add(n) }
  catch(e){ console.log(`group #${i+1}: ${e.message.includes('timed out')?'INFINITE LOOP (timed out after 2s)':e.message}`); break }
}
console.log('names produced:',names.join(' | '));
