import { test } from "node:test";
import assert from "node:assert/strict";

import { findQueryKeyFetches, isAllowedPublicKeyFetch } from "../scripts/lib/security-checks.mjs";

test("findQueryKeyFetches: detecta fetch d'una línia amb ?key=", () => {
    const hits = findQueryKeyFetches('fetch("https://x/y?key=SECRET");');
    assert.equal(hits.length, 1);
    assert.equal(hits[0].line, 1);
});

test("findQueryKeyFetches: detecta fetch multilínia amb ?key=", () => {
    const src = 'const resp = await fetch(\n  `/youtubei/v1/get_transcript?key=${k}`,\n  { method: "POST" }\n);';
    const hits = findQueryKeyFetches(src);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].line, 1, "la línia és la del fetch(");
});

test("findQueryKeyFetches: no detecta fetch sense cap key", () => {
    assert.deepEqual(findQueryKeyFetches('fetch("https://x/y")'), []);
    assert.deepEqual(findQueryKeyFetches('fetch("https://x/y?api_key=nope")'), []);
});

test("findQueryKeyFetches: també mira &key= dins de la finestra", () => {
    const hits = findQueryKeyFetches('fetch(url + "&key=SECRET")');
    assert.equal(hits.length, 1);
});

test("isAllowedPublicKeyFetch: només la clau pública d'InnerTube a content.js", () => {
    const transcript = {
        text: 'fetch(\n  `/youtubei/v1/get_transcript?key=${encodeURIComponent(apiKey)}`,\n',
    };
    assert.equal(isAllowedPublicKeyFetch("sidebar/content.js", transcript), true);
    assert.equal(isAllowedPublicKeyFetch("sidebar\\content.js", transcript), true);
    assert.equal(isAllowedPublicKeyFetch("sidebar/api.js", transcript), false);

    const otherKey = { text: 'fetch("https://x/y?key=SECRET")' };
    assert.equal(isAllowedPublicKeyFetch("sidebar/content.js", otherKey), false);
});
