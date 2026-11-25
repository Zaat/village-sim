#!/bin/bash
# usage: tools/covbatch.sh YEARS "SEED MAP H" "SEED MAP H" ...   runs the jobs two at a time in the background (nohup setsid), logs in logs/cov_*.log
cd "$(dirname "$0")/.."; Y=$1; shift; mkdir -p logs
i=0; for job in "$@"; do set -- $job; ( node tools/coverage.js run $1 $2 $Y $3 > logs/cov_$1_$2_h$3.log 2>&1 ) & i=$((i+1)); if [ $((i%2)) -eq 0 ]; then wait; fi; done; wait
