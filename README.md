# Village Sim v0.4

A watch-mostly village simulation: a 160×112 island you can pan and zoom, four seasons, wildlife, villagers with personalities and roles, and a town that plans and builds itself.

## Run it
Open `index.html` in a browser. There is no build step and no dependencies (plain script tags, so it also works from `file://`).

The optional **Claude counsel** (right panel) only works on the published page, where the page can call Claude. It is **off by default**. When on, the council and courts hand Claude a short list of concrete options (pass or reject a motion, pick a remedy for a crime wave, choose a sentence). Claude picks one based on each member's personality, opinions and what worked before, and writes the debate. The choice is validated; if it is off, slow or invalid, the village's own rules decide. Limited to 40 deliberations per session.

## Saving
- **Autosave** every minute to this browser, plus when you leave the page. Next visit, a prompt offers to **Resume** (the game stays paused until you choose). **Start fresh** keeps the old save as a backup.
- **Export file / Import file** writes a .json save you can keep, share or move to another device. On the published page the export asks your permission first.
- Jobs in progress are not saved: after loading, villagers simply decide again (a carried load or half-finished trip is lost, nothing else).

## Controls
Drag to pan · wheel to zoom · click a villager, animal or building · WASD/arrows pan · Space pause · 1–4 speed · F follow selected · minimap click to jump.

## Layout
| File | Purpose |
|---|---|
| `src/config.js` | `CFG` (all balance numbers), enums, noise/RNG/heap utilities |
| `src/world.js` | terrain generation, buildings, pathfinding, calendar/seasons, main `step()` |
| `src/animals.js` | deer, rabbits, wolves |
| `src/villager.js` | personality, skills, needs, jobs (lazy `go`/`work` steps), wolf response |
| `src/town.js` | what to build, resource targets, role assignment (self-correcting), events (newcomers, wolves, fever, fire, storm, drought, harsh winter) |
| `src/society.js` | opinions and debates, bonds and rivalries, emergent social circles, elected council and policies, crime and justice, holidays and games |
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
1. **Next (water and technology):** boats, docks, fishing fleets and crossing the water; a tech tree with eras and building styles that change over time.
2. **Then (civilization):** markets and money, great projects built by cooperating groups, learning from history, sports and games, science, bigger disasters.
3. Save/load and export, richer analysis charts, bigger maps.
