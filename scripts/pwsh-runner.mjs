#!/usr/bin/env node
import { existsSync } from 'fs';
import { spawnSync } from 'child_process';
import { resolve } from 'path';

const SCRIPT = process.argv[2];
const ARGS = process.argv.slice(3);

function findPowerShell() {
  const candidates = ["pwsh", "powershell", "powershell.exe"];
  for (const candidate of candidates) {
    const result = spawnSync(candidate, ["-NoProfile", "-NonInteractive", "-Command", "exit 0"], { stdio: 'ignore' });
    if (result.status === 0 && !result.error) {
      return candidate;
    }
  }
  return null;
}

if (!SCRIPT) {
  console.log("Usage: node scripts/pwsh-runner.mjs <script.ps1> [args...]");
  process.exit(1);
}

const pwsh = findPowerShell();
if (!pwsh) {
  console.error("PowerShell executable not found. Install PowerShell Core (pwsh) or ensure powershell is available in PATH.");
  process.exit(1);
}

const scriptPath = resolve(process.cwd(), SCRIPT);
if (!existsSync(scriptPath)) {
  console.error(`PowerShell script not found: ${scriptPath}`);
  process.exit(1);
}

const spawnArgs = ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", scriptPath, ...ARGS];

const result = spawnSync(pwsh, spawnArgs, { stdio: 'inherit' });
if (result.error) {
  console.error(`Failed to execute PowerShell script: ${result.error.message}`);
  process.exit(result.status || 1);
}
process.exit(result.status || 0);
