#!/usr/bin/env bash
# Stops only the instance launch.sh started (its pid tree). Evidence in .verify-runs/<run>/ is kept.
set -uo pipefail
. "$(dirname "$0")/_common.sh"
[ -f "$STATE" ] || { echo "nothing to stop"; exit 0; }
. "$STATE"
PIDS=$(tree_pids "$PID" | tr '\n' ' ')
kill $PIDS 2>/dev/null
for _ in $(seq 1 10); do kill -0 "$PID" 2>/dev/null || break; sleep 1; done
kill -9 $PIDS 2>/dev/null
rm -f "$STATE"
echo "stopped pid tree: $PIDS"
echo "evidence kept: $RUN_DIR"
