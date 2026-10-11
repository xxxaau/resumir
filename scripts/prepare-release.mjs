#!/usr/bin/env node
/**
 * prepare-release.mjs — Script interactiu de preparacio de release.
 *
 * Guia l'usuari pas a pas: cada accio requereix confirmacio explicita.
 * Mai avança sense dir-li "si" a una pregunta.
 * Qualsevol pas fallit (build, commit, tag, push) ATURA l'script — mai
 * imprimeix un "✓" d'èxit per a una accio que ha fallat.
 *
 * Usage:
 *   node scripts/prepare-release.mjs
 *   npm run prepare-release
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import * as readline from "readline";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function question(prompt) {
  return new Promise(resolve => rl.question(prompt, resolve));
}

/**
 * Executa una comanda via shell. Retorna false en fallada.
 * Amb `fatal: true`, qualsevol fallada imprimeix un missatge clar i surt (1) —
 * l'script mai continua amb un pas fallit.
 */
function exec(cmd, label, { fatal = false } = {}) {
  console.log(`\n--- ${label} ---`);
  console.log(`> ${cmd}`);
  try {
    execSync(cmd, { cwd: root, stdio: "inherit" });
    return true;
  } catch {
    if (fatal) {
      console.log(red(`  ✗ ${label} ha fallat. Aturat.`));
      process.exit(1);
    }
    return false;
  }
}

/**
 * Executa un comando git SENSE shell (args com a array): evita la
 * interpolacio d'input d'usuari a la shell (command injection).
 */
function execGit(args, label, { fatal = false } = {}) {
  console.log(`\n--- ${label} ---`);
  console.log(`> git ${args.join(" ")}`);
  try {
    execSync("git", args, { cwd: root, stdio: "inherit" });
    return true;
  } catch {
    if (fatal) {
      console.log(red(`  ✗ ${label} ha fallat. Aturat.`));
      process.exit(1);
    }
    return false;
  }
}

function gitOutput(args) {
  return execSync("git", args, { cwd: root }).toString().trim();
}

function readJson(file) {
  const raw = readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(raw);
}

async function confirm(msg) {
  const ans = await question(`\n${msg} (s/N) `);
  return ans.toLowerCase() === "s" || ans.toLowerCase() === "si";
}

function bold(text) {
  return `\x1b[1m${text}\x1b[0m`;
}

function green(text) {
  return `\x1b[32m${text}\x1b[0m`;
}

function red(text) {
  return `\x1b[31m${text}\x1b[0m`;
}

function yellow(text) {
  return `\x1b[33m${text}\x1b[0m`;
}

// Fitxers de mode DEV/PROD: es commitejen NOMÉS al pas de release (mode PROD).
// Mai en el commit "de canvis" del pas 2 — es quedaria mode DEV commitejat.
const MODE_PREFIXES = [
  "manifest.base.json",
  "manifest.json",
  "manifest.chromium.json",
  "manifest.firefox.patch.json",
  "manifest.firefox.prod.patch.json",
  "manifest.chromium.patch.json",
  "manifest.chromium.prod.patch.json",
  "icons",
];

const RELEASE_FILES = [
  "package.json",
  "package-lock.json",
  "manifest.base.json",
  "manifest.json",
  "manifest.chromium.json",
  "manifest.firefox.patch.json",
  "manifest.firefox.prod.patch.json",
  "manifest.chromium.patch.json",
  "manifest.chromium.prod.patch.json",
  "icons",
  "docs/CHANGELOG.md",
  "options/settings.html",
];

function isModeFile(path) {
  return MODE_PREFIXES.some(p => path === p || path.startsWith(p + "/"));
}

/** Extreu la ruta relativa de cada línia de `git status --porcelain`. */
function statusPaths() {
  return gitOutput(["status", "--porcelain"])
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => l.slice(3).trim());
}

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log(bold("  PREPARACIO DE RELEASE — Resumir"));
  console.log("=".repeat(60) + "\n");

  // ─── Step 1: Branch check ──────────────────────────────────────
  console.log(yellow("[1/9]") + " Verificant branca...");
  let branch;
  try {
    branch = gitOutput(["rev-parse", "--abbrev-ref", "HEAD"]);
  } catch {
    console.log(red("  ✗ No s'ha pogut llegir la branca actual (git falla). Aturat."));
    process.exit(1);
  }
  if (branch !== "main") {
    console.log(red(`  ✗ Ets a la branca '${branch}', no a 'main'.`));
    const ok = await confirm(`  Canviar a main?`);
    if (ok) {
      if (!execGit(["checkout", "main"], "Canvi a main", { fatal: true })) process.exit(1);
    } else {
      console.log(red("  ✗ Release nomes des de main. Aturat."));
      process.exit(1);
    }
  } else {
    console.log(green("  ✓ Branca: main"));
  }

  // ─── Step 2: Working tree clean ─────────────────────────────────
  console.log(`\n${yellow("[2/9]")} Verificant working tree...`);
  let status;
  try {
    status = gitOutput(["status", "--porcelain"]);
  } catch {
    console.log(red("  ✗ No s'ha pogut llegir l'estat de git. Aturat."));
    process.exit(1);
  }
  if (status) {
    console.log(red("  ✗ Working tree no esta net:"));
    console.log(status);
    const ok = await confirm(`  Fer commit de tots els canvis?`);
    if (ok) {
      const msg = await question("  Missatge del commit: ");
      const dirty = statusPaths();
      const nonMode = dirty.filter(p => !isModeFile(p));
      const modeFiles = dirty.filter(p => isModeFile(p));

      if (nonMode.length > 0) {
        execGit(["add", ...nonMode], "Stage canvis (sense fitxers de mode)");
        if (modeFiles.length > 0) {
          console.log(yellow(`  ! ${modeFiles.length} fitxer(s) de mode DEV/PROD es commitejaran al pas de release.`));
        }
        execGit(["commit", "-m", msg], "Commit de canvis", { fatal: true });
        console.log(green("  ✓ Canvis commitats"));
      } else {
        console.log(yellow("  ! Només hi ha canvis de mode DEV/PROD (es resoldran al pas 7). Sense commit."));
      }
    } else {
      console.log(red("  ✗ Working tree ha d'estar net. Aturat."));
      process.exit(1);
    }
  } else {
    console.log(green("  ✓ Working tree net"));
  }

  // ─── Step 3: MODE PROD ──────────────────────────────────────────
  console.log(`\n${yellow("[3/9]")} Assegurant mode PROD...`);
  const base = readJson(join(root, "manifest.base.json"));
  if (base.name.includes("(DEV)")) {
    console.log(yellow("  ! Mode DEV detectat"));
    const ok = await confirm(`  Canviar a mode PROD?`);
    if (ok) {
      exec("npm run prod", "Switch a PROD", { fatal: true });
      console.log(green("  ✓ Mode PROD actiu"));
    } else {
      console.log(yellow("  ! Continuant en mode DEV (no recomanat per release)"));
    }
  } else {
    console.log(green("  ✓ Mode PROD"));
  }

  // ─── Step 4: Version bump ───────────────────────────────────────
  // Abans del build: els ZIPs han de dur la versio NOVA. Si es bumpeja
  // despres del build, build/ queda amb ZIPs de la versio antiga i el
  // prerelease valida l'estat anterior, no el que es publica.
  console.log(`\n${yellow("[4/9]")} Version...`);
  const pkg = readJson(join(root, "package.json"));
  console.log(`  Versio actual: ${pkg.version}`);

  const bumpOk = await confirm(`  Vols pujar la versio?`);
  if (bumpOk) {
    const ans = await question(`  Tipus de versio (patch/minor/major) [patch]: `);
    const type = ans.trim() || "patch";
    if (!["patch", "minor", "major"].includes(type)) {
      console.log(red(`  ✗ Tipus invalid: ${type}`));
      process.exit(1);
    }

    exec(`npm version ${type} --no-git-tag-version`, `Bump ${type}`, { fatal: true });
    console.log(green(`  ✓ Versio actualitzada a ${readJson(join(root, "package.json")).version}`));
  } else {
    console.log(yellow("  ! Versio no canviada"));
  }

  // ─── Step 5: Build ──────────────────────────────────────────────
  // Abans del prerelease: els checks de ZIP del prerelease requereixen que
  // els ZIPs ja existeixin a build/.
  console.log(`\n${yellow("[5/9]")} Build...`);
  const buildOk = await confirm(`  Generar ZIPs de produccio?`);
  if (buildOk) {
    exec("npm run build", "Build Firefox + Chromium", { fatal: true });
    console.log(green("  ✓ Build completat"));
  } else {
    console.log(yellow("  ! Build omes. El prerelease fallara al check de ZIPs si no existeixen."));
  }

  // ─── Step 6: Prerelease check ───────────────────────────────────
  // Despres del build: els checks 9 i 13 (ZIPs) validen els artefactes reals
  // de la versio que s'acaba de bumpejar.
  console.log(`\n${yellow("[6/9]")} Executant prerelease audit...`);
  const prereleaseOk = exec("npm run prerelease", "Prerelease audit");

  if (!prereleaseOk) {
    console.log(red("\n  ✗ Prerelease audit ha fallat. Corregeix els errors i torna a executar."));
    process.exit(1);
  }
  console.log(green("\n  ✓ Prerelease audit superat"));

  // ─── Step 7: Commit + tag ───────────────────────────────────────
  console.log(`\n${yellow("[7/9]")} Commit i tag...`);
  const newPkg = readJson(join(root, "package.json"));
  const newVer = newPkg.version;
  const tag = `v${newVer}`;

  let tagExists = "";
  try {
    tagExists = gitOutput(["tag", "-l", tag]);
  } catch {
    console.log(red(`  ✗ No s'ha pogut llegir els tags. Aturat.`));
    process.exit(1);
  }
  if (tagExists) {
    console.log(red(`  ✗ El tag ${tag} ja existeix. No es sobreescriu: revisa l'estat i esborra'l manualment si cal.`));
    process.exit(1);
  }

  const commitOk = await confirm(`  Crear commit de release + tag ${tag}?`);
  if (commitOk) {
    const commitMsg = `chore: release ${tag}`;
    execGit(["add", ...RELEASE_FILES], `Stage fitxers de release ${tag}`, { fatal: true });
    execGit(["commit", "-m", commitMsg], `Commit release ${tag}`, { fatal: true });
    execGit(["tag", tag], `Tag ${tag}`, { fatal: true });
    console.log(green(`  ✓ Commit i tag ${tag} creats`));
  }

  // ─── Step 8: Push ───────────────────────────────────────────────
  console.log(`\n${yellow("[8/9]")} Push...`);
  const pushOk = await confirm(`  Fer push a origin/main + tags?`);
  if (pushOk) {
    execGit(["push", "origin", "main", "--tags"], "Push a origin", { fatal: true });
    console.log(green("\n  ✓ Push completat! El workflow de release s'ha disparat."));
    console.log("    Ves a https://github.com/xxxaau/resumir/actions");
    console.log("    per veure el proges del GitHub Release.");
  } else {
    console.log(yellow("  ! Push omes. Quan vulguis:"));
    console.log(`    git push origin main --tags`);
  }

  // ─── Step 9: AMO publish ────────────────────────────────────────────
  console.log(`\n${yellow("[9/9]")} Publicacio a AMO (Firefox Add-ons)...`);
  console.log(`  El workflow ja ha generat el GitHub Release amb el ZIP.`);
  console.log(`  Ara has de penjar manualment el ZIP a AMO:`);
  console.log(`    ${bold("https://addons.mozilla.org/en-US/firefox/addon/resumir/")}`);
  console.log(`  (Obre l'enllac, ves a «Versions» → «Puja una versio nova»)`);
  const amoOk = await confirm(`  Has publicat la nova versio a AMO?`);
  if (amoOk) {
    console.log(green("  ✓ Publicacio a AMO completada"));
  } else {
    console.log(yellow("  ! Recorda fer-ho mes tard: puja el ZIP a AMO"));
  }

  // ─── Restore DEV mode hint ──────────────────────────────────────
  console.log(`\n${bold("Recorda:")} estas en mode PROD. Torna a DEV amb:`);
  console.log(`  npm run dev\n`);

  rl.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
