# Changelog - Resumir contingut

Tots els canvis notables d'aquest projecte es documentaran en aquest fitxer.

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

## [1.0.0] - 2026-02-01

### Inicial

- Versió inicial de l'extensió Resumir contingut.
- Resum de pàgines web amb Google Gemini API.
- Barra lateral integrada.
