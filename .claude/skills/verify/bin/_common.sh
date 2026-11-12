# Sourced by the other helpers. Resolves the repo root and the run state paths.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
RUNS="$ROOT/.verify-runs"
STATE="$RUNS/instance.env"
cd "$ROOT"
load_state() {
  [ -f "$STATE" ] || { echo "no instance: run .claude/skills/verify/bin/launch.sh first" >&2; exit 1; }
  # shellcheck disable=SC1090
  . "$STATE"
}
tree_pids() { # $1 = root pid; prints it and every descendant
  local p; echo "$1"; for p in $(pgrep -P "$1" 2>/dev/null); do tree_pids "$p"; done
}
