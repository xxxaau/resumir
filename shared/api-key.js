/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// shared/api-key.js
// Neteja i comprovació de la clau d'API de Gemini. Compartit per l'onboarding de
// la barra lateral i la pàgina de configuració (carregat als dos HTML).

/**
 * Neteja el que l'usuari enganxa com a clau: espais i salts de línia, cometes
 * i el prefix «Bearer » (error habitual en copiar d'un exemple de capçalera).
 */
function normalizeApiKey(raw) {
    if (typeof raw !== "string") return "";
    return raw.trim().replace(/^["']|["']$/g, "").replace(/^Bearer\s+/i, "").trim();
}

/** Les claus de Google AI Studio comencen per «AIza»; només és un avís, no un bloqueig. */
function looksLikeGeminiKey(key) {
    return /^AIza[0-9A-Za-z_-]{30,}$/.test(key);
}

/**
 * Tradueix el resultat de la comprovació de clau a un missatge accionable.
 * @param {number|null} status HTTP, o null si no hi ha hagut resposta (xarxa)
 */
function describeKeyCheck(status) {
    if (status === null) return { ok: false, message: "No s'ha pogut connectar amb Google. Comprova la connexió i torna-ho a provar." };
    if (status >= 200 && status < 300) return { ok: true, message: "Clau vàlida." };
    if (status === 400) return { ok: false, message: "La clau no és vàlida. Torna-la a copiar de Google AI Studio." };
    if (status === 401 || status === 403) return { ok: false, message: "Google ha rebutjat la clau (sense permís o l'API de Gemini no està habilitada). Crea'n una de nova a AI Studio." };
    if (status === 429) return { ok: false, message: "Has arribat al límit gratuït de peticions. Espera uns minuts i torna-ho a provar." };
    if (status >= 500) return { ok: false, message: "El servei de Gemini no està disponible ara mateix. Prova-ho d'aquí a uns minuts." };
    return { ok: false, message: `Google ha respost amb un error inesperat (${status}).` };
}

/**
 * Comprova una clau amb una consulta barata (llistar models, sense generar
 * res). Retorna { ok, message }.
 */
async function verifyApiKey(rawKey) {
    const key = normalizeApiKey(rawKey);
    if (!key) return { ok: false, message: "Enganxa primer la clau." };
    try {
        const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1", {
            headers: { "x-goog-api-key": key },
        });
        return { ...describeKeyCheck(response.status), key };
    } catch (_e) {
        return describeKeyCheck(null);
    }
}

/**
 * Camp de la clau d'API sense que el navegador ofereixi desar-la com a contrasenya. Els gestors de
 * contrasenyes (Firefox, Chrome, 1Password, LastPass…) actuen sobre <input type="password">; la clau
 * no és cap contrasenya d'usuari, així que es fa servir un camp de text emmascarat amb CSS
 * (`-webkit-text-security`, que Firefox i Chromium accepten) i se'n desactiven les ajudes. Si el
 * navegador no admet l'emmascarament per CSS es manté type="password" (la clau no es pot veure mai).
 */
function secretInputSupportsTextMask() {
    try { return typeof CSS !== "undefined" && !!CSS.supports && CSS.supports("-webkit-text-security", "disc"); }
    catch { return false; }
}

function hardenSecretInput(input) {
    input.setAttribute("autocomplete", "off");
    input.setAttribute("autocapitalize", "off");
    input.setAttribute("autocorrect", "off");
    input.setAttribute("spellcheck", "false");
    input.setAttribute("data-lpignore", "true");   // LastPass
    input.setAttribute("data-1p-ignore", "");      // 1Password
    input.setAttribute("data-bwignore", "true");   // Bitwarden
    input.setAttribute("data-form-type", "other"); // Dashlane
    if (secretInputSupportsTextMask()) {
        input.type = "text";
        input.classList.add("secret-mask");
    } else {
        input.type = "password";
        input.classList.remove("secret-mask");
    }
}

/** Mostra/amaga el camp; retorna true si ara es veu. */
function toggleSecretInput(input) {
    if (input.classList.contains("secret-mask")) {
        const show = !input.classList.contains("secret-shown");
        input.classList.toggle("secret-shown", show);
        return show;
    }
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    return show;
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { normalizeApiKey, looksLikeGeminiKey, describeKeyCheck, verifyApiKey, secretInputSupportsTextMask, hardenSecretInput, toggleSecretInput };
}
