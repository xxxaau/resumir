# Roadmap & Improvement Proposals

Aquest document recull propostes per optimitzar l'extensió (Eficiència, Velocitat, Cost) i millorar-ne la funcionalitat.

## 🐛 Known Issues & Bugs

- (Cap error crític conegut actualment)

## 🛡️ Millores Tècniques i Manteniment

### 1. Sèrie 1.2.x – Refinament versió Firefox (en progrés)

- **Objectiu:** polir l'extensió actual per a Firefox abans d'obrir el meló multi-navegador.
- **Tasques clau:**
  - Refactoritzar `sidebar.js` en blocs més petits (extracció de contingut, client Gemini/Gemma, caché+stats, UI).
  - Centralitzar la lògica de visibilitat de plugins (Markdown, Obsidian, Bionic, Deep Dive) en un sol helper.
  - Unificar emmagatzematge de configuració a `browser.storage.sync` (API key, model, temes, prompts, plugins).
  - Revisar missatges d'error (API key, quota, permisos) i millorar-ne la claredat/UX.
  - Ampliar tests de `utils.js` i documentar l'arquitectura bàsica al `README`.

### 2. Sèrie 1.3.x – Preparació multi-navegador (només Firefox)

- **Objectiu:** preparar el codi perquè sigui fàcilment portable, mantenint com a target principal Firefox.
- **Tasques clau:**
  - Crear un petit wrapper d'API (`ext.*`) per encapsular l'ús de `browser.*` i facilitar compatibilitat futura amb `chrome.*` / polyfill.
  - Aïllar tot el que depèn directament de `sidebar_action` en un mòdul clar (obertura/tancament, restauració de vistes).
  - Documentar al `README`/`ROADMAP` quines parts del manifest són específiques de Firefox.
  - Verificar que l'ordre configurat de plugins (`extensionOrder`) es reflecteix sempre en l'ordre de visualització dinàmic de la sidebar.

### 3. Milestone 2.0.0 – Versió per navegadors basats en Chromium (futur)

- **Estat:** 📝 Planificat (no iniciat)
- **Objectiu:** portar l'extensió a Chrome/Edge/Brave reutilitzant al màxim la lògica actual.
- **Idees preliminars i Bifurcació:**
  - El fitxer genèric `ext.js` ja gestiona les diferències a nivell de codi (`sidebar_action` vs `sidePanel`, `menus` vs `contextMenus`).
  - Caldrà mantenir dues versions del fitxer `manifest.json` original. El de Firefox mantindrà la clau `browser_specific_settings` i `sidebar_action`. El de Chromium ometrà aquestes claus i emprarà obligatòriament `sidePanel`.
  - Crear un manifest MV3 específic per Chromium amb `background.service_worker`, `action` (popup/side panel) respectiu.
  - L'empaquetament pot dependre d'un escript (ex: `build.js`) que pre-processi el manifest segons el navegador destinació.
  - Reutilitzar l'UI de `sidebar` com a popup o com a side panel, gràcies a l'abstracció `ext.*`.

### 4. Migració a TypeScript

- **Prioritat:** Baixa (Millora no urgent)
- **Benefici:** Major robustesa del codi, tipat estàtic per a les estructures de dades.

---

## 🚀 Noves Funcionalitats

### 12. Validació d'Evidència Científica

- **Estat:** 📝 Proposta
- **Detalls:** Funcionalitat per qüestionar i validar la validesa científica de les afirmacions del contingut contrastant-les amb evidència científica i bases de dades acadèmiques (ex: PubMed, Semantic Scholar).

---

## ✅ Implementat

### Reordenació de Plugins
- **Estat:** ✅ Implementat (v1.1.5)
- **Detalls:** Els usuaris poden establir un ordre visual preferit per a les integracions internes de la barra.

### Gràfics i Estadístiques Avançades
- **Estat:** ✅ Implementat (v1.1.5)
- **Detalls:** Quadres de comandament analítics per als usuaris amb un estimat de temps humanitzat i un gràfic de dies actius.

### 2. Tests Unitaris

- **Estat:** ✅ Implementat (v1.1.4)
- **Detalls:** Tests d'integració bàsics a `tests/test.html` i lògica separada a `utils.js`.

### 3. Integració Obsidian (Fix Producció)

- **Estat:** ✅ Implementat (v1.1.4)
- **Detalls:** Solucionat l'error de CSP utilitzant `browser.tabs.update`.

### 3. Sistema de Memòria Cau (Cache) Local

- **Estat:** ✅ Implementat
- **Detalls:** Ús de `browser.storage.local` per guardar resums i metadades, evitant regeneració de tokens.

### 4. Detecció d'Idioma (Forçat a Català)

- **Estat:** ✅ Implementat
- **Detalls:** System Prompt configurat per respondre SEMPRE en Català, independentment de l'idioma original.

### 5. Configuració de Temes i Mode Fosc

- **Estat:** ✅ Implementat
- **Detalls:** Suport per temes Clar/Fosc/Sistema automàtic a `theme.js`.

### 6. Integració amb Menú Contextual

- **Estat:** ✅ Implementat
- **Detalls:** Opcions "Resumir text seleccionat" i "Resumir contingut" al menú de clic dret (`background.js`).

### 7. Streaming de Resposta

- **Estat:** ✅ Implementat
- **Detalls:** Ús de Server-Sent Events (SSE).

### 8. Pre-càrrega Especulativa

- **Estat:** ✅ Implementat

### 9. Historial de Resums

- **Estat:** ✅ Implementat

### 10. Compressió de Prompts

- **Estat:** ✅ Implementat / En curs
- **Detalls:** System Prompt optimitzat definit a `sidebar.js`.

### 11. Navegació Històrica des de Sidebar

- **Estat:** Proposta
- **Detalls:** Permetre navegar per l'historial de resums i recuperar-los directament des de la barra lateral.

## 🗑️ Descartat / No Prioritari

- **Xat amb la Pàgina (Q&A):** Descartat per simplificar l'abast.
- **Suport PDF Local:** Descartat (no urgent).
