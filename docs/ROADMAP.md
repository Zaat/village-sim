# Roadmap

What is planned, in rough order, and why. Plans change as the game is played; when one does, this file is updated. The reasoning behind decisions is in [DESIGN.md](DESIGN.md), what exists today is in [FEATURES.md](FEATURES.md), and each release is in the [changelog](../CHANGELOG.md).

Current version: **v0.39.1** · [all milestones](https://github.com/Zaat/village-sim/milestones) · [open issues](https://github.com/Zaat/village-sim/issues) (see the [changelog](../CHANGELOG.md)). Everything below is not built yet.

Status key: **planned** (scope agreed), **proposed** (idea, scope still open).

## Saves — proposed
- **Compressed saves.** Saves are stored gzip-compressed (a 1.3 MB world should drop to a few hundred KB); older uncompressed saves keep loading.
- **Save slots.** About eight named slots plus two rotating autosaves, each with the village name, year, population, age, map and a thumbnail. Save, Save as new, Load, Rename, Delete and Export per slot; Import adds a file as a new slot, so a player can jump between worlds. Stored in the browser's IndexedDB (localStorage is too small for several worlds). The current single save moves into a slot automatically.

Issues: [#132](https://github.com/Zaat/village-sim/issues/132), [#133](https://github.com/Zaat/village-sim/issues/133) · Milestone: [Saves](https://github.com/Zaat/village-sim/milestone/51)

## Performance — planned
- Profile large villages (year 50 and beyond) and smooth the heavy ticks: villagers currently re-decide together every 32 ticks and the day rollover is long.
- Exact path caching, a per-tick search budget and a spatial grid, so large villages stay smooth on phones and 120 Hz screens.
- **A living crowd** (render only): the crowd beyond the 160 simulated villagers walks between homes and workplaces along cached routes, rests at night and shows work animations, instead of standing at doors. It does not change the simulation or saves, and waits until drawing cost is understood.

Issues: [#134](https://github.com/Zaat/village-sim/issues/134), [#135](https://github.com/Zaat/village-sim/issues/135), [#136](https://github.com/Zaat/village-sim/issues/136), [#137](https://github.com/Zaat/village-sim/issues/137) · Milestone: [Performance](https://github.com/Zaat/village-sim/milestone/52)

## v0.40: farming, energy and City design — planned (large; may be split in two)
- **Farming and energy.** A deeper crop and field model, an energy ladder from wood to the later power sources, and finite resource deposits, so scale creates new problems that need new answers.
- **Culture, rebuilt.** One overall figure with four plainly named parts always visible: Traditions, Learning, Heritage and Togetherness, plus a "known for" line, measured per person so a large town does not simply reach 100.
- **Look follows the age.** Buildings and streets that look different from age to age, so a modern town does not look like a medieval one by accident.
- **City design commission.** Beauty and street layout become the work of a council commission: a visible beauty score per district; a project ledger listing every idea, proposal and project with its state (thought of, proposed, approved, funded, in progress, done, shelved, rejected), who proposed it, cost and progress. Projects are slow and expensive and depend on regime, culture and technology. In Watch the council decides; in Play the player approves, changes or rejects, with auto-approve rules and a limit on how many proposals appear at fast speeds.
- **Transport planning.** Roads, straightening and widening, rail, stations and later transit lines, using the same project engine. Needs a transport ladder first (carts, rail, cars, aviation); see DESIGN.md entry 17.
- **Distance and the sea.** Villagers can expand over water; resources across water are not available as if connected unless a bridge is built or a route opened, and goods can be carried.
- **Wildlife and daily life.** Wildlife depth, child mortality tied to conditions and lessons, resting at home.

Issues: [#138](https://github.com/Zaat/village-sim/issues/138), [#139](https://github.com/Zaat/village-sim/issues/139), [#140](https://github.com/Zaat/village-sim/issues/140), [#141](https://github.com/Zaat/village-sim/issues/141), [#142](https://github.com/Zaat/village-sim/issues/142), [#143](https://github.com/Zaat/village-sim/issues/143), [#144](https://github.com/Zaat/village-sim/issues/144), [#145](https://github.com/Zaat/village-sim/issues/145), [#10](https://github.com/Zaat/village-sim/issues/10), [#4](https://github.com/Zaat/village-sim/issues/4) · Milestone: [v0.40](https://github.com/Zaat/village-sim/milestone/45)

## Polish release (before v1.0) — planned
- **Events redesign**, including the Chronicle and daily summaries.
- **A clearer build screen** and a full interface sweep before 1.0.
- **More of the game in Spanish.**

Issues: [#2](https://github.com/Zaat/village-sim/issues/2), [#147](https://github.com/Zaat/village-sim/issues/147), [#148](https://github.com/Zaat/village-sim/issues/148), [#149](https://github.com/Zaat/village-sim/issues/149), [#150](https://github.com/Zaat/village-sim/issues/150), [#151](https://github.com/Zaat/village-sim/issues/151), [#3](https://github.com/Zaat/village-sim/issues/3) · Milestone: [Polish release](https://github.com/Zaat/village-sim/milestone/54)

## Pace — proposed
A single, smoother birth model for villagers and crowd, and a faster march through the ages (the last current age by about year 30 instead of 60), calibrated with the pace lab tool across maps and hardship levels. Waits for a decision after more play testing; see DESIGN.md entry 3.

Issues: [#152](https://github.com/Zaat/village-sim/issues/152) · Milestone: [Pace redesign](https://github.com/Zaat/village-sim/milestone/53)

## v0.41: Space — planned
A space race against neighbouring civilizations, orbit and colonies: the ages beyond the information age.

Issue: [#153](https://github.com/Zaat/village-sim/issues/153) · Milestone: [v0.41 Space](https://github.com/Zaat/village-sim/milestone/55)

## v0.42: Generative minds — proposed
Focus villagers keep a small memory and compose their thoughts and talk from their situation, instead of picking lines from tables; cached Claude-written lines for notable villagers. Cost stays bounded because only about 160 villagers are simulated one by one (DESIGN.md entry 1).

Issue: [#154](https://github.com/Zaat/village-sim/issues/154) · Milestone: [v0.42 Generative minds](https://github.com/Zaat/village-sim/milestone/56)

## v1.0
After the polish release and the content releases above.

## Tooling and backlog (no release attached)
- Test impact analysis, more suites converted to checkpoints, telemetry beyond the world line, an immersive 3D view as a stretch idea.

Issues: [#155](https://github.com/Zaat/village-sim/issues/155), [#156](https://github.com/Zaat/village-sim/issues/156), [#146](https://github.com/Zaat/village-sim/issues/146), [#6](https://github.com/Zaat/village-sim/issues/6), [#7](https://github.com/Zaat/village-sim/issues/7) · Milestone: [Backlog](https://github.com/Zaat/village-sim/milestone/58)

## Ideas under discussion
- **Late-game interest.** After the population plateaus the game can feel static. Ideas: near-term goals ("ambitions") that give a village something to aim for, new problems that appear with scale and need the energy ladder, and a second village on a neighbouring map.
- **Simple, easy tasks** that players can do mindlessly between decisions.
