#!/bin/bash
# tools/check.sh quick|full [suite...]
#  quick: save + suites for the modules named (default: concerns, lives, stats, tech) + page test
#  full:  every suite (same list as release.sh)
# Usage: tools/check.sh quick            tools/check.sh quick regime_events strife_events      tools/check.sh full
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"
MODE="${1:-quick}"; shift
ALL="save bld regime_events strife_events living maps routes animals unreach outposts bridges lives_events stats_events tech_events concerns_events concerns_states livelihoods_events stats_legacy privacy_events research_limits discovery_events voices_events"
if [ "$MODE" = full ]; then S="$ALL"; elif [ $# -gt 0 ]; then S="save $*"; else S="save lives_events stats_events concerns_events concerns_states livelihoods_events stats_legacy privacy_events research_limits discovery_events voices_events"; fi
T0=$(date +%s); bad=0
for t in $S; do
  [ -f tests/$t.js ] || { echo "missing tests/$t.js"; bad=1; continue; }
  if ! node tests/$t.js > /tmp/chk_$t.log 2>&1; then echo "FAILED $t"; tail -15 /tmp/chk_$t.log; bad=1; else grep -E "passed|no errors|errors 0" /tmp/chk_$t.log | tail -1 | sed "s/^/$t: /"; fi
done
echo "checked in $(( $(date +%s) - T0 ))s"; exit $bad
