# ![Icona](icons/icon-48.png) Resumir contingut

Extensió de navegador que resumeix pàgines web amb **Google Gemini AI** — sense fer seguiment, sense telemetria, sense dades que pugin al núvol.

[![Download for Firefox](https://img.shields.io/badge/Firefox-Download-FF7139?logo=firefox-browser)](https://addons.mozilla.org/firefox/addon/resumir-contingut)
[![Download for Chrome](https://img.shields.io/badge/Chrome-Download-4285F4?logo=googlechrome)](https://chromewebstore.google.com)
[![License MPL-2.0](https://img.shields.io/badge/License-MPL--2.0-blue)](LICENSE)

---

## Features

- **Resumeix amb IA** — un sol clic per obtenir un resum estructurat
- **YouTube i Hacker News** — extracció intel·ligent de transcripcions i comentaris
- **Lectura biònica** — mode de lectura ràpida amb fixació configurable
- **Exporta a Markdown** — copia directa o envia a Obsidian
- **Múltiples temes** — sistema, clar, fosc, solarized, gris
- **Estadístiques** — seguiment de tokens i velocitat
- **Privadesa completa** — tot local, cap servidor, cap seguiment

---

## Installation

### Firefox

1. **Via Mozilla Add-ons** (recomanat):
   - Visita [addons.mozilla.org](https://addons.mozilla.org/firefox/addon/resumir-contingut/)
   - Clica «Afegir a Firefox»

2. **Per desenvolupament** (temporal):
   - Clona el repo: `git clone https://github.com/xxxaau/extensio-resumir-contingut.git`
   - Obre `about:debugging#/runtime/this-firefox`
   - Clica «Carrega complemento temporal» i selecciona `manifest.json`

### Chrome / Edge / Brave

1. **Via Chrome Web Store** (pròximament):
   - Enllaç disponible a breus
   
2. **Per desenvolupament** (temporal):
   - Clona el repo: `git clone https://github.com/xxxaau/extensio-resumir-contingut.git`
   - Obre `chrome://extensions` i activa «Mode de desenvolupador»
   - Clica «Carrega extensió no empaquetada» i selecciona la carpeta del repo

---

## Setup

1. Obri la barra lateral o vés a **Extensions > Resumir contingut > Configuració**
2. Enganxa la teva **API Key de Google Gemini** (gratis a [aistudio.google.com](https://aistudio.google.com/app/apikey))
3. Desa els canvis i comença a resumir

---

## Architecture

```
manifest.json               # Configuració MV3
ext.js                     # Cross-browser wrapper (Firefox ↔ Chromium)
background.js              # Service worker, context menu
sidebar/                   # Main UI (HTML + CSS + JS modules)
  sidebar.js               # Orchestrator
  summary.js               # Generation logic
  api.js                   # Gemini streaming client
  content.js               # Text extraction (YouTube, HN, Readability)
  cache.js                 # Local cache + stats
options/                   # Settings page
tests/                     # Unit tests (160/160 passing)
```

---

## Development

```bash
# Run tests
npm test

# Build for all browsers
npm run build

# Check code quality (lint + tests)
npm run prerelease

# Switch to dev mode
npm run dev

# Switch to production mode
npm run prod
```

See [CLAUDE.md](CLAUDE.md) for detailed architecture and build commands.

---

## Privacy & Security

- **No tracking**: All data stays local (API key, preferences, cache)
- **No telemetry**: Only calls Google Gemini API (no third-party servers)
- **No permissions abuse**: `<all_urls>` is optional (requested at runtime)
- **Security first**: CSP, SSRF protection, minimal permissions

---

## Contributing

1. Fork this repo
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -m "Add my feature"`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

---

## License

[Mozilla Public License 2.0 (MPL-2.0)](LICENSE)

---

Made with ❤️ in Banyoles
