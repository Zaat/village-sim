# Design notes

Why Village Sim works the way it does. Each entry records a decision, the reason, the date it was made and where it shipped. For what the game does, see [FEATURES.md](FEATURES.md); for how the code is organised, see [ARCHITECTURE.md](ARCHITECTURE.md); for what comes next, see [ROADMAP.md](ROADMAP.md).

Entries are added when a decision is made and updated when it changes. An entry that is later reversed is kept, with the reversal noted, so the reasoning is not lost.

---

## 1. Most of a big town is a crowd kept as numbers
**Decided** 2026-11-24 · **Shipped** v0.34 (`a61462f`), extended in v0.37

Every villager is simulated in full (needs, routes, relationships, memories) up to a focus of 160 people. Beyond that, residents are a crowd: counts by age group and by kind of work, with the same food, housing and work rules as the named villagers, but no individual routes.

*Why.* Per-person cost grows with the number of villagers, and a town of a few thousand people cannot be simulated person by person on a phone. The focus group keeps the people you can click on, follow and name fully alive; the crowd keeps the town's economy honest.

*Consequences.* The crowd is drawn at the doors of its houses. Making it walk is a rendering change only and must not touch the simulation (see entry 5). Deaths in the crowd are counted by cause and shown with the others.

## 2. Pace: a year is a season-length story, and growth is slow on purpose
**Decided** 2026-11-25 · **Shipped** v0.38

A day is 1,200 ticks, a year is 32 days, and 1× is 20 ticks a second. Early versions doubled the population every year. The accepted curve is about 1,000 people by year 25 on Gentle, 35 on Normal and 50 on Harsh, with immigration gated by land, technology and order.

*Why.* A metropolis should feel earned. Fast early growth made the middle of the game feel empty.

## 3. One birth model for villagers and crowd: measured, not adopted
**Decided** 2026-11-27 · **Tooling** v0.38.2 (`c5b0b73`)

Villagers use family rules (couples, gaps between children, long childhood). The crowd uses a flat birth rate per adult scaled by order. This causes a visible jump in growth near 160 people. A single birth rule for both was designed and built only inside a developer tool (`tools/pace_lab.js`) that compares population curves across maps, hardship levels and the survival switch.

The tool found that the crowd's birth rate began with a one-day spike when the crowd formed; a candidate fix did not smooth growth enough to adopt.

*Decision.* The shipped game keeps two models for now. With the survival switch off the pace was judged acceptable, and the settings study (entry 6) showed that survival, not the birth model, was the main brake on growth. Changing the model would also change every saved world and every baseline. The candidate stays in the tool and can be adopted later if the jump near 160 people becomes a problem in play.

---

## 4. Determinism: the same seed gives the same village
**Standing rule** · reload behaviour documented v0.34.1

Everything in the simulation runs from a seeded generator and a tick counter. Rendering, sound, panels and anything else the player sees must never draw from that generator or change simulation state. A golden file records the exact outcome of reference worlds, and any release that changes it must say why.

*Why.* Reproducible worlds make bugs reportable (a world line is enough to rebuild a village) and make the test suite meaningful.

*Known limit.* A reloaded save continues identically from then on, but not exactly like an uninterrupted run, because villagers come back idle.

*Across engines (v0.39.3).* "The same seed" has to hold in every browser, not only on one machine. It did not: six places sorted a list with a random comparator, and engines call a comparator in different orders and a different number of times, so Node and Chromium built different villages from about day 12 (the first sign was a Midsummer Games winner's mood differing by exactly 15). The rule is now: never sort with a random comparator; use `shuffled(list, rnd)`, which draws a fixed number of numbers; and the simulation reads no clock. `tests/determinism.js` guards both, and `tools/mathcheck.js` builds the same worlds in Node, Chromium, Firefox and WebKit and compares them bit for bit (CI runs it). Separately, `Math.sin` and `Math.cos` differ by one unit in the last place between some engine builds (about 3% of values between Node 22 and Chromium 153); no result depends on that so far (48 maps and 10 days agree exactly), and the check will say when one does. The fix changed what the seeded worlds do, so the golden file was regenerated in v0.39.3.

## 5. Display-only changes keep the simulation identical
**Standing rule** · applied in v0.39.1

Anything that is only a label (for example the split of deaths into fever season, plague and everyday illness) is added as a separate display key. The keys that game logic reads are not renamed, so the golden file stays unchanged.

## 6. Risk switches: survival, disasters, crime and raids
**Switches shipped** over several releases (raids in v0.30) · **Settings study and fixes** 2026-11-27, v0.39 (`adc1ba5`)

Four switches in Settings turn the hardest parts of the game on or off. A matrix of worlds with each switch alone and all together showed that survival (hunger and cold) is the main brake on growth, about three times fewer people after twenty years.

*Why.* People should be able to choose between a calm sandbox and a harsh one, and know what each costs. Hardship (Gentle, Normal, Harsh) tunes difficulty inside whichever set of switches is on.

## 7. Deaths are shown by cause, and illness is split three ways
**Decided** 2026-11-27 · **Shipped** v0.39.1

The Society tab keeps the Causes of death card. The Stats tab has a Deaths chart preset with old age, hunger, cold, illness and other. Illness is split into fever season (a seasonal sickness), plague (a spreading outbreak) and everyday illness, in the card, the series and the event counters.

*Why.* "Died of fever" hid whether people were dying of the yearly sickness, an epidemic, or ordinary illness, and these call for different responses (food and warmth, quarantine, medicine).

## 8. Culture: what it is today, and what it should become
**Shipped** v0.31 · **Revision decided** 2026-11-27 for v0.40

Today culture is one score from 0 to 100. Weddings add 0.8, each person honoured at a funeral adds 0.4 and a story night adds 0.6; it fades by about 5% of a point plus 0.11% a day. It slightly speeds research and nudges the regime. In a village of 160 or more people, gatherings are frequent enough that it saturates at 100, which makes the number uninformative.

*Planned model.* One overall figure, with four plainly named parts always visible: **Traditions**, **Learning**, **Heritage** and **Togetherness**, plus a "known for" line, all measured per person so a large town does not automatically max out. Until then the card explains what builds the score.

## 9. Layout modes: Docked, with a Clean view for play and screenshots
**Decided** 2026-11-28 · **Shipped** v0.39.1

*Docked* (the side panel beside the map) is the default and always available. *Clean* hides the panel and most controls, leaves a play bar and a few counters, and has a corner button and the L key to return. The choice is remembered per device.

*Tried and removed.* An *Overlay* mode (panel sliding over the map) was built and tested, and dropped the same day: it added buttons and saved little space. Narrow screens keep their own stacked layout.

## 10. City design and transport planning come as commissions
**Decided** 2026-11-27 · **Planned** v0.40

Beauty and street layout become the work of a council commission, with a visible beauty score per district and a project ledger: every idea, proposal and project listed with its state, proposer, cost and progress. Projects are slow and expensive, and depend on regime, culture and technology. In Watch the council decides; in Play the player can approve, change or reject, with auto-approve rules and a cap on how many proposals appear at fast speeds. Transport planning (roads, rail, stations) shares the same engine and needs the transport ladder first.

*Why.* A remodelled street pattern is a long project in a real city. Treating it as a project with a ledger keeps it understandable and keeps the player in control without needing constant clicks.

## 11. Long lists are compact, not scrolling
**Decided** 2026-11-28 · **Shipped** v0.39.1

Chronicle, expeditions, trade and defence show the recent few entries and an "Earlier (N)" block that opens in place, up to about thirty rows, without an inner scrollbar. Dates in lists are written "Y53 D7" (day 7 of year 53, the year having 32 days); the hover text gives the full form.

*Why.* Relative wording such as "yesterday" and "three days ago" is vague in a game that runs at many speeds. Many small scrolling boxes inside a scrolling panel are hard to use, especially on a phone.

---

## 12. Game over is rare and mostly luck, and always avoidable by play
**Decided** 2026-11-24 · **Shipped** v0.35 (end screen), v0.37 (Hardship scorecard)

A watch-only village can die on Harsh (roughly one in four to six), rarely on Normal (one in fifteen to twenty) and essentially never on Gentle. Failure comes from stacked bad luck (poor land, a hard winter or wolves while small, an early hostile neighbour), mostly in the first 10 to 15 years; big villages are resilient. The end screen names the main causes, and "Check this world" warns about poor land. Any switch that makes the game much harder must leave the player something to do that almost always avoids defeat. Risky switches are marked in Settings.

*Why.* A simulation that is also a game should be able to end, but it should not feel unfair. Targets are set by feel and measured: a scorecard in the coverage report checks that Gentle passes 1,000 people, Harsh is hard but survivable and Normal sits between them.

## 13. How releases are tested
**Decided** 2026-11-24 · **Shipped** v0.34.1 and later

Every release must have a full green run for the exact code being released (the release script refuses otherwise). Regular releases run the affected suites, the browser page tests and one full run; milestone releases (a major public release, a large feature set) add a deeper batch of worlds across all maps and difficulty levels. Early-game worlds are saved as checkpoints so suites load them instead of simulating the start. Balance settings move only when two releases in a row agree, and by at most 10 to 15 percent.

*Why.* A full run takes about eleven minutes, which is cheap next to shipping a broken build, and checkpoints keep the suite fast enough to run every time.

## 14. Play: a click only ever selects
**Decided** 2026-11-24 · **Shipped** v0.35 and v0.35.1

Watch is the village on its own; Play lets the player lead as much or as little as they like, and the two switch back and forth seamlessly. In Play a plain click or tap only selects and inspects; orders need a deliberate action (right-click, or an order button on touch devices). Orders go to the "group" of selected villagers, never by accident. Everything the player does is plain data on the world, so it saves, tests and replays like the rest of the simulation. The first time a player enters Play, a tip explains that the council stops building and that they are in charge.

## 15. The big-town view is an overlay, and orders go to groups
**Decided** 2026-11-24 · **Shipped** v0.37

A district is a 16x16 block of tiles with homes. The districts overlay tints the map (by density, mood or shortage) and names each district with its head count; clicking one opens a card with people, mood, homes, jobs, food and wood. It is not a separate screen. At far zoom the map shows districts, nearer it shows buildings and small figures, nearest it shows individuals. At scale, orders go to groups and districts ("put 40 more on wood"), with each district's plan set to Auto or Mine.

## 16. Resources are a table, not code
**Decided** 2026-11-24 · **Shipped** v0.37

Each resource has a source, a stock, its consumers, a shortage concern and substitutes by technology. New materials can be added by age (metals, cloth and wool, luxury goods, salt, then uranium and rare earths, later space materials) without touching the rest. Research stays "knowledge" and coins stay "wealth".

## 17. Transport: abstract before visible
**Decided** 2026-11-24 · **Planned** v0.40

Transport grows from feet and loads through pack animals, carts, horses, ships (done), bicycles, rail, cars and aviation. The first step is a transport level, derived from technologies and roads, that sets haul speed, how far depots and districts can lean on each other and commute times; vehicles on the map come later. Distance should matter for any resource: stock on the far side of water is not available as if connected, unless a bridge is built or a route opened, and goods can be carried. Today overseas outposts, bridges, sea and river routes and wood by boat exist; a general distance cost on stockpiles does not.

## 18. Language: English text is the key
**Decided** 2026-11-27 · **Shipped** v0.39

The game detects the browser language and offers a switch in Settings that overrides it and is remembered. A lookup function takes the English text and returns the Spanish line, or the English text if a translation is missing, so an untranslated string never breaks anything and new text can be written in English first. Saves and the world line are language-neutral. The main screens, menus and Settings are translated; the rest follows release by release.

## 19. Full screen is a menu item and a key
**Decided** 2026-11-27 · **Shipped** v0.39

Full screen is Menu > Full screen, or the X key, where the browser allows it. iPhone Safari does not allow it for a page, and that is accepted: no web app manifest and no "Add to Home Screen" prompt until the game is bigger.

## 20. The code is public and open
**Decided** 2026-11-24 · **Shipped** v0.36

The repository is public under the MIT licence, with GitHub Pages hosting the game, issue templates and a README. A safety scan before the switch found no secrets.

## 21. Performance work must not change results
**Decided** 2026-11-27 · **Crowd part built** v0.39.3 · **Simulation part planned** v0.40

Profile first. Then exact path caching with invalidation when the map changes (the golden file confirms nothing changed), a per-tick search budget and a spatial grid for neighbour scans (results sorted by id so they stay identical). Flow fields are used only if tiny changes to trajectories are acceptable. A change to how often villagers decide is undecided and will be judged from the profile. Walking crowd figures reuse the cached routes and are drawn only; they do not touch the simulation or saves.

*Built in v0.39.3 (the crowd).* The living crowd runs its own flood over walkable tiles (it never calls the simulation's search, so it cannot spend the simulation's search budget), at most 3 searches a frame, keeps every route for about 24 days, and finds the nearest workplaces through a coarse grid. In the largest saved village (2,770 townsfolk, 711 houses) it costs 0 to 4 ms a frame. The simulation side (staggered decisions, path and neighbour caches) changes the order of events, so it moved to v0.40 with its own golden review rather than joining the shuffle fix, which already changed the golden file.

## 22. Late-game interest: goals and scale problems, not busywork
**Direction decided** 2026-11-27 · **Planned** from v0.40

After the population plateaus the game can feel static. The direction is new problems that scale with size (factions, energy, pollution), then a simple loop players can follow without effort: ranks with a celebration from hamlet to metropolis, an Ambitions list of next great works and goals with visible rewards, and scale crises tied to the energy ladder. A second village on a neighbouring map is a bigger idea for later.

## 23. Saves: compressed, in IndexedDB, ten named
**Decided** 2026-11-28 (after the first large saves reached 1.4 MB) · **Built** v0.39.2

Browser localStorage holds about 5 MB per site and blocks the page while it writes, so a year-56 village (1.4 MB) plus its backup and undo copy was already near the limit. Saves are gzip-compressed (about 4.4 times smaller) and kept in IndexedDB: an autosave, a backup of the village left behind when a new one starts, and up to ten named saves; the time-travel Undo copy lives there too. The world format is unchanged, and plain older saves and files still load. Alternatives considered: compressed text in localStorage (works for 3 to 5 saves but meets the 5 MB limit as worlds grow, and the compressor is asynchronous either way) and unlimited named saves (ten keeps the screen tidy). Where the browser has no compressor, records are stored as plain text. A known limit: a tab closed mid-write can lose up to about a minute of play, which autosaves every minute, at each season and when the tab is hidden keep small. Export writes `.json.gz` and Import accepts both forms. The saves code is isolated in `src/saves.js`, so the store can change without touching the world format.

## 24. Drawing is limited to what the village can afford
**Decided** 2026-11-28 · **Built** v0.39.2

Reports from the Claude app's built-in browser showed the frame loop called about 255 times a second, with one draw of a 1,900-person town taking about 3.8 ms: drawing used about 98% of the time, so the simulation ran at 0.64× at 1× speed. Safari and Chrome stop at 60 frames a second, which hid it. Drawing is now at most 60 a second, and at most about a third of the time when a draw is expensive (down to about 10 a second); the simulation takes the rest. The simulation itself is unchanged, so results and saves are identical. The report says what limits the speed (a verdict line plus busy and draw percentages and the last 30 seconds), so a future slow-run report can be read at once.

## 25. Events: what is happening now, what mattered, what each year was
**Decided** 2026-11-28 · **Built** v0.39.3

The old Events tab was one growing list of lines, hard to read at high speed and silent about where things happened. It is now three cards. **Now** is the live picture: season and day, what the villagers in play are doing (a bar of working, sleeping, socialising, free time), the top concern and the last eight days in numbers. **Events** is the feed, ranked: every event has a group (People, Hardships, Society, Progress, World) and a size (small, medium, big), and chips filter by group or show only the important ones. At fast speeds the feed shows only medium and big lines and says how many small ones are folded away. **Years** has a row per year (people at the start and end, births, deaths, arrivals, a sparkline, the big events and a tale), the older years folded into decades.

*The event record.* The simulation now keeps its own list next to the log: `w.ev = { v: 1, next, list: [{ i, d, g, t, s, x?, y?, v? }] }`, with an id, the day, group, size, text and, where there is one, a map position (or `v` for the whole village: storms, fever). It is trimmed by size (1,200 big, 700 medium, 150 small) when it passes 2,600 and when it is saved; saves from before are rebuilt from the log. Recording is wrapped so it can never stop a tick, and it uses no random numbers.

*Pins.* An event with a place has a 📍 that moves the camera there, and a new event shows a short ring on the map (about 5 seconds, at most 8 at once, bigger for the big ones). A village-wide event has a 🏘️ instead. Pins are drawn only.

*Selecting things.* Boats, visiting ships and wagons, and trees, rocks, bushes and building sites can now be selected and show a panel (what a boat is doing, its crew and dock; where visitors are from and when they leave). Single fish tiles are not selectable, because every click on water would select something.

*Why this shape.* One list cannot be both a live view and a history; three cards with a shared record can. The record carries a position because "where" was the question asked most, and ranking by size is what makes fast speeds readable. Alternatives considered: toasts for every event (too noisy at any speed above 1x; pins on the map are enough) and a separate chronicle screen (the Years card is the chronicle).
