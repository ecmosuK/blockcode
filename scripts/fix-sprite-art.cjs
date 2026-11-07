'use strict';

/*
 * Regenerates the hand-drawn sprite replacements in assets/sprites/library.
 * Run with: node scripts/fix-sprite-art.cjs
 *
 * These drawings are intentionally stored here so the artwork can be
 * reproduced and adjusted without re-importing the original emoji set.
 */

const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const art = Object.assign(
  {},
  require('./sprite-art/animals.cjs'),
  require('./sprite-art/sports.cjs'),
  require('./sprite-art/vehicles.cjs'),
  require('./sprite-art/buildings.cjs'),
  require('./sprite-art/toys.cjs'),
  require('./sprite-art/food.cjs'),
  require('./sprite-art/music.cjs'),
  require('./sprite-art/tools-clothing.cjs'),
  require('./sprite-art/nature.cjs'),
  require('./sprite-art/weather-space.cjs'),
  require('./sprite-art/sealife.cjs')
);

function wrap(artwork, { viewBox = '0 0 72 72', stroke = '#374151', strokeWidth = 1.8 } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="${viewBox}" fill="none"><g stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" paint-order="stroke fill">${artwork}</g></svg>\n`;
}

async function main() {
  const window = {};
  vm.runInNewContext(await fs.readFile(path.join(root, 'assets', 'block-pack.js'), 'utf8'), { window });
  const sprites = [...window.BLOCK_PACK.sprites.list, ...window.BLOCK_PACK.sprites.library];
  const byName = new Map(sprites.map((sprite) => [sprite.name, sprite]));

  const missing = Object.keys(art).filter((name) => !byName.has(name));
  if (missing.length) throw new Error(`Sprite names not found in block pack: ${missing.join(', ')}`);

  for (const [name, artwork] of Object.entries(art)) {
    const sprite = byName.get(name);
    const content = typeof artwork === 'string'
      ? wrap(artwork)
      : wrap(artwork.raw, artwork);
    await fs.writeFile(path.resolve(root, sprite.src), content, 'utf8');
  }

  console.log(`Updated ${Object.keys(art).length} sprites.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
