# DUNNAA — Logo Property (brief + prompts)

> Documento canônico para criar a **nova identidade visual** do app.  
> Direção: **original · simples · moderno · premium · beleza & bem-estar**

---

## 1. O que evitar (logo atual)

- Letra “D” genérica em ouro sobre fundo escuro (parecida com dezenas de apps)
- Wordmark pesado com gradiente metálico
- Ícones de tesoura/barbeiro literal (não escala para salão, estética, spa)
- Detalhes finos que somem em 48×48 px (ícone do celular)

---

## 2. Conceito recomendado — **“Marca viva”**

**Ideia:** um símbolo abstrato que sugere **agenda + cuidado + movimento**, sem desenhar objetos.

| Elemento | Significado |
|----------|-------------|
| Forma base | Círculo ou squircle suave (universal, app icon friendly) |
| Traço interno | Curva contínua que forma um “d” estilizado ou um check suave (confirmação de horário) |
| Personalidade | Minimalista, geométrico, confiável — não “luxo barroco” |

**Nome no logo:** preferir **DUNNAA** em sans geométrica (Plus Jakarta Sans ou similar), tracking leve (+2%), sem serifas.

---

## 3. Paleta (nova — ainda premium)

| Token | Hex | Uso |
|-------|-----|-----|
| Ink | `#0B1020` | Fundo app, splash, header escuro |
| Ink soft | `#151B2E` | Cards sobre fundo escuro |
| Gold | `#C9A84C` | Destaque principal (não amarelo neon) |
| Gold light | `#E8D5A3` | Hover, detalhes |
| Sand | `#F4F1EA` | Fundo claro alternativo |
| White | `#FFFFFF` | Texto sobre ink |

**Regra:** no máximo **2 cores** no símbolo (ink + gold). Sem gradientes complexos no ícone.

---

## 4. Entregáveis técnicos

| Asset | Tamanho | Formato | Notas |
|-------|---------|---------|-------|
| `logo-mark.svg` | vetor | SVG | Símbolo sozinho |
| `logo-full.svg` | vetor | SVG | Símbolo + DUNNAA |
| `icon.png` | 1024×1024 | PNG | Expo / App Store |
| `adaptive-icon.png` | 1024×1024 | PNG | Android (foreground, fundo `#0B1020`) |
| `favicon.png` | 48–512 | PNG | Web |
| `apple-touch-icon.png` | 180×180 | PNG | PWA iOS |
| `pwa-icon-192/512.png` | 192, 512 | PNG | Manifest |

**Safe area:** manter símbolo dentro de **80%** do centro (Android adaptive icon).

---

## 5. Prompts prontos (geração IA)

### 5.1 Ícone / app icon (prioridade)

```
Minimal modern app icon for a beauty and wellness booking brand called DUNNAA.
Abstract geometric symbol: soft squircle shape, deep navy background #0B1020,
single elegant continuous line forming a stylized lowercase "d" or soft check mark,
line color refined gold #C9A84C, flat design, no gradients, no shadows, no text,
no scissors, no salon clipart, ultra clean, Apple-style simplicity,
centered composition, high contrast, vector-like, 1024x1024.
```

### 5.2 Logo horizontal (símbolo + nome)

```
Horizontal logo lockup for "DUNNAA" beauty booking app.
Left: minimal abstract gold symbol on dark navy circle.
Right: wordmark DUNNAA in modern geometric sans-serif, white letters, generous spacing,
premium fintech-meets-wellness aesthetic, flat, no 3D, no metallic texture,
transparent background, suitable for website header.
```

### 5.3 Logo só wordmark (alternativa ultra simples)

```
Wordmark logo text "DUNNAA" only, custom modern sans-serif, white on transparent,
slightly rounded letterforms, double N as subtle mirror ligature,
minimal luxury brand, beauty tech startup, no icon, no tagline,
vector style, flat color.
```

### 5.4 Splash screen

```
Mobile app splash screen, solid background #0B1020,
centered minimal gold abstract mark (same as app icon), small white text DUNNAA below,
tagline "Beleza & bem-estar" in light gray, lots of negative space,
modern premium, no photos, no patterns.
```

### 5.5 Negativo (fundo claro)

```
Same abstract DUNNAA symbol, colors inverted: navy symbol on white background,
gold accent line inside symbol, flat minimal, app store marketing asset.
```

---

## 6. Prompt negativo (sempre incluir)

```
Avoid: scissors, razor, barber pole, emoji, clipart, photorealistic, 3D render,
heavy gradients, drop shadows, busy patterns, generic letter D with crown,
similar to Uber/Calendly/Apple logos, thin hairlines, text inside small icon.
```

---

## 7. Referências de estilo (mood, não copiar)

- **Calm + Linear + Notion** → simplicidade e confiança  
- **Headspace (versão flat)** → formas suaves  
- **Nubank (clareza geométrica)** → legível em pequeno  

---

## 8. Onde aplicar no monorepo (após aprovar arte)

| Pacote | Caminho |
|--------|---------|
| App cliente | `packages/app-customer/assets/icon.png`, `logo-d.png`, `splash-logo.png` |
| PWA | `packages/website/public/app/pwa-icon-*.png`, `apple-touch-icon.png` |
| Site | `packages/website/public/store/logo.svg`, `favicon.svg` |
| Pro Web | `packages/dunnaa-pro-web/public/brand/logo.svg` |
| Admin | `packages/web-admin/public/brand/logo.svg` |
| Build script | `scripts/build-customer-web.sh` (copia ícones PWA) |

Atualizar `packages/*/lib/brand.ts` se mudar caminhos.

---

## 9. Checklist de aprovação

- [ ] Legível em 48×48 px (home screen iPhone)
- [ ] Funciona em fundo escuro **e** claro
- [ ] Não parece “app de barbearia genérico”
- [ ] Parece marca única brasileira premium
- [ ] SVG com paths simples (< 20 paths)
- [ ] Acessível: contraste gold/ink ≥ 4.5:1 onde houver texto

---

## 10. Variante escolhida (preencher após teste)

| Campo | Valor |
|-------|-------|
| Conceito | _Marca viva — squircle + traço d/check_ |
| Prompt usado | _5.1 + 5.2_ |
| Ferramenta | _Midjourney / DALL·E / Figma / Cursor_ |
| Data | _2026-06-15_ |
| Aprovado por | _pendente_ |

---

_Assinatura de marca em comunicações: **DUNNAA** (cliente) · **DUNNAA Pro** (profissional)_
