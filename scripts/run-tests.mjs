import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { build } from 'esbuild';

const utilsDir = path.resolve(process.cwd(), 'src/utils');
const testFiles = fs
  .readdirSync(utilsDir)
  .filter((name) => name.endsWith('.test.ts'))
  .sort()
  .map((name) => path.join(utilsDir, name));

if (testFiles.length === 0) {
  console.error('Tidak ada file test ditemukan di src/utils/*.test.ts');
  process.exit(1);
}

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'utamago-tests-'));

try {
  await build({
    entryPoints: testFiles,
    outdir: outDir,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    outExtension: { '.js': '.mjs' },
  });

  const builtFiles = fs
    .readdirSync(outDir)
    .filter((name) => name.endsWith('.mjs'))
    .sort()
    .map((name) => path.join(outDir, name));

  const res = spawnSync(process.execPath, ['--test', ...builtFiles], {
    stdio: 'inherit',
  });

  process.exitCode = res.status ?? 1;
} finally {
  fs.rmSync(outDir, { recursive: true, force: true });
}
