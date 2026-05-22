# ![Icona](icons/icon-48.png) Resumir contingut

Extensió de navegador que resumeix pàgines web amb **Google Gemini AI** — sense fer seguiment, sense telemetria, sense dades que pugin al núvol.

[![Disponible a Firefox Add-ons](https://img.shields.io/badge/Firefox-Descarregar-FF7139?logo=firefox-browser)](https://addons.mozilla.org/firefox/addon/resumir-contingut)
[![Disponible a Chrome Web Store](https://img.shields.io/badge/Chrome-Pròximament-4285F4?logo=googlechrome)](#)
[![Llicència MPL-2.0](https://img.shields.io/badge/Llicència-MPL--2.0-blue)](LICENSE)
[![CI](https://github.com/xxxaau/extensio-resumir-contingut/actions/workflows/ci.yml/badge.svg)](https://github.com/xxxaau/extensio-resumir-contingut/actions/workflows/ci.yml)

---

## Funcionalitats

- **Resum amb IA** — un sol clic per obtenir un resum estructurat de qualsevol pàgina
- **YouTube i Hacker News** — extracció intel·ligent de transcripcions i fils de comentaris
  - Transcripcions YouTube amb 3 vies de fallback (`baseUrl` directe, variants `timedtext` json3/srv3/cru, `youtubei/v1/get_transcript`) per a vídeos amb subtítols automàtics
- **Mapa conceptual interactiu** — visualització jeràrquica del resum en estil pill (NotebookLM)
  - Vista al sidebar i en pantalla completa, idèntiques als 4 temes
  - Pan, zoom, plegat/desplegat de branques, exportació a PNG
  - Renderitzador SVG natiu propi (zero dependències de tercers, ~22 KB)
- **Lectura biònica** — mode de lectura ràpida amb nivell de fixació configurable
- **Exporta a Markdown** — copia directament o envia a [Obsidian](https://obsidian.md)
- **Múltiples temes** — sistema, clar, fosc, solarized, gris
- **Estadístiques d'ús** — seguiment de tokens i velocitat de generació
- **Privadesa total** — tot s'executa en local; cap servidor propi, cap seguiment

---

## Instal·lació

### Firefox

**Via Mozilla Add-ons** (recomanat):
1. Visita [addons.mozilla.org/firefox/addon/resumir-contingut](https://addons.mozilla.org/firefox/addon/resumir-contingut/)
2. Clica «Afegir a Firefox»

**Per a desenvolupament** (temporal):
1. Clona el repo: `git clone https://github.com/xxxaau/extensio-resumir-contingut.git`
2. Obre `about:debugging#/runtime/this-firefox`
3. Clica «Carrega complement temporal» i selecciona `manifest.json`

### Chrome / Edge / Brave

**Via Chrome Web Store** (pròximament disponible):

**Per a desenvolupament** (temporal):
1. Clona el repo: `git clone https://github.com/xxxaau/extensio-resumir-contingut.git`
2. Obre `chrome://extensions` i activa el «Mode de desenvolupador»
3. Clica «Carrega extensió desempaquetada» i selecciona la carpeta del repo

---

## Configuració

1. Obre la barra lateral o vés a **Extensions › Resumir contingut › Opcions**
2. Enganxa la teva **API Key de Google Gemini** (gratuïta a [aistudio.google.com](https://aistudio.google.com/app/apikey))
3. Desa els canvis i comença a resumir

---

## Arquitectura

```
manifest.base.json          # Configuració MV3 compartida (Firefox + Chromium)
ext.js                      # Wrapper cross-browser (Firefox ↔ Chromium)
background.js               # Service worker i menú contextual
sidebar/
  sidebar.js                # Orquestrador principal
  summary.js                # Lògica de generació
  api.js                    # Client de streaming Gemini (SSE)
  content.js                # Extracció de text (YouTube amb 3 vies, HN, Readability)
  cache.js                  # Caché local i estadístiques
  history.js                # Historial de resums
  markmap-native.js         # Renderitzador SVG natiu del mapa conceptual
  conceptmap.js             # Orquestrador del mapa (sidebar + fullscreen)
  conceptmap-filename.js    # Generador del nom de fitxer PNG (funció pura)
options/                    # Pàgina de configuració
shared/                     # Models i valors per defecte compartits
tests/                      # 222 tests unitaris i d'integració
```

Consulta [docs/PROJECT-STRUCTURE.md](docs/PROJECT-STRUCTURE.md) per a mapa de projectes, [docs/MODELS-WORKFLOW.md](docs/MODELS-WORKFLOW.md) per a detalls tècnics d'API i models, o [docs/CONCEPTMAP-FEATURES.md](docs/CONCEPTMAP-FEATURES.md) per al disseny del mapa conceptual.

---

## Desenvolupament

```bash
# Executar els tests
npm test

# Compilar per a tots els navegadors
npm run build

# Verificació completa pre-release (lint + tests + manifests)
npm run prerelease

# Activar mode desenvolupament (icones DEV)
npm run dev

# Tornar a mode producció
npm run prod
```

---

## Privadesa i seguretat

- **Sense seguiment**: l'API key, les preferències i la caché es guarden en local
- **Sense telemetria**: l'extensió només crida a l'API de Google Gemini
- **Permisos mínims**: `<all_urls>` és opcional i es demana en temps d'execució
- **Seguretat**: CSP restrictiva, protecció SSRF, permisos mínims necessaris

Llegeix la [Política de privadesa](docs/PRIVACY_POLICY.md) per a més detalls.

---

## Contribucions

Les contribucions són benvingudes. Llegeix [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) per saber com participar.

---

## Llicència

[Mozilla Public License 2.0 (MPL-2.0)](LICENSE)

---

Fet amb ❤️ a Banyoles
