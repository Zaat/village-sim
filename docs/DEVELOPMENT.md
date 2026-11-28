# How this project is built

Village Sim is built by a project owner working with an AI assistant (Claude). The owner sets the vision, makes every design decision, tests the result and approves each release. The assistant writes code, tests and documentation under that direction. This page describes the process, where each kind of record lives, and how the whole game could be rebuilt from those records.

## Why this is written down
The code was written by an AI assistant at the owner's direction. How copyright applies to AI-assisted work is unsettled in many places, and an AI-written program may be hard to protect or enforce on its own. What the owner contributes is direction, selection and judgement: what to build, what to reject, how it should feel, how to balance it, which of several designs to keep. The project therefore records that contribution in detail. These records also let anyone, with any tool, rebuild the game in the same way and in the same release order. This is not legal advice.

The game is released under the [MIT licence](../LICENSE), copyright 2026 Zaat.

## How a change happens
1. **Request.** The owner describes what they want, usually in their own words and often with a problem they saw in play. Requests are logged as GitHub issues, labelled and put in a milestone.
2. **Discussion.** Design-heavy or taste-driven changes are discussed in words first, with questions and a recommendation, before anything is built. The owner can answer "go with the recommendations" or decide differently.
3. **Decision.** When something is decided, it is recorded: in [DESIGN.md](DESIGN.md) if it is a lasting design choice, in the [ROADMAP](ROADMAP.md) if it is planned work, and in the issue.
4. **Build.** The assistant implements it. Simulation code stays deterministic (same seed, same village); display-only changes never touch it.
5. **Test.** The affected test suites run, plus the browser page tests; a full run is required before every release. See [TESTING.md](TESTING.md).
6. **Release.** Every release is complete: tests green, [changelog](../CHANGELOG.md) entry, [release page](releases/) with a screenshot, [FEATURES](FEATURES.md) section, GitHub release with the zip, milestone closed with its issues, and the playable page updated. The release script refuses to release if a required piece is missing.
7. **Measure and adjust.** Balance changes are measured first (population curves, the pace lab, the settings study) and adopted only when the numbers support them.

## Where each kind of record lives
| Record | Where |
|---|---|
| What was asked for, and its state | GitHub [issues](https://github.com/Zaat/village-sim/issues), grouped by [milestone](https://github.com/Zaat/village-sim/milestones) (one per release, plus planned ones) |
| Why it works this way | [DESIGN.md](DESIGN.md): each decision with its date, reasoning and where it shipped |
| What comes next | [ROADMAP.md](ROADMAP.md), each item linked to an issue |
| What each release changed | [CHANGELOG.md](../CHANGELOG.md), [docs/releases](releases/), [FEATURES.md](FEATURES.md) |
| Which commit is which release | `tools/release-commits.txt` and the tags on GitHub |
| How the code is organised | [ARCHITECTURE.md](ARCHITECTURE.md) |
| What is checked, and how | [TESTING.md](TESTING.md), `tests/`, the golden trajectories and the [coverage report](coverage.md) |
| Balance and pace measurements | [dev-stats.md](dev-stats.md), the [pace lab](pace-lab.html) |
| What is known to be wrong | [KNOWN-ISSUES.md](KNOWN-ISSUES.md) |

## Rebuilding the project
To reproduce the game with another tool, read in this order:
1. **[README](../README.md) and [FEATURES](FEATURES.md)** for what the game does.
2. **[ARCHITECTURE](ARCHITECTURE.md)** for the file layout and the rules the code relies on: plain script tags, no build step, no dependencies, a deterministic seeded simulation, rendering that never touches simulation state.
3. **[DESIGN](DESIGN.md)** for the decisions that are not obvious from the code: the crowd as numbers, the pace, the risk switches, determinism, the layouts.
4. **[CHANGELOG](../CHANGELOG.md) and the milestones**, oldest first, for the order the game was built in. Each release is small enough to rebuild and check on its own; `tools/release-commits.txt` gives the commit for each, so a rebuild can be compared with the original at every step.
5. **The tests and golden files** as the acceptance criteria: a faithful rebuild of a release should pass that release's suites and, where the simulation is the same, reproduce its golden trajectories.

Known gaps in the record: the early releases (v0.2 to v0.28) have one-line changelog entries and short release pages, and the conversations behind the decisions are summarised in DESIGN.md and the issues, not stored in full. Both gaps are being closed release by release.

## Rules this project follows
- Issues, milestones and these documents are updated with every release, not afterwards. The release script checks for the pieces it can.
- A decision that is reversed stays in DESIGN.md with the reversal noted.
- Simulation code must give the same result in every browser: no random sort comparators (use `shuffled`), no clock reads, no reliance on the last bit of `Math.sin` and `Math.cos`. `tests/determinism.js` and `tools/mathcheck.js` check it, and a GitHub Actions workflow runs the tests on every push.
- Things decided against go in the roadmap's Won't do list, with the reason.
- Releases are never partial or private unless the owner says so clearly.

## How a release is published (fixed procedure)

1. `tools/release.sh vX.Y[.Z] "message"` in the working copy: gates, zip, commit, push, close the milestone's issues. Check `git remote -v` first: origin must be Zaat/village-sim, not the old archive repo.
2. Republish the artifact (all files).
3. Create the GitHub release page **from the maintainer's Mac through Desktop Commander and `gh`** (the cloud session gets HTTP 403 for releases): temp clone of Zaat/village-sim, `git archive --format=zip --prefix=village-sim/ -o village-sim-vX.Y.zip <full release SHA>`, then `gh release create vX.Y --repo Zaat/village-sim --target <FULL 40-character SHA> --title "vX.Y — Title" --notes-file <notes without the leading "# " heading> village-sim-vX.Y.zip`, then delete the temp clone. A short SHA is rejected as an invalid target.
4. macOS has BSD `sed`: use python3 for text edits on the Mac, and never hand the maintainer a script when the bridge can do it.
5. Update the Project docs and tell the maintainer what shipped.
