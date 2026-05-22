# Vendor Libraries

> **A partir de la v2.2.9**, les llibreries de tercers per al mapa conceptual
> (`d3.min.js`, `markmap-lib.js`, `markmap-view.js`, ~627 KB) **han estat
> eliminades** i substituïdes per un renderitzador SVG natiu propi
> (`sidebar/markmap-native.js`, ~22 KB).

## Vendors actius

Els únics fitxers vendoritzats al repositori són els extractors de contingut:

| Fitxer                  | Origen                                                    | Mida    | Llicència |
|-------------------------|-----------------------------------------------------------|---------|-----------|
| `sidebar/defuddle.js`   | [kepano/defuddle](https://github.com/kepano/defuddle)     | ~80 KB  | MIT       |
| `sidebar/Readability.js`| [mozilla/readability](https://github.com/mozilla/readability) | ~100 KB | Apache-2.0 |

Els hashes SHA-256 d'aquests dos fitxers estan registrats a
[`THIRD_PARTY.md`](../THIRD_PARTY.md) i es verifiquen amb:

```bash
npm run vendor:verify
```

Per a regenerar `defuddle.js` des de la versió més recent de l'upstream:

```bash
npm run vendor:update
```

## Vendors històricament eliminats

| Versió eliminada | Fitxer            | Mida    | Motiu                                                 |
|------------------|-------------------|---------|-------------------------------------------------------|
| v2.2.9           | `d3.min.js`       | ~273 KB | Substituït per `markmap-native.js`                    |
| v2.2.9           | `markmap-lib.js`  | ~304 KB | Substituït per `markmap-native.js`                    |
| v2.2.9           | `markmap-view.js` | ~50 KB  | Substituït per `markmap-native.js`                    |

**Benefici de la substitució**:

- Reducció del paquet final de ~640 KB a ~150 KB (~76% menys).
- Zero warnings d'AMO (les llibreries originals contenien `eval()`/`Function()`
  i `innerHTML` dinàmic que disparaven 6 warnings de revisió).
- Auditabilitat completa: tot el codi de visualització és nostre i revisable.
