#!/bin/sh
set -e
if [ ! -d node_modules/.pnpm ] || [ ! -f node_modules/next/package.json ]; then
  echo "Installing dependencies..."
  CI=true pnpm install
fi
exec "$@"
