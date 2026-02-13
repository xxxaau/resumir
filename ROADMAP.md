# Roadmap & Improvement Proposals

Aquest document recull propostes per optimitzar l'extensió (Eficiència, Velocitat, Cost) i millorar-ne la funcionalitat.

## 🚀 Optimització de Costos i Eficiència (Tokens)

### 1. Sistema de Memòria Cau (Cache) Local

- **Problema:** Si l'usuari torna a visitar una pàgina ja resumida, actualment es torna a pagar/gastar tokens per generar el mateix resum.
- **Solució:** Implementar un sistema de cache persistent (`browser.storage.local`) que guardi el resum associat a la URL.
- **Benefici:** **Cost 0** i **Velocitat instantània** per a visites recurrents.

### 2. Compressió de Prompts (Prompt Engineering)

- **Problema:** El System Prompt actual és molt detallat i consumeix molts tokens d'entrada en cada petició.
- **Solució:** Refinar el prompt per ser més concís sense perdre qualitat, o utilitzar tècniques de _prompt chaining_ només quan calgui.
- **Benefici:** Reducció directa del cost per petició.

### 3. Detecció d'Idioma i Traducció Selectiva

- **Problema:** De vegades el model respon en l'idioma original del text (ex: anglès) encara que l'usuari vulgui el resum en català.
- **Solució:** Forçar l'idioma de sortida al System Prompt o detectar l'idioma de la pàgina per adaptar la petició.
- **Benefici:** Millora l'experiència d'usuari (UX).

## 🛠️ Millores Funcionals (New Features)

### 6. Mode "Xat amb la Pàgina" (Q&A)

- **Descripció:** Afegir un camp de text sota el resum per fer preguntes específiques sobre el contingut ("Què diu sobre X?", "Qui és l'autor?").
- **Implementació:** Mantenir l'historial de conversa en memòria local mentre la pestanya estigui oberta.

### 7. Suport per a PDF i Arxius Locals

- **Descripció:** Permetre resumir PDFs oberts al navegador (via `pdf.js`) o arxius de text pujats des del PC.
- **Implementació:** Detectar si la pestanya és un PDF i extreure'n el text.

### 9. Selecció de Temes i Mode Fosc (Prioritat Mitjana)

- **Descripció:** Permetre triar entre tema clar, fosc o seguir el sistema, i afegir paletes de colors personalitzables (Accent Color) des del menú d'opcions.
- **Implementació:** Utilitzar variables CSS (`:root`) i guardar la preferència a `storage.local`.

### 10. Integració amb Menú Contextual

- **Descripció:** Afegir opció al clic dret: "Resumir aquest enllaç" (sense haver d'entrar a la pàgina) o "Resumir selecció de text".

## 🛡️ Millores Tècniques i Manteniment

### 10. Migració a TypeScript

- **Benefici:** Major robustesa del codi, tipat estàtic per a les estructures de dades (API responses, settings) i menys errors en temps d'execució.

### 11. Tests Unitaris (Vitest/Jest)

- **Benefici:** Assegurar que la lògica de neteja de text i gestió d'errors no es trenca amb futures actualitzacions.

---

## ✅ Implementat

### 4. Streaming de Resposta (Text en temps real)

- **Estat:** ✅ Implementat (v1.3.0)
- **Detalls:** Ús de Server-Sent Events (SSE) per mostrar el text progressivament.

### 5. Pre-càrrega Especulativa (Speculative Loading)

- **Estat:** ✅ Implementat (v1.3.0)
- **Detalls:** Extracció de text en segon pla a l'obrir la sidebar.

### 8. Historial de Resums

- **Estat:** ✅ Implementat (v1.3.0)
- **Detalls:** Tauler d'estadístiques amb historial de les últimes 100 peticions.

### 📋 Recomanació de Prioritats (Next Steps)

1.  **Prioritat Alta (Cost/Velocitat):** Implementar **Cache Local**.
2.  **Prioritat mitjana (UX):** Afegir **Xat amb la Pàgina**.
3.  **Prioritat Baixa (Tècnica):** Migració a TypeScript.
