# Roadmap & Improvement Proposals

Aquest document recull propostes per optimitzar l'extensió (Eficiència, Velocitat, Cost) i millorar-ne la funcionalitat.

## 🐛 Known Issues & Bugs

- (Cap error crític conegut actualment)

## 🛡️ Millores Tècniques i Manteniment

### 1. Migració a TypeScript

- **Prioritat:** Baixa (Millora no urgent)
- **Benefici:** Major robustesa del codi, tipat estàtic per a les estructures de dades.

---

## ✅ Implementat

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

- **Estat:** ✅ Implementat (v1.3.0)
- **Detalls:** Ús de Server-Sent Events (SSE).

### 8. Pre-càrrega Especulativa

- **Estat:** ✅ Implementat (v1.3.0)

### 9. Historial de Resums

- **Estat:** ✅ Implementat (v1.3.0)

### 10. Compressió de Prompts

- **Estat:** ✅ Implementat / En curs
- **Detalls:** System Prompt optimitzat definit a `sidebar.js`.

## 🗑️ Descartat / No Prioritari

- **Xat amb la Pàgina (Q&A):** Descartat per simplificar l'abast.
- **Suport PDF Local:** Descartat (no urgent).
