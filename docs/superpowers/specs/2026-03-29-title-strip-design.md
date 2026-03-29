# Spec: Barra de títol de la pàgina resumida

**Data:** 2026-03-29
**Estat:** Aprovat

---

## Resum

Afegir una franja sticky sota la toolbar que mostra el títol de la pàgina que s'està resumint com a link clicable. Apareix en el moment que l'usuari inicia la generació i es manté visible durant la càrrega i el resum resultant.

---

## Comportament

### Quan apareix
- En el moment que es dispara `startSummary` (qualsevol modalitat: resum normal, deep dive, validació científica).
- Es manté visible mentre `#loading` o `#content` siguin visibles.
- S'oculta quan: es tanca el sidebar, s'obre el panell d'historial, es mostra un error sense resum previ, o es fa un nou resum (se substitueix el títol).

### Contingut
- **Títol:** `document.title` de la pestanya activa en el moment de la crida, o `currentMetadata.title` si ja disponible. Fallback: la URL escurçada.
- **Link:** `href` apunta a la URL de la pàgina resumida (`currentMetadata.url`). Obre en pestanya nova (`target="_blank"`).
- **Truncament:** `text-overflow: ellipsis` si el títol no cap en una línia.

### Sticky
- `position: sticky; top: 0` dins el flux del sidebar.
- El `#container` té `overflow-y: auto`; la barra queda ancorada a dalt mentre el contingut fa scroll.

---

## Estructura HTML

Un element estàtic nou a `sidebar.html`, entre la `.toolbar` i `#history-back-bar`:

```html
<div id="page-title-strip" class="hidden">
  <a id="page-title-link" href="#" target="_blank" rel="noopener noreferrer"></a>
</div>
```

---

## CSS

```css
#page-title-strip {
  padding: 5px 12px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-color);
  position: sticky;
  top: 0;
  z-index: 10;
}

#page-title-link {
  display: block;
  color: var(--primary-color);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-decoration: none;
}

#page-title-link:hover {
  text-decoration: underline;
}
```

---

## Lògica JS (`sidebar.js`)

1. **Mostrar la barra** (`showPageTitleStrip(title, url)`): s'invoca des de `startSummary` just abans de mostrar `#loading`. Omple `#page-title-link` amb el títol i la URL, i treu la classe `hidden`.

2. **Amagar la barra** (`hidePageTitleStrip()`): s'invoca quan:
   - S'obre `#history-panel` (`openHistoryPanel`)
   - Es mostra un error i no hi ha resum previ
   - Es fa reset complet de la UI (nova crida explícita a `hidePageTitleStrip()`)

3. **Preservació:** quan es carrega una entrada de l'historial (`loadHistoryEntry`), la barra s'actualitza amb el títol i URL de l'entrada.

---

## Fitxers afectats

| Fitxer | Canvi |
|--------|-------|
| `sidebar/sidebar.html` | Nou `#page-title-strip` |
| `sidebar/sidebar.css` | Estils `#page-title-strip` i `#page-title-link` |
| `sidebar/sidebar.js` | `showPageTitleStrip()`, `hidePageTitleStrip()`, crida des de `startSummary` |
| `sidebar/history.js` | `openHistoryPanel` amaga la barra; `loadHistoryEntry` l'actualitza |

---

## Fora d'abast

- No s'afegeix favicon ni icona de la pàgina.
- No es mostra la URL com a text visible (només com a `href`).
- No hi ha animació d'entrada/sortida.
