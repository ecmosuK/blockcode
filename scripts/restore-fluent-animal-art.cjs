'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function normalize(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function getText(url) {
  const response = await fetch(url, { headers: { 'User-Agent': 'BlockCode animal art importer' } });
  if (!response.ok) throw new Error(`Request failed (${response.status}): ${url}`);
  return response.text();
}

function sizeRoot(source) {
  const match = source.match(/<svg\b[^>]*>/i);
  if (!match) throw new Error('Fluent SVG has no root element.');
  const rootTag = match[0]
    .replace(/\s+(?:width|height)=["'][^"']*["']/gi, '')
    .replace(/\/?>$/, ' width="72" height="72">');
  if (!/\bviewBox=["'][^"']+["']/i.test(rootTag)) throw new Error('Fluent SVG has no viewBox.');
  return source.slice(0, match.index) + rootTag + source.slice(match.index + match[0].length);
}

async function main() {
  const window = {};
  const pack = await fs.readFile(path.join(root, 'assets', 'block-pack.js'), 'utf8');
  vm.runInNewContext(pack, { window });
  const sprites = [...window.BLOCK_PACK.sprites.list, ...window.BLOCK_PACK.sprites.library]
    .filter((sprite) => /animals-|birds-|seaLife-/.test(sprite.src));

  const tree = JSON.parse(await getText('https://api.github.com/repos/microsoft/fluentui-emoji/git/trees/main?recursive=1'));
  const paths = new Map();
  for (const entry of tree.tree || []) {
    const parts = entry.path.split('/');
    if (parts[0] === 'assets' && parts.includes('Flat') && entry.path.endsWith('.svg')) {
      paths.set(normalize(parts[1]), entry.path);
    }
  }

  const matches = sprites.flatMap((sprite) => {
    const sourcePath = paths.get(normalize(sprite.name));
    return sourcePath ? [{ sprite, sourcePath }] : [];
  });
  const sourceText = new Map();
  await Promise.all(matches.map(async ({ sourcePath }) => {
    const url = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/' +
      sourcePath.split('/').map(encodeURIComponent).join('/');
    sourceText.set(sourcePath, await getText(url));
  }));
  for (const { sprite, sourcePath } of matches) {
    const target = path.resolve(root, sprite.src);
    await fs.writeFile(target, sizeRoot(sourceText.get(sourcePath)), 'utf8');
  }
  console.log(`Restored ${matches.length} distinct Fluent animal illustrations; unmatched animal names remain custom artwork.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
