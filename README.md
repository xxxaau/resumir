# ![Icona](icons/icon-48.png) Resumir contingut

> Extensió de navegador que resumeix pàgines web amb Intel·ligència Artificial (Google Gemini).

[![Mozilla License](https://img.shields.io/badge/license-MPL--2.0-blue)](LICENSE)
[![Firefox](https://img.shields.io/badge/Firefox-MV3-ff7139?logo=firefox-browser)](https://www.mozilla.org/firefox/)
[![Chromium](https://img.shields.io/badge/Chromium-Natiu-4285F4?logo=googlechrome)](#compatibilitat)

---

## Funcionalitats

| Funció | Descripció |
| --- | --- |
| **Resum amb IA** | Genera resums estructurats de qualsevol pàgina amb un sol clic |
| **Validació científica** | Verifica afirmacions amb rigor acadèmic i referències reals |
| **Aprofundiment (Deep Dive)** | Anàlisi detallada amb arguments i evidències |
| **YouTube i Hacker News** | Extracció intel·ligent de transcripcions i comentaris |
| **Lectura biònica** | Mode de lectura ràpida amb fixació configurable |
| **Exportació Markdown** | Copia els resums amb plantilles personalitzables |
| **Integració Obsidian** | Envia resums directament a la teva vault |
| **Temes** | 5 temes visuals (sistema, clar, fosc, solarized, gris) |
| **Estadístiques** | Tauler amb historial, tokens consumits i velocitat |
| **Streaming** | Resposta en temps real (SSE) amb timer de generació |
| **Sistema de plugins** | Activa, desactiva i reordena funcionalitats a voluntat |

---

## Captura de pantalla

> *Afegir aquí captures o GIF de demostració.*

---

## Requisits

- **Navegador**: Firefox 115+ o qualsevol navegador basat en Chromium (Chrome, Edge, Brave, Vivaldi, etc.)
- **API Key**: Google Gemini (gratuïta) → [Obtenir-la a Google AI Studio](https://aistudio.google.com/app/apikey)

---

## Instal·lació

### Firefox (temporal, per a desenvolupament)

```text
1. Clona el repositori:       git clone https://github.com/xxxaau/extensio-resumir-contingut.git
2. Obre Firefox:              about:debugging#/runtime/this-firefox
3. Clic «Load Temporary Add-on» → selecciona manifest.json
```

### Firefox (permanent)

**Opció A — Firefox Developer Edition** (sense signar):

1. `about:config` → `xpinstall.signatures.required` = `false`
2. Empaqueta en `.xpi` i arrossega al navegador

**Opció B — Signatura privada** (recomanat):

1. Puja el `.zip` a [addons.mozilla.org/developers](https://addons.mozilla.org/developers/)
2. Selecciona «On my own» → descarrega el `.xpi` signat

---

## Configuració inicial

1. Obre la barra lateral o vés a **Extensions > Resumir contingut > Configuració**
2. Enganxa la teva **Google Gemini API Key** al camp corresponent
3. Desa els canvis

---

## Arquitectura

```text
├── manifest.json          # Configuració MV3
├── ext.js                 # Wrapper cross-browser (Firefox ↔ Chromium)
├── background.js          # Service worker / menú contextual
├── theme.js               # Gestió de temes (sincronitzada)
├── Readability.js         # Parser de contingut (Mozilla)
│
├── sidebar/               # Barra lateral principal
│   ├── sidebar.html       #   Layout + toolbar
│   ├── sidebar.css        #   Estils (5 temes, CSS custom properties)
│   ├── sidebar.js         #   Orquestrador (init, events, wiring)
│   ├── summary.js         #   Lògica de generació + gestió d'errors
│   ├── api.js             #   Client Gemini (streaming SSE)
│   ├── content.js         #   Extracció de text (YouTube, HN, Readability)
│   ├── cache.js           #   Memòria cau local + estadístiques
│   ├── stats.js           #   Seguiment de quota diària + consum d'aigua
│   ├── ui.js              #   Renderitzador DOM + visibilitat de plugins
│   └── utils.js           #   Helpers (Obsidian path, Markdown, tokens)
│
├── options/               # Pàgina de configuració
│   ├── settings.html      #   UI completa (tabs, formularis)
│   ├── settings.css       #   Estils (5 temes)
│   └── settings.js        #   Lògica de configuració + sidebar dinàmica
│
├── tests/                 # Tests
│   ├── tests/*.test.mjs   #   Tests unitaris amb Node.js built-in test runner
│
└── icons/                 # Icones (16–128px)
```

---

## Compatibilitat

| Navegador | Estat | Notes |
| --- | --- | --- |
| Firefox 115+ | ✅ Funcional | `sidebar_action`, `menus`, `background.scripts` |
| Chrome/Edge/Brave 116+ | ✅ Funcional | `sidePanel`, `contextMenus`, `service_worker` (`manifest.chromium.json`) |

### Abstracció cross-browser (`ext.js`)

L'extensió utilitza un wrapper `ext.*` que encapsula les diferències entre navegadors:

| API | Firefox | Chromium |
| --- | --- | --- |
| Menú contextual | `browser.menus` | `chrome.contextMenus` |
| Obrir sidebar | `sidebarAction.open()` | `sidePanel.open({ windowId })` |
| Tancar sidebar | `sidebarAction.close()` | `sidePanel.setOptions({ enabled: false })` ⚠️ |
| Detectar sidebar | `extension.getViews({ type: "sidebar" })` | `[]` (fallback a open) |
| Registrar panel | (natiu) | `sidePanel.setPanelBehavior()` |

### Empaquetatge Dual

L'script de build (`build.ps1`) genera automàticament els paquets `.zip` independents per a Firefox i per a Chromium a partir de la mateixa base de codi compartida.

---

## Seguretat i privadesa

- **Dades locals**: Clau API, preferències i historial es guarden exclusivament al navegador (`storage.sync` / `storage.local`). Cap dada surt del teu ordinador sense la teva acció.
- **Connexió única**: L'extensió només contacta amb `generativelanguage.googleapis.com` per enviar el text i rebre el resum. No hi ha telemetria, analytics ni servidors de tercers.
- Consulta la [Política de privadesa](PRIVACY_POLICY.md) per a detalls complets.

---

## Contribuir

Les contribucions són benvingudes! Si vols col·laborar:

1. Fes un **fork** del repositori
2. Crea una **branca** per a la teva funcionalitat: `git checkout -b feature/la-meva-funcionalitat`
3. Fes **commit** dels canvis: `git commit -m "Afegeix funcionalitat X"`
4. Puja la branca: `git push origin feature/la-meva-funcionalitat`
5. Obre un **Pull Request**

### Guia ràpida de desenvolupament

```bash
# Activar mode desenvolupament (canvia nom i ID del manifest)
npm run dev

# Activar mode producció
npm run prod

# Generar paquet ZIP per a Firefox
npm run build:firefox

# Generar paquet ZIP per a Chromium
npm run build:chromium

# Generar paquets ZIP per a tots dos navegadors
npm run build

# Validar codi i tests amb un sol comando
npm run check

# Incrementar la versió i sincronitzar manifests/changelog
npm version patch

# Fer una release en mode Firefox i restaurar el mode original
npm run release:firefox

# Fer una release en mode Chromium i restaurar el mode original
npm run release:chromium
```

> Nota: els scripts de build actuals s'executen a través d'un wrapper Node que cerca PowerShell (`pwsh` o `powershell`) al teu sistema.

---

## Roadmap

Consulta el [ROADMAP.md](ROADMAP.md) per veure les funcionalitats planificades.

---

## Llicència

Distribuït sota la llicència **Mozilla Public License 2.0 (MPL-2.0)**.
Consulta el fitxer [LICENSE](LICENSE) per als detalls complets.

---

> Fet amb ❤️ en català
