# Els plugins de Resumir

Cada eina de Resumir és un **plugin** amb el seu botó a la barra lateral. A
**Configuració (⚙️) → Plugins** els actives, els reordenes amb les fletxes i obres
la configuració de cadascun amb l'engranatge. Estan agrupats com a la barra:
**Generar**, **Exportar** i **Vista**.

![Pàgina de Plugins de la configuració: la llista agrupada en Generar, Exportar i Vista, amb fletxes per reordenar, un interruptor i un engranatge a cada plugin](./img/plugins-llista.webp)

Les pàgines web, els vídeos de YouTube (per la transcripció), els fils de Hacker
News i de X es detecten sols: tu només tries què en vols.

> **Les instruccions són teves.** Cada eina que genera text funciona amb unes
> instruccions (un *prompt*). Les que porta per defecte ja funcionen bé, però a la
> configuració del plugin, a **«Personalitzar les instruccions (avançat)»**, les pots
> editar i, amb **«Restaurar»**, tornar a l'original. Totes tracten el contingut de
> la pàgina com a dades, mai com a ordres.

---

## Generar

### Resum
L'essencial per fer-te'n una idea ràpida: un paràgraf inicial, els **punts clau**
(cadascun amb una cita clicable), els **aprenentatges** i algunes **cites**
literals. Si la pàgina no té prou contingut, t'ho diu en lloc d'inventar-se res.

A la configuració de Resum tries el **format** (paràgraf i punts, només punts, dues
o tres frases o prosa), la **llargada** i els idiomes preferits per a les
transcripcions de YouTube.

![Configuració de Resum: format del resum, llargada, idiomes de YouTube i, desplegades, les instruccions de l'assistent amb els botons Desar i Restaurar](./img/prompt-resum.webp)

### PDF
Tria un PDF del teu ordinador: Resumir l'obre en un visor propi i després el resums
amb l'eina que vulguis. Els PDF escanejats, que són només imatge, no es poden llegir.

### Explica-ho fàcil
Per a temes densos o d'un camp que no domines. Ho reescriu en llenguatge planer:
de què va, analogies per entendre-ho, les paraules difícils explicades i per què
t'hauria d'importar.

![Explica-ho fàcil a la barra lateral: una frase inicial i els apartats «De què va, exactament?», «Per entendre-ho millor», «Paraules que potser no coneixes» i «Per què t'hauria d'importar?»](./img/panell-explica-facil.webp)

### Aprofundiment
Quan vols entendre-ho a fons: arguments, proves, matisos, punts febles i preguntes
obertes. Separa el que diu el text del que n'opina la IA.

### Validació científica
Per contrastar estudis i afirmacions. Comença amb un veredicte (sòlid, raonable amb
reserves, feble o no avaluable) i revisa el mètode, la mostra i els salts lògics
segons el que diu el mateix text. No s'inventa referències: el que compara amb el
consens ho marca com a no verificat. És una ajuda, no una verificació; contrasta
sempre les fonts importants.

### Mapa conceptual
L'estructura d'un cop d'ull: un mapa interactiu que pots desplegar, ampliar, veure
a pantalla completa o en llista, i descarregar com a imatge.

![Mapa conceptual a la barra lateral: el tema central «Per què oblidem el que llegim» es ramifica en quatre branques amb les seves idees, i al costat els botons per ampliar, reduir, ajustar i descarregar](./img/mapa-conceptual.webp)

### Targetes Anki
Converteix el contingut en targetes de pregunta i resposta per repassar amb Anki.
Cada targeta es pot **editar** o **descartar**; **«Generar més»** en treu de noves i
**«Afinar»** les centra en un aspecte concret. Les seleccionades s'afegeixen a una
nota d'Obsidian amb el format d'`obsidian_to_anki`. A la configuració hi tries la
bóveda, la nota, quantes targetes per tanda i l'idioma.

![Targetes Anki a la barra lateral: cinc targetes amb pregunta, resposta i els botons Editar i Descartar, i a sota «Generar més», «Descartar-ho tot», «Seleccionar-ho tot», «Afegir a Obsidian» i el camp «Afinar»](./img/panell-anki.webp)

---

## Exportar

### Desar a Obsidian
Desa el resum a la teva bóveda d'Obsidian, amb la carpeta i la plantilla que vulguis.

### Copiar Markdown
Copia el resum al porta-retalls en Markdown, amb una plantilla que pots adaptar (per
exemple, amb el títol i l'enllaç de la font).

---

## Vista

### Lectura biònica
Posa en negreta l'inici de cada paraula per guiar la vista. Pots ajustar-ne la
intensitat, la tipografia, la mida, el gruix i l'interlineat, amb una vista prèvia.

---

Encara no tens la clau? Segueix la **[guia de la clau d'API](./API-KEY-GOOGLE.md)**.
Per començar, la **[guia d'inici](./GUIA-INICI.md)**.
