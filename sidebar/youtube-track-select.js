/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// sidebar/youtube-track-select.js
// Selecció de pista de subtítols de YouTube segons preferències.
// Pur i testejable (sense DOM).

/**
 * @typedef {Object} YtTrack
 * @property {string} lang       ISO code, p.ex. "ca", "en", "es-419"
 * @property {string} langName   Nom localitzat segons el browser (només informatiu)
 * @property {string} vssId      p.ex. ".en", "a.en" (ASR)
 * @property {boolean} isAsr     true si kind === "asr" o vssId comença per "a."
 */

/**
 * Tria la millor pista segons preferències.
 *
 * Ordre de resolució:
 *   1. preferredLangs (preferència explícita d'usuari)
 *   2. browserLang (prefix, p.ex. "ca-ES" → busca "ca")
 *   3. anglès "en" com a fallback universal (dins del mateix loop anterior)
 *   4. pista activa del player (activeVssId)
 *   5. primera no-ASR
 *   6. primera ASR
 *
 * Match per codi: exacte primer, després per prefix (p.ex. "es" matcheja "es-419").
 *
 * @param {YtTrack[]} tracks
 * @param {string|null} activeVssId
 * @param {string[]} preferredLangs  Llista ordenada, p.ex. ["ca", "es", "en"]
 * @param {string} browserLang       navigator.language, p.ex. "ca-ES"
 * @returns {{ track: YtTrack, reason: string } | null}
 */
function selectYoutubeTrack(tracks, activeVssId, preferredLangs, browserLang) {
    if (!Array.isArray(tracks) || tracks.length === 0) return null;

    const browserPrefix = (browserLang || "").split("-")[0];
    // "en" s'afegeix com a fallback universal només si no ja hi és.
    const langs = [...(preferredLangs || []), browserPrefix, "en"]
        .filter(Boolean)
        .filter((v, i, a) => a.indexOf(v) === i);

    const nonAsr = tracks.filter(t => !t.isAsr);

    const findByCode = (code, pool) => {
        const prefix = code.split("-")[0];
        return pool.find(t => t.lang === code) ||
               pool.find(t => t.lang.split("-")[0] === prefix);
    };

    for (const code of langs) {
        const hit = findByCode(code, nonAsr) || findByCode(code, tracks);
        if (hit) return { track: hit, reason: `preferred:${code}` };
    }
    if (activeVssId) {
        const hit = tracks.find(t => t.vssId === activeVssId);
        if (hit) return { track: hit, reason: "player-active" };
    }
    const fallback = nonAsr[0] || tracks[0];
    return {
        track: fallback,
        reason: fallback.isAsr ? "first-asr" : "first-manual",
    };
}

// Export per a Node.js (tests) i per a ús al navegador.
if (typeof module !== "undefined" && module.exports) {
    module.exports = { selectYoutubeTrack };
}
