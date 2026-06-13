#!/usr/bin/env bash
# Build APK local (Gradle) + publica no site
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="$ROOT/packages/app-customer"
APK_OUT="$APP_DIR/android/app/build/outputs/apk/release/app-release.apk"

export ANDROID_HOME="${ANDROID_HOME:-/opt/android-sdk}"
export JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/java-17-openjdk-amd64}"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

cd "$APP_DIR"

# expo-updates fica no node_modules da raiz do monorepo — quebra o build Kotlin
rm -rf "$ROOT/node_modules/expo-updates" "$ROOT/node_modules/expo-updates-interface" 2>/dev/null || true

echo ">> Instalando deps isoladas do app..."
npm ci --ignore-scripts 2>/dev/null || npm install --ignore-scripts

echo ">> Regenerando projeto Android..."
npx expo prebuild --platform android --clean --no-install

echo ">> Compilando APK release (pode levar 5–15 min na 1ª vez)..."
cd android
./gradlew assembleRelease --no-daemon

if [[ ! -f "$APK_OUT" ]]; then
  echo "Erro: APK não encontrado em $APK_OUT"
  exit 1
fi

bash "$ROOT/scripts/publish-apk-to-site.sh" "$APK_OUT"
