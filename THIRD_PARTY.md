# Codi de Tercers

Aquest projecte utilitza les següents biblioteques de tercers:

## Readability.js

- **Versió:** 1.7.1 (Arc90) / Mozilla Readability (basada en Firefox Reader View)
- **Font:** https://github.com/mozilla/readability
- **Llicència:** Apache License 2.0
- **Ús:** Extracció de contingut llegible de pàgines web (sidebar/content.js)
- **Actualització:** Descarregar manualment de la release corresponent a GitHub
- **Fitxer:** `Readability.js` (arrel del projecte)

## Defuddle.js

- **Versió:** 0.14.0
- **Font:** https://github.com/kepano/defuddle
- **Llicència:** MIT
- **Ús:** Eliminació de "junk" (sidebars, ads, navegació) del text extret de pàgines web (sidebar/content.js)
- **Actualització:** Via `npm run vendor:update` (descàrrega de npm)
- **Fitxer:** `defuddle.js` (arrel del projecte, minified)

---

Per a qualsevol dubte sobre les llicències, consulta els repositoris originals.
