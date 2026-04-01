#!/usr/bin/env node
/**
 * backup-extension-data.mjs
 * 
 * Backs up extension storage (manifest.json + icon) before switching modes.
 * Ensures you don't lose data when switching between DEV and PROD locally.
 * 
 * Usage:
 *   node scripts/backup-extension-data.mjs               # Interactive menu
 *   node scripts/backup-extension-data.mjs firefox dev   # Backup Firefox DEV data
 *   node scripts/backup-extension-data.mjs chromium prod # Backup Chromium PROD data
 *   node scripts/backup-extension-data.mjs list          # List backups
 *   node scripts/backup-extension-data.mjs restore <backup-id> # Restore from backup
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, readdirSync, statSync } from "fs";
import { resolve } from "path";
import * as readline from "readline";

const BACKUP_DIR = resolve(process.cwd(), ".backups");
const MANIFEST_FIREFOX = "manifest.json";
const MANIFEST_CHROMIUM = "manifest.chromium.json";

function ensureBackupDir() {
    if (!existsSync(BACKUP_DIR)) {
        mkdirSync(BACKUP_DIR, { recursive: true });
    }
}

function generateBackupId(browser, mode) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
    return `${browser}-${mode}-${timestamp}`;
}

function getManifestPath(browser) {
    return resolve(process.cwd(), browser === "firefox" ? MANIFEST_FIREFOX : MANIFEST_CHROMIUM);
}

function backupData(browser, mode) {
    ensureBackupDir();
    const backupId = generateBackupId(browser, mode);
    const backupPath = resolve(BACKUP_DIR, backupId);
    mkdirSync(backupPath, { recursive: true });

    const manifestPath = getManifestPath(browser);
    if (existsSync(manifestPath)) {
        const manifest = readFileSync(manifestPath, "utf8");
        writeFileSync(resolve(backupPath, "manifest.json"), manifest);
        console.log(`✓ Backed up ${browser} (${mode}) manifest`);
    } else {
        console.warn(`⚠ Manifest not found: ${manifestPath}`);
    }

    writeFileSync(resolve(backupPath, "metadata.json"), JSON.stringify({
        backupId,
        browser,
        mode,
        timestamp: new Date().toISOString(),
        notes: `Backup before switching from ${mode}`
    }, null, 2));

    console.log(`✓ Backup created: ${backupId}`);
    return backupId;
}

function listBackups() {
    ensureBackupDir();
    if (!existsSync(BACKUP_DIR)) {
        console.log("No backups found.");
        return;
    }

    const backups = readdirSync(BACKUP_DIR)
        .filter(f => statSync(resolve(BACKUP_DIR, f)).isDirectory());

    if (backups.length === 0) {
        console.log("No backups found.");
        return;
    }

    console.log("\nAvailable backups:");
    backups.forEach((backup, idx) => {
        const metaPath = resolve(BACKUP_DIR, backup, "metadata.json");
        if (existsSync(metaPath)) {
            const meta = JSON.parse(readFileSync(metaPath, "utf8"));
            console.log(`  [${idx}] ${backup}`);
            console.log(`      Browser: ${meta.browser} | Mode: ${meta.mode} | ${meta.timestamp}`);
        }
    });
}

function restoreData(backupId, browser) {
    const backupPath = resolve(BACKUP_DIR, backupId);
    if (!existsSync(backupPath)) {
        console.error(`Backup not found: ${backupId}`);
        process.exit(1);
    }

    const metaPath = resolve(backupPath, "metadata.json");
    const meta = JSON.parse(readFileSync(metaPath, "utf8"));
    const manifestPath = getManifestPath(browser || meta.browser);
    const backupManifest = resolve(backupPath, "manifest.json");

    if (!existsSync(backupManifest)) {
        console.error(`Manifest not found in backup: ${backupId}`);
        process.exit(1);
    }

    const manifest = readFileSync(backupManifest, "utf8");
    writeFileSync(manifestPath, manifest);
    console.log(`✓ Restored ${meta.browser} (${meta.mode}) manifest from ${backupId}`);
}

async function interactiveMenu() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

    console.log("\n=== Extension Data Backup Manager ===\n");
    console.log("1. Backup data before switching mode");
    console.log("2. List backups");
    console.log("3. Restore from backup");
    console.log("4. Exit\n");

    const choice = await question("Choose an option (1-4): ");

    switch (choice.trim()) {
        case "1": {
            const browser = await question("Browser (firefox/chromium): ");
            const mode = await question("Current mode (dev/prod): ");
            backupData(browser, mode);
            break;
        }
        case "2": {
            listBackups();
            break;
        }
        case "3": {
            listBackups();
            const backupId = await question("\nEnter backup ID to restore: ");
            const browser = await question("Target browser (firefox/chromium): ");
            restoreData(backupId, browser);
            break;
        }
        case "4": {
            console.log("Exiting...");
            break;
        }
        default:
            console.log("Invalid option.");
    }

    rl.close();
}

// CLI
const args = process.argv.slice(2);
if (args.length === 0) {
    interactiveMenu().catch(console.error);
} else if (args[0] === "list") {
    listBackups();
} else if (args[0] === "restore" && args[1]) {
    restoreData(args[1], args[2]);
} else if (args[1]) {
    backupData(args[0], args[1]);
} else {
    console.log("Usage:");
    console.log("  node scripts/backup-extension-data.mjs");
    console.log("  node scripts/backup-extension-data.mjs firefox dev");
    console.log("  node scripts/backup-extension-data.mjs list");
    console.log("  node scripts/backup-extension-data.mjs restore <backup-id> [browser]");
}
