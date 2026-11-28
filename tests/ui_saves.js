// Saves: compressed IndexedDB store, named saves, autosave, backup, migration of an old plain save, file export and import
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m) } };
  const p = await b.newPage({ viewport: { width: 1400, height: 900 }, acceptDownloads: true }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.goto('file:///' + __dirname.replace(/\\/g, '/') + '/../index.html'); await p.evaluate(async () => { localStorage.clear(); await new Promise(r => { const q = indexedDB.deleteDatabase('villagesim'); q.onsuccess = q.onerror = q.onblocked = r }) }); await p.reload(); await p.waitForTimeout(800);
  ok(await p.evaluate(() => savesOk()), 'the browser can store compressed saves');
  // autosave goes to the store, compressed, with a small meta copy for the startup check
  await p.evaluate(() => { setSpeed(100) }); await p.waitForTimeout(3000); await p.evaluate(() => setSpeed(0));
  ok(await p.evaluate(() => __sim.saveToStorage(true)), 'Save now succeeds');
  const rec = await p.evaluate(async () => { const l = await savesList(), a = l.find(r => r.id === 'auto'), g = await savesGet('auto'); return { n: l.length, bytes: a && a.bytes, text: g && g.text.length, ok: g && JSON.parse(g.text).seed === __sim.world.seed } });
  ok(rec.n === 1 && rec.bytes > 100 && rec.text > rec.bytes * 2 && rec.ok, 'the autosave is stored compressed and reads back (' + JSON.stringify(rec) + ')');
  ok(await p.evaluate(() => !localStorage.getItem('villagesim.save') && !localStorage.getItem('villagesim.meta')), 'nothing about saves is kept in localStorage');
  // saves screen
  await p.click('#menuBtn'); await p.click('#menu [data-mn=load]'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => /Saves/.test(document.getElementById('modal_t').textContent) && document.querySelectorAll('#modal_b [data-ld]').length === 1), 'the Saves screen lists the autosave');
  await p.fill('#sv_name', 'First try'); await p.click('#sv_new'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => [...document.querySelectorAll('#modal_b .sv_label')].some(x => x.textContent === 'First try')), 'a named save appears');
  // overwrite and delete need a second click
  const day0 = await p.evaluate(() => __sim.world.tick); await p.evaluate(() => { __sim.run(1200) });
  await p.click('#modal_b [data-ov]'); ok(await p.evaluate(() => document.querySelector('#modal_b [data-ov]').textContent === 'Sure?'), 'overwrite asks first');
  await p.click('#modal_b [data-ov]'); await p.waitForTimeout(500);
  ok(await p.evaluate(async () => { const l = await savesList(), n = l.find(r => r.id[0] === 'n'); return n && n.meta.day >= 1 && (await savesGet(n.id)).text.includes('"tick":' + __sim.world.tick) }), 'overwrite replaced the saved village');
  // rename
  await p.click('#modal_b [data-rn]'); await p.fill('#modal_b .saverow[data-id] input', 'Renamed'); await p.keyboard.press('Enter'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => [...document.querySelectorAll('#modal_b .sv_label')].some(x => x.textContent === 'Renamed')), 'rename works');
  // load keeps the current village in the autosave
  const tickNow = await p.evaluate(() => { __sim.run(2400); return __sim.world.tick });
  await p.click('#modal_b [data-ld]:not([data-ld=auto]):not([data-ld=backup])'); await p.waitForTimeout(800);
  ok(await p.evaluate(t => __sim.world.tick < t, tickNow), 'loading a named save goes back to it');
  ok(await p.evaluate(async t => (await savesGet('auto')).text.includes('"tick":' + t), tickNow), 'the village that was open is kept in the autosave');
  ok(await p.evaluate(() => document.getElementById('modal').style.display === 'none'), 'the screen closes after loading');
  // the limit of ten
  await p.evaluate(async () => { for (let i = 0; i < 12; i++) { if ((await savesList()).filter(r => r.id[0] === 'n').length < SAVES.MAX) await savesPut('n' + (1000 + i), 'Filler ' + i, __sim.world && { pop: 1, year: 1, season: 0, day: 1, seed: 1 }, '{}') } });
  await p.evaluate(() => savesOpen()); await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.getElementById('sv_new').disabled && /10 of 10/.test(document.getElementById('modal_b').textContent)), 'the Save button stops at ten named saves');
  await p.click('#modal_x');
  // export and import (v0.40): the export is a .zip, import reads .zip, .json.gz and plain .json
  const [dl] = await Promise.all([p.waitForEvent('download'), p.evaluate(() => exportFile())]); const path = await dl.path();
  ok(/\.zip$/.test(dl.suggestedFilename()), 'export writes a .zip file (' + dl.suggestedFilename() + ')');
  const fs = require('fs'), buf = fs.readFileSync(path); ok(buf[0] === 0x50 && buf[1] === 0x4b, 'the exported file is a zip');
  const seed = await p.evaluate(() => __sim.world.seed); await p.evaluate(() => __sim.newWorld(4242));
  await p.setInputFiles('#importFile', path); await p.waitForTimeout(1200);
  ok(await p.evaluate(s => __sim.world.seed === s, seed), 'importing the .zip file restores the village');
  const plain = require('child_process').execSync('unzip -p ' + path); fs.writeFileSync('/tmp/plain-save.json', plain); fs.writeFileSync('/tmp/plain-save.json.gz', require('zlib').gzipSync(plain)); await p.evaluate(() => __sim.newWorld(4244));
  await p.setInputFiles('#importFile', '/tmp/plain-save.json.gz'); await p.waitForTimeout(1200);
  ok(await p.evaluate(s => __sim.world.seed === s, seed), 'importing an older .json.gz file still works'); await p.evaluate(() => __sim.newWorld(4243));
  await p.setInputFiles('#importFile', '/tmp/plain-save.json'); await p.waitForTimeout(1200);
  ok(await p.evaluate(s => __sim.world.seed === s, seed), 'importing an older plain .json file still works');
  // a save that cannot be loaded says why in the dialog and can be downloaded
  await p.evaluate(async () => { await savesPut('backup', 'Backup', { pop: 1, year: 1, season: 0, day: 1, seed: 1 }, '{"v":1,"seed":1,"vills":5}') });
  await p.evaluate(() => savesOpen()); await p.waitForTimeout(400);
  ok(await p.evaluate(() => !!document.querySelector('#modal_b [data-dw=backup]') && !!document.querySelector('#modal_b [data-dw=auto]')), 'every save has a Download button');
  await p.click('#modal_b [data-ld=backup]'); await p.waitForTimeout(600);
  ok(await p.evaluate(() => document.getElementById('modal').style.display !== 'none' && /could not be loaded/.test(document.getElementById('sv_err').textContent)), 'a failed load says so inside the dialog: ' + await p.evaluate(() => document.getElementById('sv_err').textContent));
  const [dl2] = await Promise.all([p.waitForEvent('download'), p.click('#modal_b [data-dw=backup]')]);
  ok(/^village-backup\.zip$/.test(dl2.suggestedFilename()), 'the broken save downloads as a zip (' + dl2.suggestedFilename() + ')');
  await p.click('#modal_x'); await p.evaluate(async () => { await savesDelete('backup') });
  // migration of an old plain localStorage save
  await p.evaluate(async () => { const json = JSON.stringify(serializeWorld(__sim.world)); localStorage.setItem('villagesim.save', json); localStorage.setItem('villagesim.meta', JSON.stringify({ ...saveMeta(__sim.world), speed: 10 })); await savesDelete('auto') });
  await p.reload(); await p.waitForTimeout(1500);
  ok(await p.evaluate(async s => { const g = await savesGet('auto'); return !!g && JSON.parse(g.text).seed === s && !localStorage.getItem('villagesim.save') }, seed), 'an older plain save is moved into the store and removed from localStorage');
  ok(await p.evaluate(s => __sim.world.seed === s, seed), 'and the village resumes from it');
  ok(errs.length === 0, 'no page errors: ' + errs.slice(0, 3).join(' | '));
  // the Resume screen of a village that cannot be loaded says why and offers the download (v0.40)
  await p.evaluate(async () => { localStorage.removeItem('villagesim.autoresume'); await savesPut('auto', 'Autosave', { pop: 9, year: 2, season: 0, day: 1, seed: 5, speed: 10 }, '{"v":1,"seed":5,"vills":5}') });
  await p.reload(); await p.waitForTimeout(1500);
  const rs = await p.evaluate(() => ({ shown: document.getElementById('resume').style.display !== 'none', info: document.getElementById('resumeInfo').textContent }));
  ok(rs.shown, 'the Resume screen shows for the saved village: ' + JSON.stringify(rs));
  await p.click('#resumeBtn'); await p.waitForTimeout(600);
  const rs2 = await p.evaluate(() => ({ info: document.getElementById('resumeInfo').textContent, dl: document.getElementById('resumeDl').style.display }));
  ok(/could not be loaded/.test(rs2.info) && rs2.dl === '', 'a failed Resume says why and offers the download: ' + JSON.stringify(rs2));
  await p.evaluate(async () => { await savesDelete('auto') });
  console.log(fail ? fail + ' failed' : 'ui_saves ok'); await b.close(); process.exit(fail ? 1 : 0);
})();
