const fs=require('fs'),vm=require('vm');
const code=require('./lib').SRC.map(f=>fs.readFileSync(__dirname+'/../src/'+f+'.js','utf8')).join('\n')+'\n;Object.assign(globalThis,{World,CFG,TERR});';
const ctx={console,Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
const w=new ctx.World(+process.argv[2]||777,{map:process.argv[3]||'island'});const {W}=ctx.CFG;
for(let t=0;t<1200*3;t++)w.step();
const start=new Map(w.animals.filter(a=>a.alive).map(a=>[a.id,{x:a.x,y:a.y,k:a.kind,t:w.terr[Math.floor(a.y)*W+Math.floor(a.x)]}]));const path=new Map();
for(let d=0;d<12;d++){for(let t=0;t<1200;t++)w.step();for(const a of w.animals){if(!a.alive)continue;const p=path.get(a.id)||{d:0,last:[a.x,a.y]};p.d+=Math.hypot(a.x-p.last[0],a.y-p.last[1]);p.last=[a.x,a.y];path.set(a.id,p)}}
const rows={};for(const [id,s] of start){const p=path.get(id);if(!p)continue;const key=s.k+'@'+['deep','shallow','sand','grass','rock','peak','ford'][s.t];const r=rows[key]||(rows[key]={n:0,still:0,tot:0});r.n++;r.tot+=p.d;if(p.d<3)r.still++}
for(const [k,r] of Object.entries(rows).sort())console.log(k.padEnd(14),'n',String(r.n).padStart(3),'barely moved (<3 tiles in 12 days):',String(r.still).padStart(3),' avg distance',(r.tot/r.n).toFixed(1));
let bad=0,n=0;for(const r of Object.values(rows)){bad+=r.still;n+=r.n}
if(bad>Math.max(4,n*0.07)){console.log('FAILED: '+bad+'/'+n+' animals barely moved');process.exit(1)}console.log('animals passed: '+(n-bad)+'/'+n+' roam freely');
