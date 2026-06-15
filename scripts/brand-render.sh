#!/usr/bin/env bash
# Rasteriza os SVGs da marca DUNNAA (docs/brand) em PNGs e distribui para os pacotes.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
B="$ROOT/docs/brand"
PNG="$B/png"
mkdir -p "$PNG"

r() { rsvg-convert -w "$2" -h "$2" "$B/$1" -o "$PNG/$3"; }   # quadrado
rw() { rsvg-convert -w "$2" "$B/$1" -o "$PNG/$3"; }          # largura (lockup)

# Geracao via python (SVGs)
python3 "$ROOT/scripts/brand-assets.py"

# --- Marcas transparentes (variacoes de cor) ---
for c in gold white navy; do
  for s in 1024 512 256; do
    rsvg-convert -w "$s" -h "$s" "$B/dunnaa-mark-$c.svg" -o "$PNG/mark-$c-$s.png"
  done
done

# --- Lockups transparentes ---
rw dunnaa-logo-onlight.svg 1600 lockup-onlight-1600.png
rw dunnaa-logo-ondark.svg 1600 lockup-ondark-1600.png

# --- Icones de app ---
for s in 1024 512 192 180; do r dunnaa-icon-square.svg "$s" "icon-square-$s.png"; done
for s in 1024 512; do r dunnaa-icon-rounded.svg "$s" "icon-rounded-$s.png"; done
for s in 1024 512; do r dunnaa-adaptive-foreground.svg "$s" "adaptive-$s.png"; done

echo ">> PNGs gerados em $PNG"
ls -1 "$PNG"

# =========================================================
#  Distribuicao
# =========================================================
copy() { install -D -m644 "$1" "$2"; echo "  -> $2"; }

echo ">> app-customer/assets"
AC="$ROOT/packages/app-customer/assets"
copy "$PNG/icon-square-1024.png"  "$AC/icon.png"
copy "$PNG/adaptive-1024.png"     "$AC/adaptive-icon.png"
copy "$PNG/icon-square-512.png"   "$AC/favicon.png"
copy "$PNG/lockup-ondark-1600.png" "$AC/splash-logo.png"
copy "$PNG/mark-gold-1024.png"    "$AC/splash-icon.png"

echo ">> app-pro/assets"
AP="$ROOT/packages/app-pro/assets"
copy "$PNG/icon-square-1024.png"  "$AP/icon.png"
copy "$PNG/adaptive-1024.png"     "$AP/adaptive-icon.png"
copy "$PNG/icon-square-512.png"   "$AP/favicon.png"
copy "$PNG/lockup-ondark-1600.png" "$AP/splash-logo.png"

echo ">> website/public/store"
WS="$ROOT/packages/website/public/store"
copy "$B/dunnaa-logo-onlight.svg" "$WS/logo.svg"
copy "$B/dunnaa-logo-ondark.svg"  "$WS/logo-dark.svg"
copy "$B/dunnaa-mark-gold.svg"    "$WS/favicon.svg"

echo ">> web-admin/public/brand"
WA="$ROOT/packages/web-admin/public/brand"
copy "$B/dunnaa-logo-ondark.svg"  "$WA/logo.svg"
copy "$B/dunnaa-mark-gold.svg"     "$WA/favicon.svg"

echo ">> dunnaa-pro-web/public/brand"
WP="$ROOT/packages/dunnaa-pro-web/public/brand"
copy "$B/dunnaa-logo-onlight.svg" "$WP/logo.svg"
copy "$B/dunnaa-logo-ondark.svg"  "$WP/logo-dark.svg"
copy "$B/dunnaa-mark-gold.svg"     "$WP/favicon.svg"

echo ">> Concluido."
