#!/usr/bin/env bash
# Signs in as the local demo user exactly as the "Use local development account" link does
# (GET /login/demo). Prints the cookie jar path for curl -b.
set -euo pipefail
. "$(dirname "$0")/_common.sh"
load_state
JAR="$RUN_DIR/cookies.txt"
code=$(curl -sS -o /dev/null -w '%{http_code} %{redirect_url}' -c "$JAR" "$BASE/login/demo")
case "$code" in 307*/dashboard) echo "$JAR" ;; *) echo "demo login failed: $code" >&2; exit 1 ;; esac
