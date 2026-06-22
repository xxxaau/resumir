# Vendor Libraries

> **A partir de la v2.2.9**, les llibreries de tercers per al mapa conceptual
> (`d3.min.js`, `markmap-lib.js`, `markmap-view.js`, ~627 KB) **han estat
> eliminades** i substituïdes per un renderitzador SVG natiu propi
> (`sidebar/markmap-native.js`, ~22 KB).

## Vendors actius

Els fitxers vendoritzats al repositori són:

| Fitxer                       | Origen                                                    | Mida     | Llicència  |
|------------------------------|-----------------------------------------------------------|----------|------------|
| `Readability.js`             | [mozilla/readability](https://github.com/mozilla/readability) | ~100 KB  | Apache-2.0 |
| `vendor/pdf.min.js`          | [mozilla/pdf.js](https://github.com/mozilla/pdf.js) (3.11.174 legacy) | ~377 KB | Apache-2.0 |
| `vendor/pdf.worker.min.js`   | [mozilla/pdf.js](https://github.com/mozilla/pdf.js) (3.11.174 legacy) | ~1.1 MB | Apache-2.0 |

Els hashes SHA-256 d'aquests fitxers estan registrats a
[`docs/THIRD_PARTY.md`](docs/THIRD_PARTY.md) i es verifiquen amb:

```bash
npm run vendor:verify
```

Per a actualitzar `pdf.js`, descarregar manualment la versió legacy de `pdfjs-dist`
i actualitzar els hashes a `scripts/verify-vendor.mjs` i `docs/THIRD_PARTY.md`.

## Vendors històricament eliminats

| Versió eliminada | Fitxer            | Mida    | Motiu                                                 |
|------------------|-------------------|---------|-------------------------------------------------------|
| v2.2.9           | `d3.min.js`       | ~273 KB | Substituït per `markmap-native.js`                    |
| v2.2.9           | `markmap-lib.js`  | ~304 KB | Substituït per `markmap-native.js`                    |
| v2.2.9           | `markmap-view.js` | ~50 KB  | Substituït per `markmap-native.js`                    |
| Sense publicar   | `defuddle.js`     | ~571 KB | Twitter/X passa a scrape de tweets + `og:description` |

**Benefici de la substitució**:

- Reducció del paquet final de ~640 KB a ~150 KB (~76% menys).
- Zero warnings d'AMO (les llibreries originals contenien `eval()`/`Function()`
  i `innerHTML` dinàmic que disparaven 6 warnings de revisió).
- Auditabilitat completa: tot el codi de visualització és nostre i revisable.
