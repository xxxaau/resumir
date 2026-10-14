# Com obtenir la clau d'API de Google Gemini

Resumir fa els resums amb **Google Gemini**. Per connectar-s'hi necessita una
**clau d'API**: una mena de contrasenya personal entre l'extensió i Google.

> **És gratuïta** i no demana targeta. El nivell gratuït sol bastar per a un ús
> personal.
>
> **És privada.** La clau es desa només en aquest ordinador i només s'envia a
> Google. Resumir no té cap servidor propi.

Es fa una sola vegada i triga un parell de minuts. Només cal un compte de Google
(el del Gmail o YouTube).

---

## Pas 1 — Crea la clau

1. Obre **[aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)**
   i inicia sessió amb Google. La primera vegada potser hauràs d'acceptar les
   condicions.
2. Clica **«Create API key»**. Si et demana un projecte, accepta el que t'ofereix.
3. Apareixerà la clau, un text llarg que comença per `AIza`. **Copia-la.**

> Tracta-la com una contrasenya: no la comparteixis. Si cal, la pots esborrar i
> crear-ne una de nova a la mateixa pàgina.

---

## Pas 2 — Enganxa-la a Resumir

Obre **Resumir → Configuració (⚙️) → General → Claus i models**, enganxa la clau i
clica **«Comprovar»**. Si surt «Clau vàlida i desada», ja ho tens.

---

## Pas 3 — Prova-ho

Obre un article, obre Resumir i clica **«Resumir aquesta pàgina»** (o prem
**Alt+Maj+S**). Si al cap d'uns segons tens el resum, ja està.

---

## Problemes habituals

**«La clau no és vàlida»**
Torna-la a copiar sencera, sense espais al davant ni al darrere. Si continua
fallant, esborra-la a [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
i crea'n una de nova.

**Error de límit o va lent**
El nivell gratuït limita les peticions per minut: espera uns segons i torna-ho a
provar. Si en fas un ús intensiu, pots activar la facturació al teu projecte de
Google (opcional, de pagament).

**He perdut la clau**
A [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) hi tens
totes les teves claus. Si no la recuperes, crea'n una de nova i enganxa-la a
Resumir.

---

I ara, mira què pots fer a la **[guia de plugins](./PLUGINS.md)**, o torna a la
**[guia d'inici](./GUIA-INICI.md)**.
