# Roadmap

What is planned, in rough order, and why. Plans change as the game is played; when one does, this file is updated. The reasoning behind decisions is in [DESIGN.md](DESIGN.md), what exists today is in [FEATURES.md](FEATURES.md), and each release is in the [changelog](../CHANGELOG.md).

Current version: **v0.39.3** · [all milestones](https://github.com/Zaat/village-sim/milestones) · [open issues](https://github.com/Zaat/village-sim/issues) (see the [changelog](../CHANGELOG.md)). Everything below is not built yet.

Status key: **planned** (scope agreed), **proposed** (idea, scope still open).

## City design, continued — planned (the release after v0.40)
- **Culture, rebuilt.** One overall figure with four plainly named parts always visible: Traditions, Learning, Heritage and Togetherness, plus a "known for" line, measured per person so a large town does not simply reach 100.
- **Look follows the age.** Buildings and streets that look different from age to age, so a modern town does not look like a medieval one by accident. Buildings keep the look of the age they were built in and change when remodelled or rebuilt.
- **City design, the rest.** In Play the player approves, changes or rejects projects, with auto-approve rules and a limit on how many proposals appear at fast speeds; a monument project; a beauty overlay on the map; road realignment.
- **A city that keeps changing.** The village should not stay static late in the game: buildings age and are replaced, and the layout and its organisation shift slowly for efficiency and sometimes beauty, with more variety than a real city because the building types are fewer. Periodic re-planning, remodel and replace by age and condition, redevelopment of worn quarters, rezoning as the economy changes, and decline and reclaim.
- **Transport planning.** Roads, straightening and widening, rail, stations and later transit lines, using the same project engine. Needs a transport ladder first (carts, buses, rail, metro, cars, airports, aviation); see DESIGN.md entry 17.
- **Distance and the sea.** Villagers can expand over water; resources across water are not available as if connected unless a bridge is built or a route opened, and goods can be carried.
- **Wildlife and daily life.** Wildlife depth, child mortality tied to conditions and lessons, resting at home.

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
After the content releases above, and one last task before it ships: a **full interface sweep** (every screen, in both languages, on a computer and a phone; the Play layout), together with the browser and web API review and the rest of the Spanish translation (the inspector panels, event texts, thoughts and technology names).

Issues: [#149](https://github.com/Zaat/village-sim/issues/149), [#151](https://github.com/Zaat/village-sim/issues/151), [#150](https://github.com/Zaat/village-sim/issues/150) · Milestone: [v1.0](https://github.com/Zaat/village-sim/milestone/57)

## Tooling and backlog (no release attached)
- A date panel behind the date display (needs a discussion first), test impact analysis, more suites converted to checkpoints, telemetry beyond the world line, an immersive 3D view as a stretch idea.

Issues: [#3](https://github.com/Zaat/village-sim/issues/3), [#155](https://github.com/Zaat/village-sim/issues/155), [#156](https://github.com/Zaat/village-sim/issues/156), [#146](https://github.com/Zaat/village-sim/issues/146), [#6](https://github.com/Zaat/village-sim/issues/6), [#7](https://github.com/Zaat/village-sim/issues/7) · Milestone: [Backlog](https://github.com/Zaat/village-sim/milestone/58)

## Ideas under discussion
- **Late-game interest.** After the population plateaus the game can feel static. Ideas: near-term goals ("ambitions") that give a village something to aim for, new problems that appear with scale and need the energy ladder, and a second village on a neighbouring map.
- **Simple, easy tasks** that players can do mindlessly between decisions.
- **Event pins, further.** Pins now show where a new event happened. Possible later: pin toasts for the biggest events only, a map layer that shows where the last year's events were, and a filter for the event feed by place.
- **From the study of another open village simulation (parked, none planned yet):** a save that carries a fingerprint of the world's generation so a loaded save can say when the rules changed; a recovery screen that resets one broken part of a save instead of refusing all of it; scenes that can be reproduced from a link (seed, tick, camera); a short "rules that are easy to miss" file for contributors; a release-notes rule that lists a bug under Fixed only if it shipped in an earlier release.

## Won't do
Things decided against, with the reason, so they are not proposed again by accident. A decision here can change; say so in [DESIGN.md](DESIGN.md) when it does.
- **Simulating every townsperson as an individual.** Past about 160 people the rest are a crowd kept as numbers and drawn as figures. Individual minds for thousands would cost more than any phone can run and would add little the player can see (entry 1).
- **A game server, accounts or multiplayer.** The game is one page that runs from files, with saves in the browser. The only server is the optional music-ratings tally, which the game never needs. A game server would bring cost, privacy duties and something that can go down.
- **A build step, a bundler or third-party code.** Plain script tags and code written for the project: anyone can open the folder and read it, and licences stay simple.
- **Third-party art, fonts or audio.** Pixels are drawn in code and the music is generated live.
- **Asking Claude, or any service, for lines during a run.** Generative minds (v0.42) use lines written ahead and cached, so a village never waits for a network and a run never depends on a service being up.
- **Giving orders on a plain click.** A click selects and inspects; orders need a deliberate second step so nothing happens by accident (entry 14).
- **Results that depend on the browser.** The same seed gives the same village everywhere; code that cannot promise that (a random sort comparator, a clock read, an unordered scan) is a bug (entry 4).
- **Following every crowd figure to the pixel in fast play.** Above 30x the crowd stands at its doors; following walkers there would cost frames for something nobody can see.
