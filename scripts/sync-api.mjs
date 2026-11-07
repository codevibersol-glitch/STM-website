/**
 * Vendor stm-api into this repo so Netlify can co-deploy /api without a sibling checkout.
 * Prefer editing C:\Users\yonat\src\stm-api, then re-run: node scripts/sync-api.mjs
 */
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sibling = join(root, '..', 'stm-api');
const dest = join(root, 'api');

if (!existsSync(join(sibling, 'src', 'app.ts'))) {
  console.warn('sync-api: sibling stm-api not found — keeping existing api/ vendor copy');
  process.exit(0);
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(join(sibling, 'src'), join(dest, 'src'), { recursive: true });

const pkg = JSON.parse(readFileSync(join(sibling, 'package.json'), 'utf8'));
writeFileSync(
  join(dest, 'package.json'),
  JSON.stringify(
    {
      name: 'stm-api-vendor',
      private: true,
      type: 'module',
      version: pkg.version,
      dependencies: pkg.dependencies,
    },
    null,
    2,
  ) + '\n',
);

console.log('sync-api: vendored stm-api → api/');
