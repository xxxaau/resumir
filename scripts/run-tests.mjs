#!/usr/bin/env node
/**
 * run-tests.mjs
 * Cross-platform test runner that works on Windows, macOS, and Linux.
 * Avoids glob expansion issues in Windows PowerShell.
 */

import { readdirSync } from 'fs';
import { spawnSync } from 'child_process';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';

import { dirname } from 'path'; const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const testsDir = join(root, 'tests');

// Find all test files
let testFiles;
try {
  testFiles = readdirSync(testsDir)
    .filter(f => f.endsWith('.test.mjs'))
    .map(f => resolve(testsDir, f));
} catch (err) {
  console.error(`❌ Cannot read tests directory: ${err.message}`);
  process.exit(1);
}

if (testFiles.length === 0) {
  console.error('❌ No test files found in tests/*.test.mjs');
  process.exit(1);
}

console.log(`🧪 Running ${testFiles.length} test file(s)...\n`);

// Run tests with node --test
const result = spawnSync('node', ['--test', ...testFiles], { 
  stdio: 'inherit',
  cwd: root 
});

process.exit(result.status || 0);

