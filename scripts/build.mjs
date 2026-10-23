import { readFile, writeFile } from 'node:fs/promises';
import { Script } from 'node:vm';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('scripts/sources.json', root), 'utf8'));
const checking = process.argv.includes('--check');
if (process.argv.slice(2).some(arg => arg !== '--check')) throw new Error('Usage: node scripts/build.mjs [--check]');
const readSources = async paths => (await Promise.all(paths.map(path => readFile(new URL(path, root), 'utf8')))).join('');
const banner = '/* Generated from src/. Run node scripts/build.mjs; edit source files, not this bundle. */\n';
// Preserve the existing shared closure and CSS cascade; no runtime imports or requests.
const javascript = banner + "(() => {\n  'use strict';\n  " + await readSources(manifest.javascript) + '})();\n';
const styles = banner + await readSources(manifest.styles);
new Script(javascript, { filename: 'app.js' });
for (const [name, content] of [['app.js', javascript], ['styles.css', styles]]) {
  const target = new URL(name, root);
  if (checking) {
    if (await readFile(target, 'utf8') !== content) throw new Error(`${name} is stale. Run node scripts/build.mjs and commit both sources and bundles.`);
  } else await writeFile(target, content);
  console.log(`${checking ? 'Verified' : 'Built'} ${name}: ${Buffer.byteLength(content)} bytes`);
}
