# Els plugins de Resumir

Resumir s'organitza en **plugins**: cada un és una eina amb el seu botó a la barra
lateral. Els pots **activar, desactivar i reordenar** des de Configuració (⚙️) →
**Plugins**, perquè la barra mostri només el que fas servir.

![Llista de plugins a Configuració, cadascun amb el seu interruptor, fletxes per reordenar i engranatge de configuració](./img/plugins-llista.webp)

Segueixen els tres moments del pipeline de Resumir: **captures** el contingut,
l'**entens** amb la lent que necessites, i el **conserves**.

> **Els prompts són teus.** Cada lent funciona amb un *prompt* (les instruccions
> que rep la IA). Resumir en porta un **per defecte**, pensat i provat, però el pots
> **editar** a Configuració → el plugin → Configuració, i **restaurar-lo** a
> l'original quan vulguis. A sota expliquem què fa cada prompt per defecte.

---

## 📥 Captura: d'on surt el contingut

La majoria de fonts es detecten **soles**, sense plugins: pàgines web (extracció
de l'article net), **YouTube** (transcripció), **Hacker News** (article enllaçat +
fil de comentaris) i **Twitter/X** (els tuits del fil). Tu només tries la lent.

Per al que no és en línia hi ha un plugin:

### PDF
Tria un PDF del teu ordinador i resumeix-lo: Resumir l'obre en un visor propi i
n'extreu el text. Cal que el PDF tingui capa de text — els escanejats sense text no
es poden llegir (no hi ha OCR). No té prompt propi: un cop carregat, l'analitzes amb
la lent que vulguis.

---

## 🔍 Les cinc lents: entendre, no només resumir

Cinc maneres que la IA processa el mateix contingut. Cadascuna té el seu **prompt
editable**; tots inclouen una capa de **seguretat** que tracta el contingut de la
pàgina com a dades, mai com a instruccions (protecció contra *prompt injection*).

### Resum
La lent per defecte, per fer-te una idea ràpida i ordenada.

**Què fa el prompt per defecte:** demana a la IA que actuï com a experta en
resumir, **sempre en català**, sense frases introductòries, i que retorni una
estructura fixa:

- un **paràgraf executiu** (màxim 150 paraules) que diu quin tipus de contingut és i de què va,
- **Punts clau** (de 3 a 8, segons la llargada del text),
- **Aprenentatges** (fins a 3 conclusions pràctiques),
- **Cites** (fins a 3 frases literals; en clicar-les, la pàgina les ressalta en groc i hi
  desplaça la vista).

Només hi ha les seccions que tenen contingut: en un text curt en sortiran menys. Si la
pàgina és buida o només és un avís de galetes, diu que no hi ha prou contingut en lloc
d'inventar-se un resum. Pots ajustar el format i la llargada a la configuració de
Resum.

![Configuració de Resum amb el prompt per defecte (System Prompt) editable i el botó Restaurar](./img/prompt-resum.webp)

### Explica-ho fàcil
Per a temes densos o d'un camp que no domines.

**Què fa el prompt per defecte:** demana a la IA que faci de divulgadora i ho
reescrigui en **llenguatge planer**, amb frases curtes i sense gergó sense traduir.
L'estructura de sortida:

- una frase que resumeix de què va,
- **De què va, exactament?** (2-4 paràgrafs senzills),
- **Per entendre-ho millor** (analogies quotidianes),
- **Paraules que potser no coneixes** (glossari dels termes que surten),
- **Per què t'hauria d'importar?** (per què és rellevant).

![Panell d'Explica-ho fàcil amb les seccions «De què va», «Per entendre-ho millor» i «Paraules que potser no coneixes»](./img/panell-explica-facil.webp)

### Aprofundiment
Quan no en vols el resum, sinó entendre-ho a fons.

**Què fa el prompt per defecte:** demana una **anàlisi profunda i crítica** —
arguments, proves i dades, matisos, valoració crítica, implicacions i preguntes
obertes— amb una estructura fixa i, com sempre, en català. Separa el que **diu** el
text de la **valoració** de la IA.

### Validació científica
Per a estudis i afirmacions que vols contrastar amb rigor.

**Què fa el prompt per defecte:** la IA actua com a **revisora científica**: avalua
el tipus de font, el disseny i la mostra, els resultats, els salts lògics (correlació
com a causalitat, extrapolacions) i els conflictes d'interès **segons el que diu el
mateix text**. Comença amb un **veredicte de solidesa** (sòlid / raonable amb
reserves / feble / no avaluable). **No aporta referències pròpies**: com que no pot
consultar res, només transcriu les fonts que cita el contingut, i el que compara amb el
consens científic ho marca com a «coneixement general, no verificat». És una ajuda per
decidir, no una verificació: contrasta sempre les fonts importants.

### Mapa conceptual
Per veure l'estructura d'un cop d'ull o per estudiar.

**Què fa el prompt per defecte:** demana un **arbre jeràrquic** (fins a 4 nivells)
en format de llista Markdown indentada — tema central, branques principals,
sub-branques i detalls. Resumir el renderitza com un mapa **interactiu** amb nodes
desplegables, pantalla completa i export a PNG.

![Mapa conceptual interactiu generat per Resumir a partir de l'Estatut d'Autonomia de Catalunya](./img/mapa-conceptual.webp)

---

## 📚 Conserva: el que entens avui, ho trobes demà

### Desar a Obsidian
Desa els resums directament al teu Vault, amb carpeta i plantilla configurables. Si
guardes el coneixement a Obsidian, els resums hi arriben sense copiar-los a mà. No té
prompt: és una destinació d'exportació.

### Targetes Anki
Converteix el contingut en **targetes de memòria** (flashcards de pregunta/resposta)
i les exporta a Obsidian amb la sintaxi `obsidian_to_anki`, a punt per repassar-les
amb repetició espaiada.

**Com funciona:**

- Genera un paquet de targetes (per defecte **5**; configurable) sobre els punts
  clau del contingut.
- Cada targeta s'**edita** o es **descarta** individualment; pots
  `Selecciona-ho tot` / `Deselecciona-ho tot` i `Descarta-ho tot`.
- **`Genera més`** empeny el model cap a detalls secundaris per treure'n de noves;
  **`Afinar`** centra la generació en un aspecte concret.
- Té el seu **vault propi** (independent del plugin d'Obsidian), ruta de la nota,
  mida del paquet i **idioma** (català o anglès) configurables.

**Què fa el prompt per defecte:** demana a la IA que faci d'assistent d'estudi i
generi targetes pregunta/resposta autocontingudes i comprovables, sense inventar res
que no surti al contingut, en l'idioma configurat i en format JSON perquè Resumir les
pugui mostrar i exportar.

![Panell de Targetes Anki: cada targeta amb pregunta i resposta, i botons Edita/Descarta](./img/panell-anki.webp)

### Copiar Markdown
Copia el resum al porta-retalls en Markdown, amb una plantilla personalitzable (per
exemple afegint-hi el títol o l'enllaç de la font). Per enganxar-lo on vulguis.

---

## 👁️ Llegir millor

### Lectura biònica
Ressalta l'inici de cada paraula per guiar la vista i llegir més de pressa. Pots
ajustar la intensitat (fixació), la tipografia, la mida i l'interlineat. Funciona
tant sobre l'original com sobre el resum.

---

## Personalitzar la barra

A **Configuració (⚙️) → Plugins**:

- **Activa o desactiva** cada plugin amb l'interruptor.
- **Reordena'ls** amb les fletxes ▲▼: l'ordre de la barra lateral és el que tu
  decideixis.
- **Edita el prompt** de cada lent des del seu engranatge (⚙️) i **restaura'l** a
  l'original quan vulguis.

---

Si encara no tens la clau de Google, segueix la
**[guia de la clau d'API](./API-KEY-GOOGLE.md)**. Per tornar enrere, ves a la
**[guia d'inici](./GUIA-INICI.md)**.
