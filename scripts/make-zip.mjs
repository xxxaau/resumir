#!/usr/bin/env node
/**
 * make-zip.mjs
 * Creates a ZIP file from a directory with '/' path separators (AMO-compliant).
 * No external dependencies — uses Node.js built-in zlib + buffer.
 *
 * Usage:
 *   node scripts/make-zip.mjs <sourceDir> <outputZip>
 */

import { deflateRawSync } from "zlib";
import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, relative, resolve } from "path";

// --- CRC-32 ---
const crcTable = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        t[i] = c;
    }
    return t;
})();

function crc32(buf) {
    let c = 0xFFFFFFFF;
    for (const b of buf) c = crcTable[(c ^ b) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
}

// --- Buffer helpers ---
function u16(n) { const b = Buffer.alloc(2); b.writeUInt16LE(n, 0); return b; }
function u32(n) { const b = Buffer.alloc(4); b.writeUInt32LE(n >>> 0, 0); return b; }

// --- Directory walk ---
function walkDir(dir) {
    const files = [];
    (function walk(curr) {
        for (const entry of readdirSync(curr)) {
            const full = join(curr, entry);
            statSync(full).isDirectory() ? walk(full) : files.push(full);
        }
    })(dir);
    return files;
}

// --- Main ---
const [,, srcArg, outArg] = process.argv;
if (!srcArg || !outArg) {
    console.error("Usage: node scripts/make-zip.mjs <sourceDir> <outputZip>");
    process.exit(1);
}

const sourceDir = resolve(srcArg);
const outputZip = resolve(outArg);
const files     = walkDir(sourceDir);

const localParts  = [];
const centralParts = [];
let offset = 0;

for (const file of files) {
    const name      = relative(sourceDir, file).replace(/\\/g, "/"); // AMO: '/' only
    const nameBytes = Buffer.from(name, "utf8");
    const data      = readFileSync(file);
    const deflated  = deflateRawSync(data, { level: 9 });
    const crc       = crc32(data);

    // Use STORE if deflation doesn't save space
    const method    = deflated.length < data.length ? 8 : 0;
    const compData  = method === 8 ? deflated : data;

    const local = Buffer.concat([
        Buffer.from([0x50, 0x4B, 0x03, 0x04]), // local file header signature
        u16(20),                 // version needed to extract
        u16(0),                  // general purpose bit flag
        u16(method),             // compression method
        u16(0), u16(0),          // last mod time / date (epoch)
        u32(crc),                // CRC-32
        u32(compData.length),    // compressed size
        u32(data.length),        // uncompressed size
        u16(nameBytes.length),   // file name length
        u16(0),                  // extra field length
        nameBytes,
        compData,
    ]);

    const central = Buffer.concat([
        Buffer.from([0x50, 0x4B, 0x01, 0x02]), // central dir file header signature
        u16(20), u16(20),        // version made by / version needed
        u16(0),                  // general purpose bit flag
        u16(method),             // compression method
        u16(0), u16(0),          // last mod time / date
        u32(crc),                // CRC-32
        u32(compData.length),    // compressed size
        u32(data.length),        // uncompressed size
        u16(nameBytes.length),   // file name length
        u16(0),                  // extra field length
        u16(0),                  // file comment length
        u16(0),                  // disk number start
        u16(0),                  // internal file attributes
        u32(0),                  // external file attributes
        u32(offset),             // relative offset of local header
        nameBytes,
    ]);

    localParts.push(local);
    centralParts.push(central);
    offset += local.length;
}

const localBuf   = Buffer.concat(localParts);
const centralBuf = Buffer.concat(centralParts);

const eocd = Buffer.concat([
    Buffer.from([0x50, 0x4B, 0x05, 0x06]), // end of central directory signature
    u16(0), u16(0),              // disk number / start disk
    u16(files.length),           // entries on this disk
    u16(files.length),           // total entries
    u32(centralBuf.length),      // size of central directory
    u32(localBuf.length),        // offset of central directory
    u16(0),                      // comment length
]);

const finalZip = Buffer.concat([localBuf, centralBuf, eocd]);
writeFileSync(outputZip, finalZip);
console.log(`Created ${outArg} (${(finalZip.length / 1024).toFixed(1)} KB)`);
