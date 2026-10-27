import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = process.argv[2]
  ? resolve(process.argv[2])
  : join(projectRoot, 'assets', 'blocks');
mkdirSync(outDir, { recursive: true });

const colors = {
  event: { fill: '#f0b32e', fg: '#3a2500' },
  motion: { fill: '#3f7bf0', fg: '#ffffff' },
  looks: { fill: '#a855f7', fg: '#ffffff' },
  control: { fill: '#f97316', fg: '#2c1000' }
};

const connector = {
  x: 16,
  width: 20,
  depth: 6,
  shoulder: 3
};

const darken = (hex, factor = .8) => {
  const value = parseInt(hex.slice(1), 16);
  const r = Math.round(((value >> 16) & 255) * factor);
  const g = Math.round(((value >> 8) & 255) * factor);
  const b = Math.round((value & 255) * factor);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};

const icons = {
  flag: `<path d="M5 21V4" fill="none" stroke="COLOR" stroke-width="2.2" stroke-linecap="round"/><path d="M6 5h12l-2.8 4.5L18 14H6z" fill="COLOR"/>`,
  move: `<path d="M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4" fill="none" stroke="COLOR" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
  turn: `<path d="M20 12a8 8 0 1 1-2.6-5.9" fill="none" stroke="COLOR" stroke-width="2.2" stroke-linecap="round"/><path d="M20 4v4.6h-4.6" fill="none" stroke="COLOR" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
  goto: `<circle cx="12" cy="12" r="8" fill="none" stroke="COLOR" stroke-width="2.2"/><circle cx="12" cy="12" r="2.4" fill="COLOR"/><path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4" fill="none" stroke="COLOR" stroke-width="2.2" stroke-linecap="round"/>`,
  say: `<path d="M5 3.5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H10l-5 4.5v-4.5H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z" fill="COLOR"/>`,
  wait: `<circle cx="12" cy="12" r="9" fill="none" stroke="COLOR" stroke-width="2.2"/><path d="M12 6.8v5.4l3.4 2.2" fill="none" stroke="COLOR" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`
};

const blocks = [
  {
    file: 'event.svg',
    category: 'event',
    width: 160,
    height: 52,
    bodyHeight: 46,
    topRadius: 10,
    icon: 'flag',
    iconX: 16,
    iconY: 15.5,
    texts: [{ x: 40, y: 28, value: 'when clicked' }],
    slots: []
  },
  {
    file: 'move.svg',
    category: 'motion',
    width: 190,
    height: 44,
    bodyHeight: 38,
    topRadius: 4,
    notch: true,
    icon: 'move',
    iconX: 16,
    iconY: 11.5,
    texts: [
      { x: 40, y: 24, value: 'move' },
      { x: 130, y: 24, value: 'steps' }
    ],
    slots: [{ x: 82, y: 8, w: 44, h: 22 }]
  },
  {
    file: 'turn.svg',
    category: 'motion',
    width: 158,
    height: 44,
    bodyHeight: 38,
    topRadius: 4,
    notch: true,
    icon: 'turn',
    iconX: 16,
    iconY: 11.5,
    texts: [
      { x: 40, y: 24, value: 'turn' },
      { x: 126, y: 24, value: '\u00b0' }
    ],
    slots: [{ x: 76, y: 8, w: 44, h: 22 }]
  },
  {
    file: 'goto.svg',
    category: 'motion',
    width: 142,
    height: 44,
    bodyHeight: 38,
    topRadius: 4,
    notch: true,
    icon: 'goto',
    iconX: 16,
    iconY: 11.5,
    texts: [{ x: 40, y: 24, value: 'go to start' }],
    slots: []
  },
  {
    file: 'say.svg',
    category: 'looks',
    width: 252,
    height: 44,
    bodyHeight: 38,
    topRadius: 4,
    notch: true,
    icon: 'say',
    iconX: 16,
    iconY: 11.5,
    texts: [
      { x: 40, y: 24, value: 'say' },
      { x: 172, y: 24, value: 'for' },
      { x: 232, y: 24, value: 's' }
    ],
    slots: [
      { x: 70, y: 8, w: 96, h: 22 },
      { x: 196, y: 8, w: 30, h: 22 }
    ]
  },
  {
    file: 'wait.svg',
    category: 'control',
    width: 158,
    height: 44,
    bodyHeight: 38,
    topRadius: 4,
    notch: true,
    icon: 'wait',
    iconX: 16,
    iconY: 11.5,
    texts: [
      { x: 40, y: 24, value: 'wait' },
      { x: 122, y: 24, value: 's' }
    ],
    slots: [{ x: 76, y: 8, w: 40, h: 22 }]
  }
];

function bodyPath(w, b, topRadius, notch) {
  const r = topRadius;
  const bottom = 4;
  const { x, width, depth, shoulder } = connector;
  const top = notch
    ? `M${r} 0 H${x} V1 Q${x} ${depth} ${x + shoulder} ${depth} H${x + width - shoulder} Q${x + width} ${depth} ${x + width} 1 V0 H${w - r}`
    : `M${r} 0 H${w - r}`;
  return `${top} Q${w} 0 ${w} ${r} V${b - bottom} Q${w} ${b} ${w - bottom} ${b} H${bottom} Q0 ${b} 0 ${b - bottom} V${r} Q0 0 ${r} 0 Z`;
}

const escapeXml = (value) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

for (const block of blocks) {
  const { fill, fg } = colors[block.category];
  const outline = darken(fill);
  const body = bodyPath(block.width, block.bodyHeight, block.topRadius, block.notch);
  const outlineWidth = 2;
  const { x: tabX, width: tabW, depth: tabDepth, shoulder: tabShoulder } = connector;
  const tabTop = block.bodyHeight - 4;
  const tabBottom = block.bodyHeight + tabDepth;
  const tabJoin = block.bodyHeight + 1;
  const tabShape = `M${tabX} ${tabTop} H${tabX + tabW} V${tabJoin} Q${tabX + tabW} ${tabBottom} ${tabX + tabW - tabShoulder} ${tabBottom} H${tabX + tabShoulder} Q${tabX} ${tabBottom} ${tabX} ${tabJoin} V${tabTop} Z`;
  const tabOutlineTop = block.bodyHeight - outlineWidth;
  const tabOutline = `M${tabX} ${tabOutlineTop} V${tabJoin} Q${tabX} ${tabBottom} ${tabX + tabShoulder} ${tabBottom} H${tabX + tabW - tabShoulder} Q${tabX + tabW} ${tabBottom} ${tabX + tabW} ${tabJoin} V${tabOutlineTop}`;
  const icon = icons[block.icon].replaceAll('COLOR', fg);

  const pills = block.slots.map((slot) =>
    `  <rect x="${slot.x}" y="${slot.y}" width="${slot.w}" height="${slot.h}" rx="4" fill="#ffffff" fill-opacity=".94" stroke="#000000" stroke-opacity=".12"/>`
  ).join('\n');

  const texts = block.texts.map((text) =>
    `  <text x="${text.x}" y="${text.y}" fill="${fg}" font-family="'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif" font-size="14.5" font-weight="600">${escapeXml(text.value)}</text>`
  ).join('\n');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${block.width}" height="${block.height}" viewBox="0 0 ${block.width} ${block.height}" fill="none">
  <defs>
    <clipPath id="blockClip"><path d="${body}"/></clipPath>
    <clipPath id="tabClip"><path d="${tabShape}"/></clipPath>
  </defs>
  <path d="${body}" fill="${fill}"/>
  <rect x="0" y="${block.bodyHeight - outlineWidth}" width="${block.width}" height="${outlineWidth}" fill="${outline}" clip-path="url(#blockClip)"/>
  <path d="${tabShape}" fill="${fill}"/>
  <path d="${tabOutline}" fill="none" stroke="${outline}" stroke-width="${outlineWidth * 2}" clip-path="url(#tabClip)"/>
${pills}
  <g transform="translate(${block.iconX} ${block.iconY}) scale(.625)">
    ${icon}
  </g>
${texts}
</svg>
`;

  writeFileSync(join(outDir, block.file), svg, 'utf8');
  console.log('wrote', join(outDir, block.file));
}
