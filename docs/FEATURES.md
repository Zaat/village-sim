# Village Sim: every feature, release by release

The newest sections are first. For one page per release with screenshots see [docs/releases](releases/) and the [changelog](../CHANGELOG.md).

## Saves and steadier speed (new in 0.39.2)
- **Saves:** Menu > Saves lists the autosave, the backup (the village you left when starting a new one) and up to ten named saves. Each has Load; named saves also have Overwrite, Rename and Delete (overwrite and delete ask a second time). Loading keeps the village you were playing in the autosave. Saves are compressed and kept in the browser's IndexedDB; the screen says that clearing site data removes them.
- **Export and Import:** Export writes a compressed `.json.gz` file; Import accepts it and older plain `.json` saves. Older plain browser saves are moved into the new store once.
- **Time travel:** the Undo copy is kept in the same store, and the game pauses before the copy so Undo returns to exactly where the skip began.
- **Speed:** drawing is limited to what the village can afford (at most 60 a second, at most about a third of the time), so a display that calls the game 120 to 250 times a second no longer starves the simulation.
- **Diagnostics:** the report has a verdict on what limits the speed, busy and draw percentages, the frame-call rate, core count, focus and the last 30 seconds of timings.

## Interface, saves and diagnostics (new in 0.39.1)
- **Menu:** eight items in three groups (New world, Scenarios, Save now, Load saved; Settings, Full screen; How to play, About) with the version at the foot. Opening the menu closes the Events drawer and the other way round; Esc closes either. Show tips again moved to Settings.
- **Layouts:** *Docked* (default) and *Clean* (map, a play bar, and a few counters; L or the corner button returns). Settings > Layout; remembered per device.
- **Compact lists:** Chronicle, Expeditions, Trade and Defence show the recent few entries and an "Earlier (N)" block, with dates written like "Y53 D7" (day 7 of the 32-day year; hover for the full form). Trade also has a treasury line.
- **Hover history:** hover a stat name in the side panel (Population, Food, Mood, Culture, Technologies and others) for its graph over the run.
- **Deaths:** a Deaths preset in Stats (old age, hunger, cold, illness, other); illness is split into fever season, plague and everyday illness in the card, series and counters. The Stats tab opens on an Overview preset; selecting the active preset again returns to it.
- **Diagnostics:** one card: the village text first (version tag, world, crowd, activity, device, language and loaded-from details), the engine details below, one Copy button. The live line shows ticks per frame, tick time, frame time, frames per second and the longest gap between frames.
- **Fixes:** the inspector scrolls the selected villager into view; Time travel and Fast-forward no longer wrap or leave blank space; fixed-height cards no longer leave empty space (Tree of knowledge, Society, Chronicle); a Stats crash on saves that lacked a newer series is fixed; the main loop no longer drops time after a long tick.

## Late ages, language and settings study (new in 0.39)
- **Atomic and Information ages:** 39 new technologies (148 in eleven ages), high-rise (32 beds) and arcology (64 beds) homes, farms that keep gaining yield.
- **Spanish:** starts in Spanish when the browser is set to it; Settings has a language switch. The main screens, menus and Settings are translated; the rest follows.
- **Full screen:** Menu or X.
- **Settings study:** survival is the main brake on growth; harsh winters and droughts are rarer; fevers and fires depend on village size.

## Pace and developer tools (new in 0.38)
- **A real childhood** (about two and a half game years to grow up), a narrower fertile span, slower families, fewer and smaller groups of newcomers, an order brake on large towns, and wider Hardship levels. Old saves carry over.
- **Copyable Diagnostics** and a **pace lab** tool (`tools/pace_lab.js`) that compares birth models.
- Steadier resource notices, a clearer stats graph for the first two years, and a stronger land-value overlay.

## Metropolis (new in 0.37)
- **Big towns** are a crowd kept as numbers around the 160 villagers simulated one by one, with the same food, housing and work rules.
- **Districts** overlay with names and head counts; **storage** (yards, storehouses, granaries, spoilage); food and wood by sea; resources as one table; homes may clear woodland; faster building searches; a measured Hardship scorecard; phone fixes.

## Insight, look and sound (new in 0.36)
- **Growth** that no longer stalls near 250 people, generated **music** that follows the village (M), icons on the build palette, Max speed, touch building with Undo, scenarios in the Menu, game-over tales, and coverage and statistics tools.

## Play (new in 0.35 and 0.35.1)
- **Watch / Play** switch; orders by click, shift-click and box select; a command bar; building, roads and zones; research choices; village-plan switches; lifespans; game over. Watch and Play switch seamlessly, and a first-time tip explains that you are in charge.

## Technology, eras and building
- **Knowledge** comes from debating, practising a trade and teaching. The council chooses what to study next (rules by default; Claude can deliberate). 15 discoveries across four ages: Founding, Craft, Stone & Sail, Iron.
- **Effects:** bigger catches (nets), faster work (tools, ironwork), more storage and less spoilage (granaries), higher crop yields (rotation, plow), safer winters (medicine, watchtowers), and more.
- **Architecture changes with the ages:** log cabins, then timber-frame houses (carpentry), then stone houses (masonry). Roads become cobbled. Old homes are upgraded over time, and better homes sleep more people. Storehouses change style too.
- **Docks and boats** (boat-building): fishing boats sail straight out from a dock to deep water, fish, and return; catches are unloaded at the dock.
- **Camps** (forestry, mining, hunting lodges): a camp beside dense forest, rock or game acts as a local depot. Workers within about 14 tiles (22 for hunters) work faster, get more per trip, and hunts are surer.

## Trade, money and taxes (new in 0.6)
- **Trade** research lets the council build a **market** (stalls, a coin sign, a merchant wagon on caravan days). Prices rise with scarcity of wood, stone and food. Caravans arrive every 5–9 days; with **Sea trade** and a dock, trading ships come too. The council (or Claude counsel, if on) decides how much to sell or buy.
- Before **Coinage** trades are barter; after it, the village keeps a **treasury** funded by a tax whose rate follows the Taxes policy (10–40%), and villagers earn, save and buy fine goods that lift mood. Wealth feeds opinions on taxes and can drive crime. See the Trade & treasury card.

## City structure (new in 0.33)
- **Land value** (`src/city.js`): every 4x4 tiles gets a value from the pull of the camp, market, plaza, tavern, hall and other services, roads and neighbours, the shore, minus the nuisance of fields, camps, mines and forges. Press **Show land value on the map** in the City card (World tab).
- **Density follows value:** the dearest ground gets the best style the village knows, the edge keeps log cabins; old homes are rebuilt in place as ground gets dearer, several at a time in a big town.
- **Redevelopment:** ruins are cleared; bare fields the town has grown around are given up and the farmers plough further out.
- **Hamlets:** satellite clusters of homes (named by direction) are founded when the close ground fills up or the people like to spread out; each gets a store once it has six homes. Compact, tidy layouts come with strong authority, a martial outlook or danger; looser ones with the opposite.
- **Desire paths:** villagers' footsteps are counted; the most walked ground is paved and the busiest roads get the best surface first.
- **Workshops:** a new trade building (own art) in a trade quarter; potters, weavers, smiths, carpenters and other crafts now work there.
- **Housing diagnosis:** when beds run short the concern now says what is in the way (project cap, no wood or stone, no walkable ground, nobody building). House placement checks reachability with one flood instead of up to 14 searches that could all fail together.
- **World line and diagnostics:** Settings shows one line (version, seed, map, size, hardship, philosophy, open knowledge, switches, date). Click it to copy; paste a whole line into the Seed box in New world to set all of that. A collapsed Diagnostics section holds a snapshot, and your own choices are kept in a small saved action log.
- **Fix:** the Concerns list keeps its scroll position when it refreshes and no longer rebuilds every game day while the pointer is over it.
- Tests: `tests/city_events.js` (24 checks) and `tests/ui_city.js`; probes `tools/probe_city.js` and `tools/probe_house.js`.

## Settlements, causes of death and housing (new in 0.32)
- **Click another settlement** on the map (or its name in the World tab) for a full panel: people, temper, strength, treaty and dealings, what they know that we do not (and the reverse), origin and recent history.
- **Causes of death** card in the Society tab: totals by cause with bars, this year against last year, age groups, the main preventable cause with advice, and the most recent deaths.
- **Housing:** when the ground near the village is full, new homes are now sited further out (suburbs and hamlets, up to about 74 tiles) and the Housing concern says so. Larger villages spread their homes more.
- **Fixes:** the tree of knowledge window now fits the stage on small screens; "Recently eased" in Concerns stays open; culture no longer saturates at 100; plague is a little more likely.
- Tests: `tests/ui_settle.js` and `tests/housing_events.js`.

## Society depth (new in 0.31)
- **Culture (`src/culture.js`):** weddings (a couple holds one feast), funerals (the village gathers for the dead and eases mourning) and winter story nights lift moods and build a slow 0-100 culture score that needs keeping up. Culture and curious minds, plus a library, add a little to the research in hand.
- **Disasters** (when Disasters is on): spring floods wash out fields and spoil food; a **plague** can break out in a trading village, and the council decides between quarantine (slower spread) and carrying on. Medicine and memories of earlier fevers help. New "plague" concern.
- **Guilds:** with coinage, five or more in one trade found a guild; members pay dues into the treasury and are steadier.
- **Outposts with councils:** an outpost of eight or more chooses a head of its own, which steadies its loyalty and gives it a voice (it sends word when people feel forgotten).
- **Knowledge:** the council may sell lessons to a friendly neighbour for coins, hostile neighbours send spies who may steal a craft (the law and watch catch some), and the council may send a spy to a rival (55% to succeed, a worse quarrel if caught).
- **Authority re-tuned:** crises push authority up less, and culture pulls it down a little, so more villages stay councils and communes.
- **Culture & guilds** card in the Society tab; new statistics and chronicle entries. Tests: `tests/culture_events.js` (28 checks) and `tests/ui_culture.js`.

## Conflict: soldiers, battles and campaigns (new in 0.30)
Peace is still the default. Everything below needs the **Raids and war** switch in Settings (the old "Raids" switch, renamed) and a hostile neighbour the village has met.
- **A standing army (`src/war.js`).** When danger is felt (a met, hostile clan, a raid in living memory, strife at home) the council musters a watch from the bravest adults, a few at a time, up to a target that grows with the danger, the defence policy and the regime (authority keeps bigger armies). When the danger passes the ranks are stood down slowly. Soldiers are ordinary villagers: they carry a helmet and a spear on the map (steel-grey for better arms) and the inspector names their rank.
- **Arms follow technology:** militia, spearmen (hafted spears), archers (bows), swordsmen (iron armour), legionaries (drilled ranks), musketeers (muskets). One soldier a day is re-equipped when the stores allow; drill adds experience.
- **Barracks and Watchtower** are two new great projects. The barracks drills the ranks (+25% strength, faster experience) and lets the army carry the best arms known; the watchtower gives early warning, so a raid is easier to beat. Both have art and appear only when danger is felt.
- **Upkeep and morale:** each soldier eats a little extra from the store (cheaper under authority, dearer in open regimes). Hungry or beaten armies lose morale and weaken; victories raise it; a starving army deserts.
- **Battles are abstract:** two sides, three rounds, casualties on both. The same model settles raids on the village (the ranks bleed first, and friends with a treaty may stand with the village), attacks on outposts and the council's own campaigns.
- **Hostile neighbours attack outposts** now and then; an outpost may drive them off (with soldiers sent from the village if there are enough), lose people, or be overrun and abandoned.
- **Campaigns:** when raids or a grudge have gone on long enough and the army is big enough, the council is asked whether to march on the neighbour, send envoys with gifts instead, or hold. A campaign takes days; the soldiers are away and do not defend meanwhile. Victory brings plunder and a spell of tribute; defeat costs lives, morale and the neighbour's respect.
- **Concerns, statistics, chronicle:** new "poorly defended" and "army going hungry" concerns; series for soldiers and army strength; counters for campaigns and outposts attacked; campaigns appear in the chronicle. A new **Defence & war** card in the World tab shows the army, morale, results and the last battles.
- **Bug fix:** raid and strife victims were given 0 health, but villagers regain a little health before the death check, so many of those deaths never happened. They are now killed properly.
- **Tests:** `tests/war_events.js` (51 checks: battles, muster and stand-down, raids, allies, campaigns, outposts, projects, concerns, save and load, upkeep and the regime), `tests/ui_war.js` (page test with screenshots). Control of the army (orders, stance) is planned for 0.33.

## Varied bubbles and quicker tests (new in 0.29.2)
- **Bubbles:** every thought now carries other wordings for the same subject (about 35 new lines for hunger, tiredness, loneliness, cold, contentment, low spirits, housing, privacy, drought, winter and the season). A bubble picks a wording that has not been on screen in the last 90 seconds, and no more than two bubbles on the same subject show at once. Choosing is display-only: the simulation is identical to v0.29.
- **Emote box:** the small white box with a symbol over a villager now shows only for the selected villager (fights and fleeing alarms still show for all); bubbles carry the rest.
- **Tests:** the `living` wolf check stops once a pack has returned (9 minutes to about 1) and the performance gate simulates 6 years and times the last 2. Reloaded worlds do not continue exactly like the original, so shared world snapshots were rejected for the suites.

## Tests and releases (new in 0.29.1)
Tools only, no change to the game. `tools/check.sh` is a runner (`tools/run.js`) that prints each result as it finishes and keeps suite timings in `tests/timings.json`.
- `tools/check.sh` runs only the suites the changed files can affect (a change to a browser-only file, such as `ui.js` or `render.js`, needs none); `tools/check.sh full` runs all 24 node suites two at a time (about 22 minutes); `tools/check.sh pages` runs the Playwright page tests; `tools/check.sh regime_events save` runs named suites; `--bail` stops at the first failure.
- A passing `full` run is stamped with a hash of the source and the tests. `tools/release.sh` refuses to release unless that stamp matches the code being released (so `SKIP_TESTS=1` only works right after a green full run), and a failing suite stops the release. Releases numbered x.y also need the page tests green for the same source.
- `tests/lib.js` builds the list of simulation files from the script tags in `index.html`, so a new module needs no edit in the tests. `tests/golden.js` runs 30 days on each of the six map types and compares a signature with `tests/golden.json` (`--update` after an intended change). `tests/perf.js` fails a 10-year run above 1.5 ms per tick.
- The old debug and screenshot scripts are in `tests/legacy/`; the suites are listed in `tests/suites.json`.

## Voices and thoughts (new in 0.29)
- **Villagers now think, dream and talk.** About thirty kinds of thought are drawn from the villager's real state: hunger, tiredness, loneliness, cold, no home of their own, mood, their trade, play and lessons for children, a partner or child, a coming baby, grief, the stores before winter, drought and harsh winters, festivals, a fresh discovery, an expedition setting out or coming back, village troubles and council decisions, rumours of far places, their own dream for the future, quarrels and friends, money and old age. Sleepers dream. Choosing a thought uses no random numbers, so the village runs exactly as it did before (a test compares 30 days against a build with voices removed).
- **Conversations.** When two villagers stop to chat, one speaks and the other answers a moment later. The topic comes from what they share: the stores, the weather, work, a partner or child, news, the festival, an issue they disagree on; a pair who dislike each other speak coldly.
- **Bubbles scale with speed** (`src/render.js`): at 1&times; and below full lines, six at a time; at 3&times; a few words, six at a time; at 10&times; and 30&times; a single glyph, three at a time, nearest the middle of the screen; at 100&times; none. Thoughts are white bubbles, speech has a tail, dreams are blue clouds. A Settings switch turns them off.
- **Click to pin.** Click a bubble to select that villager and pin the line; the inspector's **Mind** block shows the current thought (click it to pin at 3&times; and below), the last few thoughts, and an Unpin button. A pinned line stays on screen at any speed.
- **Talk of the village** (Events tab): at 1&times; and below a live feed of the lines being shown; at 3&times; a running digest; faster than that only the **daily summaries** ("the talk of the village: daily work 30%, the council 20%, wanting privacy 5%; 12 conversations", with one quoted line), merged into weekly lines above 10&times;. Summaries are saved with the village.
- **Claude-written lines (optional, off by default).** A toggle next to the council's Claude switch lets Claude replace the selected villager's rule-based thought with a line of its own (up to 60 per session, slow speeds only, same permission as the council).
- **Statistics:** new series for the share of thoughts that are worries and for conversations per day. Tests: `tests/voices_events.js` (30 checks), `tests/ui_voices.js` (page test with screenshots).

## Expeditions, discovery and a living sea (new in 0.28)
- **Hidden sites (`src/discovery.js`):** every map seeds about 23 places worth a journey, out of reach of the village at first: ruins of an older people, deep caves, outcrops of dark stone, buried hoards (on land) and sunken wrecks, rich fishing grounds and whaling grounds (at sea). The village's own past adds more: **the wreck of a trading ship it lost** and **abandoned outposts** become sites too. Sites come from the map seed alone (their own random stream), so a map always has the same hidden places.
- **Rumours:** hunters and fishers hear of the nearest hidden site every couple of weeks; how far they hear grows with exploration technology, boats and the peoples met. A small flag marks each known site on the map (gold on land, blue at sea).
- **Expeditions:** the council weighs a trip like any other project (what the find is worth against labour and risk) and asks. If it says yes, a leader takes the job; on land two escorts may follow, at sea a boat is provisioned and sails a real water route. At most one land party and one ship are out at a time, so you see a few parties and a ship, not a crowd. They bring home coins or goods, **old writings** (knowledge towards the technology being studied, or **a technology the village had forgotten**), fish, whale meat, or a **source of a material**. Fishing and whaling grounds can be used again; sea trips can be lost in storms (when disasters are on).
- **Materials that gate technology:** saltpetre (gunpowder), coal (steam, steel, blast furnace), copper (electricity, telegraph) and oil (engines, aviation) are input gates. Since 0.28.1 they are scarce: see the next section.
- **Living waters:** fish come back faster where the neighbouring water is full, so an emptied bay recovers slowly and a healthy one quickly. **Deer migrate:** in winter the herds drift to three sheltered pockets a day's walk out and return in spring.
- **River barges:** on maps where a land neighbour can be reached by water, the council may build a barge (carries more than a wagon; bulk trade without the sea-trade technology).
- **Research deals:** a friendly neighbour that knows something the village can learn may sell lessons for coins (buying only for now); the council decides, and the lessons skip the input gates.
- **Unlock toast:** the discovery message now says what the new technology opens.
- **Statistics:** new events (terraform works, expeditions returned and lost, sites heard of, lessons bought) and series (technologies waiting on an input, scholar-limit days, works built, tiles won, sites known, finds, materials in hand, fish in the water, deer near the village). A new **Expeditions & discoveries** card in the Progress tab lists materials, parties on the road, sites heard of and recent finds.
- Tests: `tests/discovery_events.js` (32 checks), `tests/ui_disc.js` (page test with screenshots), `tools/probe_disc.js SEED MAP YEARS` (sites, expeditions, finds, materials, fish per year). **Results:** island seed 12, 30 years: population 28, 65, 120, 138, 160, 222, 319, 355 at years 1, 2, 4, 5, 10, 16, 20, 30, 0 errors; 15 of 16 near sites visited by year 12 (20 expeditions, none lost), far ring heard of from about year 11, materials in hand by year 2 (copper, oil; saltpetre from the far ring). Continent seeds 1, 2, 4, 6 at year 4: population 118, 124, 115, 132 against 86, 101, 113, 79 on v0.27 (no early slowdown); one continent seed lost one sea expedition and left its wreck as a salvage site. Full suite (21 suites) and page tests pass; one suite's expectation was pinned to a fixed dice roll (the crackdown on a rival council) so it no longer follows the seed's random stream.

## Scarcer materials, new discoveries and a world check (new in 0.28.1)
- **Materials are rare deposits you have to recognise.** Each map holds only a few: one deposit per material, and each of the map's two local materials sits within reach, while the others are far away on some maps. A party that reaches a deposit only brings home **strange stone nobody can name yet** until the village knows the matching craft (masonry for saltpetre, mining for coal, bronze for copper, steam for oil); then the site can be visited again. Neighbours sell a material only when relations are friendly (45+). Result on island seed 12: coal at year 9 and saltpetre at year 10 (v0.28 had copper and oil by year 2-4).
- **New places appear over time.** Diving bells reveal deep wrecks, sonar the sea bed, aviation a lost city; a deep drought can uncover a hoard in the shrunken lakes and rivers (`triggerDay` in `src/discovery.js`).
- **Check this world.** The new-world dialog has a **Check this world** button that builds the map for the chosen seed, type and size and lists its special features: land share, fishing, stone, neighbours by land or sea, whether **barges** can serve a land neighbour, hidden places and deposits.
- **Population flow diagnostic.** `tools/probe_disc.js` prints each year's births, deaths by cause (age, hunger, cold, sea), arrivals and the people living in outposts, and the Stats tab has a new series for people in outposts, to find out why some seeds dip around years 7-14.
- Tests: `tests/discovery_events.js` now 46 checks, `tests/ui_disc.js` covers the new button.

## Knowledge with limits, the tree of knowledge and a shaped land (new in 0.27)
- **What knowledge is good for (`src/unlocks.js`):** every one of the 109 technologies lists what it *gives* in plain words (including the great projects it opens) and what it *needs*: real inputs such as a coast, rock, timber, six farms, a working mine, two landings, a library, neighbours, or 30 / 60 / 100 / 150 people. The Ages panel shows each as a check or a cross.
- **Research now has limits.** A day can give only so much knowledge (scholar capacity grows with adults, learning techs and a library; extra effort beyond it is mostly wasted), each discovery costs more the more is already known, and a technology whose inputs are missing waits ("waiting for a mine") instead of being chosen. The aim is that a typical civilization finishes roughly 60&ndash;70% of the tree, not all of it.
- **Who decides what is studied:** the council's circles pull the agenda toward their platforms in proportion to their numbers; the ruling circle counts double and a harsher regime mutes the others. A **philosophy** (Balanced, Practical, Scholarly, Martial, Mercantile) chosen in the new-world dialog or Settings tilts whole branches.
- **Open knowledge (a sandbox option):** Off, Relaxed (no input gates, twice the scholar capacity, slower cost growth) or Unlimited (every technology open at once, cheap and fast). While it is on, a **Grant** button appears beside each technology and learns it at once, with what it rests on. Switching it on marks the world as a sandbox in the chronicle and in saves; it can be changed live in Settings.
- **Tree of knowledge:** a button in the Progress tab opens every technology as a box in its branch (row) and age (column), joined by lines to what it unlocks. Click one to light up what it depends on and what depends on it, with its gives, needs and cost.
- **Terraforming (`src/terraform.js`):** grading, drainage, terracing, dikes, reclamation and earthworks let the village turn bare rock, damp shore and shallow water into ground it can build and farm on: levelled plots, drained meadow, terraces, sand banks, polders, open ground. Each work is weighed by the council like a bridge (the land it wins, scaled by how hemmed in the village is, against timber, stone and labour) and never closes a dock off from the sea. Finished works are saved as tile changes.
- **Tower blocks:** skyscrapers unlock a tower block that sleeps 16 (an apartment block sleeps 9), with its own art; old blocks are upgraded over time.
- **Outposts have a temper:** each settlement's loyalty now depends on its leader's character and the luck of its founding, plus a slow swing, so the "resentful" shares are no longer almost equal.
- Tests: `tests/research_limits.js` (25), `tests/ui_tree.js` (page test with screenshots). New script: `tools/probe_research.js SEED MAP YEARS [OPEN] [PHILOSOPHY]` (known technologies, blocked by input, scholar-cap hits). **Results:** island seed 12, 40 years: known technologies 8%, 17%, 29%, 38%, 43%, 51%, 57%, 63% at years 5 to 40 (population 124 to 380); continent seed 5, 30 years: 52% (57 of 109) with 12 terraforming works (36 tiles) and outpost loyalties spread over 38&ndash;66%; no errors in either run, and the full suite and page tests pass.

## Growth and housing: a village that responds to how well life is going (new in 0.26)
Long runs showed the village stalling at 80&ndash;150 people with a third of its beds empty and plenty of food. The cause was not housing or food (0 conceptions were ever blocked for lack of a bed or food over 30 years on two seeds): births were a flat chance, immigration stopped at 70 people, and houses were only built when beds ran out.
- **Prosperity:** a daily 0.3&ndash;1.8 index from food in store, spare beds, mood and health. It scales births, how easily people pair up, how many newcomers arrive (no fixed cap any more, tapering as the town grows) and how far ahead builders plan.
- **Pairing and lifespan:** on some seeds singles never became friends, so no couples formed for years. People are now readier to settle down when few of the fertile are partnered, and health technology (medicine, nutrition) lengthens life by up to about 37%.
- **Result (6 island seeds, 12 years, v0.25 against v0.26):** mean population 70 &rarr; 114 at year 4 and 90 &rarr; 141 at year 12, couples 14 &rarr; 22, beds 123 &rarr; 208, with no errors and no more starvation.
- **Hardship (Gentle / Normal / Harsh):** how forgiving the world is: births, newcomers, wolves, fevers and hard winters. Pick it in the new-world dialog; change it any time in Settings (a live change is written to the chronicle so it never passes silently).
- **Privacy and personal space:** each person's wish for privacy is the opposite of their sociability. Private people choose empty houses and lose mood when strangers share their roof; sociable people look for company and are lonelier alone. A very private adult may build a **cabin** out in the trees (a few at most, two beds, kept for its builder and partner). Sleeping outside costs mood, and in winter health (less so before carpentry).
- **Housing concern:** when people have no bed of their own, or many are crowded against their nature, a *Not enough homes* concern appears with a **Building drive** response (20 days: more builders, homes built well ahead of need).
- **Statistics:** new series for Prosperity, Beds, Sleeping outside and Crowded against their nature; new event Cabins built.
- **Fixes:** old saves no longer lose their statistics (series added in later versions are filled in on load); the diagnostics report shows the real version.
- Tests: `tests/privacy_events.js` (24), `tests/stats_legacy.js` (4), `tests/ui_growth.js` (page test and screenshots). New script: `tools/probe_growth.js SEED MAP YEARS` (conception outcomes, beds, food, couples; `SRC=dir` runs another version's source).

## Livelihoods: everyone finds a way to make a living (new in 0.25)
Beyond the six heavy roles there are now about 35 trades: odd jobs and care from the very start (childminder, helper, porter, water carrier, mender, kitchen gardener, launderer), crafts unlocked by technology (potter, weaver, tailor, smith, carpenter, baker, brewer, jeweller, glassblower ...) and services (healer, midwife, teacher, scribe, scholar, innkeeper, musician, watchman, shopkeeper, merchant, banker ...). Each has real **demand** for the village's size and needs, a price and a small real effect: tools speed up work, cloth keeps people warm, pots and fine goods bring comfort, bread feeds, healers heal, teachers teach, musicians and innkeepers cheer, watchmen keep wolves away. A market full of a good wants no more of it.

- **Money:** crafts create value, services move coins (or barter wealth before coinage) from customers to workers. Customers can only pay what they hold, so a poor village supports few trades.
- **Finding work:** adults without a role take a trade where demand is unmet; people with a role take side jobs when short of cash or out of work in winter; a richer village lets some people leave heavy labour for a trade. Oversupplied trades shed workers.
- **Invented jobs:** idle, curious people try ideas (lantern maker, dyer, honey keeper, rat catcher, bone carver ...). Each has a hidden market: some catch on and become trades, others fail and their maker moves on a little wiser.
- **Overtime:** when food or firewood runs short, a free council gets volunteers working longer hours; a strict one orders it, at a cost to mood, health and unity.
- **Dreams:** adults aspire to a shop of their own, mastery of their craft, scholarship, a council seat, a large family, a fortune or a sea voyage, and pursue it when life is comfortable. Shown in the villager panel and the chronicle.
- **On screen:** craftspeople wear an apron colour for their trade, carry a small tool at work and stand at a little workbench. The Progress tab has a Livelihoods card; the villager panel shows livelihood and dream.
- Tests: `tests/livelihoods_events.js` (22). New scripts: `tools/check.sh quick|full`, `tools/probe_liv.js SEED MAP DAYS`.

## Concerns now track what you did about them (0.24.2a)
Each concern card shows a state: **Needs your attention**, **Responding** (a countdown bar for each running response, "council deciding" for nudges), **Easing**, or **Didn't work** (a response ended or was declined and the trouble remains). A severity bar with a worsening/steady/easing arrow shows how bad it is. Resolved concerns stay visible for 16 days with what was tried. The badge turns calm blue when everything is being handled.

## Concerns: the village watches itself (0.24.1)
- **What it watches:** population (a fast fall, or a long slide from the recent peak, with the cause: deaths by kind, births, people who left with a faction), food (stock per person, starvation), firewood before winter, and unity (a divided village, a rival council, civil strife, outposts losing loyalty). Each concern is *watch* or *critical*, has a plain reason, and clears by itself when the trouble passes.
- **Where you see it:** a **⚑ badge** in the date bar (amber, red and pulsing when something is critical) opens a **Concerns panel** with the reason, how long it has lasted and the responses you can try. Critical concerns also raise a **toast** that stays until you dismiss it or the trouble passes (at most three). Settings &rarr; Concern alerts chooses what a new critical concern does to the game: nothing extra (default), **pause**, or **slow to 1×**; toasts can be switched off.
- **Responses (each has a cost, a cooldown and an effect you can see):** *Hold a feast* (spends food and firewood, lifts mood and unity), *Ration food* (16 days: slower hunger, shorter tempers), *More hands on food* and *More hands on firewood* (more farmers, hunters, fishers or woodcutters), *All hands* (10 days, no leisure, costs mood), and four **council nudges** (encourage families, less leisure, ease the laws, open reconciliation talks): the council still decides whether to heed you, and is more likely to when it is not an autocracy.
- **Secession is rarer and smaller:** a faction may break away at most once in about four years, takes at most 30% of the adults (the most aggrieved), and the village feels relief afterwards. Coup and purge penalties to unity now fade over 60 days instead of lasting while they recur, and purges need 50 days between them.
- **Why:** in long runs the big population drops were whole factions sailing off (29&ndash;37 people each, five times in 45 years on one continent world), kept coming by permanently low unity.
- **Tools:** `tests/concerns_events.js` (in the release checks), `tests/concerns_ui.js` (page test with screenshots), `tools/diag.js SEED MAP DAYS` (year-by-year health record: births, deaths, departures, resources, roles, stuck villagers, speed), `tools/probe_div.js` (which parts of the unity formula dominate), `tools/probe_social.js`.
- **Next:** v0.24.2 Livelihoods (trades, side jobs, overtime, invented jobs, aspirations), because in big towns 40&ndash;55% of adults have no job role.

## Technology and ages (new in 0.24)
- **A tree of 109 technologies in 8 branches** (Land & food, Building, Craft & metal, Sea & trade, Learning & faith, Society & law, War & defence, Medicine) and **9 ages**: Stone, Bronze, Iron, Classical, Medieval, Renaissance, Gunpowder, Industrial and Modern. The original 18 technologies keep their names and ids, so old saves load.
- **Ages:** an age is complete when 65% of its technologies are known; then the next age's technologies open (each still needs its own prerequisites, often from other branches, so no village can race ahead by studying one subject). The age shows in the date bar and in the Progress tab, which has a branch list (click a branch to see every technology, what it needs and what it costs).
- **Effects:** newer technologies add to farm yields, work speed, building speed, knowledge growth, health, storage, trade, sea power, defence and contentment, on top of the original technologies' special effects. Houses and storehouses now go through six styles (log cabin, timber frame, stone, **brick house, townhouse, apartment block**), with new art, and roads go from dirt to cobbles to paving slabs to tarmac.
- **Choosing what to study:** the council picks from the six most useful open technologies; a balanced village is nudged toward the branches it has explored least; the ruling circle, the council members' tastes and past lessons still count.
- **Neighbours learn too:** scholars, merchants, farmers and clansfolk advance at different paces and in their own branches, and visiting scholars can teach the village what it is ready for.
- **Knowledge can be lost:** when the population collapses to under about 45% of its peak, the newest, least-shared skills can be forgotten and must be learned again (counted in the statistics).
- **Ladders for later steps:** terraforming (8 technologies from "Levelling plots" to "Heavy earthmoving"), exploration (11, from "Sky-watching" to "Sonar") and war (7) are marked in the tree.
- **Tools:** `tests/tech_events.js` (in the release checks), `tests/shot25.js`, `tools/pace.js SEED MAP DAYS` (when each age began, techs per decade, speed).

## Statistics and insight (new in 0.23)
- **Stats tab:** "A civilization in numbers" (age, population and peak, births and deaths, technologies, great works, peoples known, outposts, unrest) and an **Over time** chart. Pick a view (People, Wealth & mood, Regime, Policy, Growth) or add any of 38 measures (up to five), choose the last 5 years, 20 years or everything, and hover for exact values. Each line is scaled to its own range. Triangles along the bottom mark notable events (red for hard times such as coups, famines, fevers, strikes and secessions; green for outposts, bridges, great works and discoveries); dashed lines mark new ages.
- **What happens, and how often:** about 50 kinds of event grouped as People (births, newcomers, couples, deaths by cause), Hardship (fires, storms, droughts, harsh winters, fevers, wolf attacks, famines, collapses, lost cargoes), Society (elections, council decisions, coups, uprisings, purges, reforms, rival councils, strikes, civil strife, secessions, sects, crimes, trials, feuds, estates, holidays), Economy & expansion (deals, trips, ships, harbours, peoples discovered, outposts, bridges) and Knowledge (discoveries, ages, great works, lessons). Each row shows the total, the rate per year over the last five years, a trend arrow against the five years before, and a yearly sparkline.
- **Records & firsts:** largest and smallest population, most unequal, most united and divided, happiest and gloomiest, busiest years, and the day each kind of event first happened.
- **Export:** CSV (every series, then every event by year) or JSON (summary plus all raw data) from the Stats tab. The data is saved with the world and kept for the whole run (thinned automatically after about 2,400 samples).
- **Insight report:** `node tools/insight.js [days] [concurrency] [seeds per map]` runs many worlds across every map type and writes `insight-report.md`: results by map type and by final regime, the strongest correlations between features, and specific questions (does early inequality predict later unrest? does trade go with growth? does authority go with unrest?). Small samples give hints, not proof.
- **Tools:** `tests/stats_events.js` (in the release checks), `tests/shot24.js`, `tools/insight.js`, `tools/insight_one.js`.

## Lives, property and feuds (new in 0.22)
- **Hobbies and errands:** every adult has a hobby (angling, wood-carving, gardening, stargazing, singing, storytelling or long walks) chosen from their character. After work, adults may pursue it or run an errand: visiting kin, taking a meal to a hungry relative, fetching water at the well. Hobbies lift mood and sometimes give a little food, knowledge, keepsakes or friendship. The more leisure the council's work-and-leisure policy allows, the more of this the village does (and the slower the work).
- **Property:** homes and fields have owners (the first adult to settle a home or work a field). Field owners keep a share of the harvest as wealth (none in communal regimes). A villager's **standing** (overlooked to prominent) mixes wealth, reputation, office, property and family; it shows in the inspector and nudges mood and elections.
- **Inheritance:** when an owner dies, the partner, a favoured or eldest child, or a sibling inherits homes, fields and wealth; with no heir the estate goes to the village. Someone passed over may feel bitter and start a feud.
- **Feuds:** families fall out after a brawl, a disputed will, or an old grudge. Kin on both sides grow colder every day, fights become likely, and moods suffer. A hot feud goes to the council (mediate, side with one family, or stay out). Time, festivals, mediation and marriages across the divide cool it. The losing side of a feud is the first to feel aggrieved when a village starts to divide (rival councils, strikes).
- **Policy and power:** policies now drift toward what the regime favours (an autocracy turns strict and watchful, a commune turns to heavy taxes and light law, an industrial town to work first and growth); council votes still move them. The council card has a **Who holds power** bar (chief, council, ruling circle, wealthy families, faith, the people). The Society tab has a **Families & feuds** card.
- **Performance guard:** path searches are limited per tick (150,000 nodes); a villager whose search is refused simply waits a moment. Daily planning is not limited.
- **Tools:** `tests/lives_events.js`, `tests/shot21.js`.

## Settlements, bridges and bigger worlds (new in 0.21)
- **Outposts:** when the village feels cramped, short of timber, stone or food, or simply grows large and bold, the council can send settlers to found an **outpost**: a logging outpost, quarry, fishing station or farming hamlet. It weighs gain against cost and risk (settlers, supplies, a journey that can fail) with the same rule as trade; bold, open villages expand, wary or communal ones seldom do.
- **Life of an outpost:** the party walks (or sails, if the village has boats and a dock) along a route you can see; the outpost feeds itself, grows from a **camp** to a **hamlet**, **village** and **town**, and every few days sends a share of what it makes home by cart or ship (some loads are lost on the way). Click it on the map or in World &rarr; Settlements to see people, loyalty, share sent and founders.
- **Loyalty:** it falls with a heavy share, distance, hunger and a bigger, prouder outpost, and rises with help. A restless outpost asks the council to send aid, lighten its share, or be left alone. An outpost that stays resentful **breaks away** and becomes a neighbour of its own (friendly or bitter).
- **Bridges:** with carpentry (timber) or masonry (stone), the council can span a strait or river up to five tiles wide, tile by tile from our own bank, when the walking saved or land opened is worth the cost, and never where it would cut a dock off from the sea. Bridges are walkable by people and animals and saved with the world.
- **New world dialog:** Settings &rarr; New world&hellip; picks the seed (with dice), map type, and **map size**: Compact (200&times;140), Standard (260&times;180) or Large (340&times;236). Island and archipelago worlds always use at least Standard (they need open sea).
- **Tools:** `tests/outposts.js`, `tests/bridges.js`, `tests/sizes.js [days]` (every map type at every size), `tests/newworld.js` and `tests/shot20.js` (browser), `tests/pl4.js` (profile a slow world in the page).
- **Not yet:** outposts do not build individual houses or have their own council; settlements are records, not a second simulation. Neighbours on large maps are still few.

## Harbour and trade abroad (new in 0.20)
The village no longer waits for merchants. It now trades for itself.
- **Trade trips:** with trade and sea trade (or on foot for land neighbours), the council looks at every neighbour it knows and weighs the best trip with one shared **cost-benefit rule**: what the cargo should earn, against crew time, ship upkeep and the risk of losing it. The council then decides whether to **send** the trip, make it a **standing route** that repeats while it keeps paying, or **wait**. Claude can counsel these decisions as with others.
- **Cargo:** goods leave the stores, are carried by a ship or wagon, sold at the neighbour's prices (each kind of neighbour pays differently and friendlier ones pay better), and what the village is short of comes home. Trips are skippered by a real villager, can be lost to bad weather, and the skipper may be lost too (with the Disasters setting on).
- **Ships:** fishing boats can carry a small load (24); **cargo ships** carry 70; **carracks** carry 140 and sail faster.
- **Harbour tiers:** a **dock** can be improved to a **quay** (stone landing, warehouse, more berths, cargo ships) and then a **port** (cranes, customs sheds, carracks, customs revenue on every trip). The council weighs each improvement against its cost.
- **Regimes matter:** open, merchant-minded villages trade eagerly; devout or hard-ruled ones seldom; communal ones put all the profit in the treasury.
- **See it:** the Progress tab has a Harbour & trade abroad card (tier, fleet, current trip, standing routes, ledger, recent trips); the dock panel shows tier and berths; cargo ships and port cranes have their own art.
- **Council policies** now show a clear two-ended bar with plain words ("favours more leisure", "strongly watchful").
- **Population line** is a quiet sentence: "This past year: 10 born, 3 arrived, 2 died".
- **Tools:** `tests/routes.js`, `tests/shot19.js`.

## Map types (new in 0.19)
New worlds now come in six map types, chosen in Settings (or **Auto**, picked by the seed):
- **Island:** one island in open sea, other islands beyond (the original map).
- **Archipelago:** a smaller home island among several others; boats matter early.
- **Continent:** land across the whole 260x180 map with a coast on one or two sides and mountains along the rest.
- **Peninsula:** a tongue of land with sea on three sides and a narrow neck to the mainland.
- **Lakeland:** landlocked with big lakes; boats work the lakes.
- **River land:** one or two winding rivers divide the land; they can be crossed only at **fords** (a new walkable shallow terrain).
- **Neighbours on foot:** on the land maps, other peoples live a few days' walk away. Hunters and curious villagers go exploring to find them; they trade by wagon, send envoys, migrants and aid on foot, and can raid by land. Coastal maps also have an island or two reached by boat.
- **Starts that work:** the village starts on the biggest connected land, with a shore fishers can actually walk to. If the only shore lies behind thick woods, fishers cut a way through when food runs short.
- **Old saves** load as the original island map. New islands now also fade out toward the edge of the home area instead of being cut off.
- **Not yet:** wildlife migration between regions. (Bridges arrived in 0.21.)
- **Tools:** `tests/maps.js [seeds] [show]` (ASCII previews and checks), `tests/mapsweep.js` (a short sweep for each map type), `tests/shot17.js` (overview images).

## Movement and population (new in 0.18)
- **Natural movement:** paths are smoothed into straight diagonal shortcuts (never leaving roads, never cutting through brush or odd ground, and keeping clear of walls). If something is built across a shortcut, the walker plans again. Trips are a few percent shorter, so villages are a little more productive.
- **Personal space:** villagers who stand or walk close together are eased apart when drawn, and standing spots at the square, tavern and hall are reserved so people don't stack on one spot. A small hop animates walking.
- **Ages in human years:** a villager's age shows in game years with a human-years equivalent in brackets (display only).
- **Where the population changes come from:** the Population card shows the past year's births, arrivals (travelers and boat migrants), deaths and departures (banished or sailed away).
- **Secret key 5:** runs the simulation as fast as the machine allows (about 270x here), for testing. Keys 1 to 4 return to normal speeds.
- **Measured:** pathfinding is only about 8% of run time, so no path-engine rewrite was needed yet; terrain-cost paths and connectivity come with the map step, and crowd movement with military units.
- **Tools:** `tests/move.js` (walls and trip length, smoothing on versus off).

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

## Play (v0.35)
- **Watch / Play:** Watch is the village on its own. Play adds a toolbar: Select, Build, Road, Zone, Research, Crowd and three "Village plans" switches (Buildings, Research, Jobs).
- **Orders:** pick villagers (click, Shift-click, Shift-drag a box) and right-click a tree, rock, berry bush, building site or damaged building. On touch, tap the place and press the order button in the inspector, or press and hold for a menu. A plain click or tap only selects.
- **Building:** a footprint follows the pointer, green or red with the reason. Player sites are built first. Roads are dragged. Zones (homes, farms, work, civic) are painted and steer where the village builds. Sites can be cancelled before work starts.
- **Control:** the player picks research; each of buildings, research and jobs can be switched from "the village plans it" to "I do". The Crowd panel sets how the crowd splits its work.
- **Lives and game over:** villagers live about 8 to 12 years. A village with nobody left, or fewer than five people for a month, ends with a summary and a choice to carry on, restart the seed or start anew.
- **Menu:** Resume, New world, Save, Load, Settings, How to play, About (version, news, links, a report button), and a first-visit welcome.

## Performance and stability notes
- A long run (500 simulated days, 160+ villagers) completes with no errors. The year-12 freeze was an infinite loop in the naming of social circles (a sixth circle with the same base name never found a unique suffix). It is fixed, and every loop in the code is now bounded or provably terminating.
- Pathfinding failures were the main cost; fields and game that cannot be reached are now skipped before searching, and wildlife uses a spatial grid. Roughly 3x faster at 70+ villagers.
- Wood is renewable: felled trees often sprout again, foresters replant, and better homes need less firewood.

