const fs=require('fs'),vm=require('vm');
const code=require('../lib').SRC.map(f=>fs.readFileSync('/home/claude/village-sim/src/'+f+'.js','utf8')).join('\n')+'\n;Object.assign(globalThis,{World,TECHS,CFG,serializeWorld,deserializeWorld,b64enc,packArr});';
const ctx={console,Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
const w=new ctx.World(777);for(let d=1;d<=150;d++){for(let t=0;t<1200;t++)w.step();if(d===24)for(const id of Object.keys(ctx.TECHS))w.tech.known[id]=24}
const d=ctx.serializeWorld(w),json=JSON.stringify(d);
const plain=Object.fromEntries(['feat','res','road','fish'].map(k=>[k,ctx.b64enc(w[k]).length]));plain.seen=ctx.b64enc(w.seen).length;
const packed=Object.fromEntries(['feat','res','road','fish'].map(k=>[k,d.arrays[k].length]));packed.seen=d.seen.length;
console.log('plain  ',JSON.stringify(plain),'sum',Object.values(plain).reduce((a,b)=>a+b));console.log('packed ',JSON.stringify(packed),'sum',Object.values(packed).reduce((a,b)=>a+b));
console.log('total save json',Math.round(json.length/1024)+' KB (was about '+Math.round((json.length-Object.values(packed).reduce((a,b)=>a+b)+Object.values(plain).reduce((a,b)=>a+b))/1024)+' KB)');
const L=ctx.deserializeWorld(JSON.parse(json));const same=k=>L[k].every((x,i)=>x===w[k][i]);console.log('round trip equal:',['feat','res','road','fish','seen'].every(same));
// an old-format save (plain base64) still loads
const old=JSON.parse(json);for(const k of ['feat','res','road','fish'])old.arrays[k]=ctx.b64enc(w[k]);old.seen=ctx.b64enc(w.seen);const O=ctx.deserializeWorld(old);console.log('old format loads equal:',['feat','res','road','fish','seen'].every(k=>O[k].every((x,i)=>x===w[k][i])));
const sizes=Object.entries(d).map(([k,v])=>[k,JSON.stringify(v)===undefined?0:JSON.stringify(v).length]).sort((a,b)=>b[1]-a[1]).slice(0,8);console.log('largest parts:',sizes.map(e=>e[0]+' '+Math.round(e[1]/1024)+'KB').join(', '));
