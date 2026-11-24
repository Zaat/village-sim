#!/usr/bin/env bash
# One-time (and safe to re-run) GitHub organisation: labels, milestones, issues.
# Run on the Mac inside a clone of the repo:  bash tools/gh-setup.sh
# Needs gh logged in with repo scope. Skips anything that already exists.
set -u
R=Zaat/village-claudia
BASE="https://github.com/$R/blob/main/docs/releases"

label() { gh label create "$1" -R $R --color "$2" --description "$3" --force >/dev/null 2>&1 && echo "label $1"; }
label sim        0e8a16 "Simulation behaviour and balance"
label ui         1d76db "Interface, panels and drawing"
label tests      fbca04 "Test suites and tools"
label design     c5def5 "Needs a design discussion first"
label needs-data b60205 "Waiting for diagnostics from a real run"
label high       d93f0b "High effort or high priority"
label medium     fef2c0 "Medium effort or priority"
label done       0e8a16 "Shipped"

# milestones: one per release (closed), then the planned ones (open)
ms_exists() { gh api "repos/$R/milestones?state=all&per_page=100" --jq '.[].title' | grep -Fxq "$1"; }
ms() { # title, state, description
  if ms_exists "$1"; then echo "milestone exists: $1"; return; fi
  gh api "repos/$R/milestones" -f title="$1" -f state="$2" -f description="$3" >/dev/null && echo "milestone $1 ($2)"
}
grep '^mk ' tools/make-releases.sh | while IFS= read -r line; do
  v=$(echo "$line" | awk '{print $2}')
  t=$(echo "$line" | sed -n 's/.*--title "\([^"]*\)".*/\1/p' | sed 's/ — / /')
  [ -z "$t" ] && continue
  # create open first (closed milestones cannot be created with a state on some API versions), then close
  ms "$t" open "Release notes: $BASE/$v.md" && \
    n=$(gh api "repos/$R/milestones?state=open&per_page=100" --jq ".[] | select(.title==\"$t\") | .number") && \
    [ -n "$n" ] && gh api -X PATCH "repos/$R/milestones/$n" -f state=closed >/dev/null
done
ms "v0.35 Control and mobile" open "Controls, mobile layout, date display panel."
ms "v0.36 Look and polish" open "Visual polish, Events tab redesign."
ms "v0.37 Resources and energy" open "Resources, forest balance, energy and power."
ms "v0.38 Atomic and information ages" open "Late ages and the population surge."
ms "v0.39 Space age" open "Space age."
ms "v0.40 Generative minds" open "Proposed: villagers compose thoughts from a small memory."

# issues
iss() { # title, labels, milestone ("" for none), state (open|closed), body
  if gh issue list -R $R --state all --search "\"$1\" in:title" --json title --jq '.[].title' | grep -Fxq "$1"; then echo "issue exists: $1"; return; fi
  mnum=""
  [ -n "$3" ] && mnum=$(gh api "repos/$R/milestones?state=all&per_page=100" --jq ".[] | select(.title==\"$3\") | .number")
  labels=$(echo "$2" | tr ',' '\n' | sed 's/.*/-f labels[]=&/' | tr '\n' ' ')
  url=$(gh api "repos/$R/issues" -f title="$1" -f body="$5" ${mnum:+-F milestone=$mnum} $labels --jq .html_url) || return
  echo "issue $url"
  [ "$4" = closed ] && gh api -X PATCH "repos/$R/issues/${url##*/}" -f state=closed >/dev/null
}
M32=$(grep -o '^v0.32 [^"]*' <(grep '^mk v0.32 ' tools/make-releases.sh | sed -n 's/.*--title "\([^"]*\)".*/\1/p' | sed 's/ — / /'))
M33="v0.33 City structure"
M34="v0.34 Crowds"

# open
iss "Time and lifespans review" "sim,design,high" "v0.35 Control and mobile" open "Decided: villagers live about 8 to 12 years, fast childhood (about 1.5 years), adults near real pace. Research and economy stay per day; only demography scales (life stages, fertile window, birth interval, mourning, apprenticeships, mortality curve). Measure headless demography first. Trees and animals on their own scales (town-size effects earlier, the rest in v0.37). Decide numbers before Crowds."
iss "Events tab redesign" "ui,design,medium" "v0.36 Look and polish" open "Importance-ranked, grouped, colour-coded feed; Week, Year, Decade and Lifetime views; compact and polished. Design a mock-up first."
iss "Date display panel" "ui,design,high" "v0.35 Control and mobile" open "The date display top left should hold something useful on hover or click. Discuss before building."
iss "Forest regrowth is too fast" "sim,medium" "v0.37 Resources and energy" open "Measured in v0.33: trees keep growing while wood stays above 500 (island seed 12 trees 1612 to 1722 in years 4 to 6; lakeland seed 351323045 about 4900 trees, wood 700 to 1000). Tune for realistic scarcity without limiting long-term growth."
iss "Population plateaus at 150 to 200 with beds to spare" "sim,high" "v0.35 Control and mobile" open "Not housing-limited. Find the growth driver for the metropolis. Related: dips of 20 to 35 percent around years 7 to 14 on some seeds."
iss "Housing stuck at 54 homes in Albert's run" "sim,needs-data" "" open "Not reproduced on seed 351323045. v0.33 adds the housing funnel ('why no house was placed') to Concerns and Diagnostics. Paste the world line and the Diagnostics text from the stuck run here."
iss "Built-in diagnostics: study the best examples" "ui,design,medium" "" open "First form shipped in v0.33 (world line, Diagnostics section, action log). Study how the best games do it before extending (report buttons, state dumps, replay seeds)."

iss "Not enough homes concern never clears and homes stay flat then jump" "sim,done" "$M34" closed "The concern comes from the privacy model (people with no bed of their own, or sharing a roof against their nature) but planTown only compares beds with population. Measured on seed 351323045: the concern is on 32 of 32 days in years 1 and 2 with 28 beds for 19 villagers; in 30 years homes stay at 40 for years 6 to 12 then step to 46 and 58. Fix: demand follows crowding and people without a bed, smoother build-ahead target."

iss "Fast headless runs and checkpoints" "tests,design,high" "v0.35 Control and mobile" open "Roundtrip determinism check (save and load mid-run equals a straight run), checkpoint saves at year 10 and 20 for tests and probes, exact hot-path speedups verified by the golden test, optional coarse-tick probe mode."
iss "Wildlife and ecology pass" "sim,medium" "v0.37 Resources and energy" open "Wolves can stay hunted out for years and only deer, rabbits and wolves exist. Migration from outside the map so no species stays extinct, bears and foxes, predator-prey balance, an extinction note."
iss "Game over condition" "sim,design,high" "v0.35 Control and mobile" open "Extinction, long collapse, conquest or absorption; end screen with history, stats and world line, then continue or restart on the same seed. Design first."
iss "Crowds: villagers in play plus a crowd kept as numbers" "sim,done" "$M34" closed "Shipped in v0.34: 160 in play, the rest counted by age, drawn at the houses; 2,800 people at about 1.1 ms per tick."

# closed (retroactive)
iss "Causes of death card" "ui,done" "$M32" closed "Shipped in v0.32."
iss "Clicking another settlement shows details" "ui,done" "$M32" closed "Shipped in v0.32 (settlement panel with stats and relations)."
iss "Tree of knowledge window offset" "ui,done" "$M32" closed "Fixed in v0.32."
iss "Housing diagnostic: why no house was placed" "sim,done" "$M33" closed "Shipped in v0.33 (housing funnel in Concerns and Diagnostics)."
iss "Organic city growth: land value, density, hamlets, redevelopment" "sim,done" "$M33" closed "Shipped in v0.33."
iss "Concerns list loses scroll position on refresh" "ui,done" "$M33" closed "Fixed in v0.33."
iss "Workshops as trade buildings" "sim,done" "$M33" closed "Shipped in v0.33 (ten crafts work at workshops)."
iss "World line in Settings, paste into Seed box" "ui,done" "$M33" closed "Shipped in v0.33."
echo done
