#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export PORT="${PORT:-3000}"
if [[ ! -d node_modules ]]; then
  npm install --omit=dev
fi
exec node server.js
