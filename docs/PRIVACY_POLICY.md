# Política de Privadesa - Resumir

**Última actualització:** 14 d'octubre de 2026

La teva privadesa és important per a nosaltres. Aquesta política explica com l'extensió **Resumir** gestiona les teves dades.

## 1. Recollida de Dades

L'extensió **NO** recopila ni comparteix dades personals amb els desenvolupadors de l'extensió. Tanmateix, el text seleccionat o el contingut de la pàgina que es processa es transmet a Google Gemini quan generes un resum; aquesta és l'excepció descrita a l'apartat 2 ("Ús de Google Gemini API").

### Dades Locals

Les següents dades s'emmagatzemen al teu navegador. La clau d'API, la memòria cau, l'historial i les estadístiques van a `browser.storage.local` (només aquest ordinador); les preferències van a `browser.storage.sync`, que el navegador pot sincronitzar amb el teu compte si hi tens la sincronització activada (l'extensió mateixa no envia res a cap servidor propi):

- **API Key de Google Gemini**: Necessària per connectar amb el servei d'IA. Aquesta clau es guarda localment i s'envia només en headers HTTP a la crida de l'API.
- **Memòria cau de Resums**: Títol, URL, text del resum, model i data de generació.
- **Historial d'ús**: Títol, URL, model, tokens consumits i durada de cada petició (pestanya "Estadístiques").
- **Preferències** (`storage.sync`): Configuració de model, tema, prompts i extensions actives. La clau d'API no hi és mai.

El text de la pàgina que es processa no es desa externament per l'extensió mateixa, sinó que es transmet a Google Gemini per generar el resum quan l'usuari ho sol·licita.

## 2. Ús de Google Gemini API

Per a generar els resums, l'extensió envia el contingut de text de la pàgina web que estàs visitant (i que explícitament demanes resumir) als servidors de Google.

- **Què s'envia**: El text i títol de la pàgina web activa quan demanes un resum o qualsevol altra acció que generi text (mapa conceptual, targetes d'Anki, aprofundiment…), amb les instruccions corresponents. Aquesta informació s'envia a Google Gemini; si un model supera la quota, l'extensió pot reenviar el mateix text a un altre model de Gemini.
- **A on s'envia**: Al servei `generativelanguage.googleapis.com` (Google Gemini API).
- **Com s'envia**: L'API Key s'envia via header HTTP (`x-goog-api-key`), mai en una URL.
- **Tractament de Google**: L'ús d'aquestes dades es regeix per la [Política de Privadesa de Google](https://policies.google.com/privacy) i els [Termes de Servei de la API de Generative AI](https://ai.google.dev/terms).
- **No entrenament**: Si fas servir una API Key de pagament o enterprise, Google no utilitza les teves dades per entrenar els seus models. Amb claus gratuïtes, consulta les condicions específiques de Google.

## 3. YouTube i contingut de tercers

Quan resumeixes un fil de Hacker News, l'extensió descarrega (sense galetes ni credencials) l'article enllaçat; quan resumeixes un PDF remot, el descarrega des de la seva URL. Són peticions GET del teu navegador cap a aquest lloc; no s'hi envia cap dada teva.


- Quan resums vídeos de **YouTube**, l'extensió executa un petit script en el context de la pàgina (`world: "MAIN"`) per llegir les dades del reproductor ja carregades al navegador i obtenir-ne la transcripció (també l'automàtica).
- Per obtenir-la, l'extensió pot fer les mateixes peticions que fa el reproductor de YouTube (subtítols i transcripció) **a youtube.com, amb la teva sessió del navegador**. Mai fa peticions a tercers i no s'hi envia cap dada teva més enllà del que ja envia el reproductor.

## 4. Permisos Requerits

| Permís | Ús |
| --- | --- |
| `activeTab` | Llegir el contingut de la pestanya actual només quan actives l'extensió |
| `storage` | Guardar la teva API Key, preferències, memòria cau i historial d'ús localment |
| `scripting` | Injectar el parser de contingut (Readability.js) per extreure text net |
| `tabs` | Consultar la pestanya activa, obrir links en noves pestanyes i gestionar integracions |
| `menus` / `contextMenus` | Crear entrades al menú contextual ("Resumir la selecció" i "Resumir aquesta pàgina") |
| `sidePanel` | Obrir el panell lateral natiu a navegadors basats en Chromium |
| `<all_urls>` (requerit) | Permís host requerit, concedit a la instal·lació, per executar scripts de lectura en qualsevol pàgina |

## 5. Contacte i codi font

Si tens algun dubte sobre aquesta política, pots contactar amb el desenvolupador o consultar el codi font al repositori oficial del projecte (vegeu l'enllaç `homepage_url` al `manifest.json` o al `README.md`).
