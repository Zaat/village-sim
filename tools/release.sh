#!/bin/bash
# Release helper: tools/release.sh v0.17 "commit message"
# Runs the headless regression tests, builds the zip, syncs the repo clone, commits and pushes.
# Refuses to release unless a full green run exists for this exact code; SKIP_TESTS=1 only skips re-running when that is already true.
# Publishing the artifact and sending the zip are done separately.
set -e
V="$1"; MSG="$2"; [ -z "$V" ] && { echo "usage: tools/release.sh vX.Y \"message\""; exit 1; }
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; PARENT="$(dirname "$ROOT")"; REPO="$PARENT/village-claudia"; cd "$ROOT"
grep -q "APP_VERSION = '${V#v}'" src/debug.js || { echo "src/debug.js APP_VERSION does not match $V"; exit 1; }
# Release checklist (v0.35.1): the things that were forgotten once must now stop the release
grep -q "<sub>v${V#v} " README.md || { echo "REFUSED: README.md <sub> line does not say v${V#v} (bump it)"; exit 1; }
grep -q "version: '${V#v}'" src/helpui.js || { echo "REFUSED: ABOUT.version in src/helpui.js is not ${V#v}"; exit 1; }
[ -f "$REPO/docs/releases/$V.md" ] && grep -q "^### $V " "$REPO/CHANGELOG.md" || { echo "REFUSED: $REPO needs docs/releases/$V.md and a '### $V' entry in CHANGELOG.md"; exit 1; }
grep -q "(new in ${V#v})" "$REPO/docs/FEATURES.md" || { echo "REFUSED: $REPO/docs/FEATURES.md has no section marked (new in ${V#v}). Add what this release changes for the player."; exit 1; }
# Docs and GitHub cohesion (v0.39.1): the release must be recorded where people look for it
grep -q "^## ${V}[: ]" "$REPO/docs/ROADMAP.md" 2>/dev/null && { echo "REFUSED: docs/ROADMAP.md still lists $V as planned. Remove it (shipped work belongs in FEATURES and the changelog)."; exit 1; }
awk -v v="### $V " 'index($0,v)==1{f=1;next} /^### /{f=0} f' "$REPO/CHANGELOG.md" | grep -Eq "^Issues: .*#[0-9]+" || { echo "REFUSED: the '### $V' changelog entry needs a line 'Issues: #n, #m' naming the GitHub issues it closes."; exit 1; }
for L in $(grep -o '](\(docs/\|CHANGELOG\|LICENSE\)[^)#]*' README.md | sed 's/^](//' | sort -u); do [ -e "$REPO/$L" ] || [ -e "$ROOT/$L" ] || { echo "REFUSED: README.md links to $L, which does not exist."; exit 1; }; done
MSN=$(gh api "repos/Zaat/village-sim/milestones?state=all&per_page=100" --jq ".[] | select(.title|startswith(\"$V \")) | .number" 2>/dev/null | head -1)
[ -n "$MSN" ] || { echo "REFUSED: GitHub has no milestone starting with '$V '. Create it and put this release's issues in it (see docs/DEVELOPMENT.md)."; exit 1; }
[ "$(gh api repos/Zaat/village-sim/milestones/$MSN --jq '.open_issues + .closed_issues')" -ge 1 ] || { echo "REFUSED: milestone $V has no issues."; exit 1; }
git -C "$REPO" remote get-url origin 2>/dev/null | grep -q "Zaat/village-sim" || { echo "origin of $REPO was not Zaat/village-sim (it had reverted to the old repo once): setting it"; git -C "$REPO" remote set-url origin https://github.com/Zaat/village-sim; }
# Gate: the exact code being released must have a full green run on record (tools/run.js writes the stamp).
# Any source or test edit since then changes the hash, so SKIP_TESTS only works right after a green full run.
NOW=$(node tools/run.js hash); GREEN=$(node -e "try{console.log(require('./tests/.stamp.json').hash)}catch(e){console.log('none')}")
if [ "$NOW" != "$GREEN" ]; then
  if [ -n "$SKIP_TESTS" ]; then echo "REFUSED: SKIP_TESTS is set but the last green full run ($GREEN) is not this code ($NOW). Run tools/check.sh full first."; exit 1; fi
  node tools/run.js full || { echo "REFUSED: a suite failed. Fix it and release again."; exit 1; }
else echo "full run already green for this exact code ($NOW)"; fi
# x.y releases (not x.y.z) also need the browser page tests green for this source
case "$V" in v*.*.*) ;; *)
  PG=$(node -e "try{console.log(require('./tests/.stamp.json').pagesHash)}catch(e){console.log('none')}"); SH=$(node tools/run.js simhash)
  if [ "$PG" != "$SH" ]; then node tools/run.js pages || { echo "REFUSED: a page test failed."; exit 1; }; fi;; esac
# GitHub shows the release title as a heading, so the notes must not start with their own "# " heading (it appeared twice in v0.38.1, v0.38.2 and v0.39)
sed '1{/^# /d}' "$REPO/docs/releases/$V.md" | sed '1{/^[[:space:]]*$/d}' > "$PARENT/release-notes-$V.md"; echo "release notes without a duplicate heading: $PARENT/release-notes-$V.md"
rm -f "$PARENT/village-sim-$V.zip"; (cd "$PARENT" && zip -rq "village-sim-$V.zip" village-sim -x "*.png" "village-sim/node_modules/*"); echo "zip: $PARENT/village-sim-$V.zip"
if [ -d "$REPO/.git" ]; then
  tar cf - --exclude=node_modules --exclude='*.png' . | (cd "$REPO" && tar xf -)
  cd "$REPO" && git add -A && git commit -q -m "$V: $MSG

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01EvsuWaMaRoMJQAB9iM4xPe" && git push -q origin main && git log --oneline | head -1
  # record the release commit (the file lives in the sim folder too, so the next release cannot overwrite the line), then push that as a follow-up
  SHA=$(git rev-parse --short HEAD); cd "$ROOT"; grep -q "^$V " tools/release-commits.txt || echo "$V $SHA" >> tools/release-commits.txt; cp tools/release-commits.txt "$REPO/tools/release-commits.txt"
  # close this release's issues and milestone, naming the commit
  for N in $(gh api "repos/Zaat/village-sim/issues?milestone=$MSN&state=open&per_page=100" --jq '.[].number'); do
    gh api --method POST repos/Zaat/village-sim/issues/$N/comments -f body="Shipped in $V (commit $SHA). Release page: https://github.com/Zaat/village-sim/blob/main/docs/releases/$V.md" >/dev/null
    gh api --method PATCH repos/Zaat/village-sim/issues/$N -f state=closed -f state_reason=completed >/dev/null
    gh api --method POST repos/Zaat/village-sim/issues/$N/labels -f 'labels[]=done' >/dev/null; done
  gh api --method PATCH repos/Zaat/village-sim/milestones/$MSN -f state=closed >/dev/null
  cd "$REPO" && git add -A && git commit -q -m "$V: record release commit

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01EvsuWaMaRoMJQAB9iM4xPe" && git push -q origin main
fi
