/**
 * Comprovacions de seguretat del codi font, pures i testejables.
 */

/**
 * Retorna els fetch() que porten una clau a la URL (`?key=` o `&key=`).
 * Mira una finestra de 500 caràcters des del `fetch(`, així detecta
 * convocatòries multilínia (no només la línia del fetch).
 * @param {string} src
 * @returns {{line: number, call: string, text: string}[]}
 */
export function findQueryKeyFetches(src) {
    const out = [];
    const re = /\bfetch\s*\(/g;
    let m;
    while ((m = re.exec(src)) !== null) {
        const chunk = src.slice(m.index, m.index + 500);
        if (/[?&]key=/.test(chunk)) {
            out.push({
                line: src.slice(0, m.index).split("\n").length,
                call: chunk.split("\n")[0].trim(),
                text: chunk,
            });
        }
    }
    return out;
}

/**
 * L'única excepció coneguda: la clau pública INNERTUBE de YouTube dins del
 * content script. No és un secret; qualsevol altra coincidència ha de fallar.
 * @param {string} file
 * @param {{text: string}} hit
 * @returns {boolean}
 */
export function isAllowedPublicKeyFetch(file, hit) {
    const isContentJs = /(^|[\\/])content\.js$/.test(String(file));
    return isContentJs && /youtubei\/v1\/get_transcript\?key=/.test(hit?.text || "");
}
