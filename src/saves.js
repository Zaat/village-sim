/* saves (browser only): saves kept in IndexedDB, gzip-compressed where the browser can compress (about 2023 or later), plain text otherwise.
   A record is { id, name, meta, data (gzip bytes or text), at }; the details shown in lists (meta) live in the record, so nothing is kept in localStorage.
   Ids: 'auto' (autosave), 'backup' (the village left behind by starting a new one), 'n<time>' (named saves, at most SAVES.MAX).
   Older plain-text saves and files are still read: anything that does not start with the gzip marker is taken as text. */
const SAVES = { DB: 'villagesim', STORE: 'saves', MAX: 10 };
let _savesDb = null;
const savesOk = () => typeof indexedDB !== 'undefined' && !!indexedDB;
const savesGzOk = () => typeof CompressionStream !== 'undefined' && typeof Blob !== 'undefined';
const savesIsGz = u8 => !!u8 && u8.length > 2 && u8[0] === 0x1f && u8[1] === 0x8b;
async function savesGz(text) { if (!savesGzOk()) return null; return new Uint8Array(await new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer()) }
async function savesGunzip(u8) { return await new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'))).text() }
/* bytes (ArrayBuffer or Uint8Array) of a file or record to text, whether gzip or plain */
async function savesDecode(buf) {
  let u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  if (u8.length > 4 && u8[0] === 0x50 && u8[1] === 0x4b && u8[2] === 3 && u8[3] === 4) u8 = (await zipUnpack(u8)).data;      // a .zip holding the save (v0.40)
  return savesIsGz(u8) ? await savesGunzip(u8) : new TextDecoder().decode(u8);
}
/* zip files (v0.40): one file per zip, deflated where the browser can, stored otherwise. The Claude app's download dialog allows .zip but not .gz, so exports are zips; Import reads zip, gzip and plain text. */
const ZIP_CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0 } return t })();
function zipCrc(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = ZIP_CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0 }
const zipOk = () => typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined' && typeof Blob !== 'undefined';
async function zipStream(u8, S, kind) { return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new S(kind))).arrayBuffer()) }
async function zipPack(name, u8) {
  const nm = new TextEncoder().encode(name), crc = zipCrc(u8); let method = 0, body = u8;
  if (zipOk()) { try { const d = await zipStream(u8, CompressionStream, 'deflate-raw'); if (d.length < u8.length) { method = 8; body = d } } catch (e) { } }
  const lh = new DataView(new ArrayBuffer(30)), ch = new DataView(new ArrayBuffer(46)), eo = new DataView(new ArrayBuffer(22));
  lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, method, true); lh.setUint16(12, 33, true); lh.setUint32(14, crc, true); lh.setUint32(18, body.length, true); lh.setUint32(22, u8.length, true); lh.setUint16(26, nm.length, true);
  ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, method, true); ch.setUint16(14, 33, true); ch.setUint32(16, crc, true); ch.setUint32(20, body.length, true); ch.setUint32(24, u8.length, true); ch.setUint16(28, nm.length, true);
  const cdOff = 30 + nm.length + body.length, cdSize = 46 + nm.length;
  eo.setUint32(0, 0x06054b50, true); eo.setUint16(8, 1, true); eo.setUint16(10, 1, true); eo.setUint32(12, cdSize, true); eo.setUint32(16, cdOff, true);
  const out = new Uint8Array(cdOff + cdSize + 22); let o = 0;
  for (const part of [new Uint8Array(lh.buffer), nm, body, new Uint8Array(ch.buffer), nm, new Uint8Array(eo.buffer)]) { out.set(part, o); o += part.length }
  return out;
}
/* the first file in a zip: { name, data } */
async function zipUnpack(u8) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength); let e = u8.length - 22; while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error('this zip file is damaged');
  const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true);
  for (let i = 0; i < n; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nl)); p += 46 + nl + el + cl;
    if (/\/$/.test(name) || /^__MACOSX/.test(name)) continue;
    const st = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true), data = u8.subarray(st, st + csize);
    if (method === 0) return { name, data };
    if (method === 8) return { name, data: await zipStream(data, DecompressionStream, 'deflate-raw') };
    throw new Error('this zip uses a method the game cannot read');
  }
  throw new Error('there is no file in this zip');
}
const savesRaw = id => idbDo('readonly', s => s.get(id));
function savesDb() {
  if (_savesDb) return _savesDb;
  _savesDb = new Promise((res, rej) => {
    try {
      if (!savesOk()) return rej(new Error('this browser cannot keep saves (no IndexedDB)'));
      const r = indexedDB.open(SAVES.DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(SAVES.STORE, { keyPath: 'id' });
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error || new Error('could not open the save store')); r.onblocked = () => rej(new Error('the save store is blocked by another tab'));
    } catch (e) { rej(e) }
  });
  _savesDb.catch(() => { _savesDb = null });
  return _savesDb;
}
function idbDo(mode, f) {
  return savesDb().then(db => new Promise((res, rej) => {
    const t = db.transaction(SAVES.STORE, mode), r = f(t.objectStore(SAVES.STORE));
    t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error || new Error('the save was not stored'));
  }));
}
/* write one record; resolves to its size in bytes, rejects when the browser will not store it */
async function savesPut(id, name, meta, json) {
  const data = (await savesGz(json)) || json;
  await idbDo('readwrite', s => s.put({ id, name, meta, data, at: Date.now() }));
  savesPersist();
  return data.length;
}
/* after the first save: ask the browser to keep our storage (not to clear it when the disk runs low); asked once per browser, the answer goes in the diagnostics */
let savesPersistAsked = false;
async function savesPersist() {
  if (savesPersistAsked) return; savesPersistAsked = true;
  try {
    if (!(navigator.storage && navigator.storage.persist)) { DBG.persist = 'not supported'; return }
    if (await navigator.storage.persisted()) { DBG.persist = 'kept'; return }
    let asked = null; try { asked = localStorage.getItem('villagesim_persist_asked') } catch (e) { }
    if (asked) { DBG.persist = 'not granted (asked before)'; return }
    try { localStorage.setItem('villagesim_persist_asked', String(Date.now())) } catch (e) { }
    DBG.persist = (await navigator.storage.persist()) ? 'kept' : 'not granted';
  } catch (e) { DBG.persist = 'error' }
}
/* { id, name, meta, at, text } or null */
async function savesGet(id) {
  const rec = await idbDo('readonly', s => s.get(id)); if (!rec) return null;
  return { id: rec.id, name: rec.name, meta: rec.meta, at: rec.at, text: typeof rec.data === 'string' ? rec.data : await savesDecode(rec.data) };
}
/* every record without its data, newest first */
async function savesList() {
  const all = await idbDo('readonly', s => s.getAll());
  return (all || []).map(r => ({ id: r.id, name: r.name, meta: r.meta, at: r.at, bytes: r.data ? (r.data.length || r.data.byteLength || 0) : 0 })).sort((a, b) => (b.at || 0) - (a.at || 0));
}
const savesDelete = id => idbDo('readwrite', s => s.delete(id));
async function savesRename(id, name) {
  const rec = await idbDo('readonly', s => s.get(id)); if (!rec) return;
  rec.name = name; await idbDo('readwrite', s => s.put(rec));
}
/* one-time move of the older plain localStorage saves into the store; the old key goes only after the copy checked out */
async function savesMigrate(keys) {
  for (const [id, name, saveKey, metaKey] of keys) {
    let raw = null, meta = null; try { raw = localStorage.getItem(saveKey); meta = JSON.parse(localStorage.getItem(metaKey) || 'null') } catch (e) { }
    if (!raw) continue;
    try {
      if (!(await savesGet(id))) { await savesPut(id, name, meta, raw); const back = await savesGet(id); if (!back || back.text.length !== raw.length) continue }
      localStorage.removeItem(saveKey); localStorage.removeItem(metaKey);
    } catch (e) { }
  }
}
