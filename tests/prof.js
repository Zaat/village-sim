// CPU profile of a headless run: node --cpu-prof --cpu-prof-dir=/tmp/prof tests/prof.js SEED DAYS
const fs=require('fs'),vm=require('vm'),path=require('path');const dir=path.join(__dirname,'..','src');
const code=['config','animals','villager','town','society','tech','water','trade','save','world'].map(f=>fs.readFileSync(path.join(dir,f+'.js'),'utf8')).join('\n')+'\n;Object.assign(globalThis,{World,CFG});';
// run the sources as normal module code so the profiler attributes time to real function names
fs.writeFileSync('/tmp/prof3/bundle.js',code+'\nmodule.exports={World,CFG};');
const {World,CFG}=require('/tmp/prof3/bundle.js');
const w=new World(+(process.argv[2]||777));const days=+(process.argv[3]||90);
for(let t=0;t<CFG.TPD*days;t++)w.step();
console.log('done day',w.day,'pop',w.vills.length);
