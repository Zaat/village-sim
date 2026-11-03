// Map type checks: node tests/maps.js [seeds=4]  - prints an ASCII preview and sanity numbers for each type
const fs=require('fs'),vm=require('vm'),path=require('path');
const code=['config','animals','villager','town','society','tech','water','trade','projects','history','buildings','places','neighbours','diplomacy','routes','mapgen','character','regime','strife','outposts','bridges','save','world'].map(f=>fs.readFileSync(path.join(__dirname,'..','src',f+'.js'),'utf8')).join('\n')+'\n;Object.assign(globalThis,{World,CFG,TERR,landRegions,MAP_ORDER,sameLand,serializeWorld,deserializeWorld});';
const ctx={console,Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
const nseeds=+process.argv[2]||4,show=process.argv[3]==='show';let ok=0,bad=0;const check=(n,c,x)=>{if(!c||show)console.log((c?'PASS ':'FAIL ')+n+(x?'  '+x:''));c?ok++:bad++};
const CH={0:'~',1:'-',2:'.',3:'"',4:'^',5:'A',6:'='};
for(const arch of ctx.MAP_ORDER){for(let s=0;s<nseeds;s++){const seed=101+s*37;const w=new ctx.World(seed,{map:arch});const {W,H}=ctx.CFG;
  let land=0,water=0,ford=0;for(let i=0;i<W*H;i++){const t=w.terr[i];if(t>=2&&t!==6)land++;else if(t<=1)water++;if(t===6)ford++}
  const R=ctx.landRegions(w),home=R.label[w.cy*W+w.cx],homeSize=R.sizes[home];
  const label=`${arch} seed ${seed}`;
  check(label+': start is on solid land',w.terr[w.cy*W+w.cx]===3&&homeSize>(arch==='archipelago'?1000:1500),`start ${w.cx},${w.cy} region ${homeSize} tiles, land ${(100*land/W/H).toFixed(0)}%, water ${(100*water/W/H).toFixed(0)}%, fords ${ford}`);
  const land4=w.neigh.filter(n=>n.reach==='land'),sea=w.neigh.filter(n=>n.reach!=='land');
  check(label+': land neighbours are walkable from home',land4.every(n=>ctx.sameLand(w,w.cx,w.cy,n.x,n.y)),`${land4.length} by land, ${sea.length} by sea`);
  if(['continent','peninsula','lakeland','river'].includes(arch))check(label+': has neighbours to walk to',land4.length>=2,land4.map(n=>n.name+'@'+n.dist).join(' '));
  if(arch==='river')check(label+': river has fords',w.rivers>=1&&ford>=8,'rivers '+w.rivers);
  if(arch==='archipelago'){let comps=0;for(let k=1;k<R.sizes.length;k++)if(R.sizes[k]>120)comps++;check(label+': more than one island',comps>=2,comps+' islands >120 tiles')}
  if(s===0){for(let t=0;t<1200*6;t++)w.step();const L=ctx.deserializeWorld(JSON.parse(JSON.stringify(ctx.serializeWorld(w))));let same=L.arch===w.arch&&L.cx===w.cx&&L.cy===w.cy&&L.neigh.length===w.neigh.length;for(let i=0;i<W*H&&same;i++)if(L.terr[i]!==w.terr[i])same=false;check(label+': save and load keep the same map',same);for(let t=0;t<1200*3;t++)L.step();check(label+': loaded world runs',L.dbg.total===0)}
  if(show&&s===0){for(let y=0;y<H;y+=4){let row='';for(let x=0;x<W;x+=2){let t=w.terr[y*W+x];row+=(x%4===0&&Math.abs(x-w.cx)<2&&Math.abs(y-w.cy)<3)?'@':CH[t]}console.log(row)}}
}}
console.log(`\n${ok} passed, ${bad} failed`);process.exit(bad?1:0);
