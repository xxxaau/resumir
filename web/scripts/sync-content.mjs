import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
// La mateixa lògica que l'historial de «Sobre l'extensió» de la configuració:
// només versions amb data, sense entrades (minor)/(dev) i les antigues plegades.
import { parseChangelog, generateHtml } from "../../scripts/changelog-lib.mjs";

const webDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repo = resolve(webDir, "..");
const gen = resolve(webDir, "src/_generated");

rmSync(gen, { recursive: true, force: true });
mkdirSync(resolve(gen, "guia"), { recursive: true });

const guides = [
  { src: "docs/user-guide/GUIA-INICI.md",    out: "guia/inici.md",    permalink: "/guia/inici/",    title: "Guia d'inici" },
  { src: "docs/user-guide/API-KEY-GOOGLE.md", out: "guia/clau-api.md", permalink: "/guia/clau-api/", title: "Com obtenir la clau d'API" },
  { src: "docs/user-guide/PLUGINS.md",        out: "guia/plugins.md",  permalink: "/guia/plugins/",  title: "Guia de plugins" },
];

function emit(srcRel, outRel, permalink, title, layout) {
  const body = readFileSync(resolve(repo, srcRel), "utf8");
  const fm = `---\nlayout: ${layout}\npermalink: "${permalink}"\ntitle: "${title.replace(/"/g, '\\"')}"\n---\n`;
  writeFileSync(resolve(gen, outRel), fm + body, "utf8");
}

for (const g of guides) emit(g.src, g.out, g.permalink, g.title, "guia.njk");

// Novetats: per a l'usuari final (el registre complet és docs/CHANGELOG.md a GitHub)
const versions = parseChangelog(readFileSync(resolve(repo, "docs/CHANGELOG.md"), "utf8"));
const entries = generateHtml(versions)
  .replace(/<div class="version-title">\s*(v[^\n<]+?)\s*<span class="version-date">([^<]*)<\/span>\s*<\/div>/g,
    '<h2 class="version-title">$1 <span class="version-date">$2</span></h2>');
writeFileSync(resolve(gen, "changelog.html"), `---
layout: guia.njk
permalink: "/changelog/"
title: "Novetats"
description: "Què hi ha de nou a cada versió de Resumir."
---
<h1>Novetats</h1>
<p class="changelog-intro">Els canvis de cada versió que notaràs en fer servir Resumir. El registre tècnic complet és a <a href="https://github.com/xxxaau/resumir/blob/main/docs/CHANGELOG.md">GitHub</a>.</p>
<div class="changelog">
{% raw %}
${entries}
{% endraw %}
</div>
`, "utf8");

// Imatges de les guies
cpSync(resolve(repo, "docs/user-guide/img"), resolve(gen, "img"), { recursive: true });

console.log("Contingut sincronitzat a src/_generated/");
