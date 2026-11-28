# Known issues and limits

What is known to be wrong, missing or deliberately limited, with the GitHub issue that tracks it where there is one. Report something new through the [bug report form](https://github.com/Zaat/village-sim/issues/new/choose); pasting the world line and the Diagnostics report (Menu > Settings > Diagnostics > Copy) makes it much easier to fix. The current version is v0.39.2. Planned work is in the [roadmap](ROADMAP.md).

## Bugs and open questions
| What | Status | Issue |
|---|---|---|
| The game ran at about 0.6× at 1× in the Claude app's built-in browser, which redraws 255 times a second; the drawing cap (v0.39.2) should have fixed it, and a slow run could not be reproduced at 1× or Max with the same save (it started paused because of the "resume automatically" setting) | Closed; a new Diagnostics report can reopen it | [#137](https://github.com/Zaat/village-sim/issues/137), [#171](https://github.com/Zaat/village-sim/issues/171) |
| In the Claude app's built-in browser in full screen, the first two tabs show no hand cursor and do not respond | Not reproduced elsewhere. Diagnostics (v0.39.3) now report what sits on top of each tab and the cursor there; it stays open until a report shows the cause | [#174](https://github.com/Zaat/village-sim/issues/174), [#177](https://github.com/Zaat/village-sim/issues/177) |
| Housing stalled at 54 homes in one early run | Not reproduced; the housing diagnostic exists | [#6](https://github.com/Zaat/village-sim/issues/6) |
| Forest regrows too fast | Planned for v0.40 | [#4](https://github.com/Zaat/village-sim/issues/4) |
| Heavy ticks: every villager decides on the same tick, and the day rollover is long, so a large village has brief pauses | Planned for v0.40 (it changes simulation results, so it needs a golden review) | [#134](https://github.com/Zaat/village-sim/issues/134), [#135](https://github.com/Zaat/village-sim/issues/135) |

## Missing or unfinished
| What | Status | Issue |
|---|---|---|
| The crowd figures are decoration: they have no names, cannot be selected, and above 30× speed they stand at their doors instead of walking | By design (entry 21) | [#136](https://github.com/Zaat/village-sim/issues/136) |
| Culture reaches 100 in any village of about 160 people, so the number says little | Planned model rebuild | [#140](https://github.com/Zaat/village-sim/issues/140) |
| Spanish covers the main screens, menus, Settings, the Events tab and the Play panels; the inspector panels, event texts, thoughts and technology names are English | Ongoing, finished with the interface sweep before 1.0 | [#150](https://github.com/Zaat/village-sim/issues/150) |
| Date display has no panel behind it | Backlog; needs a discussion first | [#3](https://github.com/Zaat/village-sim/issues/3) |
| Farm, dock and civic buildings look the same in every age | Planned | [#141](https://github.com/Zaat/village-sim/issues/141) |
| Villagers cannot be absorbed by a stronger neighbour (game-over ending) | Backlog | [#146](https://github.com/Zaat/village-sim/issues/146) |

## By design
- **Sine and cosine can differ by one unit in the last place between browser builds** (about 3% of values between Node 22 and Chromium 153). No result depends on it so far; `tools/mathcheck.js` compares engines and says when one does. See entry 4.
- **A seed started again after v0.39.3 can give a different village than it did before**, because six random sorts were replaced by a proper shuffle (the continent coast layout and events from the first games and strife onward can differ). Saves are not affected: they keep their state and load as before. See entry 4.
- **A reloaded save continues identically from then on, but not exactly like an uninterrupted run**, because villagers come back idle. See [DESIGN](DESIGN.md) entry 4.
- **No full screen on iPhone Safari**: the browser does not allow it for a page. See entry 19.
- **Two birth rules** (family rules for the 160 simulated villagers, a rate for the crowd) cause a visible change in growth near 160 people. See entry 3 and [#152](https://github.com/Zaat/village-sim/issues/152).
- **Survival, disasters, crime and raids can make a village very hard or end it**, especially on Harsh. They are marked in Settings and can be turned off. See entry 12.
