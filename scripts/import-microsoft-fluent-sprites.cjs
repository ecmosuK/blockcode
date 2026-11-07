'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const aliases = {
  'UFO': 'Flying saucer',
  'Planet': 'Ringed planet',
  'Moon': 'Full moon',
  'Rover': 'Robot',
  'Cardboard Box': 'Package',
  'Gift Box': 'Wrapped gift',
  'Skyscraper': 'Office building',
  'Tree': 'Deciduous tree',
  'Apple': 'Red apple',
  'Burger': 'Hamburger',
  'Cake': 'Birthday cake',
  'Flower': 'Sunflower',
  'Squirrel': 'Chipmunk',
  'Toucan': 'Bird',
  'Robin': 'Bird',
  'Blue Jay': 'Bird',
  'Woodpecker': 'Bird',
  'Hummingbird': 'Bird',
  'Pelican': 'Bird',
  'Seagull': 'Bird',
  'Puffin': 'Penguin',
  'Sparrow': 'Bird',
  'Heron': 'Bird',
  'Cardinal': 'Phoenix bird',
  'Clownfish': 'Tropical fish',
  'Seahorse': 'Tropical fish',
  'Starfish': 'Star',
  'Seashell': 'Spiral shell',
  'Sea Turtle': 'Turtle',
  'Stingray': 'Tropical fish',
  'Pufferfish': 'Blowfish',
  'Swordfish': 'Fish',
  'Orca': 'Whale',
  'Nautilus': 'Spiral shell',
  'Daisy': 'White flower',
  'Fern': 'Leafy green',
  'Pine Tree': 'Evergreen tree',
  'Oak Tree': 'Deciduous tree',
  'Bamboo': 'Tanabata tree',
  'Water Lily': 'Lotus',
  'Lavender': 'Hyacinth',
  'Dandelion': 'White flower',
  'Bonsai': 'Potted plant',
  'Vine': 'Leafy green',
  'Pitcher Plant': 'Potted plant',
  'Clover': 'Four leaf clover',
  'Poppy': 'Wilted flower',
  'Orange': 'Tangerine',
  'Cherry': 'Cherries',
  'Blueberry': 'Blueberries',
  'Kiwi': 'Kiwi fruit',
  'Pumpkin': 'Jack-o-lantern',
  'Corn': 'Ear of corn',
  'Donut': 'Doughnut',
  'Noodles': 'Steaming bowl',
  'Soup': 'Pot of food',
  'Cheese': 'Cheese wedge',
  'Milkshake': 'Bubble tea',
  'Water Bottle': 'Bottle with popping cork',
  'Race Car': 'Racing car',
  'Fire Truck': 'Fire engine',
  'Scooter': 'Kick scooter',
  'Hot Air Balloon': 'Balloon',
  'Submarine': 'Passenger ship',
  'Dump Truck': 'Pickup truck',
  'Crane': 'Construction worker',
  'Spaceship': 'Flying saucer',
  'Saturn': 'Ringed planet',
  'Earth': 'Globe showing Europe-Africa',
  'Mars': 'Red circle',
  'Jupiter': 'Ringed planet',
  'Venus': 'Ringed planet',
  'Mercury': 'Ringed planet',
  'Neptune': 'Ringed planet',
  'Uranus': 'Ringed planet',
  'Asteroid': 'Rock',
  'Meteor': 'Shooting star',
  'Galaxy': 'Milky way',
  'Black Hole': 'Black circle',
  'Space Shuttle': 'Rocket',
  'Lunar Lander': 'Satellite',
  'Space Probe': 'Satellite',
  'Space Helmet': 'Astronaut',
  'Moon Rover': 'Robot',
  'Solar System': 'Ringed planet',
  'Satellite Dish': 'Satellite antenna',
  'Rocket Bot': 'Robot',
  'Cottage': 'House',
  'Farmhouse': 'House with garden',
  'Treehouse': 'House with garden',
  'Lighthouse': 'House',
  'Windmill': 'Wind chime',
  'Barn': 'House with garden',
  'School Bus Stop': 'Bus stop',
  'Fire Station': 'Fire engine',
  'Museum': 'Classical building',
  'Castle Tower': 'Castle',
  'Igloo': 'Snow-capped mountain',
  'Apartment': 'Office building',
  'Shop': 'Convenience store',
  'Cafe': 'Hot beverage',
  'Train Station': 'Train',
  'Water Tower': 'Water wave',
  'Greenhouse': 'House with garden',
  'Toy Robot': 'Robot',
  'Doll': 'Japanese dolls',
  'Toy Train': 'Train',
  'Toy Boat': 'Motor boat',
  'Toy Dinosaur': 'T-rex',
  'Jack-in-the-Box': 'Jack-o-lantern',
  'Spinning Top': 'Cyclone',
  'Building Blocks': 'Brick',
  'Jump Rope': 'Person bouncing ball',
  'Bowling Ball': 'Bowling',
  'Toy Drum': 'Drum',
  'Marble': 'Crystal ball',
  'Toy Rocket': 'Rocket',
  'Wind-up Mouse': 'Mouse',
  'Toy Airplane': 'Airplane',
  'Rubber Duck': 'Duck',
  'Pinwheel': 'Wind chime',
  'Acoustic Guitar': 'Guitar',
  'Electric Guitar': 'Guitar',
  'Ukulele': 'Guitar',
  'Piano': 'Musical keyboard',
  'Cello': 'Violin',
  'Harp': 'Guitar',
  'Trombone': 'Trumpet',
  'Clarinet': 'Flute',
  'Drum Kit': 'Drum',
  'Snare Drum': 'Drum',
  'Tambourine': 'Maracas',
  'Harmonica': 'Musical notes',
  'Football': 'Rugby football',
  'Tennis Ball': 'Tennis',
  'Golf Ball': 'Flag in hole',
  'Tennis Racket': 'Tennis',
  'Baseball Bat': 'Baseball',
  'Hockey Stick': 'Field hockey',
  'Snowboard': 'Snowboarder',
  'Surfboard': 'Person surfing',
  'Skateboard Helmet': 'Skateboard',
  'Medal': 'Sports medal',
  'Soccer Goal': 'Soccer ball',
  'Basketball Hoop': 'Basketball',
  'Sunshine': 'Sun',
  'Thundercloud': 'Cloud with lightning',
  'Raindrop': 'Droplet',
  'Lightning Bolt': 'High voltage',
  'Comet Trail': 'Comet',
  'Foggy Cloud': 'Foggy',
  'Hailstone': 'Cloud with snow',
  'Night Sky': 'Night with stars',
  'Star Cluster': 'Glowing star',
  'Planet Ring': 'Ringed planet',
  'Snowy Mountain': 'Snow-capped mountain',
  'Sweater': 'Coat',
  'Raincoat': 'Coat',
  'Skirt': 'Dress',
  'Sneakers': 'Running shoe',
  'Boots': 'Hiking boot',
  'Sandals': 'Thong sandal',
  'Baseball Cap': 'Billed cap',
  'Winter Hat': 'Womans hat',
  'Mittens': 'Gloves',
  'Bow Tie': 'Necktie',
  'Wristwatch': 'Watch',
  'Saw': 'Carpentry saw',
  'Shovel': 'Spade suit',
  'Watering Can': 'Teapot',
  'Magnifying Glass': 'Magnifying glass tilted left',
  'Ruler': 'Straight ruler',
  'Lock': 'Locked',
  'Thread and Needle': 'Sewing needle'
};

function normalize(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findArtwork(paths, sprite) {
  const requested = aliases[sprite.name] || sprite.name;
  const folder = paths.get(normalize(requested));
  if (!folder) throw new Error(`Microsoft Fluent Emoji has no mapped Flat SVG for "${sprite.name}" (tried "${requested}").`);
  return folder;
}

function outlineFor(source) {
  const fills = [...source.matchAll(/\bfill=["']#([0-9a-f]{6})["']/gi)]
    .map((match) => match[1])
    .filter((color) => !['000000', '212121', 'ffffff', 'fffefe'].includes(color.toLowerCase()));
  if (!fills.length) return '#374151';
  const color = fills[0];
  return '#' + [0, 2, 4].map((offset) =>
    Math.round(parseInt(color.slice(offset, offset + 2), 16) * 0.48).toString(16).padStart(2, '0')
  ).join('');
}

function restyle(source) {
  const open = source.match(/<svg\b[^>]*>/i);
  if (!open) throw new Error('Downloaded Microsoft SVG has no root element.');
  const opening = open[0]
    .replace(/\s+(?:width|height)=["'][^"']*["']/gi, '')
    .replace(/\/?>$/, ' width="72" height="72">');
  const viewBox = opening.match(/\bviewBox=["']([^"']+)["']/i);
  if (!viewBox) throw new Error('Downloaded Microsoft SVG has no viewBox.');
  const closingIndex = source.lastIndexOf('</svg>');
  if (closingIndex < open.index + open[0].length) throw new Error('Downloaded Microsoft SVG is incomplete.');
  const content = source.slice(open.index + open[0].length, closingIndex);
  const defs = [];
  const artwork = content.replace(/<defs\b[\s\S]*?<\/defs>/gi, (match) => {
    defs.push(match);
    return '';
  });
  const stroke = outlineFor(artwork);
  const styled = `${opening.replace(viewBox[0], `viewBox="${viewBox[1]}"`)}${defs.join('')}<g stroke="${stroke}" stroke-width="0.85" stroke-linecap="round" stroke-linejoin="round" paint-order="stroke fill">${artwork}</g></svg>\n`;
  return styled;
}

async function getText(url) {
  const response = await fetch(url, { headers: { 'User-Agent': 'BlockCode Microsoft Fluent Emoji importer' } });
  if (!response.ok) throw new Error(`Request failed (${response.status}): ${url}`);
  return response.text();
}

async function mapConcurrent(items, concurrency, callback) {
  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const current = index++;
      await callback(items[current], current);
    }
  });
  await Promise.all(workers);
}

async function main() {
  const window = {};
  const packSource = await fs.readFile(path.join(root, 'assets', 'block-pack.js'), 'utf8');
  vm.runInNewContext(packSource, { window });
  const pack = window.BLOCK_PACK;
  const sprites = [...pack.sprites.list, ...pack.sprites.library];
  if (sprites.length !== 319) throw new Error(`Expected 319 sprite entries, found ${sprites.length}.`);

  const tree = JSON.parse(await getText('https://api.github.com/repos/microsoft/fluentui-emoji/git/trees/main?recursive=1'));
  const paths = new Map();
  for (const entry of tree.tree || []) {
    const parts = entry.path.split('/');
    if (parts[0] !== 'assets' || !parts.includes('Flat') || !entry.path.endsWith('.svg')) continue;
    paths.set(normalize(parts[1]), entry.path);
  }

  const sources = [];
  const missing = [];
  for (const sprite of sprites) {
    try {
      sources.push({ sprite, sourcePath: findArtwork(paths, sprite) });
    } catch (error) {
      if (!error.message.startsWith('Microsoft Fluent Emoji has no mapped Flat SVG')) throw error;
      missing.push(error.message);
    }
  }
  if (missing.length) throw new Error(`Unresolved sprite mappings:\n${missing.join('\n')}`);
  if (process.argv.includes('--check')) {
    console.log(`Resolved ${sources.length} sprites to ${new Set(sources.map((item) => item.sourcePath)).size} Microsoft Fluent Flat SVGs.`);
    return;
  }

  const sourceText = new Map();
  const uniquePaths = [...new Set(sources.map((item) => item.sourcePath))];
  await mapConcurrent(uniquePaths, 10, async (sourcePath, index) => {
    const url = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/' +
      sourcePath.split('/').map(encodeURIComponent).join('/');
    sourceText.set(sourcePath, await getText(url));
    if ((index + 1) % 25 === 0 || index + 1 === uniquePaths.length) {
      console.log(`Downloaded ${index + 1}/${uniquePaths.length} Microsoft SVGs`);
    }
  });

  await mapConcurrent(sources, 10, async ({ sprite, sourcePath }) => {
    const target = path.resolve(root, sprite.src);
    await fs.writeFile(target, restyle(sourceText.get(sourcePath)), 'utf8');
  });

  const license = await getText('https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/LICENSE');
  await fs.writeFile(path.join(root, 'assets', 'sprites', 'MICROSOFT-FLUENT-EMOJI-LICENSE.txt'),
    `Microsoft Fluent Emoji Flat SVG artwork\nSource: https://github.com/microsoft/fluentui-emoji\n\n${license}`, 'utf8');

  // The sprites under scripts/sprite-art are hand-drawn and must win over the
  // imported set. Reapply them last so re-importing never clobbers that work.
  execFileSync(process.execPath, [path.join(__dirname, 'fix-sprite-art.cjs')], { stdio: 'inherit' });

  console.log(`Imported ${sprites.length} project sprites from Microsoft Fluent Emoji Flat artwork; custom artwork reapplied.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
