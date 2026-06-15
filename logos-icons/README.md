# Logos e ícones – Dunnaa

Pasta central para **splash**, **logos** e **ícones** usados em: **site**, **web-pro**, **app cliente**, **admin** e **app pro** (Expo).

---

## Análise por produto

### 1. App Cliente (Expo – `packages/app-customer`)

| Asset | Caminho referenciado | Estado atual | Uso |
|-------|----------------------|--------------|-----|
| **Ícone do app** | `./assets/icon.png` | ⚠️ Não existe (só fonts em `assets/`) | Ícone na home do celular |
| **Splash** | `./assets/splash-icon.png` | ⚠️ Não existe | Tela de abertura (backgroundColor: `#005F73`) |
| **Adaptive icon** | `./assets/adaptive-icon.png` | ⚠️ Não existe | Android (foreground) |
| **Favicon** | `./assets/favicon.png` | ⚠️ Não existe | Web/PWA |

**Tela de login:** hoje usa **texto “D”** em círculo + “DUNNAA” (sem imagem), alinhado ao conceito “minimalist D” das brand guidelines.

**Recomendações:**
- **Splash:** logo “D” centralizada, fundo `#005F73`, sem texto longo (resizeMode: contain).
- **Icon / Adaptive:** mesma “D” em versão quadrada; Android pode usar foreground transparente sobre `#005F73`.
- **Favicon:** 32×32 ou 48×48 PNG da “D”.

---

### 2. Dunnaa Pro Web (`packages/dunnaa-pro-web`)

| Asset | Onde aparece | Estado atual |
|-------|--------------|--------------|
| **Logo / marca** | Login, layout (sidebar), escolha, onboarding | **CSS:** div com “D” + texto “Dunnaa Pro” |
| **Favicon** | Aba do navegador | Padrão Next.js (não há favicon customizado) |

**Análise:** Não há imagens de logo; tudo é tipografia + forma com “D”. Para consistência com o app e o site, pode-se adotar:
- `public/logo.svg` ou `logo.png` – “D” ou logo completo.
- `public/favicon.ico` ou `favicon.png` – ícone da aba.

---

### 3. Web Admin (`packages/web-admin`)

| Asset | Onde aparece | Estado atual |
|-------|--------------|--------------|
| **Logo** | Login | **CSS:** “D” em gradiente (amber) + “DUNNAA” em texto |
| **Favicon** | Aba | Padrão Next.js |

**Análise:** Visual mais “admin” (amber/gold). Pode usar o mesmo monograma “D” em versão escura/amber ou um logo admin específico em `public/`.

---

### 4. Site institucional (`packages/website`)

| Asset | Onde aparece | Estado atual |
|-------|--------------|--------------|
| **Logo header** | Header | Texto “Dunnaa” com cor `#005f73` (sem imagem) |
| **Outros** | Footer, páginas | Nenhum asset de logo referenciado |

**Análise:** Só tipografia. Um `logo.svg` (horizontal: ícone “D” + “Dunnaa”) serviria para header e footer.

---

### 5. App Pro (Expo) – se existir pacote separado

Caso no futuro exista um app Pro em Expo (gestão no celular), seguir o mesmo padrão do **App Cliente**: `icon.png`, `splash-icon.png`, `adaptive-icon.png`, `favicon.png`, com a variante “D com estrela/badge” das brand guidelines.

---

## Especificações sugeridas (para criar/substituir imagens)

| Asset | Tamanho | Formato | Fundo / notas |
|-------|---------|---------|----------------|
| **App icon** | 1024×1024 px | PNG | Sem transparência para iOS; Android usa adaptive |
| **Splash** | 1284×2778 px (ou 1:1 centralizado) | PNG | Centralizado; fundo no app: `#005F73` |
| **Adaptive icon (foreground)** | 1024×1024 px | PNG | Centro ~66%; bordas transparentes |
| **Favicon** | 32×32, 48×48 | PNG/ICO | “D” legível em tamanho pequeno |
| **Logo site/Pro/Admin** | SVG ou PNG 2x | SVG preferível | Pode ser só “D” ou “D” + “Dunnaa” |

---

## Estrutura sugerida nesta pasta (`logos-icons/`)

```
logos-icons/
├── README.md                 (este arquivo)
├── shared/                   (uso em vários produtos)
│   ├── logo-d.svg            Monograma "D" (vetorial)
│   ├── logo-d-pro.svg        "D" com estrela/badge (Pro)
│   └── favicon.png           32×32 ou 48×48
├── app-customer/             (Expo app cliente)
│   ├── icon.png              1024×1024
│   ├── splash-icon.png       splash
│   ├── adaptive-icon.png     1024×1024 foreground
│   └── favicon.png
├── web-pro/                  (Dunnaa Pro Web)
│   ├── logo.svg
│   └── favicon.png
├── web-admin/                 (Admin)
│   ├── logo.svg
│   └── favicon.png
└── website/                   (Site institucional)
    ├── logo.svg              header/footer
    └── favicon.png
```

Ao adicionar imagens aqui, copie (ou gere via build) para os caminhos que cada app espera:
- **App cliente:** `packages/app-customer/assets/` (icon.png, splash-icon.png, adaptive-icon.png, favicon.png).
- **Web Pro / Admin / Website:** `packages/<pacote>/public/` (logo, favicon).

---

## Resumo da análise

| Produto      | Splash | Ícone app | Logo tela | Favicon | Observação |
|-------------|--------|-----------|-----------|---------|------------|
| App cliente | Referenciado, arquivo ausente | Idem | Texto “D” | Ausente | Completar `assets/` |
| Web Pro     | N/A    | N/A       | CSS “D”   | Padrão  | Opcional: logo + favicon em `public/` |
| Admin       | N/A    | N/A       | CSS “D”   | Padrão  | Idem |
| Site        | N/A    | N/A       | Texto     | Padrão  | Opcional: logo header em SVG |

**Brand guidelines:** Primary `#005F73`, monograma “D”; Customer = “D” minimalista; Pro = “D” com estrela/badge. Usar Plus Jakarta Sans quando houver texto no logo.

Quando você tiver as imagens em `logos-icons/` (por exemplo em `shared/` ou em cada subpasta), posso indicar os imports e caminhos exatos em cada projeto (app cliente, web-pro, admin, site).
