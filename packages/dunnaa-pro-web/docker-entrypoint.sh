#!/bin/sh
set -e
if [ ! -d node_modules/.pnpm ] || [ ! -f node_modules/next/package.json ]; then
  echo "Installing dependencies..."
  pnpm install --no-frozen-lockfile
fi
exec "$@"
