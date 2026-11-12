#!/usr/bin/env bash
# Read-only: is the recorded instance worth driving?
set -uo pipefail
. "$(dirname "$0")/_common.sh"
load_state
ok=0
check() { if eval "$2" >/dev/null 2>&1; then echo "ok   $1"; else echo "FAIL $1"; ok=1; fi; }
check "process $PID alive" "kill -0 $PID"
LISTENER=$(lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null | head -1)
OURS=" $(tree_pids "$PID" | tr '\n' ' ')"
check "port $PORT owned by our process tree (listener ${LISTENER:-none})" "[[ '$OURS' == *' ${LISTENER:-x} '* ]]"
check "GET /login renders the sign-in page" "curl -fsS $BASE/login | grep -q 'Continue with Google'"
check "dev-only demo login is mounted (NODE_ENV=development)" "curl -fsS $BASE/login | grep -q 'Use local development account'"
check "local D1 has no pending migrations" "npx wrangler d1 migrations list csa-id --local 2>&1 | grep -q 'No migrations to apply'"
echo "build: $(git rev-parse --short HEAD)$(git diff --quiet || echo ' +uncommitted')  evidence: $RUN_DIR"
exit $ok
