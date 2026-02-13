# Política de Privadesa - Resumir contingut

**Última actualització:** 12 de Febrer de 2026

La teva privadesa és important per a nosaltres. Aquesta política explica com l'extensió **Resumir contingut** gestiona les teves dades.

## 1. Recollida de Dades

L'extensió **NO** recull, emmagatzema ni comparteix dades personals, de navegació o d'ús amb els desenvolupadors de l'extensió ni amb tercers, amb l'única excepció descrita a l'apartat 2 ("Ús de Google Gemini API").

### Dades Locals

Les següents dades s'emmagatzemen exclusivament al teu navegador (`browser.storage.local`) i mai surten del teu dispositiu:

- **API Key de Google Gemini**: Necessària per connectar amb el servei d'IA.
- **Historial de Resums**: Títol, URL i data dels resums que has generat.
- **Preferències**: Configuració de model, idioma i tema.

## 2. Ús de Google Gemini API

Per a generar els resums, l'extensió envia el contingut de text de la pàgina web que estàs visitant (i que explícitament demanes resumir) als servidors de Google.

- **Què s'envia**: Únicament el text i títol de la pàgina web activa quan prems el botó "Resumir".
- **A on s'envia**: Al servei `generativelanguage.googleapis.com` (Google Gemini API).
- **Tractament de Google**: L'ús d'aquestes dades es regeix per la [Política de Privadesa de Google](https://policies.google.com/privacy) i els [Termes de Servei de la API de Generative AI](https://ai.google.dev/terms).
- **No entrenament**: Si fas servir una API Key de pagament o enterprise, Google no utilitza les teves dades per entrenar els seus models. Amb claus gratuïtes, consulta les condicions específiques de Google.

## 3. Permisos Requerits

- **activeTab**: Per llegir el contingut de la pestanya actual només quan actives l'extensió.
- **storage**: Per guardar la teva API Key i preferències localment.
- **scripting**: Per netejar el contingut de la pàgina (mòde lectura) abans d'enviar-lo.

## 4. Contacte

Si tens algun dubte sobre aquesta política, pots contactar amb el desenvolupador o consultar el codi font obert al repositori del projecte.
