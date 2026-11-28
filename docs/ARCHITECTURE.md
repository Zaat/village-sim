# How Village Sim works

## Layout
| File | Purpose |
|---|---|
| `src/config.js` | `CFG` (all balance numbers), enums, noise/RNG/heap utilities |
| `src/world.js` | terrain generation, buildings, pathfinding, calendar/seasons, main `step()` |
| `src/animals.js` | deer, rabbits, wolves |
| `src/villager.js` | personality, skills, needs, jobs (lazy `go`/`work` steps), wolf response |
| `src/town.js` | what to build, resource targets, role assignment (self-correcting), events (newcomers, wolves, fever, fire, storm, drought, harsh winter) |
| `src/society.js` | opinions and debates, bonds and rivalries, emergent social circles, elected council and policies, crime and justice, holidays and games |
| `src/tech.js` | knowledge, research, the discovery tree, eras, house styles, upgrades |
| `src/water.js` | docks and fishing boats |
| `src/trade.js` | money, prices, taxes, merchant caravans |
| `src/projects.js` | great projects (hall, library, bastion, monument, amphitheatre, granary, lighthouse, temple, foundry, citadel) |
| `src/history.js` | the chronicle and the lessons a village remembers |
| `src/buildings.js` | building hit points, wear and repair |
| `src/places.js` | the square, tavern and where villagers gather |
| `src/mapgen.js` | map types: shapes, rivers and fords, connected land, neighbours on foot |
| `src/routes.js` | village-run trade trips, the shared cost-benefit rule, harbour tiers and shipyard, trade ledger |
| `src/neighbours.js` | other islands, fog of war, first contact by boat |
| `src/diplomacy.js` | treaties, aid, visits, tribute and raids |
| `src/character.js` | temperament, faith, ambition and upbringing |
| `src/regime.js` | how the village is ruled: six axes, regime labels, coups, prophets, uprisings, heirs |
| `src/strife.js` | rival councils, strikes, civil strife, secession to new settlements, sects |
| `src/culture.js` | weddings, funerals, story nights, the culture score |
| `src/city.js` | land value, density, redevelopment, hamlets, desire paths |
| `src/crowd.js` | the crowd: everyone beyond the 160 people simulated one by one, kept as numbers by age |
| `src/crowdui.js` | browser only: draws the crowd as figures that follow the day (door, work, plaza, home, asleep) along routes it finds itself and keeps; never touches the simulation |
| `src/events.js` | the event record (`w.ev`): group, size and place of every event, the feed, the years table and the Now summary |
| `src/eventsui.js` | browser only: the Events tab (Now, Events, Years) and the map pins |
| `src/debug.js` | diagnostics: error history, performance numbers (including the main loop's ticks per frame), the full copyable report |
| `src/saves.js` | browser only: compressed saves in IndexedDB (autosave, backup, ten named saves, the time-travel Undo copy); reads plain older saves |
| `src/save.js` | snapshot and restore a whole village (terrain regenerates from the seed; everything else is stored) |
| `src/stats.js` | statistics kept for the whole run: dozens of series sampled every four days, event counters, yearly rates |
| `src/statsui.js` | the Stats tab (chart, presets, events table) and the hover history graph on stat names |
| `src/concerns.js` | the village watches its own numbers and raises concerns with states |
| `src/concernsui.js` | the Concerns badge, panel and toasts |
| `src/lives.js` | hobbies, leisure, families and feuds, the depth behind each life |
| `src/livelihoods.js` | trades besides the six heavy roles, demand and supply, invented jobs |
| `src/resources.js` | what each resource is for, how much is wanted and why a store may be short |
| `src/economy.js` | what the crowd's work yields, so crowd and villagers follow the same rules |
| `src/districts.js` | the town read as 16x16 districts (nothing stored) |
| `src/timber.js` | wood brought from far shores by boat |
| `src/terraform.js` | works that reshape the land: grading, drainage, terraces, dikes, reclamation |
| `src/bridges.js` | spanning a strait or river so the village can reach land it cannot walk to |
| `src/outposts.js` | settlements founded by the village and how loyal they stay |
| `src/discovery.js` | hidden sites, expeditions, materials and old writings |
| `src/war.js` | soldiers, raids, campaigns, morale and battle records |
| `src/gameover.js` | the two ways a village ends, and the choice to carry on |
| `src/techtree.js` | the tree of knowledge: about 150 technologies in 8 branches and 11 ages |
| `src/unlocks.js` | what each technology needs and what it is good for |
| `src/treeui.js` | the dependency tree drawn as boxes and lines |
| `src/voices.js` | what villagers think and say, chosen from their real state |
| `src/voicesui.js` | the talk feed, daily summaries, the thought block and clickable bubbles |
| `src/play.js` | the player's hands: orders, building, roads and zones, kept as plain data on the world |
| `src/playui.js` | the Play screen: toolbar, group orders, build panels |
| `src/helpui.js` | the game menu, the manual, About and the first-visit welcome |
| `src/overui.js` | the end screen |
| `src/sound.js` | music and effects generated in code; off until turned on |
| `src/i18n.js` | the language layer: English text is the key, Spanish where translated |
| `src/diag.js` | what is needed to look at a run without guessing (world line, diagnostics text) |
| `src/render.js` | camera, seasonal terrain cache, pixel art drawn in code, lighting, minimap |
| `src/ui.js` | panels, input, layout modes (Docked, Clean), the menu, compact lists, the main loop |
| `tests/` | the release suites (listed in `tests/suites.json`), golden trajectories, the performance gate, Playwright page tests; old one-off scripts live in `tests/legacy/` |
| `tools/checkpoint.js` | make and list the saved worlds in `tests/checkpoints/` that suites load instead of simulating the early game |
| `tools/run.js` | the test runner behind `tools/check.sh` (affected suites, `full`, `pages`, timings, green stamp) |
| `tools/mathcheck.js` | builds the same worlds in Node, Chromium, Firefox and WebKit and compares them bit for bit, and the sine and cosine values |
| `.github/workflows/ci.yml` | runs the node suites, the page tests and the cross-engine check on every push |

The simulation files never touch the DOM, so they run in Node for batch experiments.

## Rules the code relies on
- **The simulation is deterministic.** One seeded generator and a tick counter; rendering, sound and panels never draw from the generator or write simulation state. Anything that is only a label is added as a separate display key, so the keys game logic reads stay unchanged. The same seed must give the same village in every browser: never sort with a random comparator (use `shuffled(list, rnd)`), read no clock in simulation code, and expect `Math.sin` and `Math.cos` to differ in the last bit between engines. See [DESIGN.md](DESIGN.md) entries 4 and 5.
- **The crowd is numbers.** Up to 160 villagers are simulated one by one; the rest are counts by age and work. Drawing the crowd is a render-only matter (`crowdui.js` has its own route search and cache, and never calls the simulation's `search`).
- **One loop, one budget.** The page loop adds owed ticks each frame and stops a frame's ticking after a time budget (14 ms normally, 45 ms at Max speed); owed time carries over so a long tick does not slow the game. Live numbers for it are in Diagnostics.
- **Saves** store everything except terrain, which is regenerated from the seed. The save records which version wrote it.

## How it works
- **Time:** 1200 ticks = 1 day, 8 days per season, 32-day year. Same seed = same world.
- **Seasons:** crops stop growing in winter, berries disappear, houses burn firewood, deer and fish regrow only in warm months, snow and colors change.
- **Villagers:** five personality traits (sociable, industrious, curious, brave, kind), inherited by children with some mutation. Skills improve with practice. Roles (builder, farmer, hunter, fisher, woodcutter, miner) are assigned by the town from need and each person's aptitude.
- **Decisions:** each villager runs a priority list (danger, hunger, sleep, social, work). Brave villagers fight wolves; timid ones hide.
- **Life stages:** infant, child, youth (apprentice), adult, elder. Children inherit traits and opinions from their parents; families carry a house name. Elders step back from heavy labor and carry extra influence.
- **Desires and stories:** each adult has a personal goal (a family, mastery of a trade, belonging, understanding the world, leadership, glory at the games). Milestones are recorded in a life story you can read in the inspector.
- **Opinions:** four issues (growth, work vs leisure, strict vs lenient law, watch vs trust). Villagers debate, persuade or quarrel, and events (crime, wolves, famine, festivals) shift opinions.
- **Groups:** friendship clusters form named circles with leaders; circles can grow close or become rivals.
- **Council:** at 8+ adults the village elects a council (Chief, Warden, Steward, Speaker, Councillors), which meets every four days, votes on policy and picks remedies for crime waves. It tracks what worked ("efficacy") and adjusts.
- **Crime and justice:** theft from the stores and brawls, investigated by the Warden, tried by the council, sentenced by the law policy (warning, community labor, stocks, banishment).
- **Holidays:** Seedtime Festival, Midsummer Games (contests), Harvest Festival, Midwinter Feast.
- **Settings:** Survival mode (harder), Disasters on/off (fire, storm, fever, drought, harsh winter), Crime and conflict on/off.
- **Resource balance:** stock targets scale with population and season, and role quotas shift hands toward whichever resource is short and away from a surplus.

