# Known issues and limits

What is known to be wrong, missing or deliberately limited, with the GitHub issue that tracks it where there is one. Report something new through the [bug report form](https://github.com/Zaat/village-sim/issues/new/choose); pasting the world line and the Diagnostics report (Menu > Settings > Diagnostics > Copy) makes it much easier to fix. The current version is v0.39.2. Planned work is in the [roadmap](ROADMAP.md).

## Bugs and open questions
| What | Status | Issue |
|---|---|---|
| The game ran at about 0.6× at 1× (and far below Max) in the Claude app's built-in browser, which redraws 255 times a second; a drawing cap in v0.39.2 should fix it | Waiting for confirmation on that machine | [#137](https://github.com/Zaat/village-sim/issues/137), [#171](https://github.com/Zaat/village-sim/issues/171) |
| In the Claude app's built-in browser in full screen, the first two tabs show no hand cursor and do not respond | Not reproduced elsewhere; may share the cause above | [#174](https://github.com/Zaat/village-sim/issues/174) |
| Housing stalled at 54 homes in one early run | Not reproduced; the housing diagnostic exists | [#6](https://github.com/Zaat/village-sim/issues/6) |
| Forest regrows too fast | Planned for v0.40 | [#4](https://github.com/Zaat/village-sim/issues/4) |
| Heavy ticks: every villager decides on the same tick, and the day rollover is long, so a large village has brief pauses | Planned (performance) | [#134](https://github.com/Zaat/village-sim/issues/134) |

## Missing or unfinished
| What | Status | Issue |
|---|---|---|
| The crowd stands at its houses instead of walking | Planned; drawing only | [#136](https://github.com/Zaat/village-sim/issues/136) |
| Culture reaches 100 in any village of about 160 people, so the number says little | Planned model rebuild | [#140](https://github.com/Zaat/village-sim/issues/140) |
| Spanish covers the main screens, menus and Settings; the rest is English | Ongoing | [#150](https://github.com/Zaat/village-sim/issues/150) |
| Events and the Chronicle are hard to read at high speed | Planned redesign | [#2](https://github.com/Zaat/village-sim/issues/2), [#147](https://github.com/Zaat/village-sim/issues/147) |
| Date display has no panel behind it | Open | [#3](https://github.com/Zaat/village-sim/issues/3) |
| Farm, dock and civic buildings look the same in every age | Planned | [#141](https://github.com/Zaat/village-sim/issues/141) |
| Villagers cannot be absorbed by a stronger neighbour (game-over ending) | Backlog | [#146](https://github.com/Zaat/village-sim/issues/146) |

## By design
- **A reloaded save continues identically from then on, but not exactly like an uninterrupted run**, because villagers come back idle. See [DESIGN](DESIGN.md) entry 4.
- **No full screen on iPhone Safari**: the browser does not allow it for a page. See entry 19.
- **Two birth rules** (family rules for the 160 simulated villagers, a rate for the crowd) cause a visible change in growth near 160 people. See entry 3 and [#152](https://github.com/Zaat/village-sim/issues/152).
- **Survival, disasters, crime and raids can make a village very hard or end it**, especially on Harsh. They are marked in Settings and can be turned off. See entry 12.
