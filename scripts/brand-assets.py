#!/usr/bin/env python3
"""Gera os assets de marca DUNNAA a partir do simbolo vetorial + wordmark Plus Jakarta.

Saida: docs/brand/ (SVGs canonicos). PNGs sao rasterizados via rsvg-convert no shell.
"""
import os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = os.path.join(
    ROOT,
    "node_modules/@expo-google-fonts/plus-jakarta-sans/700Bold/PlusJakartaSans_700Bold.ttf",
)
OUT = os.path.join(ROOT, "docs/brand")

GOLD = "#C9A84C"
NAVY = "#0B1020"
WHITE = "#FFFFFF"

# --- Simbolo (mesma geometria do dunnaa-mark.svg, viewBox 0 0 128 128) ---
MARK_STROKE = 7
MARK_BODY = (
    '<circle cx="48" cy="78" r="22"/>'
    '<path d="M70 30 V86"/>'
    '<path d="M50 82 L72 104 L114 52"/>'
)


def mark_group(color, tx=0.0, ty=0.0, scale=1.0):
    return (
        f'<g transform="translate({tx},{ty}) scale({scale})" '
        f'stroke="{color}" stroke-width="{MARK_STROKE}" fill="none" '
        f'stroke-linecap="round" stroke-linejoin="round">{MARK_BODY}</g>'
    )


def wordmark_path(text, color, tracking_em=0.02):
    """Retorna (path_svg, largura_em, ascent_em, descent_em) em unidades de em=1."""
    font = TTFont(FONT)
    upm = font["head"].unitsPerEm
    cmap = font.getBestCmap()
    glyf = font.getGlyphSet()
    hmtx = font["hmtx"]

    parts = []
    x = 0.0
    tracking = tracking_em * upm
    for ch in text:
        gname = cmap[ord(ch)]
        pen = SVGPathPen(glyf)
        glyf[gname].draw(pen)
        d = pen.getCommands()
        adv = hmtx[gname][0]
        if d:
            parts.append(f'<path transform="translate({x},0)" d="{d}"/>')
        x += adv + tracking
    total_w = (x - tracking) / upm
    cap = font["OS/2"].sCapHeight if hasattr(font["OS/2"], "sCapHeight") else 0.7 * upm
    # grupo com flip Y (font sobe, svg desce) e escala 1/upm
    g = (
        f'<g fill="{color}" transform="scale({1.0/upm},{-1.0/upm})">'
        + "".join(parts)
        + "</g>"
    )
    return g, total_w, cap / upm


def build_lockup(text_color, filename):
    cap_px = 64.0  # altura visual das maiusculas
    _, word_w_em, cap_em = wordmark_path("DUNNAA", text_color)
    word_scale = cap_px / cap_em
    word_w = word_w_em * word_scale

    mark_h = 104.0
    mark_scale = mark_h / 128.0
    mark_w = 128.0 * mark_scale

    gap = 26.0
    pad = 8.0
    total_w = pad + mark_w + gap + word_w + pad
    total_h = mark_h + 2 * pad

    word_x = pad + mark_w + gap
    baseline_y = pad + (mark_h + cap_px) / 2.0

    word_g = wordmark_scaled("DUNNAA", text_color, word_scale)
    svg = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{total_w:.1f}" height="{total_h:.1f}" '
        f'viewBox="0 0 {total_w:.1f} {total_h:.1f}" fill="none" role="img" aria-label="DUNNAA">\n'
        f"  {mark_group(GOLD, tx=pad, ty=pad, scale=mark_scale)}\n"
        f'  <g transform="translate({word_x:.2f},{baseline_y:.2f})">{word_g}</g>\n'
        "</svg>\n"
    )
    with open(os.path.join(OUT, filename), "w", encoding="utf-8") as f:
        f.write(svg)
    return total_w, total_h


def wordmark_scaled(text, color, scale, tracking_em=0.02):
    font = TTFont(FONT)
    upm = font["head"].unitsPerEm
    cmap = font.getBestCmap()
    glyf = font.getGlyphSet()
    hmtx = font["hmtx"]
    parts = []
    x = 0.0
    tracking = tracking_em * upm
    for ch in text:
        gname = cmap[ord(ch)]
        pen = SVGPathPen(glyf)
        glyf[gname].draw(pen)
        d = pen.getCommands()
        adv = hmtx[gname][0]
        if d:
            parts.append(f'<path transform="translate({x},0)" d="{d}"/>')
        x += adv + tracking
    s = scale / upm
    return (
        f'<g fill="{color}" transform="scale({s:.6f},{-s:.6f})">' + "".join(parts) + "</g>"
    )


def build_mark(color, filename):
    svg = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" '
        'viewBox="0 0 128 128" fill="none" role="img" aria-label="DUNNAA">\n'
        f'  <g stroke="{color}" stroke-width="{MARK_STROKE}" stroke-linecap="round" '
        f'stroke-linejoin="round">{MARK_BODY}</g>\n'
        "</svg>\n"
    )
    with open(os.path.join(OUT, filename), "w", encoding="utf-8") as f:
        f.write(svg)


# Centro/dimensoes do bbox visual do simbolo (viewBox 128)
MARK_CX, MARK_CY = 71.75, 67.0
MARK_W, MARK_H = 91.5, 81.0


def centered_mark(color, canvas=1024, content_ratio=0.58):
    scale = (canvas * content_ratio) / max(MARK_W, MARK_H)
    tx = canvas / 2 - MARK_CX * scale
    ty = canvas / 2 - MARK_CY * scale
    return (
        f'  <g transform="translate({tx:.2f},{ty:.2f}) scale({scale:.4f})" '
        f'stroke="{color}" stroke-width="{MARK_STROKE}" fill="none" '
        f'stroke-linecap="round" stroke-linejoin="round">{MARK_BODY}</g>\n'
    )


def build_icon(filename, bg=NAVY, fg=GOLD, radius=0, content_ratio=0.58):
    rect = (
        f'  <rect width="1024" height="1024" rx="{radius}" fill="{bg}"/>\n'
        if bg
        else ""
    )
    svg = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" '
        'viewBox="0 0 1024 1024" fill="none">\n'
        + rect
        + centered_mark(fg, 1024, content_ratio)
        + "</svg>\n"
    )
    with open(os.path.join(OUT, filename), "w", encoding="utf-8") as f:
        f.write(svg)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    build_mark(GOLD, "dunnaa-mark-gold.svg")
    build_mark(WHITE, "dunnaa-mark-white.svg")
    build_mark(NAVY, "dunnaa-mark-navy.svg")
    w1, h1 = build_lockup(NAVY, "dunnaa-logo-onlight.svg")
    w2, h2 = build_lockup(WHITE, "dunnaa-logo-ondark.svg")
    build_icon("dunnaa-icon-square.svg", bg=NAVY, fg=GOLD, radius=0)
    build_icon("dunnaa-icon-rounded.svg", bg=NAVY, fg=GOLD, radius=224)
    build_icon("dunnaa-adaptive-foreground.svg", bg=None, fg=GOLD, content_ratio=0.50)
    print(f"lockup onlight {w1:.0f}x{h1:.0f} | ondark {w2:.0f}x{h2:.0f}")
    print("OK ->", OUT)
