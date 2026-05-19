# Política de Privadesa - Resumir contingut

**Última actualització:** 25 de Febrer de 2026

La teva privadesa és important per a nosaltres. Aquesta política explica com l'extensió **Resumir contingut** gestiona les teves dades.

## 1. Recollida de Dades

L'extensió **NO** recopila ni comparteix dades personals amb els desenvolupadors de l'extensió. Tanmateix, el text seleccionat o el contingut de la pàgina que es processa es transmet a Google Gemini quan generes un resum; aquesta és l'excepció descrita a l'apartat 2 ("Ús de Google Gemini API").

### Dades Locals

Les següents dades s'emmagatzemen exclusivament al teu navegador (`browser.storage.sync` i `browser.storage.local`):

- **API Key de Google Gemini**: Necessària per connectar amb el servei d'IA. Aquesta clau es guarda localment i s'envia només en headers HTTP a la crida de l'API.
- **Memòria cau de Resums**: Títol, URL, text del resum, model i data de generació.
- **Historial d'ús**: Títol, URL, model, tokens consumits i durada de cada petició (pestanya "Estadístiques").
- **Preferències**: Configuració de model, tema, prompts i extensions actives.

El text de la pàgina que es processa no es desa externament per l'extensió mateixa, sinó que es transmet a Google Gemini per generar el resum quan l'usuari ho sol·licita.

## 2. Ús de Google Gemini API

Per a generar els resums, l'extensió envia el contingut de text de la pàgina web que estàs visitant (i que explícitament demanes resumir) als servidors de Google.

- **Què s'envia**: El text i títol de la pàgina web activa quan prems el botó "Resumir". Aquesta informació s'envia a Google Gemini per generar el resum.
- **A on s'envia**: Al servei `generativelanguage.googleapis.com` (Google Gemini API).
- **Com s'envia**: L'API Key s'envia via header HTTP (`x-goog-api-key`), mai en una URL.
- **Tractament de Google**: L'ús d'aquestes dades es regeix per la [Política de Privadesa de Google](https://policies.google.com/privacy) i els [Termes de Servei de la API de Generative AI](https://ai.google.dev/terms).
- **No entrenament**: Si fas servir una API Key de pagament o enterprise, Google no utilitza les teves dades per entrenar els seus models. Amb claus gratuïtes, consulta les condicions específiques de Google.

## 3. YouTube i contingut de tercers

- Quan resums vídeos de **YouTube**, l'extensió executa un petit script en el context de la pàgina (`world: "MAIN"`) per llegir les dades del reproductor (`ytInitialPlayerResponse`) ja carregades al navegador i extreure'n la transcripció automàtica. **No es fa cap petició de xarxa addicional als servidors de YouTube.** No s'envien dades de l'usuari.

## 4. Permisos Requerits

| Permís | Ús |
| --- | --- |
| `activeTab` | Llegir el contingut de la pestanya actual només quan actives l'extensió |
| `storage` | Guardar la teva API Key, preferències, memòria cau i historial d'ús localment |
| `scripting` | Injectar el parser de contingut (Readability.js) per extreure text net |
| `tabs` | Consultar la pestanya activa, obrir links en noves pestanyes i gestionar integracions |
| `menus` / `contextMenus` | Crear entrades al menú contextual ("Resumir text seleccionat" i "Resumir contingut") |
| `sidePanel` | Obrir el panell lateral natiu a navegadors basats en Chromium |
| `<all_urls>` (opcional) | Permís host demanat dinàmicament per executar scripts de lectura en qualsevol pàgina |

## 5. Contacte i codi font

Si tens algun dubte sobre aquesta política, pots contactar amb el desenvolupador o consultar el codi font al repositori oficial del projecte (vegeu l'enllaç `homepage_url` al `manifest.json` o al `README.md`).
