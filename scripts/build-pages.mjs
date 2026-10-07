import { cp, mkdir, rm, writeFile, access } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'dist/pages');
if (!output.startsWith(resolve(root, 'dist') + sep)) throw new Error('Unsafe Pages output path');
const env = { ...loadEnv('production', root, 'NEXT_PUBLIC_'), ...process.env };
const vars = {};
for (const key of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_APP_NAME']) {
  if (env[key]) vars[key] = env[key];
}
vars.HBI_AI_ENABLED = 'false';
if (!vars.NEXT_PUBLIC_SUPABASE_URL || !vars.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Set public Supabase URL and publishable key before building Pages');
}
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(resolve(root, 'dist/client'), output, { recursive: true });
for (const asset of ['manifest.webmanifest', 'favicon.ico', 'brand/sesen-lockup.webp', 'brand/icon-192.png', 'brand/maskable-512.png', 'brand/apple-touch-icon.png']) {
  await access(resolve(output, asset));
}
const require = createRequire(resolve(root, 'node_modules/wrangler/package.json'));
const { build } = require('esbuild');
await build({
  entryPoints: [resolve(root, 'dist/server/index.js')],
  outfile: resolve(output, '_worker.js'),
  bundle: true, format: 'esm', platform: 'neutral',
  external: ['node:*', 'cloudflare:*'], target: 'es2022', minify: true,
});
await writeFile(resolve(output, '_routes.json'), JSON.stringify({
  version: 1, include: ['/*'], exclude: ['/_next/static/*', '/favicon.ico', '/icons/*', '/brand/*', '/manifest.webmanifest'],
}, null, 2));
await writeFile(resolve(output, 'wrangler.json'), JSON.stringify({
  name: 'hbi-handball-intelligence', pages_build_output_dir: '.',
  compatibility_date: '2026-10-01', compatibility_flags: ['nodejs_compat'], vars,
}, null, 2));
// Keep Wrangler's config lookup inside Pages, away from Vite's Worker redirect.
await mkdir(resolve(output, '.wrangler/deploy'), { recursive: true });
await writeFile(resolve(output, '.wrangler/deploy/config.json'), JSON.stringify({ configPath: '../../wrangler.json' }));
console.log('Pages advanced-mode bundle ready in dist/pages. No upload performed.');
