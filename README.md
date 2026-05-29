# ![Icona](icons/icon-48.png) Resumir

Extensió de navegador que resumeix pàgines web amb **Google Gemini AI** — sense fer seguiment, sense telemetria, sense dades que pugin al núvol.

[![Disponible a Firefox Add-ons](https://img.shields.io/badge/Firefox-Descarregar-FF7139?logo=firefox-browser)](https://addons.mozilla.org/firefox/addon/resumir-contingut)
[![Baixar de GitHub Releases](https://img.shields.io/badge/Chrome-Descarregar-4285F4?logo=googlechrome)](https://github.com/xxxaau/extensio-resumir-contingut/releases)
[![Llicència MPL-2.0](https://img.shields.io/badge/Llicència-MPL--2.0-blue)](LICENSE)
[![CI](https://github.com/xxxaau/extensio-resumir-contingut/actions/workflows/ci.yml/badge.svg)](https://github.com/xxxaau/extensio-resumir-contingut/actions/workflows/ci.yml)

---

## Funcionalitats

- **Resum amb IA** — un sol clic per obtenir un resum estructurat de qualsevol pàgina
- **YouTube i Hacker News** — extracció intel·ligent de transcripcions i fils de comentaris
  - Transcripcions YouTube amb 3 vies de fallback (`baseUrl` directe, variants `timedtext` json3/srv3/cru, `youtubei/v1/get_transcript`) per a vídeos amb subtítols automàtics
- **PDFs amb capa de text** — resum de PDFs HTTPS remots (descàrrega automàtica) i locals (`file://`/HTTP via botó "Selecciona PDF local"). Detecció per extensió o `Content-Type`. PDFs escanejats no suportats (cal OCR).
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

L'extensió es distribueix **exclusivament** via Mozilla Add-ons:

1. Visita [addons.mozilla.org/firefox/addon/resumir-contingut](https://addons.mozilla.org/firefox/addon/resumir-contingut/)
2. Fes clic a «Afegir a Firefox»

> **Per a desenvolupament:** obre `about:debugging#/runtime/this-firefox`, clica «Carrega complement temporal» i selecciona `manifest.json`.

### Chrome / Edge / Brave

L'extensió **no està al Chrome Web Store**. Per instal·lar-la:

1. Ves a la secció **Releases** del GitHub:
   https://github.com/xxxaau/extensio-resumir-contingut/releases
2. Baixa el fitxer `resumir-contingut-vX.X.X-chromium.zip` de l'última versió
3. Descomprimeix-lo en una carpeta
4. Obre `chrome://extensions` i activa el «Mode de desenvolupador»
5. Fes clic a «Carrega extensió desempaquetada» i selecciona la carpeta

> **Consell:** Després de cada actualització, repeteix el procés amb el nou ZIP. Les dades (clau API, historial, preferències) es conserven.

---

## Configuració

1. Obre la barra lateral o vés a **Extensions › Resumir › Opcions**
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
tests/                      # 233 tests unitaris i d'integració
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

Les contribucions són benvingudes! Consulta:

- [Guia de contribució](docs/CONTRIBUTING.md) — com començar
- [Codi de conducta](docs/CODE_OF_CONDUCT.md) — normes de la comunitat
- [Backlog de millores](docs/BACKLOG.md) — funcionalitats pendents
- [Issues](https://github.com/xxxaau/extensio-resumir-contingut/issues) — reporta bugs o demana funcionalitats
- [Discussions](https://github.com/xxxaau/extensio-resumir-contingut/discussions) — preguntes generals

## Reportar bugs

Si trobes un error, obre una [issue](https://github.com/xxxaau/extensio-resumir-contingut/issues/new/choose)
i inclou: navegador/versió, passos per reproduir, comportament real vs. esperat.

---

## Llicència

[Mozilla Public License 2.0 (MPL-2.0)](LICENSE)

---

Fet amb ❤️ a Banyoles
