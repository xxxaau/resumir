# Changelog - Resumir contingut

Tots els canvis notables d'aquest projecte es documentaran en aquest fitxer.

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

- **Validació AMO**: Corregit l'ID de l'extensió al `manifest.json` (`sergi-firefox-resum@example.com`) per coincidir amb el registrat a Mozilla Add-ons, permetent la pujada de noves versions.

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
