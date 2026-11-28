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
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return savesIsGz(u8) ? await savesGunzip(u8) : new TextDecoder().decode(u8);
}
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
