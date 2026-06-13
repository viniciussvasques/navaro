#!/usr/bin/env bash
# Incrementa versionCode no app.json e publica nova versão (build + site)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_JSON="$ROOT/packages/app-customer/app.json"

CURRENT="$(node -e "console.log(require('$APP_JSON').expo.android.versionCode || 1)")"
NEXT=$((CURRENT + 1))

node -e "
  const fs = require('fs');
  const path = '$APP_JSON';
  const data = JSON.parse(fs.readFileSync(path, 'utf8'));
  data.expo.android.versionCode = $NEXT;
  fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
"

echo "versionCode: $CURRENT -> $NEXT"
RELEASE_NOTES="${1:-Melhorias e correções no app DUNNAA.}" \
  bash "$ROOT/scripts/publish-customer-apk.sh"
