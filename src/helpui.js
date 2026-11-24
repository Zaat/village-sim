'use strict';
/* helpui.js — the game menu, the manual, the About card and the first-visit welcome (v0.35).
   The news list in ABOUT is rewritten at each release (tools/release.sh checks that its version matches APP_VERSION). */
const ABOUT = {
  home: 'https://github.com/Zaat/village-sim', issues: 'https://github.com/Zaat/village-sim/issues/new/choose', changelog: 'https://github.com/Zaat/village-sim/blob/main/CHANGELOG.md', license: 'https://github.com/Zaat/village-sim/blob/main/LICENSE',
  version: '0.35.1', name: 'Play',
  news: ['Switching between Watch and Play is seamless: Watch is always fully automatic and your Play choices are kept. The first time you enter Play the council stops building, with a note saying so.', 'Crowded households can now move in with housemates who suit them, so the Not enough homes concern no longer stays on all the time.', 'Pinch to zoom and two-finger pan on touchscreens.', 'The council no longer starts great works such as halls while you are in charge in Play.'],
};
const HELP = `
<h4>The idea</h4><p>A small village on its own island or shore. Watch it grow from a handful of people into a town: farms, houses, trade, ideas, quarrels. Every world is made from a seed, so the same seed always starts the same land.</p>
<h4>Watch and Play</h4><p><b>Watch</b> leaves everything to the village. <b>Play</b> (the switch at the bottom of the map) lets you take the lead as much or as little as you like. You can switch back at any time; nothing is lost.</p>
<h4>Looking around</h4><table class="ht"><tr><td></td><td><b>Mouse</b></td><td><b>Touch</b></td></tr><tr><td>Move the map</td><td>drag, or WASD / arrows</td><td>drag</td></tr><tr><td>Zoom</td><td>wheel, + and −</td><td>the + and − buttons</td></tr><tr><td>Inspect</td><td>click a villager, animal, building or ground</td><td>tap</td></tr><tr><td>Speed</td><td>Space, [ ] or the buttons</td><td>the buttons</td></tr></table>
<p>A plain click or tap <b>only selects and inspects</b>. It never gives an order by accident.</p>
<h4>Giving orders (Play)</h4><ul><li><b>Pick people</b>: click a villager, Shift-click to add more, or hold Shift and drag a box. On a phone, tap a villager.</li><li><b>Give an order</b>: right-click a tree, rock, berry bush, building site or damaged building to send them there. On a phone, tap the place, then press the order button in the inspector; or press and hold on the map for a menu.</li><li>The bar above the toolbar has the common jobs: wood, stone, berries, farm, hunt, fish, a fixed job, and <b>Free</b> to hand them back to the village.</li><li>Children cannot be ordered. Ordered villagers still eat, sleep and run from wolves.</li></ul>
<h4>Building (Play)</h4><ul><li><b>Build</b>: pick a building, move over open grass (the footprint shows green where it can go, red where it cannot, and says why), then click. On a phone, tap to place the footprint, tap again to confirm. Builders pick your sites first. Esc or right-click leaves the tool.</li><li><b>Road</b>: drag along the ground. Each tile costs a stone.</li><li><b>Zone</b>: paint homes, farms, work or civic areas. When the village places a building of that kind, it chooses ground inside the zone when there is room. The hand button (or holding Space) moves the map while a painting tool is active.</li><li>Click a site you placed, before work starts, to cancel it.</li></ul>
<h4>Research and the village plans</h4><p><b>Research</b> lists what can be studied. The three <b>Village plans</b> switches say what the village still decides for itself: <i>Buildings</i> (new sites, roads, upgrades, bridges), <i>Research</i>, and <i>Jobs</i> (who does what). Amber means you are in charge of that part. Orders and sites you place always come first.</p>
<h4>The crowd</h4><p>Once the town has more than 160 people, only some are followed one by one; the rest are the <b>crowd</b>. The Crowd panel sets how much of their effort goes to food, wood and stone.</p>
<h4>When it ends</h4><p>If everyone is gone, or fewer than five people remain for a whole month, the village is over. You will see what it was, and can keep watching, start the same world again, or begin a new one.</p>
<h4>Saving</h4><p>The game saves by itself and resumes where you left off. Settings has Save now, Export and Import for keeping a village as a file.</p>
<h4>Tips</h4><ul><li>Food first: a granary and a few farms before more houses.</li><li>Roads between homes, stores and fields make everyone faster.</li><li>Pausing is free. Plan while paused, then watch what happens.</li><li>If something looks wrong, About has a button that copies a report.</li></ul>`;
function modal(title, html, extra) { const m = $('modal'); $('modal_t').textContent = title; $('modal_b').innerHTML = html; m.style.display = 'flex'; m._extra = extra || null }
function modalClose() { const m = $('modal'), f = m._extra; m._extra = null; m.style.display = 'none'; if (f) f() }
function helpOpen() { modal('How to play', HELP) }
function aboutOpen() {
  const a = ABOUT, ver = typeof APP_VERSION !== 'undefined' ? APP_VERSION : a.version;
  modal('About Village Sim', `<p class="big">Village Sim <span class="hint">v${escapeHtml(ver)} “${escapeHtml(a.name)}”</span></p><p>A deterministic village simulation that runs in your browser. Free and open source (MIT).</p><div class="hint">What is new</div><ul>${a.news.map(n => `<li>${escapeHtml(n)}</li>`).join('')}</ul>
    <div class="btnrow" style="flex-wrap:wrap"><a class="btn" href="${a.home}" target="_blank" rel="noopener">Homepage</a><a class="btn" href="${a.changelog}" target="_blank" rel="noopener">Changelog</a><button id="ab_help">Manual</button><a class="btn" href="${a.license}" target="_blank" rel="noopener">License</a></div>
    <div class="hint" style="margin-top:10px">Something wrong? This copies a report (the world line and diagnostics, no personal details) and opens the issue page.</div><div class="btnrow"><button id="ab_report" class="on">Report a problem</button></div><div class="hint" id="ab_note"></div>`);
  $('ab_help').onclick = helpOpen;
  $('ab_report').onclick = async () => { let ok = false; try { await navigator.clipboard.writeText(JSON.stringify(dbgReport(world, speed), null, 2)); ok = true } catch (e) { } $('ab_note').textContent = ok ? 'Report copied. Paste it into the issue.' : 'Your browser blocked copying: use Settings, Diagnostics, Download report.'; window.open(a.issues, '_blank', 'noopener') };
}
const PLAYTIP_KEY = 'villagesim.playtip';
/* first time in Play: the village waits while the tip is open */
function playTipOpen() {
  const was = speed; setSpeed(0);
  modal('You are in charge', `<p>The council has stopped building. From now on <b>you</b> place the buildings, roads and fields: pick <b>Build</b> (B), <b>Road</b> (R) or <b>Zone</b> (Z) in the bar below, or right-click a villager's target to give an order.</p><p>Research and jobs are still automatic until you switch them in <b>Village plan</b>.</p><p class="hint">Switch back to Watch at any time and the council takes over again. Your choices are kept for next time.</p><div class="btnrow"><button id="pt_ok" class="on">Got it</button></div>`, () => { if (speed === 0) setSpeed(was || 10) });
  $('pt_ok').onclick = modalClose; try { localStorage.setItem(PLAYTIP_KEY, '1') } catch (e) { }
}
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
  menu.onclick = e => { const b = e.target.closest('[data-mn]'); if (!b) return; close(); ({ resume: () => { if (speed === 0) setSpeed(lastSpeed || 10) }, new: () => nwOpen(), save: () => saveToStorage(true), load: () => $('loadSave').click(), settings: () => toggleDrawer(true), help: helpOpen, about: aboutOpen })[b.dataset.mn]() };
  $('modal_x').onclick = modalClose; $('modal').addEventListener('pointerdown', e => { if (e.target === $('modal')) modalClose() });
  addEventListener('keydown', e => { if (e.key === 'Escape' && $('modal').style.display !== 'none') { modalClose(); e.stopPropagation() } if (e.key === '?' && !(e.target && e.target.tagName === 'INPUT')) helpOpen() }, true);
}
