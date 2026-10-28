import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(projectRoot, 'assets', 'blocks');
mkdirSync(outDir, { recursive: true });

const colors = {
  functions: { fill: '#14b8a6', fg: '#042f2e' },
  normal: { fill: '#f97316', fg: '#2c1000' },
  math: { fill: '#22c55e', fg: '#052e16' },
  visual: { fill: '#ec4899', fg: '#500724' },
  audio: { fill: '#ef4444', fg: '#450a0a' }
};

const connector = { x: 16, width: 20, depth: 6, shoulder: 3 };

const darken = (hex, factor = .8) => {
  const value = parseInt(hex.slice(1), 16);
  const r = Math.round(((value >> 16) & 255) * factor);
  const g = Math.round(((value >> 8) & 255) * factor);
  const b = Math.round((value & 255) * factor);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};

const icons = {
  flag: `<path d="M5 21V4" fill="none" stroke="COLOR" stroke-width="2.2" stroke-linecap="round"/><path d="M6 5h12l-2.8 4.5L18 14H6z" fill="COLOR"/>`,
  function: `<text x="5" y="19" fill="COLOR" font-size="20" font-weight="700" font-family="serif">\u0192</text>`,
  call: `<path d="M4 12h15M14 7l5 5-5 5" fill="none" stroke="COLOR" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
  loop: `<path d="M5 12a7 7 0 1 0 2.4-5.3M4 4v4h4" fill="none" stroke="COLOR" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
  forever: `<path d="M7 8c-3 0-3 8 0 8 4 0 6-8 10-8 3 0 3 8 0 8-4 0-6-8-10-8z" fill="none" stroke="COLOR" stroke-width="2" stroke-linecap="round"/>`,
  wait: `<circle cx="12" cy="12" r="9" fill="none" stroke="COLOR" stroke-width="2.2"/><path d="M12 6.8v5.4l3.4 2.2" fill="none" stroke="COLOR" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
  goto: `<circle cx="12" cy="12" r="8" fill="none" stroke="COLOR" stroke-width="2.2"/><circle cx="12" cy="12" r="2.4" fill="COLOR"/><path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4" fill="none" stroke="COLOR" stroke-width="2.2" stroke-linecap="round"/>`,
  stop: `<rect x="6" y="6" width="12" height="12" rx="2" fill="COLOR"/>`,
  move: `<path d="M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4" fill="none" stroke="COLOR" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
  turn: `<path d="M20 12a8 8 0 1 1-2.6-5.9" fill="none" stroke="COLOR" stroke-width="2.2" stroke-linecap="round"/><path d="M20 4v4.6h-4.6" fill="none" stroke="COLOR" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
  star: `<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill="COLOR"/>`,
  image: `<rect x="3" y="4" width="18" height="16" rx="2.5" fill="none" stroke="COLOR" stroke-width="2.2"/><circle cx="8.5" cy="9" r="1.6" fill="COLOR"/><path d="M4 17l5-5 4 4 3-3 4 4" fill="none" stroke="COLOR" stroke-width="2.2" stroke-linejoin="round"/>`,
  eye: `<path d="M2.5 12s3.6-6 9.5-6 9.5 6 9.5 6-3.6 6-9.5 6-9.5-6-9.5-6z" fill="none" stroke="COLOR" stroke-width="2.2"/><circle cx="12" cy="12" r="2.6" fill="COLOR"/>`,
  eyeoff: `<path d="M3 4l18 16" fill="none" stroke="COLOR" stroke-width="2.2" stroke-linecap="round"/><path d="M9.8 6.3A10.7 10.7 0 0 1 12 6c5.9 0 9.5 6 9.5 6a16 16 0 0 1-3 3.3M6.2 8.1C4 9.7 2.5 12 2.5 12s3.6 6 9.5 6c1.1 0 2.1-.2 3-.5" fill="none" stroke="COLOR" stroke-width="2" stroke-linecap="round"/>`,
  resize: `<path d="M4 10V4h6M20 14v6h-6M4 4l6 6M20 20l-6-6" fill="none" stroke="COLOR" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
  speaker: `<path d="M4 9h4l5-4v14l-5-4H4z" fill="COLOR"/><path d="M16 9a4.5 4.5 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" fill="none" stroke="COLOR" stroke-width="2.1" stroke-linecap="round"/>`,
  mute: `<path d="M4 9h4l5-4v14l-5-4H4z" fill="COLOR"/><path d="M16 9l5 6M21 9l-5 6" fill="none" stroke="COLOR" stroke-width="2.2" stroke-linecap="round"/>`,
  say: `<path d="M5 3.5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H10l-5 4.5v-4.5H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z" fill="COLOR"/>`
};

const blocks = [
  { file: 'start.svg', kind: 'hat', category: 'functions', width: 160, height: 52, bodyHeight: 46, icon: 'flag', iconY: 15.5, texts: [{ x: 40, y: 28, value: 'on start' }] },
  { file: 'define.svg', kind: 'hat', category: 'functions', width: 250, height: 52, bodyHeight: 46, icon: 'function', iconY: 15.5, texts: [{ x: 40, y: 28, value: 'define' }, { x: 212, y: 28, value: '()' }], slots: [{ x: 98, y: 15, w: 108, h: 22 }] },
  { file: 'call.svg', kind: 'stack', category: 'functions', width: 230, icon: 'call', texts: [{ x: 40, y: 24, value: 'call' }, { x: 194, y: 24, value: '()' }], slots: [{ x: 76, y: 8, w: 112, h: 22 }] },
  { file: 'repeat-top.svg', kind: 'cblock', category: 'functions', width: 200, icon: 'loop', texts: [{ x: 40, y: 24, value: 'repeat' }, { x: 152, y: 24, value: 'times' }], slots: [{ x: 96, y: 8, w: 48, h: 22 }] },
  { file: 'forever-top.svg', kind: 'cblock', category: 'functions', width: 160, icon: 'forever', texts: [{ x: 40, y: 24, value: 'forever' }] },
  { file: 'wait.svg', kind: 'stack', category: 'normal', width: 158, icon: 'wait', texts: [{ x: 40, y: 24, value: 'wait' }, { x: 122, y: 24, value: 's' }], slots: [{ x: 76, y: 8, w: 40, h: 22 }] },
  { file: 'goto.svg', kind: 'stack', category: 'normal', width: 142, icon: 'goto', texts: [{ x: 40, y: 24, value: 'go to start' }] },
  { file: 'stop.svg', kind: 'stack', category: 'normal', width: 120, icon: 'stop', texts: [{ x: 40, y: 24, value: 'stop' }] },
  { file: 'setvar.svg', kind: 'stack', category: 'math', width: 300, icon: 'function', texts: [{ x: 40, y: 24, value: 'set' }, { x: 144, y: 24, value: 'to' }], slots: [{ x: 74, y: 8, w: 64, h: 22 }, { x: 170, y: 8, w: 120, h: 22 }] },
  { file: 'changevar.svg', kind: 'stack', category: 'math', width: 310, icon: 'function', texts: [{ x: 40, y: 24, value: 'change' }, { x: 162, y: 24, value: 'by' }], slots: [{ x: 92, y: 8, w: 64, h: 22 }, { x: 188, y: 8, w: 112, h: 22 }] },
  { file: 'add.svg', kind: 'reporter', category: 'math', width: 150, height: 36, texts: [{ x: 75, y: 23, value: '+', anchor: 'middle' }], slots: [{ x: 30, y: 7, w: 36, h: 22 }, { x: 94, y: 7, w: 36, h: 22 }] },
  { file: 'subtract.svg', kind: 'reporter', category: 'math', width: 150, height: 36, texts: [{ x: 75, y: 23, value: '\u2212', anchor: 'middle' }], slots: [{ x: 30, y: 7, w: 36, h: 22 }, { x: 94, y: 7, w: 36, h: 22 }] },
  { file: 'multiply.svg', kind: 'reporter', category: 'math', width: 150, height: 36, texts: [{ x: 75, y: 23, value: '\u00d7', anchor: 'middle' }], slots: [{ x: 30, y: 7, w: 36, h: 22 }, { x: 94, y: 7, w: 36, h: 22 }] },
  { file: 'divide.svg', kind: 'reporter', category: 'math', width: 150, height: 36, texts: [{ x: 75, y: 23, value: '\u00f7', anchor: 'middle' }], slots: [{ x: 30, y: 7, w: 36, h: 22 }, { x: 94, y: 7, w: 36, h: 22 }] },
  { file: 'round.svg', kind: 'reporter', category: 'math', width: 126, height: 36, texts: [{ x: 14, y: 23, value: 'round' }], slots: [{ x: 66, y: 7, w: 46, h: 22 }] },
  { file: 'random.svg', kind: 'reporter', category: 'math', width: 200, height: 36, texts: [{ x: 14, y: 23, value: 'random' }, { x: 122, y: 23, value: 'to' }], slots: [{ x: 78, y: 7, w: 38, h: 22 }, { x: 146, y: 7, w: 38, h: 22 }] },
  { file: 'variable.svg', kind: 'reporter', category: 'math', width: 170, height: 36, texts: [{ x: 14, y: 23, value: 'variable' }], slots: [{ x: 82, y: 7, w: 74, h: 22 }] },
  { file: 'move.svg', kind: 'stack', category: 'visual', width: 190, icon: 'move', texts: [{ x: 40, y: 24, value: 'move' }, { x: 130, y: 24, value: 'steps' }], slots: [{ x: 82, y: 8, w: 44, h: 22 }] },
  { file: 'turn.svg', kind: 'stack', category: 'visual', width: 158, icon: 'turn', texts: [{ x: 40, y: 24, value: 'turn' }, { x: 126, y: 24, value: '\u00b0' }], slots: [{ x: 76, y: 8, w: 44, h: 22 }] },
  { file: 'switchsprite.svg', kind: 'stack', category: 'visual', width: 290, icon: 'star', texts: [{ x: 40, y: 24, value: 'switch sprite to' }], slots: [{ x: 164, y: 8, w: 112, h: 22 }] },
  { file: 'switchbg.svg', kind: 'stack', category: 'visual', width: 300, icon: 'image', texts: [{ x: 40, y: 24, value: 'switch background to' }], slots: [{ x: 184, y: 8, w: 102, h: 22 }] },
  { file: 'show.svg', kind: 'stack', category: 'visual', width: 150, icon: 'eye', texts: [{ x: 40, y: 24, value: 'show sprite' }] },
  { file: 'hide.svg', kind: 'stack', category: 'visual', width: 150, icon: 'eyeoff', texts: [{ x: 40, y: 24, value: 'hide sprite' }] },
  { file: 'setsize.svg', kind: 'stack', category: 'visual', width: 190, icon: 'resize', texts: [{ x: 40, y: 24, value: 'set size' }, { x: 158, y: 24, value: '%' }], slots: [{ x: 108, y: 8, w: 44, h: 22 }] },
  { file: 'gotoxy.svg', kind: 'stack', category: 'visual', width: 280, icon: 'goto', texts: [{ x: 40, y: 24, value: 'go to x' }, { x: 164, y: 24, value: 'y' }], slots: [{ x: 98, y: 8, w: 44, h: 22 }, { x: 186, y: 8, w: 44, h: 22 }] },
  { file: 'glide.svg', kind: 'stack', category: 'visual', width: 340, icon: 'move', texts: [{ x: 40, y: 24, value: 'glide' }, { x: 122, y: 24, value: 's to x' }, { x: 236, y: 24, value: 'y' }], slots: [{ x: 82, y: 8, w: 34, h: 22 }, { x: 182, y: 8, w: 44, h: 22 }, { x: 258, y: 8, w: 44, h: 22 }] },
  { file: 'changex.svg', kind: 'stack', category: 'visual', width: 230, icon: 'move', texts: [{ x: 40, y: 24, value: 'change x by' }], slots: [{ x: 140, y: 8, w: 50, h: 22 }] },
  { file: 'changey.svg', kind: 'stack', category: 'visual', width: 230, icon: 'move', texts: [{ x: 40, y: 24, value: 'change y by' }], slots: [{ x: 140, y: 8, w: 50, h: 22 }] },
  { file: 'point.svg', kind: 'stack', category: 'visual', width: 260, icon: 'turn', texts: [{ x: 40, y: 24, value: 'point in direction' }], slots: [{ x: 190, y: 8, w: 48, h: 22 }] },
  { file: 'say.svg', kind: 'stack', category: 'audio', width: 252, icon: 'say', texts: [{ x: 40, y: 24, value: 'say' }, { x: 172, y: 24, value: 'for' }, { x: 232, y: 24, value: 's' }], slots: [{ x: 70, y: 8, w: 96, h: 22 }, { x: 196, y: 8, w: 30, h: 22 }] },
  { file: 'speak.svg', kind: 'stack', category: 'audio', width: 250, icon: 'speaker', texts: [{ x: 40, y: 24, value: 'speak' }], slots: [{ x: 92, y: 8, w: 146, h: 22 }] },
  { file: 'tone.svg', kind: 'stack', category: 'audio', width: 300, icon: 'speaker', texts: [{ x: 40, y: 24, value: 'play tone' }, { x: 160, y: 24, value: 'Hz for' }, { x: 254, y: 24, value: 's' }], slots: [{ x: 108, y: 8, w: 46, h: 22 }, { x: 214, y: 8, w: 34, h: 22 }] },
  { file: 'stopsounds.svg', kind: 'stack', category: 'audio', width: 200, icon: 'mute', texts: [{ x: 40, y: 24, value: 'stop all sounds' }] }
];

const escapeXml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

function stackBody(w, b, topRadius, notch, flatBottom) {
  const r = topRadius;
  const bottom = 4;
  const { x, width, depth, shoulder } = connector;
  const top = notch
    ? `M${r} 0 H${x} V1 Q${x} ${depth} ${x + shoulder} ${depth} H${x + width - shoulder} Q${x + width} ${depth} ${x + width} 1 V0 H${w - r}`
    : `M${r} 0 H${w - r}`;
  const end = flatBottom
    ? `Q${w} 0 ${w} ${r} V${b} H0 V${r} Q0 0 ${r} 0 Z`
    : `Q${w} 0 ${w} ${r} V${b - bottom} Q${w} ${b} ${w - bottom} ${b} H${bottom} Q0 ${b} 0 ${b - bottom} V${r} Q0 0 ${r} 0 Z`;
  return top + ' ' + end;
}

function tabPath(bodyHeight) {
  const { x, width, depth, shoulder } = connector;
  const tabTop = bodyHeight - 4;
  const tabBottom = bodyHeight + depth;
  const tabJoin = bodyHeight + 1;
  return {
    shape: `M${x} ${tabTop} H${x + width} V${tabJoin} Q${x + width} ${tabBottom} ${x + width - shoulder} ${tabBottom} H${x + shoulder} Q${x} ${tabBottom} ${x} ${tabJoin} V${tabTop} Z`,
    outlineTop: bodyHeight - 2,
    outline: `M${x} ${bodyHeight - 2} V${tabJoin} Q${x} ${tabBottom} ${x + shoulder} ${tabBottom} H${x + width - shoulder} Q${x + width} ${tabBottom} ${x + width} ${tabJoin} V${bodyHeight - 2}`
  };
}

function makeStack(block) {
  const { fill, fg } = colors[block.category];
  const outline = darken(fill);
  const isCBlock = block.kind === 'cblock';
  const height = block.height || 44;
  const bodyHeight = block.bodyHeight || (isCBlock ? height : 38);
  const topRadius = block.kind === 'hat' ? 18 : 4;
  const body = stackBody(block.width, bodyHeight, topRadius, block.kind !== 'hat', isCBlock);
  const tab = isCBlock ? null : tabPath(bodyHeight);
  const outlineStart = isCBlock ? connector.x : 0;
  const icon = block.icon ? icons[block.icon].replaceAll('COLOR', fg) : '';
  const pills = (block.slots || []).map((slot) =>
    `  <rect x="${slot.x}" y="${slot.y}" width="${slot.w}" height="${slot.h}" rx="4" fill="#ffffff" fill-opacity=".94" stroke="#000000" stroke-opacity=".12"/>`
  ).join('\n');
  const texts = (block.texts || []).map((text) =>
    `  <text x="${text.x}" y="${text.y}" fill="${fg}" font-family="'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif" font-size="14.5" font-weight="600"${text.anchor ? ` text-anchor="${text.anchor}"` : ''}>${escapeXml(text.value)}</text>`
  ).join('\n');
  const baseShape = isCBlock ? '' : `  <defs>
    <clipPath id="blockClip"><path d="${body}"/></clipPath>
    <clipPath id="tabClip"><path d="${tab ? tab.shape : body}"/></clipPath>
  </defs>
  <path d="${body}" fill="${fill}"/>
  <rect x="${outlineStart}" y="${bodyHeight - 2}" width="${block.width - outlineStart}" height="2" fill="${outline}" clip-path="url(#blockClip)"/>
${tab ? `  <path d="${tab.shape}" fill="${fill}"/>
  <path d="${tab.outline}" fill="none" stroke="${outline}" stroke-width="4" clip-path="url(#tabClip)"/>` : ''}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${block.width}" height="${height}" viewBox="0 0 ${block.width} ${height}" fill="none">
${baseShape}
${pills}
${block.icon ? `  <g transform="translate(16 ${block.kind === 'hat' ? 15.5 : 11.5}) scale(.625)">
    ${icon}
  </g>` : ''}
${texts}
</svg>
`;
}

function makeReporter(block) {
  const { fill, fg } = colors[block.category];
  const outline = darken(fill);
  const radius = Math.max(2, block.height / 2 - 1);
  const pills = (block.slots || []).map((slot) =>
    `  <rect x="${slot.x}" y="${slot.y}" width="${slot.w}" height="${slot.h}" rx="4" fill="#ffffff" fill-opacity=".94" stroke="#000000" stroke-opacity=".12"/>`
  ).join('\n');
  const texts = (block.texts || []).map((text) =>
    `  <text x="${text.x}" y="${text.y}" fill="${fg}" font-family="'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif" font-size="14.5" font-weight="600"${text.anchor ? ` text-anchor="${text.anchor}"` : ''}>${escapeXml(text.value)}</text>`
  ).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${block.width}" height="${block.height}" viewBox="0 0 ${block.width} ${block.height}" fill="none">
  <rect x="1" y="1" width="${block.width - 2}" height="${block.height - 2}" rx="${radius}" fill="${fill}" stroke="${outline}" stroke-width="2"/>
${pills}
${texts}
</svg>
`;
}

for (const block of blocks) {
  const svg = block.kind === 'reporter'
    ? makeReporter(block)
    : makeStack(block);
  writeFileSync(join(outDir, block.file), svg, 'utf8');
  console.log('wrote', join(outDir, block.file));
}
