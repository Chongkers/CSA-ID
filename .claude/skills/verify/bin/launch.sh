#!/usr/bin/env bash
# Usage: launch.sh [port]   (default 3100)
# Installs deps if missing, applies local D1 migrations, starts `next dev`,
# waits until /login renders, and records the instance in .verify-runs/instance.env.
set -euo pipefail
. "$(dirname "$0")/_common.sh"
PORT="${1:-3100}"
mkdir -p "$RUNS"
if [ -f "$STATE" ]; then
  . "$STATE"
  if kill -0 "$PID" 2>/dev/null; then echo "refusing: instance already running (pid $PID, port $PORT). Use it, or run stop.sh." >&2; exit 1; fi
  rm -f "$STATE"
fi
if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then echo "refusing: port $PORT is taken by another process" >&2; exit 1; fi
if pgrep -f "$ROOT/node_modules/.bin/next dev|$ROOT/node_modules/next/dist" >/dev/null 2>&1; then
  echo "refusing: another next dev is running in this checkout (Next allows one per directory). Stop it or drive it instead." >&2; exit 1
fi
if [ ! -d node_modules/@opennextjs/cloudflare ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then npm ci; fi
npx wrangler d1 migrations apply csa-id --local >/dev/null
RUN_DIR="$RUNS/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$RUN_DIR"
nohup npx next dev -p "$PORT" >"$RUN_DIR/server.log" 2>&1 &
PID=$!
printf 'PID=%s\nPORT=%s\nRUN_DIR=%s\nBASE=http://localhost:%s\n' "$PID" "$PORT" "$RUN_DIR" "$PORT" >"$STATE"
for _ in $(seq 1 120); do
  kill -0 "$PID" 2>/dev/null || { echo "next dev exited; see $RUN_DIR/server.log" >&2; tail -20 "$RUN_DIR/server.log" >&2; rm -f "$STATE"; exit 1; }
  if curl -fsS "http://localhost:$PORT/login" 2>/dev/null | grep -q "Continue with Google"; then
    echo "ready: http://localhost:$PORT  pid=$PID  evidence=$RUN_DIR"; exit 0
  fi
  sleep 1
done
echo "not ready after 120s; see $RUN_DIR/server.log" >&2; exit 1
