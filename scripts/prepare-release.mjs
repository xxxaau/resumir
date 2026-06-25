#!/usr/bin/env node
/**
 * prepare-release.mjs — Script interactiu de preparacio de release.
 *
 * Guia l'usuari pas a pas: cada accio requereix confirmacio explicita.
 * Mai avança sense dir-li "si" a una pregunta.
 *
 * Usage:
 *   node scripts/prepare-release.mjs
 *   npm run prepare-release
 */

import { readFileSync, existsSync, readdirSync } from "fs";
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

function question(prompt) {
  return new Promise(resolve => rl.question(prompt, resolve));
}

function exec(cmd, label) {
  console.log(`\n--- ${label} ---`);
  console.log(`> ${cmd}`);
  try {
    execSync(cmd, { cwd: root, stdio: "inherit" });
    return true;
  } catch {
    return false;
  }
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

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log(bold("  PREPARACIO DE RELEASE — Resumir"));
  console.log("=".repeat(60) + "\n");

  // ─── Step 1: Branch check ──────────────────────────────────────
  console.log(yellow("[1/9]") + " Verificant branca...");
  const branch = execSync("git rev-parse --abbrev-ref HEAD", { cwd: root })
    .toString().trim();
  if (branch !== "main") {
    console.log(red(`  ✗ Ets a la branca '${branch}', no a 'main'.`));
    const ok = await confirm(`  Canviar a main?`);
    if (ok) {
      if (!exec("git checkout main", "Canvi a main")) {
        console.log(red("  ✗ No s'ha pogut canviar a main. Aturat."));
        process.exit(1);
      }
    } else {
      console.log(red("  ✗ Release nomes des de main. Aturat."));
      process.exit(1);
    }
  } else {
    console.log(green("  ✓ Branca: main"));
  }

  // ─── Step 2: Working tree clean ─────────────────────────────────
  console.log(`\n${yellow("[2/9]")} Verificant working tree...`);
  const status = execSync("git status --porcelain", { cwd: root })
    .toString().trim();
  if (status) {
    console.log(red("  ✗ Working tree no esta net:"));
    console.log(status);
    const ok = await confirm(`  Fer commit de tots els canvis?`);
    if (ok) {
      const msg = await question("  Missatge del commit: ");
      exec(`git add -A && git commit -m "${msg}"`, "Commit");
      console.log(green("  ✓ Canvis commitats"));
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
      exec("npm run prod", "Switch a PROD");
      console.log(green("  ✓ Mode PROD actiu"));
    } else {
      console.log(yellow("  ! Continuant en mode DEV (no recomanat per release)"));
    }
  } else {
    console.log(green("  ✓ Mode PROD"));
  }

  // ─── Step 4: Prerelease check ───────────────────────────────────
  console.log(`\n${yellow("[4/9]")} Executant prerelease audit...`);
  const prereleaseOk = exec("npm run prerelease", "Prerelease audit (17 checks)");

  if (!prereleaseOk) {
    console.log(red("\n  ✗ Prerelease audit ha fallat. Corregeix els errors i torna a executar."));
    process.exit(1);
  }
  console.log(green("\n  ✓ Prerelease audit: 17/17 checks OK"));

  // ─── Step 5: Build ──────────────────────────────────────────────
  console.log(`\n${yellow("[5/9]")} Build...`);
  const buildOk = await confirm(`  Generar ZIPs de produccio?`);
  if (buildOk) {
    exec("npm run build", "Build Firefox + Chromium");
    console.log(green("  ✓ Build completat"));
  } else {
    console.log(yellow("  ! Build omes. No es generaran ZIPs."));
  }

  // ─── Step 6: Version bump ───────────────────────────────────────
  console.log(`\n${yellow("[6/9]")} Version...`);
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

    exec(`npm version ${type} --no-git-tag-version`, `Bump ${type}`);
    console.log(green(`  ✓ Versio actualitzada a ${readJson(join(root, "package.json")).version}`));
  } else {
    console.log(yellow("  ! Versio no canviada"));
  }

  // ─── Step 7: Commit + tag ───────────────────────────────────────
  console.log(`\n${yellow("[7/9]")} Commit i tag...`);
  const newPkg = readJson(join(root, "package.json"));
  const newVer = newPkg.version;
  const tag = `v${newVer}`;

  const tagExists = execSync(`git tag -l "${tag}"`, { cwd: root })
    .toString().trim();
  if (tagExists) {
    console.log(yellow(`  ! El tag ${tag} ja existeix.`));
    const force = await confirm(`  Sobreescriure?`);
    if (force) {
      exec(`git tag -f ${tag}`, `Tag ${tag}`);
    }
  }

  const commitOk = await confirm(`  Crear commit de release + tag ${tag}?`);
  if (commitOk) {
    const manifestUpdated = existsSync(join(root, "manifest.base.json"));
    const changelogUpdated = existsSync(join(root, "docs/CHANGELOG.md"));

    const commitMsg = `chore: release ${tag}`;
    exec(
      `git add -A && git commit -m "${commitMsg}"`,
      `Commit release ${tag}`
    );
    exec(`git tag ${tag}`, `Tag ${tag}`);
    console.log(green(`  ✓ Commit i tag ${tag} creats`));
  }

  // ─── Step 8: Push ───────────────────────────────────────────────
  console.log(`\n${yellow("[8/9]")} Push...`);
  const pushOk = await confirm(`  Fer push a origin/main + tags?`);
  if (pushOk) {
    exec("git push origin main --tags", "Push a origin");
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
