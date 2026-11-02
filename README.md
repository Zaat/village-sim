# Village Sim v0.11

A watch-mostly village simulation: a 160×112 island you can pan and zoom, four seasons, wildlife, villagers with personalities and roles, and a town that plans and builds itself.

## Run it
Open `index.html` in a browser. There is no build step and no dependencies (plain script tags, so it also works from `file://`).

The optional **Claude counsel** (right panel) only works on the published page, where the page can call Claude. It is **off by default**. When on, the council and courts hand Claude a short list of concrete options (pass or reject a motion, pick a remedy for a crime wave, choose a sentence). Claude picks one based on each member's personality, opinions and what worked before, and writes the debate. The choice is validated; if it is off, slow or invalid, the village's own rules decide. Limited to 40 deliberations per session.

## Technology, eras and building
- **Knowledge** comes from debating, practising a trade and teaching. The council chooses what to study next (rules by default; Claude can deliberate). 15 discoveries across four ages: Founding, Craft, Stone & Sail, Iron.
- **Effects:** bigger catches (nets), faster work (tools, ironwork), more storage and less spoilage (granaries), higher crop yields (rotation, plow), safer winters (medicine, watchtowers), and more.
- **Architecture changes with the ages:** log cabins, then timber-frame houses (carpentry), then stone houses (masonry). Roads become cobbled. Old homes are upgraded over time, and better homes sleep more people. Storehouses change style too.
- **Docks and boats** (boat-building): fishing boats sail straight out from a dock to deep water, fish, and return; catches are unloaded at the dock.
- **Camps** (forestry, mining, hunting lodges): a camp beside dense forest, rock or game acts as a local depot. Workers within about 14 tiles (22 for hunters) work faster, get more per trip, and hunts are surer.

## Trade, money and taxes (new in 0.6)
- **Trade** research lets the council build a **market** (stalls, a coin sign, a merchant wagon on caravan days). Prices rise with scarcity of wood, stone and food. Caravans arrive every 5–9 days; with **Sea trade** and a dock, trading ships come too. The council (or Claude counsel, if on) decides how much to sell or buy.
- Before **Coinage** trades are barter; after it, the village keeps a **treasury** funded by a tax whose rate follows the Taxes policy (10–40%), and villagers earn, save and buy fine goods that lift mood. Wealth feeds opinions on taxes and can drive crime. See the Trade & treasury card.

## Diplomacy and trade with neighbours (new in 0.11)
- **First contact:** when sailors find an island the council decides how to greet it (a gift, greetings only, or wait and watch).
- **Relations** (-100 to +100) drift with how the village behaves: gifts, aid, trade and an open village policy warm them; weakness, refusals and grudges chill them. Each neighbour has its own temper, and a **new leader** every few seasons can make it prouder or friendlier.
- **Visits by ship** (look for the coloured sail at the dock: blue merchants, gold farmers, purple scholars, red raiders): friendly neighbours trade through the usual merchant deals (with settlement-specific prices: farmers sell cheap grain, merchants pay well and bring fine goods), envoys bring gifts, **scholars teach** a technology the village is ready for, and **settlers** arrive by ship.
- **Treaties:** at good relations the council is offered a **trade pact** (more visits, better prices) and later a **friendship** (neighbours send food when the village starves, share knowledge and settle here). Treaties collapse if trust fades.
- **Pleas for help:** neighbours sometimes ask for aid; helping earns lasting goodwill, refusing costs it.
- **Proud clans** with poor relations demand **tribute** (pay, parley or refuse). With **Raids from neighbours** switched on in Settings (off by default) they can also attack the dock: defence depends on policy, the Bastion, watchtowers, ironwork, brave villagers, lessons learned and alliances. Raids can steal goods, wound or kill defenders, and burn a house, and the council then chooses to fortify, parley, pay a standing tribute or do nothing.
- All of this goes through the council, so Claude counsel can deliberate it when switched on.

## The wider sea: neighbours (new in 0.10)
- New worlds are **260 x 180**: the home island is exactly the same as before (same seed, same island) and the extra sea holds **four other islands**, each with a settlement of its own (merchants, scholars, farmers or clansfolk), hidden in **fog of war**. Villagers reveal the land they walk on and boats reveal the sea as they sail.
- With boats and a dock on the open sea, adventurous villagers (fishers and the curious) take **expeditions** to the nearest unknown island; the farthest two need Navigation. Voyages take days, have a small risk of loss at sea when disasters are on, and each discovery is celebrated and recorded in the chronicle. The **Neighbours** card lists what has been found; the minimap shows islands and boats at sea.
- Wanting the sea: once other islands exist, nets, boat-building and navigation become more attractive to the council. Docks now prefer the open sea over inland lakes.
- Saves from older versions still load as the original 160 x 112 world, without fog or neighbours. Diplomacy, trade routes and (optional) raids with the neighbours are the next step.

## Gathering places (new in 0.9.1)
Villagers no longer all crowd the campfire. With carpentry the village lays out a **village square** (a plaza with a well, benches and, later, cobbles and lamps), and with trade it builds **taverns** where adults spend their evenings. The Great Hall hosts council sessions, the amphitheatre hosts holidays and games, and villagers drift to the market stalls when merchants are in town. The campfire gets log benches until a square exists. Evenings in the tavern or square raise mood and social life, and the chatting there spreads opinions.

## Time travel and more projects (new in 0.9)
- **Time travel:** in the ⚙ drawer, pick a span (a season, 1, 2, 5 or 10 years) and **Fast-forward**. The simulation runs flat out with a progress bar, ETA and a Stop button, then reports population change, deaths, discoveries, projects built, who leads the council and notable events. A copy of the village is kept first, and **Undo** takes you back. Autosave is paused while it runs.
- **Three more great projects:** the **Amphitheatre** (masonry; holidays and games lift mood far more), the **Great Granary** (granary; +120 storage, food spoils 30% slower) and the **Lighthouse** (navigation, needs a dock; deep fisheries recover 30% faster and trading ships come more often). Seven projects in all, one at a time.

## Factions and history (new in 0.8)
- **Factions:** every social circle now has a **platform**: the one or two issues that set it apart (a watch, lighter taxes, more leisure...) and a broader **focus** (learning, safety, fellowship or enterprise). Larger circles field their leader at elections, and voters weigh how closely a circle's platform matches their own views, with a little fatigue for a circle that keeps winning. The circle of the elected Chief **leads the council** (or the circle with the most seats). The ruling circle presses its platform in meetings and nudges research and projects toward its focus. Circles whose platform policy runs against grow bitter, circles whose platform wins grow content.
- **Learning from history:** hard events leave a **lesson**: famine, fire, storms, fever, wolves, hard winters, crime. Each lesson grows with every blow, fades slowly (a library helps it last) and changes how the village prepares: deeper food reserves and more fields, fewer fires and flattened crops, milder fevers, bigger firewood stacks, a tougher stance on defence or law, and research that targets the danger. The **Chronicle & lessons** card shows what the village has learned plus the story so far (discoveries, elections, projects, disasters).
- Wolf attacks now move the defence opinion less, and all opinions fade slowly without fresh cause, so circles keep distinct views.

## Great projects (new in 0.7)
Once the village has the know-how and the stores to spare, the council may commit to **one great project at a time**: a **Great Hall** (carpentry: more frequent council meetings, approval and feast mood), a **Library** (masonry: learning counts 1.5x), a **Bastion** (watchtowers: half the wolves, a third fewer thefts) or a **Monument** (masonry: steady mood lift, more newcomers). The council scores each option by public taste, its own members' leanings and current need, or waits. Claude counsel can choose instead if it is on. The social circles that like the project best pledge their labour and many villagers help build it (up to six workers on one site); backers feel extra pride when it is finished. The Great projects card shows progress and what is already built.

## Settings drawer (new in 0.6)
Settings, save/load, Claude counsel, diagnostics and the world seed live in a drawer opened with the ⚙ Settings button (or **G**; Esc closes it). It floats over the map and never moves, and the side panel's cards now keep a fixed size, so toggles stay put even at 30× speed.

## Diagnostics
Open the **Diagnostics** panel (it shows ok / slow / N errors). It lists actual speed against requested speed, time per tick, where the time goes, and errors with counts. **Copy report** or **Download report** produces a full JSON report (world state counts, timings, errors with stack traces, last events, and errors left over from the previous session). Send that report if something goes wrong.

Safety nets: every subsystem and every villager/animal update is isolated, so one bug is logged and skipped instead of stopping the village; a villager that keeps failing is removed. A daily self-check repairs corrupted numbers and frees villagers who have stopped making progress. A watchdog restarts a stalled frame loop and, if the village stops advancing, resets all jobs and then reloads the last autosave. The page also **resumes your saved village automatically** when it opens (switchable).

## Performance and stability notes
- A long run (500 simulated days, 160+ villagers) completes with no errors. The year-12 freeze was an infinite loop in the naming of social circles (a sixth circle with the same base name never found a unique suffix). It is fixed, and every loop in the code is now bounded or provably terminating.
- Pathfinding failures were the main cost; fields and game that cannot be reached are now skipped before searching, and wildlife uses a spatial grid. Roughly 3x faster at 70+ villagers.
- Wood is renewable: felled trees often sprout again, foresters replant, and better homes need less firewood.

## Saving
- **Autosave** every minute to this browser, plus when you leave the page. Next visit, a prompt offers to **Resume** (the game stays paused until you choose). **Start fresh** keeps the old save as a backup.
- **Export file / Import file** writes a .json save you can keep, share or move to another device. On the published page the export asks your permission first.
- Jobs in progress are not saved: after loading, villagers simply decide again (a carried load or half-finished trip is lost, nothing else).

## Controls
Drag to pan · wheel to zoom · click a villager, animal or building · WASD/arrows pan · Space pause · 1–4 speed · F follow selected · G settings drawer · minimap click to jump.

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
| `src/debug.js` | diagnostics: error history, performance numbers, downloadable reports |
| `src/save.js` | snapshot and restore a whole village (terrain regenerates from the seed; everything else is stored) |
| `src/render.js` | camera, seasonal terrain cache, pixel art drawn in code, lighting, minimap |
| `src/ui.js` | panels, input, Claude narrator toggle, main loop |
| `tests/` | headless engine test (`node tests/sim.js SEED DAYS`), Playwright screenshots |

The simulation files never touch the DOM, so they run in Node for batch experiments.

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

## Roadmap
1. **Done so far:** boats and docks, tech eras, camps, trade and money, great projects.
2. **Then (civilization):** exploration, sports and games, science, bigger disasters.
3. Save/load and export, richer analysis charts, bigger maps.
