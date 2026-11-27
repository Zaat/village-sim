/* Village Sim © 2026 Zaat · MIT license (see LICENSE) */
'use strict';
/* helpui.js — the game menu, the manual, the About card and the first-visit welcome (v0.35).
   The news list in ABOUT is rewritten at each release (tools/release.sh checks that its version matches APP_VERSION). */
const ABOUT = {
  home: 'https://github.com/Zaat/village-sim', issues: 'https://github.com/Zaat/village-sim/issues/new/choose', changelog: 'https://github.com/Zaat/village-sim/blob/main/CHANGELOG.md', license: 'https://github.com/Zaat/village-sim/blob/main/LICENSE',
  version: '0.38.2', name: 'Pace',
  news: ['Diagnostics (World card) can now be selected and copied: it no longer rewrites itself under your selection, and there is a Copy diagnostics button.', 'New developer tool, the pace lab, compares how a village grows under two birth models across many worlds. It found that the crowd begins with a one-day spike in its birth rate; the candidate fix did not smooth growth enough to ship, so the game is unchanged.']
};
const HELP = `
<h4>The idea</h4><p>A small village on its own island or shore. Watch it grow from a handful of people into a town: farms, houses, trade, ideas, quarrels. Every world is made from a seed, so the same seed always starts the same land.</p>
<h4>Watch and Play</h4><p><b>Watch</b> leaves everything to the village. <b>Play</b> (the switch at the bottom of the map) lets you take the lead as much or as little as you like. You can switch back at any time; nothing is lost.</p>
<h4>Looking around</h4><table class="ht"><tr><td></td><td><b>Mouse</b></td><td><b>Touch</b></td></tr><tr><td>Move the map</td><td>drag, or WASD / arrows</td><td>drag</td></tr><tr><td>Zoom</td><td>wheel, + and −</td><td>the + and − buttons</td></tr><tr><td>Inspect</td><td>click a villager, animal, building or ground</td><td>tap</td></tr><tr><td>Speed</td><td>Space, [ ] or the buttons</td><td>the buttons</td></tr></table>
<p>A plain click or tap <b>only selects and inspects</b>. It never gives an order by accident.</p>
<h4>Giving orders (Play)</h4><ul><li><b>Pick people</b>: click a villager, Shift-click to add more, or hold Shift and drag a box. On a phone, tap a villager.</li><li><b>Give an order</b>: right-click a tree, rock, berry bush, building site or damaged building to send them there. On a phone, tap the place, then press the order button in the inspector; or press and hold on the map for a menu.</li><li>The bar above the toolbar has the common jobs: wood, stone, berries, farm, hunt, fish, a fixed job, and <b>Free</b> to hand them back to the village.</li><li>Children cannot be ordered. Ordered villagers still eat, sleep and run from wolves.</li></ul>
<h4>Building (Play)</h4><ul><li><b>Build</b>: pick a building, move over open grass (the footprint shows green where it can go, red where it cannot, and says why), then click. On a phone, tap to put the footprint down, drag it to move it, then press ✓ (✕ drops it). An Undo shows for a few seconds after. Builders pick your sites first. Esc or right-click leaves the tool.</li><li><b>Road</b>: drag along the ground. Each tile costs a stone.</li><li><b>Zone</b>: paint homes, farms, work or civic areas. When the village places a building of that kind, it chooses ground inside the zone when there is room. The hand button (or holding Space) moves the map while a painting tool is active.</li><li>Click a site you placed, before work starts, to cancel it.</li></ul>
<h4>Research and the village plans</h4><p><b>Research</b> lists what can be studied. The three <b>Village plans</b> switches say what the village still decides for itself: <i>Buildings</i> (new sites, roads, upgrades, bridges), <i>Research</i>, and <i>Jobs</i> (who does what). Amber means you are in charge of that part. Orders and sites you place always come first.</p>
<h4>Speed and sound</h4><p>The speed buttons go from 1× to 100×, and <b>Max</b> runs as fast as your machine can (it shows the days a second). The ♪ button (or the M key) turns on the music, which is made in your browser as you play. Skip it, or press Like or Dislike: a track is just a number, so the same number is always the same tune.</p><h4>Scenarios</h4><p>Menu, then <b>Scenarios…</b> offers ready-made starts: a gentle island, a hard winter continent, river country, islands, the lake country and more.</p><h4>The crowd</h4><p>Once the town has more than 160 people, only some are followed one by one; the rest are the <b>crowd</b>. The Crowd panel sets how much of their effort goes to food, wood and stone.</p>
<h4>When it ends</h4><p>If everyone is gone, or fewer than five people remain for a whole month, the village is over. You will see what it was, and can keep watching, start the same world again, or begin a new one.</p>
<h4>Saving</h4><p>The game saves by itself and resumes where you left off. Settings has Save now, Export and Import for keeping a village as a file.</p>
<h4>Tips</h4><ul><li>Food first: a granary and a few farms before more houses.</li><li>Roads between homes, stores and fields make everyone faster.</li><li>Pausing is free. Plan while paused, then watch what happens.</li><li>If something looks wrong, About has a button that copies a report.</li></ul>`;
/* scenarios (v0.36): ready-made starts; each is just a seed, a map and the settings, so they need no files and stay true as the game grows */
const SCENARIOS = [
  { id: 'quiet', name: 'A quiet start', blurb: 'A small island, gentle seasons and room to learn the game.', seed: 12, type: 'island', size: 'standard', hardship: 0, phil: 'balanced' },
  { id: 'winters', name: 'The long winters', blurb: 'A cold continent and thin harvests. Hard, but a steady hand can keep everyone fed.', seed: 5, type: 'continent', size: 'standard', hardship: 2, phil: 'balanced' },
  { id: 'rivers', name: 'River country', blurb: 'Rivers, bridges and barges. Trade and good crossings matter.', seed: 21, type: 'river', size: 'standard', hardship: 1, phil: 'balanced' },
  { id: 'isles', name: 'Islands apart', blurb: 'A chain of islands. Boats, harbours and distant neighbours.', seed: 5, type: 'archipelago', size: 'large', hardship: 1, phil: 'balanced' },
  { id: 'lakes', name: 'The lake country', blurb: 'Water everywhere, so homes and farms must be placed with care.', seed: 351323045, type: 'lakeland', size: 'standard', hardship: 1, phil: 'balanced' },
  { id: 'open', name: 'Open minds', blurb: 'A peninsula where knowledge comes more easily. Watch how fast an age can turn.', seed: 3, type: 'peninsula', size: 'standard', hardship: 0, phil: 'balanced', open: 1 },
];
function scenariosOpen() {
  const hn = ['Gentle', 'Normal', 'Harsh'];
  modal('Scenarios', '<div class="hint" style="margin-bottom:8px">Ready-made starts. Each one is a world seed with its settings, so you can also play it from the New world dialog.</div>' + SCENARIOS.map(c => `<div class="scen"><div><b>${c.name}</b> <span class="hint">${MAP_TYPES[c.type].label} · ${hn[c.hardship]}${c.open ? ' · open knowledge' : ''}</span><div class="hint">${c.blurb}</div></div><button data-scen="${c.id}">Start</button></div>`).join(''));
  $('modal_b').querySelectorAll('[data-scen]').forEach(b => b.onclick = () => { const c = SCENARIOS.find(x => x.id === b.dataset.scen); modalClose(); newWorld(c.seed, { type: c.type, size: c.size, hardship: c.hardship, phil: c.phil, open: c.open || 0 }); setSpeed(10) });
}
function modal(title, html, extra) { const m = $('modal'); $('modal_t').textContent = title; $('modal_b').innerHTML = html; m.style.display = 'flex'; m._extra = extra || null }
function modalClose() { const m = $('modal'), f = m._extra; m._extra = null; m.style.display = 'none'; if (f) f() }
function helpOpen() { modal('How to play', HELP) }
function aboutOpen() {
  const a = ABOUT, ver = typeof APP_VERSION !== 'undefined' ? APP_VERSION : a.version;
  modal('About Village Sim', `<p class="big">Village Sim <span class="hint">v${escapeHtml(ver)} “${escapeHtml(a.name)}”</span></p><p>A deterministic village simulation that runs in your browser. Free and open source (MIT).</p><p class="hint">© 2026 Zaat. Released under the MIT license. No third-party code, fonts, pictures or audio files: the art and the music are drawn and generated in code.</p><div class="hint">What is new</div><ul>${a.news.map(n => `<li>${escapeHtml(n)}</li>`).join('')}</ul>
    <div class="btnrow" style="flex-wrap:wrap"><a class="btn" href="${a.home}" target="_blank" rel="noopener">Homepage</a><a class="btn" href="${a.changelog}" target="_blank" rel="noopener">Changelog</a><button id="ab_help">Manual</button><a class="btn" href="${a.license}" target="_blank" rel="noopener">License</a></div>
    <div class="hint" style="margin-top:10px">Something wrong? This copies a report (the world line and diagnostics, no personal details) and opens the issue page.</div><div class="btnrow"><button id="ab_report" class="on">Report a problem</button></div><div class="hint" id="ab_note"></div>`);
  $('ab_help').onclick = helpOpen;
  $('ab_report').onclick = async () => { let ok = false; try { await navigator.clipboard.writeText(JSON.stringify(dbgReport(world, speed), null, 2)); ok = true } catch (e) { } $('ab_note').textContent = ok ? 'Report copied. Paste it into the issue.' : 'Your browser blocked copying: use Settings, Diagnostics, Download report.'; window.open(a.issues, '_blank', 'noopener') };
}
/* tips: a small bar that never covers the play area for long. "Got it" closes it for now (it may come back), "Don't show again" silences that tip for good; Menu > Show tips again brings them all back. */
const TIPS_KEY = 'villagesim.tips';
const tipOff = () => { try { return JSON.parse(localStorage.getItem(TIPS_KEY) || '{}') } catch (e) { return {} } };
function tipShow(id, html, pause) {
  const off = tipOff(); if (off[id]) return; const el = $('tip'); if (!el) return;
  const was = speed, hold = pause && !off['seen:' + id] && !navigator.webdriver && speed > 0;          // the very first time, the village waits until you have read it
  if (hold) setSpeed(0);
  el.innerHTML = html + '<div class="tipbtns"><button class="on" data-tip="ok">Got it</button><button data-tip="never" title="This tip will not appear again (Menu > Show tips again)">Don\u2019t show again</button></div>'; el.style.display = 'block';
  const done = never => { el.style.display = 'none'; const o = tipOff(); o['seen:' + id] = 1; if (never) o[id] = 1; try { localStorage.setItem(TIPS_KEY, JSON.stringify(o)) } catch (e) { } if (hold && speed === 0) setSpeed(was || 10) };
  el.querySelector('[data-tip=ok]').onclick = () => done(false); el.querySelector('[data-tip=never]').onclick = () => done(true);
}
function tipHide() { const el = $('tip'); if (el) el.style.display = 'none' }
function tipsReset() { try { localStorage.removeItem(TIPS_KEY) } catch (e) { } }
const WELCOME_KEY = 'villagesim.welcomed';
function welcomeOpen() {
  modal('Welcome to Village Sim', `<p>A small village, a few hands, a lot of time. Watch it grow, or take the lead.</p><div class="btnrow" style="flex-wrap:wrap"><button id="wl_play" class="on">Start a village</button><button id="wl_help">How to play</button><button id="wl_about">About</button></div>`);
  $('wl_play').onclick = () => { modalClose(); setSpeed(10) }; $('wl_help').onclick = helpOpen; $('wl_about').onclick = aboutOpen;
  try { localStorage.setItem(WELCOME_KEY, '1') } catch (e) { }
}
function menuInit() {
  const mb = $('menuBtn'), menu = $('menu'), close = () => { menu.style.display = 'none'; mb.classList.remove('on') };
  mb.onclick = e => { e.stopPropagation(); const open = menu.style.display === 'block'; if (open) close(); else { menu.style.display = 'block'; mb.classList.add('on'); $('mn_load').disabled = $('loadSave').disabled } };
  document.addEventListener('click', e => { if (!e.target.closest('#menu') && e.target !== mb) close() });
  menu.onclick = e => { const b = e.target.closest('[data-mn]'); if (!b) return; close(); ({ resume: () => { if (speed === 0) setSpeed(lastSpeed || 10) }, new: () => nwOpen(), save: () => saveToStorage(true), load: () => $('loadSave').click(), scen: scenariosOpen, settings: () => toggleDrawer(true), tips: () => { tipsReset(); if (typeof puNote === 'function') puNote('Tips are back on.') }, help: helpOpen, about: aboutOpen })[b.dataset.mn]() };
  $('modal_x').onclick = modalClose; $('modal').addEventListener('pointerdown', e => { if (e.target === $('modal')) modalClose() });
  addEventListener('keydown', e => { if (e.key === 'Escape' && $('modal').style.display !== 'none') { modalClose(); e.stopPropagation() } if (e.key === '?' && !(e.target && e.target.tagName === 'INPUT')) helpOpen() }, true);
}
