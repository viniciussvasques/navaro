#!/usr/bin/env bash
# Build APK local (Gradle) do DUNNAA Pro
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="$ROOT/packages/app-pro"
APK_OUT="$APP_DIR/android/app/build/outputs/apk/release/app-release.apk"

export ANDROID_HOME="${ANDROID_HOME:-/opt/android-sdk}"
export JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/java-17-openjdk-amd64}"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

cd "$APP_DIR"

rm -rf "$ROOT/node_modules/expo-updates" "$ROOT/node_modules/expo-updates-interface" 2>/dev/null || true

echo ">> Instalando deps isoladas do app Pro..."
npm ci --ignore-scripts 2>/dev/null || npm install --ignore-scripts

echo ">> Regenerando projeto Android..."
npx expo prebuild --platform android --clean --no-install

echo ">> Compilando APK release Pro (pode levar 5–15 min na 1ª vez)..."
cd android
./gradlew assembleRelease --no-daemon

if [[ ! -f "$APK_OUT" ]]; then
  echo "Erro: APK não encontrado em $APK_OUT"
  exit 1
fi

PRO_APK_DEST="$ROOT/packages/website/public/downloads/dunnaa-pro.apk"
mkdir -p "$(dirname "$PRO_APK_DEST")"
cp "$APK_OUT" "$PRO_APK_DEST"

echo ""
echo ">> APK Pro publicado em: $PRO_APK_DEST"
echo ">> URL: https://dunnaa.com.br/downloads/dunnaa-pro.apk"
