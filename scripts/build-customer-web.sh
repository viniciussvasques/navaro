#!/usr/bin/env bash
# Exporta app cliente (Expo Web + PWA) para packages/website/public/app/
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="$ROOT/packages/app-customer"
WEB_DIR="$ROOT/packages/website/public/app"
VERSION_MANIFEST="$WEB_DIR/version.json"
ICON_SRC="$APP_DIR/assets/icon.png"

export EXPO_PUBLIC_API_URL="${EXPO_PUBLIC_API_URL:-https://api.dunnaa.com.br}"
export EXPO_BASE_URL="${EXPO_BASE_URL:-/app}"

cd "$APP_DIR"

rm -rf "$APP_DIR/node_modules/react" "$APP_DIR/node_modules/react-dom" 2>/dev/null || true

echo ">> Exportando PWA (API=$EXPO_PUBLIC_API_URL, base=$EXPO_BASE_URL)..."
rm -rf dist

if [[ -f "$VERSION_MANIFEST" ]]; then
  cp "$VERSION_MANIFEST" /tmp/dunnaa-app-version.json
fi

npx expo export --platform web

mkdir -p "$WEB_DIR"
find "$WEB_DIR" -mindepth 1 ! -name 'version.json' -delete 2>/dev/null || true
cp -r dist/* "$WEB_DIR/"

if [[ -f /tmp/dunnaa-app-version.json ]]; then
  cp /tmp/dunnaa-app-version.json "$VERSION_MANIFEST"
fi

if [[ -f "$ICON_SRC" ]]; then
  cp "$ICON_SRC" "$WEB_DIR/pwa-icon-192.png"
  cp "$ICON_SRC" "$WEB_DIR/pwa-icon-512.png"
  cp "$ICON_SRC" "$WEB_DIR/apple-touch-icon.png"
fi

cat > "$WEB_DIR/manifest.json" <<'EOF'
{
  "id": "/app/",
  "name": "DUNNAA",
  "short_name": "DUNNAA",
  "description": "Agende barbearias, salões e estética pelo celular.",
  "start_url": "/app/",
  "scope": "/app/",
  "display": "standalone",
  "display_override": ["standalone", "minimal-ui", "browser"],
  "orientation": "portrait",
  "theme_color": "#005f73",
  "background_color": "#0a0a0a",
  "lang": "pt-BR",
  "icons": [
    {
      "src": "/app/pwa-icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/app/pwa-icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
EOF

ENTRY_FILE="$(ls "$WEB_DIR"/_expo/static/js/web/entry-*.js 2>/dev/null | head -1 || true)"
if [[ -n "$ENTRY_FILE" ]] && grep -q 'version="19\.2' "$ENTRY_FILE"; then
  echo "ERRO: bundle PWA contém React 19.2.x (instância duplicada)."
  exit 1
fi

node -e "
const fs = require('fs');
const indexPath = process.argv[1];
let html = fs.readFileSync(indexPath, 'utf8');
if (!html.includes('viewport-fit=cover')) {
  html = html.replace(
    /name=\"viewport\" content=\"[^\"]*\"/,
    'name=\"viewport\" content=\"width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover\"'
  );
}
const ensure = [
  ['manifest.json', '<link rel=\"manifest\" href=\"/app/manifest.json\" />'],
  ['apple-touch-icon.png', '<link rel=\"apple-touch-icon\" href=\"/app/apple-touch-icon.png\" />'],
  ['mobile-web-app-capable', '<meta name=\"mobile-web-app-capable\" content=\"yes\" />'],
  ['apple-mobile-web-app-capable', '<meta name=\"apple-mobile-web-app-capable\" content=\"yes\" />'],
  ['apple-mobile-web-app-title', '<meta name=\"apple-mobile-web-app-title\" content=\"DUNNAA\" />'],
  ['apple-mobile-web-app-status-bar-style', '<meta name=\"apple-mobile-web-app-status-bar-style\" content=\"black-translucent\" />'],
];
for (const [needle, tag] of ensure) {
  if (!html.includes(needle)) {
    html = html.replace('</head>', tag + '\\n</head>');
  }
}
fs.writeFileSync(indexPath, html);
" "$WEB_DIR/index.html"

echo ""
echo ">> PWA publicado em: $WEB_DIR"
if [[ -n "$ENTRY_FILE" ]]; then
  echo ">> Bundle: $(basename "$ENTRY_FILE")"
fi
echo ">> URL produção: https://dunnaa.com.br/app/"
