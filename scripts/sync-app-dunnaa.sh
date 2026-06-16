#!/usr/bin/env bash
# Sincroniza packages/app-customer -> github.com/innexardev/app-dunnaa
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/packages/app-customer"
DEST="${SYNC_DIR:-/tmp/app-dunnaa-sync}"
REMOTE="${APP_DUNNAA_REMOTE:-git@github.com-dunnaa:innexardev/app-dunnaa.git}"
BRANCH="${APP_DUNNAA_BRANCH:-main}"

if [[ ! -d "$SRC/app" ]]; then
  echo "ERRO: $SRC nao parece ser o app cliente."
  exit 1
fi

if [[ ! -d "$DEST/.git" ]]; then
  echo ">> Clonando $REMOTE ..."
  git clone "$REMOTE" "$DEST"
fi

echo ">> Rsync $SRC -> $DEST"
rsync -av --delete \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.expo' \
  --exclude='web-build' \
  --exclude='builds' \
  --exclude='android' \
  --exclude='ios' \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='expo-env.d.ts' \
  "$SRC/" "$DEST/"

cd "$DEST"
if git diff --quiet && [[ -z "$(git status --porcelain)" ]]; then
  echo ">> Nada a commitar — ja sincronizado."
  exit 0
fi

git add -A
git commit -m "${SYNC_MSG:-chore: sync from monorepo packages/app-customer}"

echo ">> Push $BRANCH ..."
git push origin "$BRANCH"
echo ">> OK: https://github.com/innexardev/app-dunnaa"
