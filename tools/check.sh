#!/bin/bash
# tools/check.sh [quick|full|pages|hash|suite...] [--bail]
#  (none)/quick  only the suites the changed files can affect since the last full green run (UI-only edits need none)
#  full          every node suite, two at a time; writes the green stamp when everything passes
#  pages         browser page tests (playwright); run before every x.y release
#  suite names   just those suites, e.g.  tools/check.sh regime_events strife_events
exec node "$(cd "$(dirname "$0")" && pwd)/run.js" "$@"
