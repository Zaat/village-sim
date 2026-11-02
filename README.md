# Village Sim v0.2

A watch-mostly village simulation: a 160×112 island you can pan and zoom, four seasons, wildlife, villagers with personalities and roles, and a town that plans and builds itself.

## Run it
Open `index.html` in a browser. There is no build step and no dependencies (plain script tags, so it also works from `file://`).

The **Claude narrator** (right panel) only works on the published page, where the page can call Claude. It is **off by default**; when on it is rate-limited to 40 calls per session.

## Controls
Drag to pan · wheel to zoom · click a villager, animal or building · WASD/arrows pan · Space pause · 1–4 speed · F follow selected · minimap click to jump.

## Layout
| File | Purpose |
|---|---|
| `src/config.js` | `CFG` (all balance numbers), enums, noise/RNG/heap utilities |
| `src/world.js` | terrain generation, buildings, pathfinding, calendar/seasons, main `step()` |
| `src/animals.js` | deer, rabbits, wolves |
| `src/villager.js` | personality, skills, needs, jobs (lazy `go`/`work` steps), wolf response |
| `src/town.js` | what to build, role assignment, random events (festival, newcomers, wolves, fever, harsh winter, drought) |
| `src/render.js` | camera, seasonal terrain cache, pixel art drawn in code, lighting, minimap |
| `src/ui.js` | panels, input, Claude narrator toggle, main loop |
| `tests/` | headless engine test (`node tests/sim.js SEED DAYS`), Playwright screenshots |

The simulation files never touch the DOM, so they run in Node for batch experiments.

## How it works
- **Time:** 1200 ticks = 1 day, 8 days per season, 32-day year. Same seed = same world.
- **Seasons:** crops stop growing in winter, berries disappear, houses burn firewood, deer and fish regrow only in warm months, snow and colors change.
- **Villagers:** five personality traits (sociable, industrious, curious, brave, kind), inherited by children with some mutation. Skills improve with practice. Roles (builder, farmer, hunter, fisher, woodcutter, miner) are assigned by the town from need and each person's aptitude.
- **Decisions:** each villager runs a priority list (danger, hunger, sleep, social, work). Brave villagers fight wolves; timid ones hide.
- **Claude (optional):** the rule-based simulation always drives daily life. With the toggle on, Claude is asked only for notable moments: a chronicle entry at each season change and big events, plus conversations between curious villagers.

## Roadmap
1. **Next:** social circles and factions, a tech tree (tools, bronze/iron, better buildings, mills), village decisions and debates that change policy.
2. Longer storylines: rivalries, courtship, leaders, trade with travelers, disasters.
3. Save/load and export, richer analysis charts, bigger maps.
