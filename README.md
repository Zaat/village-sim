# Village Sim v0.17

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

## A more living world (new in 0.17)
- **Sightseers:** villagers walk over to look at the Monument, Temple (devout villagers pray there), Library (curious ones browse), Lighthouse, Bastion, Citadel, Foundry and Great Granary. Visits are counted in each building's panel, with popularity trends.
- **Output statistics:** logging and mining camps, farms and docks track what they produce: this season, last season, past year, all time, with a trend and a small four-season chart.
- **Trees:** new trees start as saplings and take about 12 days of growing weather to mature. Woodcutters only fell mature trees, and partly cut trees grow back.
- **Soil:** every field has a fertility that falls with each harvest and recovers over time (faster when left bare in winter; rotation halves the wear). Tired soil gives smaller harvests.
- **Weather years:** each spring brings a wet, dry or ordinary year that raises or lowers crop growth.
- **Animals:** wolf packs return to where there is deer and can breed (capped); berry bushes regrow more slowly.
- **Tools:** `tools/release.sh` (tests, zip, repo sync, commit, push), `node tests/sweep.js quick` (6 worlds x 192 days), `tests/living.js`.

## Inspector overhaul (new in 0.16)
- **Buildings:** fixed the age bugs (day-0 buildings always read 0 days; upgrades overwrote the original era). Panels now have Usage, People and Details sections. Venues (square, tavern, hall, amphitheatre, market, campfire, docks) track visits this season, last season, the past year, all time, a popularity trend (growing, steady, fading) with a small four-season chart, and regulars. Houses list residents; camps list workers; docks list boats and total catch; great works say who built them.
- **Villagers:** age in years, family (partner, parents, children), housemates, places they are often found at, work output, birth date. Names are links: click one to jump to that villager or building.
- **Animals:** health, hunger, age, activity, pack size for wolves.

## When a village divides (new in 0.15)
Unity is no longer just a number. A circle that feels unheard, is unhappy, or sits far from the way things are run can now act, and the council has to answer (or Claude can counsel it, if you have that switched on).
- **Rival councils:** an aggrieved circle sets up its own council under its most charismatic member. The council can **seat** them (and shift policy toward their grievance), **ignore** them, or **seize** the leader. A divided council stalls its meetings.
- **Strikes:** a circle can put down its tools over one policy. The council can **concede**, **hold out**, or **break** the strike. Strikers really stop working and gather at the square.
- **Civil strife:** a long standoff, low unity and the violence setting can lead to street fighting with wounded and dead (it follows the *Crime* setting). It ends in one side holding the village, the rebels taking power, or a stalemate.
- **Secession:** when fighting or a standoff cannot be mended, the council can **let a circle go** or forbid it. The circle sails off with its families and founds a **new settlement on a neighbouring island**. It appears on the Neighbours tab with the story of how it left (warm after a peaceful parting, cold after a bitter one), shares what the village knew, and trades, asks for aid or raids like any other neighbour.
- **Sects:** a devout, charismatic villager can found a movement with its own doctrine: **Zealots** (press one way on all), **Ascetics** (simple shared living) or **Reformers** (open, questioning). The council may **tolerate**, **embrace** or **suppress** it, and each choice pulls the village differently.
- **Regime buildings:** three new great works appear for villages that lean that way: the **Temple** (faith, fewer crimes, reconciles sects), the **Foundry** (faster work and learning) and the **Citadel** (deters raiders, makes coups and uprisings far harder). Each has its own art and building stats.
- **Tuning:** coups, uprisings and purges now happen in natural play, openness no longer saturates, and Fractured Towns can emerge. The sweep tool reports strife per world.

## Villages that turn out differently (new in 0.14)
Every village now finds its own path. Nothing is rolled or scripted: it emerges from who the people are, how they were raised, who comes to lead them and what they live through.
- **Character:** besides the basic traits, each villager has a **temperament** (gentle to ruthless), **faith** (doubter to devout) and **ambition**. These are partly inherited. A child's **upbringing** (a warm or harsh household, hungry years, losing a parent, growing up in a climate of fear) shapes who they become when they come of age. Life shapes them later too: loss deepens faith, famine and raids harden people, power feeds ambition. The inspector shows a villager's character and upbringing.
- **How the village is ruled:** six slow-moving qualities (**Authority, Community, Faith, Industry, Openness, Unity**) are pulled by the character of the Chief and council, by the people's own temper, and by crises, plenty and divisions. They add up to a regime that can be a **Free Council, Commune, Tyranny or Autocracy, Communal State, Spiritual Commonwealth, Theocracy, Merchant Republic, Industrial State** or a **Fractured Town**. See the **Society** tab. A new regime is announced in the chronicle only when the change lasts.
- **Real consequences:** harder rule drives work and curbs crime but sours moods and slows learning; communal states equalise wealth and tax heavily and discourage trade; faith brings fewer crimes, more festivals (a Day of Devotion) and more children but a more cautious mind; industry speeds work and invention; openness brings visitors and ideas; a divided village stalls councils and great works and sees street fights. The regime also steers research, great projects and people's opinions.
- **Emergent events:** a **strongman** may seize power in a crisis; a **prophet** may rise and win followers; hard rulers **purge critics**; hated regimes meet **uprisings**; a gentle chief may **ease** a heavy hand; and with enough authority the Chief stops standing for election and names loyalists, then may pass leadership to a **child and heir**.
- The seed-sweep tool now reports regimes and how much worlds differ.

## Tabs, speed and a balance sweep (new in 0.13)
- The side panel is now **tabbed**: Village (stats, history, inspector), Society (council, circles), Progress (knowledge, trade, projects), World (neighbours, chronicle) and Events. Clicking something on the map jumps to the Village tab, and only the visible tab is redrawn. The last tab is remembered.
- **Faster:** the fog-of-war update was a third of every tick; it now only looks where villagers have moved, which cuts total simulation cost by about a quarter.
- **Smaller saves:** big map layers are run-length packed (about 312 KB down to about 23 KB), so a mid-game save is roughly 450 KB instead of 730 KB. Older saves still load.
- **Developer tool, `tests/sweep.js`:** runs many worlds in parallel for a number of days and reports population, tech, politics, wealth, neighbours and errors per seed, how much worlds differ from each other, and warnings about degenerate worlds. It is the yardstick for making each village unique.

## Building stats (new in 0.12)
- Every building now has **hit points**, a **condition** (Sound, Good, Worn, Poor, Failing), an age, the era it was built in, a material, a repair count and a last-event note. Click a building to see them; a small bar shows its condition on the map, and worn buildings show cracks and dust.
- Strength depends on the build: log cabins are weakest, timber-frame stronger, stone twice as strong as log; great projects are very sturdy. Buildings **wear** with age and weather (log wears fastest, stone slowest; winter and harsh winters are worse).
- **Builders repair** worn buildings (below about 75%) using wood, and stone for stone structures. Neglect ends in **collapse**.
- **Fire, storms and raiders now damage rather than simply delete**: log cabins usually burn down, timber and stone often survive scorched, storms batter roofs, and a raid's torch may only singe a house. Upgrades and rebuilding restore full strength.

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
| `src/trade.js` | money, prices, taxes, merchant caravans |
| `src/projects.js` | great projects (hall, library, bastion, monument, amphitheatre, granary, lighthouse, temple, foundry, citadel) |
| `src/history.js` | the chronicle and the lessons a village remembers |
| `src/buildings.js` | building hit points, wear and repair |
| `src/places.js` | the square, tavern and where villagers gather |
| `src/neighbours.js` | other islands, fog of war, first contact by boat |
| `src/diplomacy.js` | treaties, aid, visits, tribute and raids |
| `src/character.js` | temperament, faith, ambition and upbringing |
| `src/regime.js` | how the village is ruled: six axes, regime labels, coups, prophets, uprisings, heirs |
| `src/strife.js` | rival councils, strikes, civil strife, secession to new settlements, sects |
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
