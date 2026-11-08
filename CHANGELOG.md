# Changelog

Each release is one step of a village simulation growing into a civilization simulation. Newest first. Screenshots are taken from each version itself (same seed, early game for the first image of a version; later-game for the feature view).

### v0.29.1 — Test suite overhaul
Tools only; the game is identical to v0.29. The tests now run two at a time and print each result as it finishes, with a timing table. `tools/check.sh` runs only the suites the changed files can affect, `full` runs all 24 (about 22 minutes instead of 28 to 45), and `pages` runs the browser page tests. One loader builds the source list from the script tags in `index.html`. New golden-trajectory tests (six map types, 30 days each) and a performance gate (10 years, fail above 1.5 ms per tick) join the suites. A full green run is stamped with a hash of the code, and `tools/release.sh` now refuses to release unless that stamp matches the exact code being released, so a failing or untested build cannot go out. Old debug and screenshot scripts moved to `tests/legacy/`.

### v0.29 — Voices and thoughts
Villagers now think, dream and talk. About thirty kinds of thought come from their real state (hunger, mood, work, family, grief, a coming baby, the winter stores, festivals, discoveries, expeditions and new material finds, rumours, plans, quarrels, money, old age); sleepers dream; two villagers who stop to chat speak and answer, and a pair who dislike each other speak coldly. Bubbles scale with speed: full lines at 1&times; and below (six at a time), a few words at 3&times;, a single glyph at 10&times; and 30&times; (three at a time, nearest the middle of the screen), none at 100&times;. Click a bubble to select the villager and pin the line; the inspector has a **Mind** block, and the Events tab has **Talk of the village**: a live feed at slow speeds, daily summaries at all speeds. Claude-written lines are an optional toggle, off by default. Thoughts use no random numbers, so the village runs exactly as before. Also: the Food readout no longer shows long decimals.

<img src="docs/screenshots/v0.29-feature.png" width="640" alt="Village Sim v0.29">


### v0.28.1 — Scarcer materials, new discoveries and a world check
Materials are now rare: each map holds one deposit per material (saltpetre, coal, copper, oil), and a party only recognises it once the village knows the matching craft (masonry, mining, bronze, steam); until then it brings home "strange stone nobody can name yet". Neighbours sell a material only when relations are friendly. New places appear over time: diving bells reveal deep wrecks, sonar the sea bed, aviation a lost city, and a deep drought can uncover a hoard in the shrunken waters. The new-world dialog gets a **Check this world** button that lists a map's special features (land share, fishing, stone, neighbours, whether barges can serve a land neighbour, hidden places and deposits). A yearly population-flow line in the probe (births, deaths by cause, arrivals, outpost population) is there to track the year 7&ndash;14 dips. On island seed 12 coal now arrives at year 9 and saltpetre at year 10 (v0.28: copper and oil by year 2&ndash;4).

<img src="docs/screenshots/v0.28.1-feature.png" width="640" alt="Village Sim v0.28.1">


### v0.28 — Expeditions, discovery and a living sea
Every map hides about 23 places worth a journey (ruins of an older people, caves, outcrops, hoards, wrecks, fishing and whaling grounds) plus the village's own past (a trading ship it lost, an outpost that died out). Rumours reveal them; the council weighs expeditions and sends a leader, with a few escorts on land or a boat at sea; they come home with goods, old writings (even a forgotten technology), food or a source of **saltpetre, coal, copper or oil**, the new inputs that gate gunpowder, steam, steel, electricity, engines and aviation. Fish recover faster where the water is full, deer winter in sheltered pockets and return in spring, river barges carry bulk goods to neighbours reached by water, friendly neighbours sell lessons for coins, and a discovery now says what it opens. New statistics series and an Expeditions &amp; discoveries card.

<img src="docs/screenshots/v0.28-feature.png" width="640" alt="Village Sim v0.28">


### v0.27 — Unlocks, research limits and a shaped land
Every technology now says what it gives and what it needs (a coast, rock, a mine, a library, enough people); research has limits (scholar capacity, rising costs, missing inputs), so a typical civilization finishes about 60&ndash;70% of the tree; the council's circles and a chosen philosophy steer the agenda; an Open knowledge sandbox option and a Grant button; a clickable tree of knowledge; terraforming works (levelled ground, drained shore, terraces, dikes, polders, earthworks); tower blocks; outposts with their own temper.

<img src="docs/screenshots/v0.27-feature.png" width="640" alt="Village Sim v0.27">


### v0.26 — Growth and housing
Births, pairing and newcomers now follow how well life is going; a Hardship setting (Gentle, Normal, Harsh) at world creation and live; builders plan ahead; health technology lengthens life; people have a wish for privacy (private houses, cabins in the trees, crowding and outdoor sleeping matter); a Housing concern with a Building drive. Six-seed comparison: population at year 12 went from 90 to 141.

<img src="docs/screenshots/v0.26-feature.png" width="640" alt="Village Sim v0.26">


### v0.25 — Livelihoods
About 35 trades (odd jobs, crafts, services) with real demand, goods and prices; side jobs, villager-invented jobs that catch on or fail, overtime by regime, aspirations, and craftspeople with aprons, tools and workbenches.

<img src="docs/screenshots/v0.25-feature.png" width="640" alt="Village Sim v0.25">


### v0.24.2a — Concern tracker
Concern cards now show a state (needs attention, responding, easing, didn't work), a severity bar with trend, countdown bars for running responses, council decisions, and resolved concerns stay for a while.

<img src="docs/screenshots/v0.24.2a-feature.png" width="640" alt="Village Sim v0.24.2a">


### v0.24.1 — Concerns
A badge, panel and toasts warn of falling population, food and firewood shortage and unity trouble, with feasts, rationing, orders and council nudges; secessions made rarer and smaller.

<img src="docs/screenshots/v0.24.1-feature.png" width="640" alt="Village Sim v0.24.1">


### v0.24 — Technology and ages
109 technologies in 8 branches across 9 ages, six house styles, four road tiers, knowledge that can be lost.

<img src="docs/screenshots/v0.24-feature.png" width="640" alt="Village Sim v0.24">


### v0.23 — Statistics and insight
A Stats tab with charts, event rates, records and CSV/JSON export, plus a multi-seed insight report.

<img src="docs/screenshots/v0.23-feature.png" width="640" alt="Village Sim v0.23">


### v0.22 — Lives and society depth
Hobbies, property, inheritance, feuds, policy that follows the regime, new time controls.

<img src="docs/screenshots/v0.22-feature.png" width="640" alt="Village Sim v0.22">


### v0.21 — Settlements and expansion
Outposts from camps to towns, bridges, and a new-world dialog with map size.

<img src="docs/screenshots/v0.21-feature.png" width="640" alt="Village Sim v0.21">


### v0.20 — Maritime and river commerce
Trade routes, harbour tiers, cargo ships and a ledger.

<img src="docs/screenshots/v0.20-feature.png" width="640" alt="Village Sim v0.20">


<details><summary><b>Earlier versions</b></summary>


### v0.19 — Map types
Archipelago, continent, peninsula, lakeland and river land, with neighbours on foot.

<img src="docs/screenshots/v0.19-feature.png" width="640" alt="Village Sim v0.19">


### v0.18 — Movement and population
Smoother paths, personal space, reserved spots, human-year ages, population flow.

<img src="docs/screenshots/v0.18-feature.png" width="640" alt="Village Sim v0.18">


### v0.17 — A living world
Trees that mature, soil that tires, wet and dry years, wolves that return, sightseers.

<img src="docs/screenshots/v0.17-feature.png" width="640" alt="Village Sim v0.17">


### v0.16 — Inspector overhaul
Building usage and popularity, residents, family links.

<img src="docs/screenshots/v0.16-feature.png" width="640" alt="Village Sim v0.16">


### v0.15 — Divided villages
Rival councils, strikes, civil strife, secession and sects.

<img src="docs/screenshots/v0.15-feature.png" width="640" alt="Village Sim v0.15">


### v0.14 — Divergent societies
Character, upbringing and regimes: no two villages turn out alike.

<img src="docs/screenshots/v0.14-feature.png" width="640" alt="Village Sim v0.14">


### v0.13 — Tabbed side panel
Village, Society, Progress, World and Events tabs, faster fog, packed saves, a seed-sweep harness.

<img src="docs/screenshots/v0.13-feature.png" width="640" alt="Village Sim v0.13">


### v0.12 — Building stats
Hit points, wear and repairs shown in the inspector.

<img src="docs/screenshots/v0.12.png" width="640" alt="Village Sim v0.12">


### v0.11 — Diplomacy and trade with neighbours
Relations, treaties, visits, aid, tribute and raids with scholars, farmers, merchants and raiders.

<img src="docs/screenshots/v0.11.png" width="640" alt="Village Sim v0.11">


### v0.10 — The wider sea
A 260×180 world with neighbouring islands under fog of war, found by sailors.

<img src="docs/screenshots/v0.10.png" width="640" alt="Village Sim v0.10">


### v0.9.1 — Gathering places
A plaza and a tavern: villagers gather for evenings, sessions and holidays.

<img src="docs/screenshots/v0.9.1.png" width="640" alt="Village Sim v0.9.1">


### v0.9 — Time travel and more projects
Fast-forward a year at a time, with a progress bar, and more great works.

<img src="docs/screenshots/v0.9.png" width="640" alt="Village Sim v0.9">


### v0.8 — Factions and history
Circles turn into factions; a chronicle and lessons the village learns from famine, fire and fever.

<img src="docs/screenshots/v0.8.png" width="640" alt="Village Sim v0.8">


### v0.7 — Great projects
Temples, granary halls and other monuments the council can choose to build.

<img src="docs/screenshots/v0.7.png" width="640" alt="Village Sim v0.7">


### v0.6 — Trade, money and taxes
Markets, coins, taxes and a settings drawer.

<img src="docs/screenshots/v0.6.png" width="640" alt="Village Sim v0.6">


### v0.5 — Technology, boats and camps
A technology tree that changes buildings, docks and fishing boats, resource camps, a diagnostics panel.

<img src="docs/screenshots/v0.5.png" width="640" alt="Village Sim v0.5">


### v0.4 — Saving
Autosave, export and import of save files, resume prompt.

<img src="docs/screenshots/v0.4.png" width="640" alt="Village Sim v0.4">


### v0.3 — Lives, opinions and a council
Life stages from infant to elder, personal desires and stories, opinions on four issues, friendship circles and an elected council.

<img src="docs/screenshots/v0.3.png" width="640" alt="Village Sim v0.3">


### v0.2 — First playable village
A 160×112 island with four seasons, deer, fish and berries; villagers with five personality traits who decide by priority (danger, hunger, sleep, company, work); optional Claude narration.

<img src="docs/screenshots/v0.2.png" width="640" alt="Village Sim v0.2">


</details>
