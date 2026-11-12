#!/usr/bin/env bash
# Usage: d1.sh "SELECT ..."   Read the local D1 database the dev server uses. JSON on stdout.
set -euo pipefail
. "$(dirname "$0")/_common.sh"
npx wrangler d1 execute csa-id --local --json --command "$1" 2>/dev/null
