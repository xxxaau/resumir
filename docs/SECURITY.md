# Política de Seguretat

## Reportar vulnerabilitats

Si descobreixes una vulnerabilitat de seguretat en aquesta extensió, **no obris una issue pública**. En lloc d'això, envia un email a:

```
sergi@xaudiera.xyz
```

Inclou:
- Descripció de la vulnerabilitat
- Passos per reproduir-la (si és possible)
- Impacte potencial
- Suggeriments de remei (opcional)

Tractaré el report amb confidencialitat i faré un esforç per abordar-lo ràpidament.

## Consideracions de seguretat

### Emmagatzematge de la clau API

- **Ubicació:** `storage.local` (no sincronitzada entre dispositius)
- **Transmissió:** Únicament a través de header `x-goog-api-key` a `generativelanguage.googleapis.com`
- **Visibilitat:** Mascarada als inputs de configuració (`type="password"`)
- **NO:** Mai no es registra, no entra en URLs, no es sintetitza a l'IA

### Contingut de la pàgina

- **Origen:** Text extret de la pàgina activa
- **Protecció:** Embolcallat amb `<UNTRUSTED_CONTENT>` quan es passa a Gemini (aïlla-ho de les instruccions del sistema)
- **Renderitzat:** Via DOM API (`createElement`, `textContent`), mai `innerHTML` sobre text de l'IA
- **Enllaços:** Allowlist de schemas (`https://`, `http://`), `rel="noopener noreferrer"` a tots els enllaços

### Connexions de xarxa

- **Úniques connexions permeses:**
  - `https://generativelanguage.googleapis.com` (Gemini API)
  - `https://*` (article fetch per a Hacker News — opcional, user-triggered; també PDFs remots HTTPS — vegeu secció PDF)
  - `https://obsidian.md` (Obsidian vault URI scheme)

- **Proteccions SSRF:** Denylist de rangs privats (localhost, RFC1918, link-local) en fetches d'articles

### Suport PDF i política CSP

A partir de la v2.3.0, l'extensió pot resumir PDFs amb capa de text mitjançant pdf.js (vendoritzat a `vendor/`).

- **PDFs HTTPS remots:** Es descarreguen directament des del sidebar via `fetch()`. Això requereix `connect-src https:` a la CSP (`extension_pages`), que permet connexions a qualsevol origen HTTPS. **Implicació:** un atacant que aconseguís injecció a un script de l'extensió podria exfiltrar dades a qualsevol host HTTPS. Mitigacions:
  - Cap `eval()`, `Function()`, ni `innerHTML` sobre dades externes (verificat al codi).
  - pdf.js configurat amb `isEvalSupported: false`, `disableFontFace: true`, `useSystemFonts: false`.
  - Tot el text extret es passa a Gemini embolcallat amb `<UNTRUSTED_CONTENT>`.
- **PDFs locals (`file://`) i HTTP:** No es descarreguen via `fetch` (la CSP no inclou `file:` ni `http:` per principi de mínim privilegi). L'usuari els selecciona manualment via el botó "Selecciona PDF local" (`<input type="file">`) i el contingut es llegeix amb `FileReader`/`ArrayBuffer` sense cap accés de xarxa.
- **PDFs escanejats (sense capa de text):** No suportats (no s'incorpora OCR). Es retorna `[PDF-012]`.
- **Worker pdf.js:** Carregat des de `vendor/pdf.worker.min.js` via `runtime.getURL()` (origen extensió, no remot).
- **Hashes SHA-256 de binaris vendoritzats:** Verificats al PR i documentats a `THIRD_PARTY.md`.

### Permisos del navegador

- `activeTab` — accés al contingut actiu quan l'usuari fa clic
- `scripting` — injecció de Readability.js / Defuddle per extreure text net
- `storage` — emmagatzematge local de preferències i caché
- `tabs` — metadades de la pestanya (URL, títol) per a cache keys
- `<all_urls>` — opcional, només per fetcher articles de tercers quan es sol·licita (Hacker News)

## Prova de seguretat

Les contribucions que modifiquen `sidebar/api.js`, `sidebar/content.js`, `sidebar/ui.js`, `shared/defaults.js` o `options/settings*.js` requereixen una revisió de seguretat. Consulta `CONTRIBUTING.md` per a detalls.

## Llicències de tercers

Veure `THIRD_PARTY.md` per a una llista completa de dependències i llicències.

---

**Última actualització:** 2026-05-25
