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
rm -f "$PARENT/village-sim-$V.zip"; (cd "$PARENT" && zip -rq "village-sim-$V.zip" village-sim -x "*.png" "village-sim/node_modules/*"); echo "zip: $PARENT/village-sim-$V.zip"
if [ -d "$REPO/.git" ]; then
  tar cf - --exclude=node_modules --exclude='*.png' . | (cd "$REPO" && tar xf -)
  cd "$REPO" && git add -A && git commit -q -m "$V: $MSG

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01EvsuWaMaRoMJQAB9iM4xPe" && git push -q origin main && git log --oneline | head -1
fi
