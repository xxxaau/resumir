# Resumir contingut (Firefox Extension)

Una extensió de Firefox per a resumir pàgines web utilitzant la potència dels models d'Intel·ligència Artificial de Google (Gemini i Gemma).

## Característiques Principals

- **Resum Intel·ligent**: Genera resums concisos i estructurats de qualsevol pàgina web amb un sol clic.
- **Suport Especial per a Hacker News**: Detecta fils de discussió i inclou els millors comentaris en el resum automàticament.
- **Models Avançats**: Suport per a **Gemma 3 (27b-it)**, Gemini 1.5 Flash, Gemini 1.5 Pro i Gemini 2.0 Flash.
- **Rendiment Extrem**: Càrrega especulativa i respostes en temps real (Streaming) per una experiència instantània.
- **Gestió de Quotes i Estadístiques**: Tauler complet amb historial de peticions, consum de tokens i velocitat de resposta.
- **Barra Lateral Integrada**: Funciona còmodament des de la barra lateral del navegador sense interrompre la navegació.
- **Configuració "Web Clipper"**: Pàgina de configuració completa i moderna.
- **Exportació Personalitzable**: Copia els resums en format Markdown amb plantilles personalitzables.

## Instal·lació en Local (Desenvolupament)

Aquesta extensió no està disponible actualment a la botiga d'extensions de Mozilla i s'ha d'instal·lar en mode de desenvolupament ("Side-loading").

1.  **Clonar o Descarregar**: Descarrega el codi font d'aquest repositori al teu ordinador.
2.  **Obrir Firefox**: Obre el navegador Firefox.
3.  **Anar a Debugging**: Escriu `about:debugging#/runtime/this-firefox` a la barra de direccions i prem Enter.
4.  **Carregar l'Extensió**:
    - Fes clic al botó **"Load Temporary Add-on..."** (Carrega complement temporal).
    - Navega a la carpeta on has descarregat el projecte.
    - Selecciona el fitxer `manifest.json`.
5.  **Llest!**: L'extensió apareixerà a la teva barra d'eines o al menú d'extensions. Recomanem fixar-la a la barra d'eines i obrir-la com a barra lateral.

**Nota:** En el Firefox estàndard, aquesta instal·lació és **temporal** i desapareixerà quan tanquis el navegador. Per fer-la permanent, mira la secció "Instal·lació Permanent".

## Instal·lació Permanent (Opcions)

Com que l'extensió no està publicada oficialment, tens dues opcions per instal·lar-la de manera permanent:

### Opció A: Firefox Developer Edition (Sense signar)

Si vols evitar qualsevol interacció amb els servidors de Mozilla:

1.  Descarrega i instal·la [Firefox Developer Edition](https://www.mozilla.org/firefox/developer/).
2.  Escriu `about:config` a la barra de direccions i accepta el risc.
3.  Busca la preferència `xpinstall.signatures.required` i canvia-la a `false`.
4.  Comprimeix els fitxers de l'extensió (manifest.json, background.js, carpetes...) en un fitxer `.zip`.
5.  Canvia l'extensió del fitxer de `.zip` a `.xpi`.
6.  Arrossega el fitxer `.xpi` a la finestra de Firefox Developer Edition per instal·lar-lo.

### Opció B: Signatura Privada (Self-Hosted)

Aquesta és la manera recomanada per usar-la al Firefox estàndard:

1.  Crea un compte a [Firefox Add-ons Developer Hub](https://addons.mozilla.org/developers/).
2.  Puja el fitxer `.zip` de la teva extensió.
3.  Selecciona l'opció **"On my own"** (no distribuir en el lloc web de Mozilla).
4.  Mozilla farà una revisió automàtica i signarà l'extensió.
5.  Descarrega el fitxer `.xpi` signat (normalment disponible en uns minuts).
6.  Arrossega aquest fitxer al teu Firefox normal i s'instal·larà permanentment.

## Configuració Inicial

Abans de fer servir l'extensió, necessites configurar la teva clau API de Google. És un procés gratuït i ràpid:

1.  **Obtenir la Clau API**:
    - Vés a [Google AI Studio](https://aistudio.google.com/).
    - Inicia sessió amb el teu compte de Google.
    - Fes clic al botó **"Get API key"** (normalment a la part superior esquerra).
    - Fes clic a **"Create API key"**.
    - Si tens un projecte existent de Google Cloud, el pots seleccionar. Si no, tria "Create API key in new project".
    - Copia la clau que apareix (comença per `AIza...`).

2.  **Configurar l'Extensió**:
    - Fes clic a la icona de l'extensió al navegador per obrir la barra lateral, o vés a **Extensions > Resumir contingut > Opcions**.
    - A la pàgina de configuració (`Configuració General`), enganxa la teva clau al camp **Google Gemini API Key**.
    - Fes clic a **"Desar canvis"**.

## Estructura del Projecte

- `/sidebar`: Codi HTML/JS/CSS de la barra lateral principal.
- `/options`: Pàgina de configuració independent (estil "Web Clipper").
- `/icons`: Icones de l'aplicació.
- `manifest.json`: Configuració principal de l'extensió (Manifest V3).
- `background.js`: Scripts de fons per a la gestió d'esdeveniments.

## Seguretat i Privadesa

- **Dades locals**: La teva clau API i l'historial de quotes es guarden localment al navegador (`browser.storage.local`).
- **Connexions externes**: L'extensió només es connecta als servidors de Google (`generativelanguage.googleapis.com`) per enviar el text de la pàgina i rebre el resum. No s'envia cap dada a servidors de tercers ni es rastreja l'activitat de navegació més enllà de la pàgina que demanes resumir.

## Llicència

Projecte d'ús personal en desenvolupament.
