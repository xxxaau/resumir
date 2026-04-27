// tests/youtube-track-select.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { selectYoutubeTrack } = require("../sidebar/youtube-track-select.js");

const manual = (lang) => ({ lang, langName: lang, vssId: "." + lang, isAsr: false });
const asr = (lang) => ({ lang, langName: lang + " (auto)", vssId: "a." + lang, isAsr: true });

// ---------------------------------------------------------------------------
// Preferència d'usuari
// ---------------------------------------------------------------------------

test("tria per preferència d'usuari — primera coincidència guanya", () => {
    const tracks = [manual("de"), manual("en"), manual("ca")];
    const res = selectYoutubeTrack(tracks, null, ["ca", "es"], "en-US");
    assert.equal(res.track.lang, "ca");
    assert.equal(res.reason, "preferred:ca");
});

test("prefix match — 'es' preferit matcheja 'es-419'", () => {
    const tracks = [manual("es-419"), manual("en")];
    const res = selectYoutubeTrack(tracks, null, ["es"], "en-US");
    assert.equal(res.track.lang, "es-419");
    assert.equal(res.reason, "preferred:es");
});

test("match exacte preval sobre prefix quan ambdues existeixen", () => {
    // Si hi ha "es" exacte i "es-419" prefix, l'exacte guanya.
    const tracks = [manual("es-419"), manual("es"), manual("en")];
    const res = selectYoutubeTrack(tracks, null, ["es"], "en-US");
    assert.equal(res.track.lang, "es");
});

// ---------------------------------------------------------------------------
// Fallback a navigator.language
// ---------------------------------------------------------------------------

test("fallback a navigator.language quan no hi ha preferència", () => {
    const tracks = [manual("de"), manual("ca"), manual("en")];
    const res = selectYoutubeTrack(tracks, null, [], "ca-ES");
    assert.equal(res.track.lang, "ca");
    assert.equal(res.reason, "preferred:ca");
});

test("fallback a 'en' quan navigator.language no matcheja cap pista", () => {
    const tracks = [manual("de"), manual("en"), manual("ja")];
    const res = selectYoutubeTrack(tracks, null, [], "ca-ES");
    // ca no hi és → 'en' és el fallback universal
    assert.equal(res.track.lang, "en");
    assert.equal(res.reason, "preferred:en");
});

// ---------------------------------------------------------------------------
// ASR
// ---------------------------------------------------------------------------

test("només ASR disponible retorna ASR amb reason first-asr", () => {
    const tracks = [asr("en")];
    const res = selectYoutubeTrack(tracks, null, ["ca"], "ca");
    // ca no matcheja, en sí matcheja (encara que sigui ASR)
    assert.equal(res.track.lang, "en");
    assert.equal(res.reason, "preferred:en");
});

test("prefereix manual sobre ASR del mateix idioma", () => {
    const tracks = [asr("en"), manual("en")];
    const res = selectYoutubeTrack(tracks, null, ["en"], "en-US");
    assert.equal(res.track.isAsr, false, "ha de triar la manual, no l'ASR");
});

test("cau a ASR si només hi ha ASR i cap idioma preferit matcheja", () => {
    const tracks = [asr("fr")];
    const res = selectYoutubeTrack(tracks, null, ["ca"], "de-DE");
    // ca, de, en cap matcheja → fallback
    assert.equal(res.track.lang, "fr");
    assert.equal(res.reason, "first-asr");
});

// ---------------------------------------------------------------------------
// Pista activa del player
// ---------------------------------------------------------------------------

test("prefereix pista activa del player si cap preferència matcheja", () => {
    const tracks = [manual("de"), manual("fr"), manual("ja")];
    // preferred [] → browserLang "xx-XX" (no matcheja) → 'en' no hi és → player-active
    const res = selectYoutubeTrack(tracks, ".fr", [], "xx-XX");
    assert.equal(res.track.lang, "fr");
    assert.equal(res.reason, "player-active");
});

test("activeVssId no matcheja cap pista: cau a first-manual", () => {
    const tracks = [manual("de"), manual("ja")];
    const res = selectYoutubeTrack(tracks, ".ca", [], "xx-XX");
    assert.equal(res.track.lang, "de");
    assert.equal(res.reason, "first-manual");
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

test("tracks buits retorna null", () => {
    assert.equal(selectYoutubeTrack([], null, [], "en"), null);
});

test("tracks null retorna null", () => {
    assert.equal(selectYoutubeTrack(null, null, [], "en"), null);
});

test("preferredLangs duplica 'en' — sense comportament estrany", () => {
    const tracks = [manual("en"), manual("de")];
    const res = selectYoutubeTrack(tracks, null, ["en"], "en-US");
    assert.equal(res.track.lang, "en");
    assert.equal(res.reason, "preferred:en");
});
