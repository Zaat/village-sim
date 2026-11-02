#!/bin/bash
# Release helper: tools/release.sh v0.17 "commit message"
# Runs the headless regression tests, builds the zip, syncs the repo clone, commits and pushes.
# Publishing the artifact and sending the zip are done separately.
set -e
V="$1"; MSG="$2"; [ -z "$V" ] && { echo "usage: tools/release.sh vX.Y \"message\""; exit 1; }
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; PARENT="$(dirname "$ROOT")"; REPO="$PARENT/village-claudia"; cd "$ROOT"
for t in save bld regime_events strife_events living; do
  echo "== $t"; if ! node tests/$t.js > /tmp/rel_$t.log 2>&1; then echo "FAILED: $t"; tail -20 /tmp/rel_$t.log; exit 1; fi
  if grep -q "^DIFF" /tmp/rel_$t.log; then echo "DIFF in $t"; grep "^DIFF" /tmp/rel_$t.log; exit 1; fi
  grep -E "passed|no errors|errors 0" /tmp/rel_$t.log | tail -1
done
rm -f "$PARENT/village-sim-$V.zip"; (cd "$PARENT" && zip -rq "village-sim-$V.zip" village-sim -x "*.png" "village-sim/node_modules/*"); echo "zip: $PARENT/village-sim-$V.zip"
if [ -d "$REPO/.git" ]; then
  tar cf - --exclude=node_modules --exclude='*.png' . | (cd "$REPO" && tar xf -)
  cd "$REPO" && git add -A && git commit -q -m "$V: $MSG

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01EvsuWaMaRoMJQAB9iM4xPe" && git push -q origin main && git log --oneline | head -1
fi
