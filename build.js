/**
 * Build script for static hosting (Vercel, GitHub Pages, Netlify, ...).
 *
 * The game has no transpile step — it is already plain ES modules the
 * browser runs as-is. This only stages the deployable files into
 * `public/`, the directory the host is configured to publish.
 *
 * Run with: npm run build
 */
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, 'public');

/** The files that make up the playable site. */
const ASSETS = ['index.html', 'src'];

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

for (const asset of ASSETS) {
  await cp(path.join(ROOT, asset), path.join(OUT, asset), { recursive: true });
}

// Hosts serve 404.html for unmatched routes. The game is a single page, so
// this just re-serves the entry point.
const index = await readFile(path.join(ROOT, 'index.html'), 'utf8');
await writeFile(path.join(OUT, '404.html'), index, 'utf8');

console.log(`Built ${OUT}`);
