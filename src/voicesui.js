'use strict';
/* ==========================================================================
   voicesui.js — the browser side of voices: the live talk feed and daily summaries in the
   Events tab, the thought block in the villager inspector (click to pin), clickable bubbles,
   the bubbles switch and the optional Claude-written lines (off by default).
   Speeds: 1x and below the feed prints each bubble; 3x shows a running digest;
   10x and faster only the daily summaries, because lines would scroll past unread.
   ========================================================================== */
const TALK = { live: [], max: 40 };
const VOICES_SLOW = 1;                                    // the feed prints lines up to this speed
const vSpeed = () => (typeof speed === 'undefined' ? 1 : speed);
R.onBubble = (v, th, mode) => {
  if (vSpeed() > VOICES_SLOW || !world) return;
  TALK.live.unshift({ day: world.day, name: v.name, text: th.long, kind: th.kind, cat: th.cat, id: v.id });
  if (TALK.live.length > TALK.max) TALK.live.pop();
};
const catLabel = id => (VCAT[id] ? VCAT[id].label : id);

/* ---- Events tab: "Talk of the village" ---- */
function renderTalk() {
  const w = world, el = $('talkCard'); if (!el || !w) return; const sp = vSpeed(), V = w.voices;
  let live;
  if (sp <= VOICES_SLOW) {
    live = TALK.live.length ? TALK.live.slice(0, 14).map(l => `<div class="tl ${l.kind}"><b>${escapeHtml(l.name)}</b> ${l.kind === 'dream' ? '<i>dreams</i> ' : l.kind === 'say' ? '<i>says</i> ' : '<i>thinks</i> '}“${escapeHtml(l.text)}”</div>`).join('')
      : '<div class="hint">Quiet for now. Lines appear here as the bubbles do.</div>';
  } else if (sp <= 3) {
    const d = voiceDigest(w, 1) || (V && V.sum.length ? voiceDigest(w, 2) : null);
    live = `<div class="hint">Too quick to print every line. ${d ? 'Lately: ' + d.top.join(', ') + (d.talks ? '; ' + d.talks + ' conversations' : '') + '.' : ''}</div>`;
  } else live = '<div class="hint">Too fast to follow line by line; see the daily summaries below.</div>';
  const sums = V && V.sum.length ? (sp > 10 ? digestRows(w) : V.sum.slice(0, 8).map(s => `<div><b>D${s.day}</b>${escapeHtml(s.text)}</div>`).join('')) : '<div class="hint">The first summary comes at the end of the day.</div>';
  el.innerHTML = `<h3>Talk of the village</h3>${live}<div class="hint" style="margin-top:6px">${sp > 10 ? 'Weekly summaries' : 'Daily summaries'}</div>${sums}`;
}
function digestRows(w) {
  const S = w.voices.sum, out = [];
  for (let i = 0; i < S.length && out.length < 6; i += 8) {
    const grp = S.slice(i, i + 8), t = {}; let talks = 0; for (const s of grp) { talks += s.talks || 0; for (const k in s.t) if (k !== 'talk' && k !== 'dream') t[k] = (t[k] || 0) + s.t[k] }
    const tot = Math.max(1, Object.values(t).reduce((a, b) => a + b, 0)), top = Object.entries(t).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, n]) => `${catLabel(k)} ${Math.round(100 * n / tot)}%`);
    out.push(`<div><b>D${grp[grp.length - 1].day}–${grp[0].day}</b>${escapeHtml(top.join(', '))}; ${talks} conversations.</div>`);
  }
  return out.join('');
}

/* ---- pinning ---- */
function voicePin(v, th) { if (!v || !th) return; R.vo = R.vo || { shown: new Map(), prev: new Set(), rects: [], pin: null }; R.vo.pin = { id: v.id, th: { ...th } } }
function voiceUnpin() { if (R.vo) R.vo.pin = null }
function voicePinned(v) { return !!(R.vo && R.vo.pin && v && R.vo.pin.id === v.id) }
/* a click on a bubble selects its villager and pins that line; returns the villager or null */
function bubbleAt(sx, sy) {
  const V = R.vo; if (!V || !V.rects.length) return null;
  for (let i = V.rects.length - 1; i >= 0; i--) { const r = V.rects[i]; if (sx >= r.x && sx <= r.x + r.w + 1 && sy >= r.y && sy <= r.y + r.h + 8) { const v = world.vills.find(x => x.id === r.id); if (v && v.th) { voicePin(v, v.th); return v } } }
  return null;
}

/* ---- inspector block ---- */
function thoughtBlock(w, v) {
  if (v.age < CFG.INFANT_DAYS) return '';
  const sp = vSpeed(), pinned = voicePinned(v) ? R.vo.pin.th : null, cur = v.th, h = (v.thh || []).filter(t => t !== cur && (!pinned || t.tick !== pinned.tick));
  const kindWord = t => t.kind === 'dream' ? 'dreams' : t.kind === 'say' ? 'says' : 'thinks';
  let html = '<div class="thoughts"><div class="hint">Mind</div>';
  if (pinned) html += `<div class="thought pin"><i>${kindWord(pinned)}</i> “${escapeHtml(pinned.long)}” <button class="mini" data-unpin="1">Unpin</button></div>`;
  if (cur && !(pinned && pinned.tick === cur.tick)) {
    if (sp <= 3) html += `<div class="thought now" data-pin="1" title="Click to keep this thought on screen"><i>${kindWord(cur)}</i> “${escapeHtml(cur.long)}” <small>click to pin</small></div>`;
    else html += `<div class="thought now"><i>${kindWord(cur)} about</i> ${escapeHtml(catLabel(cur.cat))}</div>`;
  } else if (!cur) html += '<div class="hint">Nothing on their mind yet.</div>';
  const old = h.slice(0, 4); if (old.length) html += old.map(t => `<div class="thought old">“${escapeHtml(t.long)}”</div>`).join('');
  return html + '</div>';
}
document.addEventListener('click', e => {
  const t = e.target.closest && e.target.closest('#sel [data-pin], #sel [data-unpin]'); if (!t || !(selected instanceof Villager)) return;
  if (t.dataset.unpin) voiceUnpin(); else if (selected.th) voicePin(selected, selected.th);
  updateUI();
});

/* ---- settings: bubbles switch ---- */
function voicesInit() {
  const b = $('bubbleToggle'); if (!b) return; let on = true; try { on = localStorage.getItem('villagesim.bubbles') !== '0' } catch (e) { }
  R.bubbles = on; b.checked = on; b.addEventListener('change', () => { R.bubbles = b.checked; try { localStorage.setItem('villagesim.bubbles', b.checked ? '1' : '0') } catch (e) { } });
}

/* ---- optional: Claude writes the selected villager's thought (OFF by default; uses the same Claude permission as the council) ---- */
const VAI = { on: false, busy: false, count: 0, MAX: 60, backoff: 0, done: new Set() };
const vaiMsg = t => { const el = $('vaiStatus'); if (el) el.textContent = t };
async function vaiAsk(v) {
  const th = v.th; if (!th || th.ai || th.kind === 'say' || VAI.done.has(v.id + ':' + th.tick)) return;
  VAI.busy = true; VAI.count++; VAI.done.add(v.id + ':' + th.tick); vaiMsg('Claude is writing a line… (' + VAI.count + '/' + VAI.MAX + ')');
  const w = world, mate = v.partner != null ? w.vills.find(x => x.id === v.partner) : null;
  const prompt = `You write one short inner thought (or dream, if sleeping) for a villager in a small village simulation. Stay in character and concrete; no quotes, no emoji, at most 90 characters.\n\nVillager: ${v.name}, ${v.sex === 'f' ? 'woman' : 'man'}, ${v.stage()}, ${v.role || 'no fixed trade'}; traits: ${v.traitWords().join(', ') || 'even-tempered'}.\nState: mood ${Math.round(v.mood)}/100, hunger ${Math.round(v.hunger)} (100 = full), energy ${Math.round(v.energy)}, doing: ${v.label}.${mate ? ' Partner: ' + mate.name + '.' : ''}\nVillage: year ${w.year}, ${SEASONS[w.season]}, ${w.vills.length} people${w.cold ? ', freezing' : ''}${w.festival ? ', a festival' : ''}.\nThe simple rule-based thought is about "${catLabel(th.cat)}": "${th.long}"\n\nReply with JSON only: {"line":"..."}`;
  try {
    const r = await Promise.race([MIND.sample(prompt, { modelTier: 'quick', cache: false }), new Promise((_, rej) => setTimeout(() => rej({ code: 'timeout' }), 20000))]);
    const j = parseJson(r.text); if (j && typeof j.line === 'string' && j.line.trim()) { th.long = j.line.trim().slice(0, 110); th.ai = true; vaiMsg('On · ' + VAI.count + '/' + VAI.MAX + ' lines written.') } else vaiMsg('Claude gave no usable line; the rules keep the thought.');
  } catch (e) {
    const code = e && e.code; if (code === 'rate_limited') { VAI.backoff = Date.now() + 180000; vaiMsg('Rate limited; the rules write the lines for a few minutes.') } else if (code === 'not_granted') { VAI.on = false; $('vaiToggle').checked = false; vaiMsg('Permission was withdrawn; the rules write the lines.') } else vaiMsg('Could not reach Claude (' + (code || 'error') + ').');
  } finally { VAI.busy = false }
}
function voicesAiInit() {
  const t = $('vaiToggle'); if (!t) return;
  t.addEventListener('change', () => {
    if (t.checked && !(MIND.ready && MIND.sample)) { t.checked = false; vaiMsg(MIND.ready === false ? 'Turn on Claude for the council first (it asks your permission once).' : 'Not available here: this works on the published page.'); return }
    VAI.on = t.checked; vaiMsg(VAI.on ? 'On · Claude writes the selected villager\'s lines (up to ' + VAI.MAX + ' per session).' : 'Off. The rules write every line.');
  });
  setInterval(() => { if (!VAI.on || VAI.busy || !MIND.sample || Date.now() < VAI.backoff || VAI.count >= VAI.MAX || vSpeed() > 1 || !world) return; if (selected instanceof Villager && selected.alive && selected.th) vaiAsk(selected) }, 2500);
}
