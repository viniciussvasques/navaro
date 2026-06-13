#!/usr/bin/env bash
# Gera APK do app cliente (EAS) e publica no site público + version.json
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="$ROOT/packages/app-customer"
WEB_DIR="$ROOT/packages/website"
DOWNLOADS_DIR="$WEB_DIR/public/downloads"
MANIFEST="$WEB_DIR/public/app/version.json"
APK_NAME="dunnaa-cliente.apk"
APK_DEST="$DOWNLOADS_DIR/$APK_NAME"

cd "$APP_DIR"

if [[ -z "${EXPO_TOKEN:-}" ]]; then
  echo "Erro: defina EXPO_TOKEN (conta Expo) para build na nuvem."
  echo "  export EXPO_TOKEN=seu_token"
  echo "  docs: https://docs.expo.dev/accounts/programmatic-access/"
  exit 1
fi

# Garante projeto EAS vinculado
if ! npx eas-cli project:info >/dev/null 2>&1; then
  echo "Vinculando projeto Expo (eas init)..."
  npx eas-cli init --non-interactive
fi

echo ">> Build Android APK (perfil preview)..."
BUILD_JSON="$(mktemp)"
npx eas-cli build -p android --profile preview --non-interactive --wait --json >"$BUILD_JSON"

ARTIFACT_URL="$(node -e "
  const fs = require('fs');
  const builds = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
  const build = Array.isArray(builds) ? builds[0] : builds;
  const url = build?.artifacts?.buildUrl || build?.artifacts?.applicationArchiveUrl;
  if (!url) { console.error('URL do APK não encontrada no build'); process.exit(1); }
  console.log(url);
" "$BUILD_JSON")"

mkdir -p "$DOWNLOADS_DIR"
echo ">> Baixando APK..."
curl -fsSL "$ARTIFACT_URL" -o "$APK_DEST"

bash "$ROOT/scripts/publish-apk-to-site.sh" "$APK_DEST"

rm -f "$BUILD_JSON"
