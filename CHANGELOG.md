# Changelog - Resumir contingut

Tots els canvis notables d'aquest projecte es documentaran en aquest fitxer.

## [2.2.1] - 2026-04-07

### Millorat

- **Prompts per defecte centralitzats**: Extrets a `shared/defaults.js` com a font de veritat única, compartida entre la sidebar i la pàgina d'opcions.
- **Inicialització de favorits simplificada**: En el primer ús, s'afegeix només el model per defecte als favorits (en lloc de tots els models curats).
- **Neteja UI**: Simplificació de `sidebar/ui.js`, `sidebar/summary.js` i `sidebar/sidebar.html`, eliminant codi redundant.
- **Opcions refactoritzades**: `settings-defaults.js` i `settings.js` netejats i simplificats.

## [2.2.0] - 2026-04-01

### Afegit

- **Panell de text font**: Nou botó al peu del sidebar (icona de document) que mostra el text que s'ha enviat a la IA per resumir. Permet auditar exactament quin contingut s'ha extret de la pàgina i comprovar si coincideix amb les expectatives.
- **Barra de títol**: Tira enganxosa al damunt del contingut que mostra el títol de la pàgina resumida amb un enllaç directe a la pàgina original.
- **Badge de caché clicable**: El símbol ⚡ al peu és ara interactiu — clicar-lo carrega directament el resum emmagatzemat en caché sense necessitat de tornar a generar-lo.
- **Panell d'historial**: Llista navegable de tots els resums previs emmagatzemats en caché, accessible des del botó 🕐 al peu. Permet rellegir i recuperar qualsevol resum anterior.
- **Selector de període a les estadístiques**: El gràfic i la taula de la pàgina d'estadístiques suporten ara filtres de 7 dies, 30 dies, 6 mesos i 1 any, a més de les columnes de tokens entrada/sortida, hits de caché i temps mitjà de resposta.
- **Extracció Twitter/X via Defuddle**: El contingut de Twitter/X s'extreu ara amb la llibreria Defuddle (v0.14.0) amb fallback a scraping DOM, obtenint text molt més ric i precís que el mètode anterior.
- **Millores Hacker News**: Eliminat el límit de comentaris, afegida la descàrrega de l'article enllaçat per proporcionar context complet als resums de fils HN.

### Millorat

- **Streaming en temps real**: El contingut del resum ara es mostra com a text pla durant la generació i es transforma a Markdown amb format complet en acabar. Eliminada la latència visual d'esperar el final per veure contingut.
- **Tokens reals de l'API**: S'utilitzen els `usageMetadata` retornats per Gemini en lloc d'estimacions del tokenitzador local, obtenint comptes exactes d'entrada/sortida i de tokens de caché.
- **Caché amb TTL de 30 dies**: Purga automàtica de les entrades expirades en segon pla sense bloquejar la interfície.
- **Historial carrega a la sidebar**: El clic a una entrada de l'historial (stats) obre la sidebar i carrega el resum directament, sense obrir una URL.
- **Permisos Firefox en instal·lació**: Sol·licita automàticament l'accés a tots els llocs web quan l'usuari instal·la l'extensió per primera vegada, evitant passos manuals de configuració.
- **Pàgina de configuració redissenyada**: Navegació lateral amb tabs, millores de CSS, indicadors de color per a cada plugin i nova secció d'estadístiques integrada.

### Eliminat

- **Plugin "Netejar Timeline"**: La funcionalitat de neteja de feeds algorítmics de Twitter/X i LinkedIn s'ha extret a una extensió independent. Eliminat el botó del sidebar, la configuració i els scripts d'injecció corresponents.

### Corregit

- **Badge de caché**: L'espai sempre reservat amb `visibility` en comptes de `display` evita que la barra inferior salti en aparèixer/desaparèixer el símbol.
- **Fallback de quota**: El fallback respecta els models favorits i evita seleccionar models cars quan la quota s'esgota.
- **Diàleg duplicat de reload**: Eliminat el condicional duplicat al listener de `apiKey` que provocava dos recarregaments consecutius.
- **Deep Dive fix**: El contingut es mostrava com a `hidden` fins al final del streaming en lloc d'aparèixer progressivament.

## [2.1.0] - 2026-03-04

### Afegit

- **Selector de models amb favorits**: Nova interfície amb estrelles per marcar/desmarcar models favorits des de la pàgina d'ajustaments. Els models seleccionats es sincronitzen automàticament amb el sidebar.
- **Botó "Actualitzar"**: Connecta amb l'API de Google per obtenir la llista completa de models Gemini disponibles i emmagatzema-la en cache local.
- **Botó "Seleccionar"**: Obre el llistat de models (cache local + curats) per gestionar favorits sense necessitat de connexió a l'API.
- **Opció "Triar més models…"**: El desplegable del sidebar inclou un enllaç directe als ajustaments quan l'usuari vol afegir nous models.

### Millorat

- **Build multi-target**: Nou sistema de build amb `manifest.base.json` + patches per Firefox/Chromium, bundle esbuild per Chromium, i generació de ZIPs via Node.js (eliminada dependència de Python).
- **Codi consolidat**: Extreta funció `ensureFavoriteModels()` a `shared/models.js` i `extractExecutiveSummary()` a `utils.js` per eliminar duplicació.
- **Neteja de producció**: Eliminats fitxers obsolets (`make_zip_v4.py`, `generate_icons_blue.ps1`, `test_models.py`) i `console.log` innecessari.

### Corregit

- **SyntaxError a la pàgina d'ajustaments**: Solucionada declaració duplicada de `extensionToggles` entre `settings-options.js` i `settings.js` que impedia carregar la pàgina.

## [2.0.1] - 2026-02-27

### Millorat

- **Bionic Reader (UI/UX)**: El botó d'activació ara està sempre disponible de forma incondicional al faldó de l'aplicació en comptes de requerir un resum completat.
- **Bionic Reader (Configuració)**: El filtre tipogràfic als ajustaments amaga intel·ligentment les fonts que no pertanyen al sistema operatiu (`macOS` o `Windows`) reduint el soroll visual de la llista desplegable. A més, canviar la font, interlineat o pes biònic des de les opcions reflectirà els canvis a l'instant al Sidebar de darrere.
- **Bionic Reader (Persistència)**: L'estat triat (actiu/inactiu) es guarda permanentment entre sessions gràcies a l'emmagatzematge local de l'extensió. De la mateixa manera, si deixes l'efecte encès i resumeixes una altra pàgina, el nou text adoptarà automàticament l'estil i formatatge preservats.
- **Traçabilitat d'errors**: S'han assignat identificadors numèrics (`[001]` a `[010]`) a cadascun dels missatges d'excepció (quotes esgotades, llocs invàlids, fallades de l'API o d'extracció) per optimitzar-ne el procés de diagnòstic de suport tècnic.

### Corregit

- **Bug del Recarregar necessari (F5)**: Solventat el problema d'extracció que exigia refrescar la finestra al moure's entre pestanyes amb la sidebar tancada. S'ha migrat l'accés web universal d'`optional_host_permissions` a l'assignació estàtica de Chromium i Firefox, consolidant la recollida de dades sense pèrdua de gest d'usuari (user gesture limits).

## [2.0.0] - 2026-02-26

Milestone 2.0.0: Versió amb suport natiu per a l'ecosistema Chromium.

### Afegit

- **Suport Chromium**: Compatibilitat completa amb navegadors basats en Chromium (Google Chrome, Edge, Brave, etc.) gràcies al nou wrapper `ext.js` que abstreu la crida correcta a `browser` o `chrome`.
- **Build Multi-Target**: Scripts de generació actualitzats per empaquetar de forma simultània l'arxiu `.zip` per Firefox i el `.zip` per Chromium alhora.
- **Side Panel Natiu**: Integració amb l'API de `chrome.sidePanel` per a entorns Google garantint que el panell lateral o l'action de l'extensió funcionen previsiblement.

### Millorat

- **Auditories i procediments**: Obligatorietat de testejar tant el branch Firefox com el Chromium de qualsevol canvi futur. Millores a l'eina automàtica de release per eliminar paquets o extrets `.zip` antics i carpetes un-packed.

### Corregit

- **Problema Caching Selecció vs Web Completa**: Solucionat error fatal (*"Cannot set properties of null"*) a l'hora de canviar de resumir un text pre-seleccionat i seguidament una pàgina completa. Ara les seleccions tenen un identificador únic (prefixat amb `seleccio:`).
- **UX Menú Contextual**: S'han retirat les icones lletges de l'entorn dev als menús contextuals de Firefox i Chrome per tal que només aparegui el text net, igualant el look & feel de sistema.

## [1.2.1] - 2026-02-26

### Millorat

- **Refactorització sidebar.js**: Reduït de 632 a 230 línies. Extreta la lògica de generació a `summary.js`, quota/estadístiques a `stats.js`, i avís API key a `ui.js`.
- **Missatges d'error**: Nova funció `classifyError()` que mostra missatges clars i en català per errors d'API key (401/403), quota excedida (429), permisos denegats, i contingut buit.
- **Contingut buit**: Substituït l'error tècnic "Page content empty" per un missatge clar indicant que cal recarregar la pestanya.
- **ext.js cross-browser**: Completat el wrapper amb suport sidePanel per a Chromium (open, close, getViews, setPanelBehavior). Firefox no afectat.

### Afegit

- `sidebar/stats.js`: Mòdul de seguiment de quota diària i consum d'aigua.
- `sidebar/summary.js`: Mòdul amb la lògica principal de generació (`startSummary`), classificació d'errors (`classifyError`), i gestió de triggers.
- Tests nous (15 → 23): `estimateTokens` edge cases, `getCuratedModelInfo`, `classifyError`, `formatObsidianPath` amb tokens de temps.

## [1.1.7] - 2026-02-25

### Corregit

- **Permisos de host (fix crític)**: `executeScriptSafe` refactoritzat amb estratègia "try first, request if needed". Elimina la comprovació prèvia `permissions.contains()` que retornava falsos negatius en URLs amb query params o hash, causant "Page content empty" en producció.
- **Manifest AMO**: Afegit camp obligatori `data_collection_permissions` (declara `websiteContent`) i apujat `strict_min_version` a `140.0` per eliminar warnings de l'AMO.

## [1.1.6] - 2026-02-25

### Millorat

- **Seguretat**: API key moguda de URL a header HTTP (`x-goog-api-key`) a totes les crides (sidebar + settings).
- **Seguretat**: Eliminat tot l'ús de `innerHTML` amb contingut dinàmic. Substituït per manipulació DOM segura (`DOMParser`, `replaceChildren`, `textContent`).
- **Seguretat**: `host_permissions` canviat a `optional_host_permissions` — permisos demanats dinàmicament.
- **Seguretat**: Comprovació de permisos (`permissions.contains()`) abans d'injectar scripts, eliminant errors de consola.
- **Accessibilitat**: Afegit `lang="ca"`, `aria-label` a tots els botons, `aria-hidden` a tots els SVGs decoratius, `aria-live` als elements d'estat.
- **Privadesa**: `PRIVACY_POLICY.md` actualitzada amb tots els permisos, YouTube/MAIN world i historial.
- **Codi**: Eliminats tots els `console.log` de producció, corregit typo "Obisidian", selectors CSS segurs amb `CSS.escape()`.
- **Codi**: Netejada dual key `enableDeepdive`/`enableDeepDive`, eliminat `storage.local.set` redundant.
- **UX**: Obsidian ara obre en nova pestanya (no substitueix l'activa).
- **UX**: Tema llegit de `storage.sync` (coherent amb la resta de configuració).

### Afegit

- `THIRD_PARTY.md`: Documentació de codi de tercers (Readability.js, Apache 2.0).
- Workflow d'auditoria pre-release (`/pre_release_audit`) integrat al procés de publicació.

## [1.1.5] - 2026-02-23

### Afegit

- **Reordenació de Plugins**: Funcionalitat per moure amunt i avall l'ordre dels plugins/extensions des de la configuració i el panell lateral.
- **Gràfic i Nou KPI**: Afegit un gràfic de barres d'activitat dels últims 7 dies i la nova mètrica "Temps Estalviat Aprox" a les Estadístiques.
- **Paginació a l'historial**: Selector de quantitat de resultats (20, 50, 100) i paginació real a la llista d'historial de peticions.
- **Data relativa**: Les entrades de referència a l'historial informatiu de peticions ara figuren en "fa X temps" de forma orgànica enlloc d'estricta, amb una lògica calculada amb el calendari actual humà (hores, minuts i "ahir"). 

### Canviat

- **Sentence Case UI**: Tots els títols de funcions, tabulacions i botons s'han re-estandarditzat en format català acadèmic deixant de banda el Title Case anglès innecessari.
- **Plugins**: Reanomenat oficial del terme "Extensions" integrades per "Plugins".
- **Tema Solarized**: S'ha rellevat i integrat manualment el perfil i els matisos de la variant de previsualització de color sèpia "Sepia" pel sistema "Solarized".

## [1.1.4] - 2026-02-13

### Corregit

- **Integració Obsidian (Fix Final)**: Canvi d'estratègia tècnica. Substituït `window.open` per `browser.tabs.update` per evitar bloquejos de CSP en producció i garantir que l'URI `obsidian://` s'obre correctament.

## [1.1.3] - 2026-02-13

### Corregit

- **Validació AMO**: Corregit l'ID de l'extensió al `manifest.json` (`sergi@xaudiera.xyz`) per coincidir amb el registrat a Mozilla Add-ons, permetent la pujada de noves versions.

## [1.1.2] - 2026-02-13

### Corregit

- **Integració Obsidian**: Primera temptativa de solucionar l'error en producció eliminant l'`iframe` ocult i utilitzant `window.open` amb `_self`.

## [1.0.4] - 2026-02-13

### Corregit

- **Filtre de Models (Sidebar)**: Ara la barra lateral oculta correctament els models "preview", "pro-exp" i "embedding", alineant-se amb la configuració.
- **Resum de YouTube**: Millora en l'extracció de transcripcions (YouTube Transcript) per evitar l'error "Proporcioneu el text".

## [1.0.0] - 2026-02-13

### Afegit

- **Tauler d'Estadístiques**: Nova pestanya a la configuració per monitorar l'ús de l'API (peticions, tokens, velocitat).
- **Historial de Peticions**: Registre detallat de les últimes 100 peticions, incloent títol, URL, model i cost en tokens.
- **Extracció Intel·ligent**: Suport especial per a Hacker News (`news.ycombinator.com`), incloent els 15 millors comentaris al resum.
- **Càrrega Especulativa**: Inici de l'extracció de text en segon pla només obrir la barra lateral per un inici instantani.
- **Streaming Real**: Respostes text-a-text en temps real (Server-Sent Events) per millorar la percepció de velocitat.

### Millorat

- Optimització del rendiment de la interfície durant la generació de text (throttling a 10fps).
- Reducció del consum de tokens eliminant elements de navegació innecessaris.

## [1.2.0] - 2026-02-11

### Afegit

- Nou disseny de la pàgina de configuració ("Web Clipper" style).
- Configuració en pàgina completa (tab) per millorar la usabilitat.
- Suggeriment automàtic de models alternatius quan s'excedeix la quota.
- Límit de tokens intel·ligent per a models Gemma per evitar errors.

### Canviat

- Actualitzat el prompt de sistema per defecte amb instruccions més detallades i estructurades.
- Reorganitzat el menú de configuració per a més claredat.

## [1.1.0] - 2026-02-10

### Afegit

- Selector de models dinàmic al peu de la barra lateral.
- Capacitat de personalitzar la plantilla d'exportació Markdown.
- Suport complet per als models Gemma 3 i Gemini 2.0 Flash.

### Corregit

- Errors en la selecció del model per defecte.

## [0.1.0] - 2026-02-01

### Inicial (versió interna)

- Versió inicial de l'extensió Resumir contingut.
- Resum de pàgines web amb Google Gemini API.
- Barra lateral integrada.
