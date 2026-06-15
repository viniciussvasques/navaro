# Logos e ícones – Dunnaa

Pasta de **splash**, **logos** e **ícones** para: **site**, **web-pro**, **app cliente**, **admin** e **app pro**.

---

## Inventário e análise das imagens

| Arquivo | Descrição | Uso recomendado |
|---------|-----------|------------------|
| **logo-branco.png** | Logo completo (emblema D/M + wordmark "DUNNAA") em **branco** sobre fundo preto. Linhas geométricas, sans-serif bold. | **Splash** ou telas escuras (app cliente, admin). Header/footer em temas escuros. |
| **logo-preto.png** | Mesmo logo em **preto** sobre fundo branco. Emblema shield + "DUNNAA". | **Site**, **web-pro**, **admin** em tema claro. Header, login, impressão. |
| **icone -.png** | Ícone quadrado com cantos arredondados: emblema branco (D/M) em fundo escuro texturizado com **faixas douradas** e partículas. Visual premium. | **App icon** (cliente ou pro). Splash quando quiser destaque dourado. |
| **iconpro.png** | Ícone quadrado arredondado: emblema branco + texto **"PRO"** abaixo; fundo escuro com textura e **efeitos dourados**. | **Ícone do App Pro** ou **Web Pro** (favicon / PWA). |
| **splash-pro.png** | Splash vertical: logo branco central + texto **"DUNNAA PRO"**; fundo preto texturizado com **luz dourada** e partículas. | **Splash screen** do app Pro ou tela de abertura do Web Pro. |
| **dunnaa-splash.png** | Splash: emblema + "DUNNAA" em branco; fundo preto com **faixas douradas** à esquerda e partículas. Sem "PRO". | **Splash screen** do **app cliente** (Dunnaa para consumidor). |
| **logoprobranco.png** | Logo completo **"DUNNAA PRO"** em branco sobre preto. Emblema + wordmark, alto contraste, minimalista. | **Web Pro / Admin**: header, login, branding em tema escuro. |
| **ChatGPT Image 14 de fev... Edited.png** | Versão editada do logo: emblema angular (D/M ou D/N) + "DUNNAA" em branco sobre preto. | Alternativa de logo; pode servir para ícone ou splash. |

---

## Onde usar em cada produto

### App cliente (Expo – `packages/app-customer`)

| Asset no app | Arquivo sugerido em `packages/logos-icons` |
|--------------|--------------------------------------------|
| Splash | **dunnaa-splash.png** |
| Ícone (icon.png) | **icone -.png** (ou exportar só o emblema sem fundo para adaptive) |
| Adaptive icon (Android) | Mesmo emblema em PNG com transparência |
| Favicon (web) | Emblema pequeno ou **logo-branco.png** redimensionado |

**Nota:** O `app.json` do app cliente aponta para `./assets/icon.png`, `splash-icon.png`, etc. Copie ou gere a partir dos arquivos desta pasta para `packages/app-customer/assets/`.

---

### Web Pro (`packages/dunnaa-pro-web`)

| Uso | Arquivo sugerido |
|-----|------------------|
| Logo login / sidebar | **logoprobranco.png** ou **logo-preto.png** (conforme tema) |
| Favicon | **iconpro.png** redimensionado ou emblema isolado |
| Splash / tela de carregamento | **splash-pro.png** |

Coloque em `packages/dunnaa-pro-web/public/` (ex.: `logo.png`, `favicon.ico`).

---

### Web Admin (`packages/web-admin`)

| Uso | Arquivo sugerido |
|-----|------------------|
| Logo login / header | **logo-preto.png** (tema claro) ou **logo-branco.png** (tema escuro) |
| Favicon | Emblema pequeno ou **icone -.png** redimensionado |

Coloque em `packages/web-admin/public/`.

---

### Site institucional (`packages/website`)

| Uso | Arquivo sugerido |
|-----|------------------|
| Logo header / footer | **logo-preto.png** (header claro) |
| Favicon | Emblema ou **logo-preto.png** em 32×32 / 48×48 |

Coloque em `packages/website/public/`.

---

### App Pro (Expo – se existir)

| Asset | Arquivo sugerido |
|-------|------------------|
| Splash | **splash-pro.png** |
| Ícone | **iconpro.png** |
| Favicon | **iconpro.png** redimensionado |

---

## Resumo visual

- **Só “DUNNAA” (cliente):** `logo-branco.png`, `logo-preto.png`, `dunnaa-splash.png`, `icone -.png`.
- **“DUNNAA PRO”:** `logoprobranco.png`, `iconpro.png`, `splash-pro.png`.
- **Versão editada:** `ChatGPT Image 14 de fev... Edited.png` — uso opcional como alternativa de logo/ícone.

Todos os logos usam o **emblema D/M** (shield + letras estilizadas) e wordmark em sans-serif bold, alinhados às brand guidelines (Primary `#005F73`). As variantes com **dourado** (icone -, iconpro, splash-pro, dunnaa-splash) funcionam bem para splash e ícones de app.

---

## Sugestão de nome de arquivo

- **icone -.png** → considerar renomear para **icone-app.png** ou **icon-cliente.png** para evitar espaço e caractere estranho no nome.
