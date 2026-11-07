// Shared application state and block model helpers.
'use strict';

const PACK = window.BLOCK_PACK;

if (!PACK || !Array.isArray(PACK.blocks)) {
  console.error('BlockCode: assets/block-pack.js is missing or invalid.');
  throw new Error('BlockCode asset pack is unavailable.');
}

const CATEGORIES = PACK.categories || {};
const DEFS = {};
PACK.blocks.forEach((def) => {
  if (def && def.type) DEFS[def.type] = def;
});

const PAD = 40;
const SNAP_DISTANCE = 30;
const SNAP_LEFT = 64;
const STACK_OVERLAP = 6;
const MAX_CALL_DEPTH = 32;
const sleepers = new Set();

let uid = 0;
let drag = null;
let expressionDrag = null;
let toastTimer = null;
let lastBlockClick = null;
let suppressCanvasClickUntil = 0;
let isolatedBlockId = null;
let workspaceZoom = 1;
let workspaceBySprite = Object.create(null);
let activeWorkspaceSpriteId = null;
const SPRITE_WORKSPACES_KEY = 'blockcode.sprite-workspaces.v1';
const selectedBlockIds = new Set();
const DOUBLE_CLICK_MS = 500;
const ASSETS_KEY = 'blockcode.assets.v1';
const VARIABLES_KEY = 'blockcode.variables.v1';
const LISTS_KEY = 'blockcode.lists.v1';
const VISIBLE_VARIABLES_KEY = 'blockcode.visible-variables.v1';
const VISIBLE_LISTS_KEY = 'blockcode.visible-lists.v1';

const state = {
  running: false,
  token: 0,
  x: 0,
  y: 0,
  heading: 0,
  size: 100,
  visible: true,
  spriteId: 'rocket',
  backgroundId: 'mission'
};

let runtimeSprites = [];
let runtimeBackgrounds = [];
let workspaceVariables = [];
let workspaceLists = [];
let visibleVariables = new Set();
let visibleLists = new Set();
let monitorRuntimeValues = null;
let audioContext = null;
let activeOscillators = new Set();

const $ = (id) => document.getElementById(id);
const monitorPanelEl = $('monitorPanel');
const toolboxEl = $('panelToolbox');
const paletteEl = $('palette');
const scriptsEl = $('scripts');
const canvasEl = $('canvas');
const emptyEl = $('empty');
const hintEl = $('hint');
const zoomLevelEl = $('zoomLevel');
const toastEl = $('toast');
const snapPreview = $('snapPreview');
const stageEl = $('stage');
const spriteEl = $('sprite');
const rocketEl = $('rocket');
const spriteImg = $('spriteImg');
const spritePick = $('spritePick');
const spriteStripEl = $('spriteStrip');
const bubbleEl = $('bubble');
const posEl = $('posLabel');
const runBtn = $('runBtn');
const stopBtn = $('stopBtn');
const resetBtn = $('resetBtn');
const clearBtn = $('clearBtn');
const uploadBtn = $('uploadBtn');
const layoutEl = $('layout');
const codeStatusEl = $('codeStatus');
const watchCodeEl = $('watchCode');
const copyCodeBtn = $('copyCodeBtn');
const downloadCodeBtn = $('downloadCodeBtn');
const buildAppBtn = $('buildAppBtn');
const newSpriteBtn = $('newSpriteBtn');
const makeCustomSpriteBtn = $('makeCustomSpriteBtn');
const spriteUploadInput = $('spriteUpload');
const spriteListEl = $('spriteList');
const bgNameInput = $('bgName');
const bgColorInput = $('bgColor');
const bgAccentInput = $('bgAccent');
const createBgBtn = $('createBgBtn');
const bgUploadInput = $('bgUpload');
const bgListEl = $('bgList');
const assetEditorHost = $('assetEditorHost');
const assetEditorTitle = $('assetEditorTitle');
const assetEditorBack = $('assetEditorBack');

const tabEls = Array.prototype.slice.call(document.querySelectorAll('.tabs .tab'));
const viewEls = Array.prototype.slice.call(document.querySelectorAll('[data-view-panel]'));
const splitterEls = Array.prototype.slice.call(document.querySelectorAll('.splitter'));
const panelEls = {};
document.querySelectorAll('[data-panel]').forEach((panel) => {
  panelEls[panel.dataset.panel] = panel;
});

const LAYOUT_KEY = 'blockcode.layout.v1';
const PANEL_LABELS = { toolbox: 'Blocks', workspace: 'Workspace', code: 'Code', stage: 'Watch Preview' };
const DEFAULT_SIZE = { toolbox: 300, stage: 348 };
let layoutState = {
  toolbox: DEFAULT_SIZE.toolbox,
  stage: DEFAULT_SIZE.stage,
  collapsed: { toolbox: false, workspace: false, code: false, stage: false }
};
let stageObserver = null;

function makeBlock(type, params) {
  const def = DEFS[type];
  if (!def) {
    console.warn('BlockCode: unknown block type "' + type + '" in asset pack.');
    return null;
  }

  const base = {};
  Object.keys(def.fields || {}).forEach((key) => {
    base[key] = defaultBlockFieldValue(type, key);
  });

  const block = {
    id: 'blk-' + (++uid),
    type: type,
    params: Object.assign(base, params || {})
  };

  if (def.cblock) block.children = [];

  return block;
}

const BOOLEAN_CONDITION_BLOCKS = new Set(['if', 'elseif', 'while']);
const COMPARISON_REPORTER_ACTIONS = new Set([
  'equals', 'less', 'greater', 'not-equal'
]);
const COMPARISON_OPERATORS = new Set(['<', '=', '>']);

function comparisonOperator(value) {
  const operator = value && value.params && value.params.operator;
  return COMPARISON_OPERATORS.has(operator) ? operator : '<';
}

function defaultBlockFieldValue(type, field) {
  if (field === 'condition' && BOOLEAN_CONDITION_BLOCKS.has(type)) {
    return null;
  }
  const def = DEFS[type];
  return def && def.fields && def.fields[field] !== undefined
    ? def.fields[field]
    : 0;
}

function isConditionReporter(block) {
  const def = block && DEFS[block.type];
  return !!(def && def.reporter &&
    (COMPARISON_REPORTER_ACTIONS.has(def.action) || def.category === 'sensing'));
}

function isCBlock(block) {
  const def = DEFS[block.type];
  return !!(def && def.cblock);
}

function isReporter(block) {
  const def = DEFS[block.type];
  return !!(def && def.reporter);
}

function isHat(block) {
  const def = DEFS[block.type];
  return !!def && (def.action === 'event' || def.action === 'start' || def.hat);
}

function isClickHat(block) {
  const def = DEFS[block.type];
  return !!def && def.action === 'event';
}

function isStartupHat(block) {
  const def = DEFS[block.type];
  return !!def && def.action === 'start';
}

function isDefine(block) {
  const def = DEFS[block.type];
  return !!(def && def.action === 'define');
}

function isExpression(value) {
  return !!(value && typeof value === 'object' && value.type && value.id);
}

function blockPathKey(path) {
  return path.join('.');
}

function parseBlockPath(value) {
  return String(value || '').split('.').filter((part) => part !== '').map(Number);
}

function blockAtPath(path) {
  if (!path || !path.length) return null;
  const script = workspace[path[0]];
  if (!script) return null;

  let container = script;
  let block = null;

  for (let i = 1; i < path.length; i++) {
    block = container[path[i]];
    if (!block) return null;
    if (i < path.length - 1) {
      container = block.children;
      if (!Array.isArray(container)) return null;
    }
  }

  return block;
}

function containerAtPath(path) {
  if (!path || !path.length) return null;
  if (path.length === 1) return workspace[path[0]] || null;
  const parent = blockAtPath(path);
  return parent && Array.isArray(parent.children) ? parent.children : null;
}

function findBlockById(id) {
  let match = null;
  walkContainer(workspace, (block) => {
    if (!match && block.id === id) match = block;
  });
  return match;
}

function walkContainer(container, visitor) {
  (container || []).forEach((block) => {
    if (Array.isArray(block)) {
      walkContainer(block, visitor);
      return;
    }
    visitor(block);
    if (isCBlock(block) && Array.isArray(block.children)) {
      walkContainer(block.children, visitor);
    }
  });
}

function walkBlocks(visitor) {
  walkContainer(workspace, visitor);
}

function collectBlockIds(blocks, out) {
  (blocks || []).forEach((block) => {
    out.add(block.id);
    if (isCBlock(block)) collectBlockIds(block.children, out);
  });
  return out;
}

function cloneBlockTree(block) {
  const copy = JSON.parse(JSON.stringify(block));
  reassignBlockIds(copy);
  return copy;
}

function reassignBlockIds(block) {
  block.id = 'blk-' + (++uid);
  if (isExpression(block)) block.id = 'expr-' + (++uid);
  Object.keys(block.params || {}).forEach((key) => {
    if (isExpression(block.params[key])) reassignBlockIds(block.params[key]);
  });
  if (Array.isArray(block.children)) block.children.forEach(reassignBlockIds);
}

function countBlocks() {
  let total = 0;
  walkBlocks(() => { total += 1; });
  return total;
}

function functionDefinitions() {
  const definitions = [];
  workspace.forEach((script, scriptIndex) => {
    if (!script.length || !isDefine(script[0])) return;
    const name = String(script[0].params.name || '').trim();
    if (name) definitions.push({ name: name, script: script, index: scriptIndex });
  });
  return definitions;
}

function functionNames() {
  return functionDefinitions().map((item) => item.name);
}

function signalNames() {
  const names = new Set();
  const containers = Object.keys(workspaceBySprite || {}).map((spriteId) => workspaceBySprite[spriteId]);
  containers.push(workspace);
  containers.forEach((container) => {
    walkContainer(container, (block) => {
      if ((DEFS[block.type] || {}).action !== 'broadcast') return;
      const message = String(block.params.message || '').trim();
      if (message) names.add(message);
    });
  });
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

function findFunctionScript(name) {
  const definition = functionDefinitions().find((item) => item.name === name);
  return definition ? definition.script : null;
}

function allSprites() {
  return runtimeSprites.length ? runtimeSprites : (PACK.sprites && PACK.sprites.list) || [];
}

function allBackgrounds() {
  return runtimeBackgrounds.length ? runtimeBackgrounds : (PACK.backgrounds && PACK.backgrounds.list) || [];
}

function activeSprite() {
  const sprites = allSprites();
  return sprites.find((sprite) => sprite.id === state.spriteId) || sprites[0] || null;
}

function activeBackground() {
  const backgrounds = allBackgrounds();
  return backgrounds.find((bg) => bg.id === state.backgroundId) || backgrounds[0] || null;
}

function cppIdentifier(value) {
  let text = String(value || '').trim().replace(/[^A-Za-z0-9_]/g, '_');
  if (!text) text = 'unnamed';
  if (/^[0-9]/.test(text)) text = '_' + text;
  return text;
}

function functionCppName(name) {
  return 'fn_' + cppIdentifier(name);
}

function variableCppName(name) {
  return 'var_' + cppIdentifier(name);
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const snapToDevicePixel = (value) => {
  const ratio = window.devicePixelRatio || 1;
  return Math.round(value * ratio) / ratio;
};

const toNum = (value, fallback, limit) => {
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return fallback;
  return clamp(n, -(limit || 9999), limit || 9999);
};
