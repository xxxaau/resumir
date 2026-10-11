/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// sidebar/pdf-zoom.js
// Càlcul pur de l'escala de renderitzat del visor PDF (sense DOM, testejable).

/**
 * Escala final per pintar una pàgina: l'«ajust a pàgina» (calculat sobre la
 * mida de la pàgina a escala 1) multiplicat pel zoom de l'usuari. Un zoom d'1
 * (100 %) vol dir «pàgina sencera visible»; més gran amplia i es pot
 * desplaçar. Abans l'ajust es limitava amb el mateix `scale` de l'usuari, de
 * manera que apropar no feia mai res més enllà de l'ajust.
 *
 * @param {number} pageWidth        amplada de la pàgina a escala 1
 * @param {number} pageHeight       alçada de la pàgina a escala 1
 * @param {number} availableWidth   amplada útil del contenidor
 * @param {number} availableHeight  alçada útil del contenidor
 * @param {number} zoom             zoom de l'usuari (1 = ajust a pàgina)
 * @returns {number}
 */
function computePdfScale(pageWidth, pageHeight, availableWidth, availableHeight, zoom) {
    if (!(pageWidth > 0) || !(pageHeight > 0)) return zoom > 0 ? zoom : 1;
    const fit = Math.min(availableWidth / pageWidth, availableHeight / pageHeight);
    const safeFit = fit > 0 ? fit : 1;
    return safeFit * (zoom > 0 ? zoom : 1);
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { computePdfScale };
}
