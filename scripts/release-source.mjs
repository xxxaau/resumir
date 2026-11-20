#!/usr/bin/env node
/**
 * release-source.mjs
 * Genera el ZIP del codi font que AMO demana a cada pujada.
 * Portable a Windows (no depèn de `mkdir -p` ni de variables de shell).
 *
 * Usage: npm run release:source
 */

import { mkdirSync, readFileSync } from "fs";
import { execFileSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const zipName = `resumir-source-v${pkg.version}.zip`;

mkdirSync(resolve(root, "build"), { recursive: true });

execFileSync(
    "git",
    ["archive", "--format=zip", "--prefix=resumir-source/", "-o", `build/${zipName}`, "HEAD"],
    { cwd: root, stdio: "inherit" }
);

console.log(`Source ZIP: build/${zipName}`);
