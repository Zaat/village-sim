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
| `src/debug.js` | diagnostics: error history, performance numbers, downloadable reports |
| `src/save.js` | snapshot and restore a whole village (terrain regenerates from the seed; everything else is stored) |
| `src/render.js` | camera, seasonal terrain cache, pixel art drawn in code, lighting, minimap |
| `src/ui.js` | panels, input, Claude narrator toggle, main loop |
| `tests/` | the release suites (listed in `tests/suites.json`), golden trajectories, the performance gate, Playwright page tests; old one-off scripts live in `tests/legacy/` |
| `tools/checkpoint.js` | make and list the saved worlds in `tests/checkpoints/` that suites load instead of simulating the early game |
| `tools/run.js` | the test runner behind `tools/check.sh` (affected suites, `full`, `pages`, timings, green stamp) |

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

