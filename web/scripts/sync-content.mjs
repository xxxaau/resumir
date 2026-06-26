import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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
emit("docs/CHANGELOG.md", "changelog.md", "/changelog/", "Registre de canvis", "guia.njk");

// Imatges de les guies
cpSync(resolve(repo, "docs/user-guide/img"), resolve(gen, "img"), { recursive: true });

console.log("Contingut sincronitzat a src/_generated/");
