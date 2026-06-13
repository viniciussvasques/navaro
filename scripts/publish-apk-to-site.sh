#!/usr/bin/env bash
# Publica APK + version.json no site — SEM reiniciar container (arquivos estáticos em public/)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB_DIR="$ROOT/packages/website"
DOWNLOADS_DIR="$WEB_DIR/public/downloads"
MANIFEST="$WEB_DIR/public/app/version.json"
APK_NAME="dunnaa-cliente.apk"
APK_DEST="$DOWNLOADS_DIR/$APK_NAME"

APK_SOURCE="${1:-}"
VERSION="${2:-}"
VERSION_CODE="${3:-}"
NOTES="${RELEASE_NOTES:-Atualização do app DUNNAA.}"

if [[ -z "$APK_SOURCE" || ! -f "$APK_SOURCE" ]]; then
  echo "Uso: publish-apk-to-site.sh <caminho-do.apk> [version] [versionCode]"
  echo "Ex.: bash scripts/publish-apk-to-site.sh packages/app-customer/android/app/build/outputs/apk/release/app-release.apk"
  exit 1
fi

APP_JSON="$ROOT/packages/app-customer/app.json"
if [[ -z "$VERSION" ]]; then
  VERSION="$(node -e "console.log(require('$APP_JSON').expo.version)")"
fi
if [[ -z "$VERSION_CODE" ]]; then
  VERSION_CODE="$(node -e "console.log(require('$APP_JSON').expo.android.versionCode || 1)")"
fi

mkdir -p "$DOWNLOADS_DIR" "$(dirname "$MANIFEST")"
cp "$APK_SOURCE" "$APK_DEST"

node -e "
  const fs = require('fs');
  const manifest = {
    version: process.argv[1],
    versionCode: Number(process.argv[2]),
    apkUrl: 'https://dunnaa.com.br/downloads/$APK_NAME',
    releaseNotes: process.argv[3],
    mandatory: false,
    publishedAt: new Date().toISOString(),
  };
  fs.writeFileSync(process.argv[4], JSON.stringify(manifest, null, 2) + '\n');
" "$VERSION" "$VERSION_CODE" "$NOTES" "$MANIFEST"

APK_SIZE="$(du -h "$APK_DEST" | cut -f1)"
echo ">> Publicado (sem restart necessário):"
echo "   APK:  $APK_DEST ($APK_SIZE)"
echo "   JSON: $MANIFEST"
echo "   URL:  https://dunnaa.com.br/downloads/$APK_NAME"
echo ""
echo "O site usa volume Docker em public/ — disponível imediatamente."
