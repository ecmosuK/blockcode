'use strict';

/* ---------- Watch C++ code generation ---------- */

let previewCodeLines = null;
let previewCodeBlockId = null;
let watchCodeLineBlocks = [];

function cppString(value) {
  return '"' + String(value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n') + '"';
}

function formatNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(3)));
}

function formatFloat(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0.0f';
  const rounded = Number(n.toFixed(3));
  return (Number.isInteger(rounded) ? rounded.toFixed(1) : String(rounded)) + 'f';
}

function exprToCpp(value) {
  if (isExpression(value)) {
    const a = () => exprToCpp(value.params.a);
    const b = () => exprToCpp(value.params.b);
    switch (value.type) {
      case 'add': return '(' + a() + ' + ' + b() + ')';
      case 'subtract': return '(' + a() + ' - ' + b() + ')';
      case 'multiply': return '(' + a() + ' * ' + b() + ')';
      case 'divide': return '(' + a() + ' / (' + b() + ' == 0.0f ? 1.0f : ' + b() + '))';
      case 'round': return 'roundf(' + a() + ')';
      case 'random': return 'watch_random(' + a() + ', ' + b() + ')';
      case 'variable': return variableCppName(variableName(value.params.name));
      case 'listitem': {
        const list = listCppName(value.params.list);
        const index = '(int)(' + exprToCpp(value.params.index) + ')';
        return '((' + index + ' >= 1 && ' + index + ' <= (int)' + list +
          '.size()) ? strtof(' + list + '[' + index + ' - 1].c_str(), nullptr) : 0.0f)';
      }
      case 'listlength': return '(float)' + listCppName(value.params.list) + '.size()';
      case 'listcontains': {
        const list = listCppName(value.params.list);
        return '(std::find(' + list + '.begin(), ' + list + '.end(), ' +
          cppString(value.params.item) + ') != ' + list + '.end() ? 1.0f : 0.0f)';
      }
      case 'equals': return '(' + a() + ' == ' + b() + ' ? 1.0f : 0.0f)';
      case 'and': return '(' + a() + ' != 0.0f && ' + b() + ' != 0.0f ? 1.0f : 0.0f)';
      case 'or': return '(' + a() + ' != 0.0f || ' + b() + ' != 0.0f ? 1.0f : 0.0f)';
      case 'not': return '(' + a() + ' == 0.0f ? 1.0f : 0.0f)';
      case 'touching': return '(watch_touching(' + cppString(value.params.sprite) + ') ? 1.0f : 0.0f)';
      default: return '0.0f';
    }
  }
  return formatFloat(value);
}

function collectExpressionVariables(value, out) {
  if (!isExpression(value)) return;
  if (value.type === 'variable') {
    out.add(variableName(value.params.name));
  }
  Object.keys(value.params || {}).forEach((key) => {
    collectExpressionVariables(value.params[key], out);
  });
}

function executableScripts() {
  return workspace.filter((script) => {
    const action = script.length && DEFS[script[0].type] && DEFS[script[0].type].action;
    return script.length > 0 && (isStartupHat(script[0]) || action === 'signal');
  });
}

function collectVariableNames(functions) {
  const names = new Set(workspaceVariables);
  const scripts = executableScripts().concat(functions.map((definition) => definition.script));
  scripts.forEach((script) => {
    walkContainer(script, (block) => {
      const def = DEFS[block.type] || {};
      const action = def.action || block.type;
      if (action === 'setvar' || action === 'changevar') {
        names.add(variableName(block.params.name));
      }
      Object.keys(block.params || {}).forEach((key) => {
        collectExpressionVariables(block.params[key], names);
      });
    });
  });
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

function listCppName(name) {
  return 'list_' + cppIdentifier(String(name || '').trim() || 'list');
}

function collectListNames(functions) {
  const names = new Set(workspaceLists);
  const scripts = executableScripts().concat(functions.map((definition) => definition.script));
  scripts.forEach((script) => {
    walkContainer(script, (block) => {
      if (block.params && block.params.list) names.add(String(block.params.list));
    });
  });
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

function cppPush(lines, indent, text) {
  lines.push('  '.repeat(indent) + text);
  if (lines === previewCodeLines) watchCodeLineBlocks.push(previewCodeBlockId);
}

function emitCppBlock(block, indent, lines) {
  const previousPreviewBlockId = previewCodeBlockId;
  previewCodeBlockId = block.id;
  const def = DEFS[block.type] || {};
  const action = def.action || block.type;

  switch (action) {
    case 'event':
      cppPush(lines, indent, '// when clicked');
      break;

    case 'signal':
      cppPush(lines, indent, '// when I receive ' + String(block.params.message || ''));
      break;

    case 'broadcast':
      cppPush(lines, indent, 'watch_broadcast(' + cppString(block.params.message || '') + ');');
      break;

    case 'start':
      cppPush(lines, indent, '// on start');
      break;

    case 'define':
      break;

    case 'if':
      cppPush(lines, indent, 'if (' + exprToCpp(block.params.condition) + ' != 0.0f) {');
      emitCppBlocks(block.children, indent + 1, lines);
      cppPush(lines, indent, '}');
      break;

    case 'elseif':
      cppPush(lines, indent, 'if (' + exprToCpp(block.params.condition) + ' != 0.0f) {');
      emitCppBlocks(block.children, indent + 1, lines);
      cppPush(lines, indent, '}');
      break;

    case 'else':
      emitCppBlocks(block.children, indent, lines);
      break;

    case 'while':
      cppPush(lines, indent, 'while (' + exprToCpp(block.params.condition) + ' != 0.0f && qos_app_running()) {');
      emitCppBlocks(block.children, indent + 1, lines);
      cppPush(lines, indent + 1, 'if (!qos_app_running()) break;');
      cppPush(lines, indent + 1, 'watch_wait(0.016f);');
      cppPush(lines, indent, '}');
      break;

    case 'repeat': {
      cppPush(lines, indent, 'for (int i = 0; i < (int)(' + exprToCpp(block.params.times) + '); ++i) {');
      (block.children || []).forEach((child) => emitCppBlock(child, indent + 1, lines));
      cppPush(lines, indent, '}');
      break;
    }

    case 'forever': {
      cppPush(lines, indent, 'while (qos_app_running()) {');
      (block.children || []).forEach((child) => emitCppBlock(child, indent + 1, lines));
      cppPush(lines, indent + 1, 'if (!qos_app_running()) break;');
      cppPush(lines, indent + 1, 'watch_wait(0.016f);');
      cppPush(lines, indent, '}');
      break;
    }

    case 'call': {
      const name = String(block.params.name || '').trim();
      if (name) cppPush(lines, indent, functionCppName(name) + '();');
      else cppPush(lines, indent, '// no function selected');
      break;
    }

    case 'move':
      cppPush(lines, indent, 'watch_move(' + exprToCpp(block.params.steps) + ');');
      break;

    case 'turn':
      cppPush(lines, indent, 'watch_turn(' + exprToCpp(block.params.deg) + ');');
      break;

    case 'goto':
      cppPush(lines, indent, 'watch_goto_start();');
      break;

    case 'stop':
      cppPush(lines, indent, 'return;');
      break;

    case 'setvar':
      cppPush(lines, indent, variableCppName(variableName(block.params.name)) + ' = ' + exprToCpp(block.params.value) + ';');
      break;

    case 'changevar':
      cppPush(lines, indent, variableCppName(variableName(block.params.name)) + ' += ' + exprToCpp(block.params.value) + ';');
      break;

    case 'listadd':
      cppPush(lines, indent, listCppName(block.params.list) + '.emplace_back(' + cppString(block.params.item) + ');');
      break;

    case 'listdelete': {
      const list = listCppName(block.params.list);
      const index = 'list_index_' + cppIdentifier(block.id);
      cppPush(lines, indent, '{ int ' + index + ' = (int)(' + exprToCpp(block.params.index) + ');');
      cppPush(lines, indent + 1, 'if (' + index + ' >= 1 && ' + index + ' <= (int)' + list + '.size()) ' + list + '.erase(' + list + '.begin() + ' + index + ' - 1);');
      cppPush(lines, indent, '}');
      break;
    }

    case 'listinsert': {
      const list = listCppName(block.params.list);
      const index = 'list_index_' + cppIdentifier(block.id);
      cppPush(lines, indent, '{ int ' + index + ' = (int)(' + exprToCpp(block.params.index) + ');');
      cppPush(lines, indent + 1, 'if (' + index + ' < 1) ' + index + ' = 1;');
      cppPush(lines, indent + 1, 'if (' + index + ' > (int)' + list + '.size() + 1) ' + index + ' = (int)' + list + '.size() + 1;');
      cppPush(lines, indent + 1, list + '.insert(' + list + '.begin() + ' + index + ' - 1, ' + cppString(block.params.item) + ');');
      cppPush(lines, indent, '}');
      break;
    }

    case 'listreplace': {
      const list = listCppName(block.params.list);
      const index = 'list_index_' + cppIdentifier(block.id);
      cppPush(lines, indent, '{ int ' + index + ' = (int)(' + exprToCpp(block.params.index) + ');');
      cppPush(lines, indent + 1, 'if (' + index + ' >= 1 && ' + index + ' <= (int)' + list + '.size()) ' + list + '[' + index + ' - 1] = ' + cppString(block.params.item) + ';');
      cppPush(lines, indent, '}');
      break;
    }

    case 'switchsprite':
      cppPush(lines, indent, 'watch_switch_sprite(' + cppString(block.params.sprite) + ');');
      break;

    case 'switchbg':
      cppPush(lines, indent, 'watch_switch_background(' + cppString(block.params.background) + ');');
      break;

    case 'show':
      cppPush(lines, indent, 'watch_show_sprite();');
      break;

    case 'hide':
      cppPush(lines, indent, 'watch_hide_sprite();');
      break;

    case 'setsize':
      cppPush(lines, indent, 'watch_set_size(' + exprToCpp(block.params.size) + ');');
      break;

    case 'gotoxy':
      cppPush(lines, indent, 'watch_goto_xy(' + exprToCpp(block.params.x) + ', ' + exprToCpp(block.params.y) + ');');
      break;

    case 'glide':
      cppPush(lines, indent, 'watch_glide(' + exprToCpp(block.params.x) + ', ' + exprToCpp(block.params.y) + ', ' + exprToCpp(block.params.secs) + ');');
      break;

    case 'changex':
      cppPush(lines, indent, 'watch_change_x(' + exprToCpp(block.params.dx) + ');');
      break;

    case 'changey':
      cppPush(lines, indent, 'watch_change_y(' + exprToCpp(block.params.dy) + ');');
      break;

    case 'point':
      cppPush(lines, indent, 'watch_point(' + exprToCpp(block.params.deg) + ');');
      break;

    case 'say': {
      const text = String(block.params.text == null ? '' : block.params.text).slice(0, 80) || 'Hello from BlockCode';
      cppPush(lines, indent, 'watch_say(' + cppString(text) + ', ' + exprToCpp(block.params.secs) + ');');
      break;
    }

    case 'speak': {
      const text = String(block.params.text == null ? '' : block.params.text).slice(0, 200) || 'Hello!';
      cppPush(lines, indent, 'watch_speak(' + cppString(text) + ');');
      break;
    }

    case 'tone':
      cppPush(lines, indent, 'watch_tone(' + exprToCpp(block.params.hz) + ', ' + exprToCpp(block.params.secs) + ');');
      break;

    case 'stopsounds':
      cppPush(lines, indent, 'watch_stop_sounds();');
      break;

    case 'wait':
      cppPush(lines, indent, 'watch_wait(' + exprToCpp(block.params.secs) + ');');
      break;

    default:
      cppPush(lines, indent, '// unsupported block: ' + block.type);
  }
  previewCodeBlockId = previousPreviewBlockId;
}

function emitCppBlocks(blocks, indent, lines) {
  const items = blocks || [];
  for (let index = 0; index < items.length; index++) {
    const block = items[index];
    const action = (DEFS[block.type] && DEFS[block.type].action) || block.type;
    if (action !== 'if') {
      emitCppBlock(block, indent, lines);
      continue;
    }

    previewCodeBlockId = block.id;
    cppPush(lines, indent, 'if (' + exprToCpp(block.params.condition) + ' != 0.0f) {');
    emitCppBlocks(block.children, indent + 1, lines);

    let branchIndex = index + 1;
    while (branchIndex < items.length) {
      const branch = items[branchIndex];
      const branchAction = (DEFS[branch.type] && DEFS[branch.type].action) || branch.type;
      if (branchAction !== 'elseif' && branchAction !== 'else') break;

      previewCodeBlockId = branch.id;
      if (branchAction === 'elseif') {
        cppPush(lines, indent, '} else if (' + exprToCpp(branch.params.condition) + ' != 0.0f) {');
      } else {
        cppPush(lines, indent, '} else {');
      }
      emitCppBlocks(branch.children, indent + 1, lines);
      branchIndex++;
      if (branchAction === 'else') break;
    }

    previewCodeBlockId = items[branchIndex - 1] && items[branchIndex - 1].id || block.id;
    cppPush(lines, indent, '}');
    index = branchIndex - 1;
  }
}

const APP_SPRITE_SIZE = 64;
const APP_BACKGROUND_SIZE = { width: 410, height: 502 };

function usedSpriteIds() {
  const ids = new Set();
  const selected = typeof activeSprite === 'function' ? activeSprite() : null;
  if (selected && selected.id) ids.add(selected.id);
  walkBlocks((block) => {
    const def = DEFS[block.type] || {};
    if ((def.action || block.type) === 'switchsprite' && block.params.sprite) {
      ids.add(String(block.params.sprite));
    }
  });
  if (ids.size > 12) {
    throw new Error('This app uses ' + ids.size + ' sprites. A watch app can embed up to 12; remove some sprite changes and retry.');
  }
  return Array.from(ids);
}

function usedBackgroundIds() {
  const ids = new Set();
  const selected = typeof activeBackground === 'function' ? activeBackground() : null;
  if (selected && selected.id) ids.add(selected.id);
  walkBlocks((block) => {
    const def = DEFS[block.type] || {};
    if ((def.action || block.type) === 'switchbg' && block.params.background) {
      ids.add(String(block.params.background));
    }
  });
  return Array.from(ids);
}

function rasterizeBackground(background) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const width = APP_BACKGROUND_SIZE.width;
    const height = APP_BACKGROUND_SIZE.height;
    const escapeXml = (value) => String(value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const css = [
      'background-color:#070c18',
      'background-image:' + String(background.css || 'none'),
      'background-size:' + String(background.size || 'cover'),
      'background-position:' + String(background.position || 'center'),
      'background-repeat:' + String(background.repeat || 'no-repeat')
    ].join(';');
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' +
      width + '" height="' + height + '" style="' + escapeXml(css) + '"></svg>';
    const objectUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not rasterize background "' + (background.name || background.id) +
        '". Open the web UI in Chrome or Edge at http://127.0.0.1:8765/ and retry.'));
    };
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('2D canvas is unavailable.');
        ctx.drawImage(image, 0, 0, width, height);
        const rgba = ctx.getImageData(0, 0, width, height).data;
        const pixels = new Uint8Array(width * height * 3);
        for (let srcIndex = 0, dst = 0; srcIndex < rgba.length; srcIndex += 4, dst += 3) {
          const rgb565 = ((rgba[srcIndex] & 0xF8) << 8) |
            ((rgba[srcIndex + 1] & 0xFC) << 3) | (rgba[srcIndex + 2] >> 3);
          pixels[dst] = rgb565 >> 8;
          pixels[dst + 1] = rgb565 & 0xFF;
          pixels[dst + 2] = rgba[srcIndex + 3];
        }
        resolve({ id: background.id, width: width, height: height, pixels: pixels });
      } catch (error) {
        reject(new Error('Could not read background "' + (background.name || background.id) + '": ' +
          error.message + ' Open the web UI at http://127.0.0.1:8765/ and retry.'));
      }
    };
    image.src = objectUrl;
  });
}

async function prepareBackgroundAssets() {
  const backgrounds = new Map(allBackgrounds().map((background) => [String(background.id), background]));
  const assets = [];
  for (const id of usedBackgroundIds()) {
    const background = backgrounds.get(String(id));
    if (!background) continue;
    const asset = await rasterizeBackground(background);
    assets.push(asset);
  }
  return assets;
}

function rasterizeSprite(sprite) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = APP_SPRITE_SIZE;
        canvas.height = APP_SPRITE_SIZE;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('2D canvas is unavailable.');

        const sourceW = image.naturalWidth || image.width;
        const sourceH = image.naturalHeight || image.height;
        if (!sourceW || !sourceH) throw new Error('Image has no dimensions.');
        const scale = Math.min((APP_SPRITE_SIZE - 4) / sourceW, (APP_SPRITE_SIZE - 4) / sourceH);
        const drawW = Math.max(1, Math.round(sourceW * scale));
        const drawH = Math.max(1, Math.round(sourceH * scale));
        ctx.clearRect(0, 0, APP_SPRITE_SIZE, APP_SPRITE_SIZE);
        ctx.drawImage(image, (APP_SPRITE_SIZE - drawW) / 2, (APP_SPRITE_SIZE - drawH) / 2, drawW, drawH);

        const rgba = ctx.getImageData(0, 0, APP_SPRITE_SIZE, APP_SPRITE_SIZE).data;
        const pixels = new Uint8Array(APP_SPRITE_SIZE * APP_SPRITE_SIZE * 3);
        for (let src = 0, dst = 0; src < rgba.length; src += 4, dst += 3) {
          const rgb565 = ((rgba[src] & 0xF8) << 8) | ((rgba[src + 1] & 0xFC) << 3) | (rgba[src + 2] >> 3);
          /* LV_COLOR_16_SWAP=y in Quantum OS: RGB565 high byte, low byte, then alpha. */
          pixels[dst] = rgb565 >> 8;
          pixels[dst + 1] = rgb565 & 0xFF;
          pixels[dst + 2] = rgba[src + 3];
        }
        resolve({ id: sprite.id, width: APP_SPRITE_SIZE, height: APP_SPRITE_SIZE, pixels: pixels });
      } catch (error) {
        reject(new Error('Could not read sprite "' + (sprite.name || sprite.id) + '": ' + error.message +
          ' Open the web UI at http://127.0.0.1:8765/ (not as a file:// page), then retry.'));
      }
    };
    image.onerror = () => reject(new Error('Could not load sprite "' + (sprite.name || sprite.id) + '".'));
    image.src = sprite.src;
  });
}

async function prepareSpriteAssets() {
  const sprites = allSprites();
  const byId = new Map(sprites.map((sprite) => [String(sprite.id), sprite]));
  const assets = [];
  for (const id of usedSpriteIds()) {
    const sprite = byId.get(String(id));
    if (!sprite || !sprite.src) continue;
    assets.push(await rasterizeSprite(sprite));
  }
  return assets;
}

function compressLz4Block(input) {
  const output = [];
  const positions = new Map();
  let anchor = 0;
  let index = 0;
  const hashAt = (offset) => (
    (input[offset] * 0x1e35a7bd ^
      input[offset + 1] * 0x1e35a7bd << 8 ^
      input[offset + 2] * 0x1e35a7bd << 16 ^
      input[offset + 3] * 0x1e35a7bd << 24) >>> 0
  );
  const pushLength = (length) => {
    while (length >= 255) {
      output.push(255);
      length -= 255;
    }
    output.push(length);
  };

  while (index + 4 <= input.length) {
    const hash = hashAt(index);
    const reference = positions.get(hash);
    positions.set(hash, index);
    if (reference === undefined || index - reference > 65535 ||
        input[reference] !== input[index] ||
        input[reference + 1] !== input[index + 1] ||
        input[reference + 2] !== input[index + 2] ||
        input[reference + 3] !== input[index + 3]) {
      index++;
      continue;
    }

    let matchLength = 4;
    while (index + matchLength < input.length &&
        input[reference + matchLength] === input[index + matchLength]) {
      matchLength++;
    }
    const literalLength = index - anchor;
    const tokenIndex = output.length;
    output.push((Math.min(literalLength, 15) << 4) |
      Math.min(matchLength - 4, 15));
    if (literalLength >= 15) pushLength(literalLength - 15);
    for (let literal = anchor; literal < index; literal++) output.push(input[literal]);
    const distance = index - reference;
    output.push(distance & 0xFF, distance >>> 8);
    if (matchLength - 4 >= 15) pushLength(matchLength - 19);
    output[tokenIndex] &= 0xFF;

    const end = index + matchLength;
    for (let cursor = index + 1; cursor + 4 <= end; cursor++) {
      positions.set(hashAt(cursor), cursor);
    }
    index = end;
    anchor = end;
  }

  const trailing = input.length - anchor;
  output.push(Math.min(trailing, 15) << 4);
  if (trailing >= 15) pushLength(trailing - 15);
  for (let cursor = anchor; cursor < input.length; cursor++) output.push(input[cursor]);
  return Uint8Array.from(output);
}

function emitCppSpriteAssets(assets, lines) {
  const add = (line) => lines.push(line);
  add('struct WatchSpriteAsset { const char *id; const uint8_t *pixels; uint16_t width; uint16_t height; };');
  (assets || []).forEach((asset, index) => {
    add('static const uint8_t watch_sprite_pixels_' + index + '[] = {');
    for (let start = 0; start < asset.pixels.length; start += 16) {
      const row = Array.from(asset.pixels.slice(start, start + 16))
        .map((value) => '0x' + value.toString(16).padStart(2, '0'));
      add('  ' + row.join(', ') + ',');
    }
    add('};');
  });
  add('static const WatchSpriteAsset watch_sprite_assets[] = {');
  (assets || []).forEach((asset, index) => {
    add('  {' + cppString(asset.id) + ', watch_sprite_pixels_' + index + ', ' + asset.width + ', ' + asset.height + '},');
  });
  add('  {"", 0, 0, 0}');
  add('};');
  add('static const WatchSpriteAsset *watch_find_sprite(const char *id) {');
  add('  for (unsigned i = 0; watch_sprite_assets[i].pixels; ++i) {');
  add('    if (strcmp(watch_sprite_assets[i].id, id ? id : "") == 0) return &watch_sprite_assets[i];');
  add('  }');
  add('  return 0;');
  add('}');
  add('');
}

function emitCppBackgroundAssets(assets, lines) {
  const add = (line) => lines.push(line);
  const compressedAssets = (assets || []).map((asset) => ({
    asset: asset,
    compressed: compressLz4Block(asset.pixels)
  }));
  const maxPixels = compressedAssets.length
    ? compressedAssets.reduce((maximum, item) => Math.max(maximum, item.asset.pixels.length), 0)
    : APP_BACKGROUND_SIZE.width * APP_BACKGROUND_SIZE.height * 3;
  add('static const size_t WATCH_BACKGROUND_MAX_BYTES = ' + maxPixels + ';');
  add('static bool watch_lz4_decode(const uint8_t *src, size_t src_size, uint8_t *dst, size_t dst_size) {');
  add('  size_t in = 0, out = 0;');
  add('  while (in < src_size) {');
  add('    uint8_t token = src[in++];');
  add('    size_t literals = token >> 4;');
  add('    if (literals == 15) {');
  add('      uint8_t extra;');
  add('      do { if (in >= src_size) return false; extra = src[in++]; literals += extra; } while (extra == 255);');
  add('    }');
  add('    if (literals > src_size - in || literals > dst_size - out) return false;');
  add('    memcpy(dst + out, src + in, literals);');
  add('    in += literals; out += literals;');
  add('    if (in == src_size) return out == dst_size;');
  add('    if (in + 2 > src_size) return false;');
  add('    size_t offset = src[in] | ((size_t)src[in + 1] << 8);');
  add('    in += 2;');
  add('    if (!offset || offset > out) return false;');
  add('    size_t match = (token & 15) + 4;');
  add('    if ((token & 15) == 15) {');
  add('      uint8_t extra;');
  add('      do { if (in >= src_size) return false; extra = src[in++]; match += extra; } while (extra == 255);');
  add('    }');
  add('    if (match > dst_size - out) return false;');
  add('    for (size_t i = 0; i < match; ++i) dst[out + i] = dst[out + i - offset];');
  add('    out += match;');
  add('  }');
  add('  return out == dst_size;');
  add('}');
  add('struct WatchBackgroundAsset { const char *id; const uint8_t *compressed; size_t compressed_size; uint16_t width; uint16_t height; };');
  compressedAssets.forEach((item, index) => {
    const compressed = item.compressed;
    add('static const uint8_t watch_background_compressed_' + index + '[] = {');
    for (let start = 0; start < compressed.length; start += 16) {
      const row = Array.from(compressed.slice(start, start + 16))
        .map((value) => '0x' + value.toString(16).padStart(2, '0'));
      add('  ' + row.join(', ') + ',');
    }
    add('};');
  });
  add('static const WatchBackgroundAsset watch_background_assets[] = {');
  compressedAssets.forEach((item, index) => {
    const asset = item.asset;
    add('  {' + cppString(asset.id) + ', watch_background_compressed_' + index + ', ' +
      item.compressed.length + ', ' + asset.width + ', ' + asset.height + '},');
  });
  add('  {"", 0, 0, 0, 0}');
  add('};');
  add('static const WatchBackgroundAsset *watch_find_background(const char *id) {');
  add('  for (unsigned i = 0; watch_background_assets[i].compressed; ++i) {');
  add('    if (strcmp(watch_background_assets[i].id, id ? id : "") == 0) return &watch_background_assets[i];');
  add('  }');
  add('  return 0;');
  add('}');
  add('');
}

function watchCppActionPrelude() {
  return [
    '#include <math.h>',
    '#include <stdio.h>',
    '#include <stdlib.h>',
    '#include <unistd.h>',
    ''
  ];
}

function watchCppActionSupport(defaultSpriteId, defaultBackgroundId) {
  return [
    'static float watch_x = 205.0f;',
    'static float watch_y = 251.0f;',
    'static float watch_heading = 0.0f;',
    'static float watch_size = 100.0f;',
    'static int watch_visible = 1;',
    'static const char *watch_sprite = ' + cppString(defaultSpriteId || 'rocket') + ';',
    'static const char *watch_background = ' + cppString(defaultBackgroundId || 'mission') + ';',
    '',
    'static float watch_clamp(float value, float low, float high) {',
    '  if (value < low) return low;',
    '  if (value > high) return high;',
    '  return value;',
    '}',
    '',
    'static void watch_sleep_ms(unsigned long ms) {',
    '  while (ms > 0 && qos_app_running()) {',
    '    unsigned long chunk = ms > 1000UL ? 1000UL : ms;',
    '    if (chunk > 16UL) chunk = 16UL;',
    '    usleep((useconds_t)(chunk * 1000UL));',
    '    ms -= chunk;',
    '  }',
    '}',
    '',
    'static float watch_play_speech(const char *text) {',
    '  (void)text;  // The local build service replaces this with embedded voice clips.',
    '  return 0.0f;',
    '}',
    '',
    'static float watch_random(float low, float high) {',
    '  if (high < low) {',
    '    float swap = low;',
    '    low = high;',
    '    high = swap;',
    '  }',
    '  return low + (high - low) * ((float)rand() / (float)RAND_MAX);',
    '}',
    ''
  ];
}

function watchCppActionCode() {
  return [
    'static void watch_render(void) {',
    '  const WatchSpriteAsset *asset = watch_find_sprite(watch_sprite);',
    '  qos_app_draw_image(watch_x, watch_y, watch_heading, watch_size, watch_visible, watch_sprite, watch_background,',
    '               asset ? asset->pixels : 0, asset ? asset->width : 0, asset ? asset->height : 0);',
    '}',
    '',
    'void watch_goto_start(void) {',
    '  watch_x = 205.0f;',
    '  watch_y = 251.0f;',
    '  watch_heading = 0.0f;',
    '  watch_size = 100.0f;',
    '  watch_visible = 1;',
    '  watch_render();',
    '  watch_sleep_ms(360);',
    '}',
    '',
    'void watch_move(float steps) {',
    '  const float radians = watch_heading * 0.0174532925f;',
    '  const float start_x = watch_x;',
    '  const float start_y = watch_y;',
    '  const float end_x = watch_clamp(start_x + cosf(radians) * steps * 1.6f, 40.0f, 370.0f);',
    '  const float end_y = watch_clamp(start_y + sinf(radians) * steps * 1.6f, 40.0f, 462.0f);',
    '  for (int frame = 1; frame <= 24 && qos_app_running(); ++frame) {',
    '    float t = (float)frame * 0.041666667f;',
    '    t = t * t * (3.0f - 2.0f * t);',
    '    watch_x = start_x + (end_x - start_x) * t;',
    '    watch_y = start_y + (end_y - start_y) * t;',
    '    watch_render();',
    '    watch_sleep_ms(16);',
    '  }',
    '}',
    '',
    'void watch_turn(float degrees) {',
    '  const float start = watch_heading;',
    '  for (int frame = 1; frame <= 20 && qos_app_running(); ++frame) {',
    '    float t = (float)frame * 0.05f;',
    '    t = t * t * (3.0f - 2.0f * t);',
    '    watch_heading = fmodf(start + degrees * t, 360.0f);',
    '    if (watch_heading < 0.0f) watch_heading += 360.0f;',
    '    watch_render();',
    '    watch_sleep_ms(16);',
    '  }',
    '}',
    '',
    'void watch_point(float degrees) {',
    '  watch_heading = fmodf(degrees, 360.0f);',
    '  if (watch_heading < 0.0f) watch_heading += 360.0f;',
    '  watch_render();',
    '}',
    '',
    'void watch_wait(float seconds) {',
    '  if (seconds > 0.0f) {',
    '    watch_sleep_ms((unsigned long)(seconds * 1000.0f + 0.5f));',
    '  }',
    '}',
    '',
    'void watch_say(const char *text, float seconds) {',
    '  qos_app_say(text);',
    '  float speech_seconds = watch_play_speech(text);',
    '  if (seconds > speech_seconds) watch_wait(seconds - speech_seconds);',
    '}',
    '',
    'void watch_speak(const char *text) {',
    '  qos_app_say(text);',
    '  watch_play_speech(text);',
    '}',
    '',
    'void watch_tone(float hz, float seconds) {',
    '  qos_app_tone(hz, seconds);',
    '}',
    '',
    'void watch_stop_sounds(void) {',
    '  printf("[watch] stop sounds\\n");',
    '}',
    '',
    'void watch_switch_sprite(const char *name) {',
    '  watch_sprite = name;',
    '  watch_render();',
    '}',
    '',
    'void watch_switch_background(const char *name) {',
    '  watch_background = name;',
    '  const WatchBackgroundAsset *asset = watch_find_background(name);',
    '  size_t pixel_bytes = asset ? (size_t)asset->width * asset->height * 3 : 0;',
    '  uint8_t *pixels = asset && pixel_bytes <= WATCH_BACKGROUND_MAX_BYTES',
    '    ? (uint8_t *)malloc(pixel_bytes) : 0;',
    '  if (pixels && watch_lz4_decode(asset->compressed, asset->compressed_size, pixels, pixel_bytes))',
    '    qos_app_set_background_image(pixels, asset->width, asset->height);',
    '  else qos_app_set_background_image(0, 0, 0);',
    '  free(pixels);',
    '  watch_render();',
    '}',
    '',
    'void watch_show_sprite(void) {',
    '  watch_visible = 1;',
    '  watch_render();',
    '}',
    '',
    'void watch_hide_sprite(void) {',
    '  watch_visible = 0;',
    '  watch_render();',
    '}',
    '',
    'void watch_set_size(float percent) {',
    '  watch_size = watch_clamp(percent, 10.0f, 400.0f);',
    '  watch_render();',
    '}',
    '',
    'void watch_goto_xy(float x, float y) {',
    '  watch_x = watch_clamp(205.0f + x, 40.0f, 370.0f);',
    '  watch_y = watch_clamp(251.0f - y, 40.0f, 462.0f);',
    '  watch_render();',
    '}',
    '',
    'void watch_glide(float x, float y, float seconds) {',
    '  float start_x = watch_x;',
    '  float start_y = watch_y;',
    '  float end_x = watch_clamp(205.0f + x, 40.0f, 370.0f);',
    '  float end_y = watch_clamp(251.0f - y, 40.0f, 462.0f);',
    '  int frames = (int)(seconds * 30.0f);',
    '  if (frames < 1) frames = 1;',
    '  for (int i = 1; i <= frames && qos_app_running(); ++i) {',
    '    float t = (float)i / (float)frames;',
    '    watch_x = start_x + (end_x - start_x) * t;',
    '    watch_y = start_y + (end_y - start_y) * t;',
    '    watch_render();',
    '    watch_wait(seconds / (float)frames);',
    '  }',
    '}',
    '',
    'void watch_change_x(float dx) {',
    '  watch_x = watch_clamp(watch_x + dx, 40.0f, 370.0f);',
    '  watch_render();',
    '}',
    '',
    'void watch_change_y(float dy) {',
    '  watch_y = watch_clamp(watch_y - dy, 40.0f, 462.0f);',
    '  watch_render();',
    '}',
    ''
  ];
}

function uniqueFunctionDefinitions() {
  const byName = new Map();
  functionDefinitions().forEach((definition) => {
    if (!byName.has(definition.name)) byName.set(definition.name, definition);
  });
  return Array.from(byName.values());
}

const PREVIEW_ACTION_HELPERS = {
  move: 'watch_move',
  turn: 'watch_turn',
  goto: 'watch_goto_start',
  point: 'watch_point',
  wait: 'watch_wait',
  say: 'watch_say',
  speak: 'watch_speak',
  tone: 'watch_tone',
  stopsounds: 'watch_stop_sounds',
  switchsprite: 'watch_switch_sprite',
  switchbg: 'watch_switch_background',
  show: 'watch_show_sprite',
  hide: 'watch_hide_sprite',
  setsize: 'watch_set_size',
  gotoxy: 'watch_goto_xy',
  glide: 'watch_glide',
  changex: 'watch_change_x',
  changey: 'watch_change_y'
};

const PREVIEW_EXPRESSION_HELPERS = {
  random: 'watch_random'
};

let previewHelperCache = null;

function collectCppFunctions(sourceLines, out) {
  let current = null;
  let depth = 0;

  (sourceLines || []).forEach((line) => {
    if (!current) {
      const name = watchFunctionNameFromLine(line);
      if (!name || line.indexOf('{') < 0) return;
      current = { name: name, lines: [] };
      depth = 0;
    }

    current.lines.push(line);
    for (let index = 0; index < line.length; index++) {
      if (line[index] === '{') depth += 1;
      else if (line[index] === '}') depth -= 1;
    }

    if (depth <= 0) {
      if (!out.has(current.name)) out.set(current.name, current.lines);
      current = null;
    }
  });
}

function previewHelperFunctions() {
  if (previewHelperCache) return previewHelperCache;

  const chunks = new Map();
  const ordered = [];
  [watchCppActionSupport(), watchCppActionCode()].forEach((source) => {
    const found = new Map();
    collectCppFunctions(source, found);
    found.forEach((lines, name) => {
      chunks.set(name, lines);
      ordered.push({ name: name, lines: lines });
    });
  });

  previewHelperCache = { chunks: chunks, ordered: ordered };
  return previewHelperCache;
}

function previewRunnableProgram() {
  const functionDefs = uniqueFunctionDefinitions();
  const functionsByName = new Map();
  functionDefs.forEach((definition) => {
    if (!functionsByName.has(definition.name)) functionsByName.set(definition.name, definition);
  });

  const stacks = [];
  workspace.forEach((script, index) => {
    if (!script.length || isDefine(script[0]) || !isHat(script[0])) return;
    if (script.length <= 1) return;
    stacks.push({ script: script, index: index });
  });

  const includedFunctions = new Set();
  functionDefs.forEach((definition) => {
    if (definition.script.length > 1) includedFunctions.add(definition.name);
  });

  const callNames = new Set();
  const collectCalls = (container) => {
    walkContainer(container, (block) => {
      const action = (DEFS[block.type] || {}).action || block.type;
      if (action !== 'call') return;
      const name = String(block.params.name || '').trim();
      if (name) callNames.add(name);
    });
  };

  stacks.forEach((stack) => collectCalls(stack.script.slice(1)));
  let changed = true;
  while (changed) {
    changed = false;
    includedFunctions.forEach((name) => {
      const definition = functionsByName.get(name);
      if (definition) collectCalls(definition.script.slice(1));
    });
    callNames.forEach((name) => {
      if (functionsByName.has(name) && !includedFunctions.has(name)) {
        includedFunctions.add(name);
        changed = true;
      }
    });
  }

  const functions = functionDefs.filter((definition) => includedFunctions.has(definition.name));
  const hasProgram = stacks.length > 0 ||
    functions.some((definition) => definition.script.length > 1);

  return {
    stacks: stacks,
    functions: functions,
    hasProgram: hasProgram
  };
}

function collectPreviewExpressionHelpers(value, seeds) {
  if (!isExpression(value)) return;
  const helper = PREVIEW_EXPRESSION_HELPERS[value.type];
  if (helper) seeds.add(helper);
  Object.keys(value.params || {}).forEach((key) => {
    collectPreviewExpressionHelpers(value.params[key], seeds);
  });
}

function collectPreviewHelperSeeds(containers) {
  const seeds = new Set();
  let usesBroadcast = false;

  containers.forEach((container) => {
    walkContainer(container, (block) => {
      const action = (DEFS[block.type] || {}).action || block.type;
      if (action === 'broadcast') usesBroadcast = true;
      const helper = PREVIEW_ACTION_HELPERS[action];
      if (helper) seeds.add(helper);
      Object.keys(block.params || {}).forEach((key) => {
        collectPreviewExpressionHelpers(block.params[key], seeds);
      });
    });
  });

  return { seeds: seeds, usesBroadcast: usesBroadcast };
}

function resolvePreviewHelpers(seeds) {
  const chunks = previewHelperFunctions().chunks;
  const needed = new Set();
  const queue = Array.from(seeds);

  while (queue.length) {
    const name = queue.pop();
    if (needed.has(name) || !chunks.has(name)) continue;
    needed.add(name);

    chunks.get(name).forEach((line) => {
      const pattern = /\b(watch_[A-Za-z0-9_]+)\s*\(/g;
      let match;
      while ((match = pattern.exec(line))) {
        if (match[1] !== name && chunks.has(match[1]) && !needed.has(match[1])) {
          queue.push(match[1]);
        }
      }
    });
  }

  return needed;
}

function generateWatchCpp(spriteAssets, backgroundAssets) {
  const lines = [];
  const add = (line) => lines.push(line === undefined ? '' : line);
  const functions = uniqueFunctionDefinitions();
  const variables = collectVariableNames(functions);
  const lists = collectListNames(functions);

  add('// Generated by BlockCode.');
  add('// Built into an ESP-IDF ELF and wrapped in a Quantum OS .app package.');
  add('// The watch firmware launches this app on the watch display.');
  add('// The watch_* actions call Quantum OS display hooks exported by the firmware.');
  add('');

  watchCppActionPrelude().forEach((line) => add(line));
  add('#include <stdint.h>');
  add('#include <string.h>');
  add('#include <algorithm>');
  add('#include <cstdlib>');
  add('#include <string>');
  add('#include <vector>');
  add('');
  add('extern "C" bool qos_app_running(void);');
  add('extern "C" void qos_app_draw_image(float, float, float, float, int, const char *, const char *, const uint8_t *, uint16_t, uint16_t);');
  add('extern "C" int qos_app_set_background_image(const uint8_t *, uint16_t, uint16_t);');
  add('extern "C" void qos_app_say(const char *);');
  add('extern "C" void qos_app_tone(float, float);');
  add('extern "C" void qos_app_play_audio(const int16_t *, uint32_t);');
  add('');
  emitCppSpriteAssets(spriteAssets || [], lines);
  emitCppBackgroundAssets(backgroundAssets || [], lines);
  const defaultSprite = typeof activeSprite === 'function' ? activeSprite() : null;
  const defaultBackground = typeof activeBackground === 'function' ? activeBackground() : null;
  watchCppActionSupport(defaultSprite && defaultSprite.id, defaultBackground && defaultBackground.id).forEach((line) => add(line));
  add('static bool watch_touching(const char *target) {');
  add('  if (!target) return false;');
  add('  const float radius = 32.0f * (watch_size + 100.0f) / 100.0f;');
  add('  if (strcmp(target, "edge") == 0) return watch_x - radius <= 40.0f || watch_x + radius >= 370.0f || watch_y - radius <= 40.0f || watch_y + radius >= 462.0f;');
  allSprites().forEach((sprite) => {
    const position = spritePreviewPositions[sprite.id] || defaultSpritePreviewPosition(sprite.id);
    const x = formatFloat(position.x * 4.1);
    const y = formatFloat(position.y * 5.02);
    add('  if (strcmp(target, ' + cppString(sprite.id) + ') == 0) return strcmp(watch_sprite, target) != 0 && fabsf(watch_x - ' +
      x + ') <= radius && fabsf(watch_y - ' + y + ') <= radius;');
  });
  add('  return false;');
  add('}');
  add('static void watch_broadcast(const char *message);');
  add('');

  if (variables.length) {
    add('// Program variables');
    variables.forEach((name) => add('static float ' + variableCppName(name) + ' = 0.0f;'));
    add('');
  }

  if (lists.length) {
    add('// Program lists');
    lists.forEach((name) => add('static std::vector<std::string> ' + listCppName(name) + ';'));
    add('');
  }

  add('extern "C" {');
  watchCppActionCode().forEach((line) => add(line));
  add('}');
  add('');

  if (functions.length) {
    add('// User function prototypes');
    functions.forEach((definition) => {
      add('static void ' + functionCppName(definition.name) + '(void);');
    });
    add('');
  }

  functions.forEach((definition) => {
    add('// Function: ' + definition.name);
    add('static void ' + functionCppName(definition.name) + '(void) {');
    emitCppBlocks(definition.script.slice(1), 1, lines);
    add('}');
    add('');
  });

  const entryNames = [];
  const signalHandlers = [];
  workspace.forEach((script, scriptIndex) => {
    if (!script.length || isDefine(script[0]) || !isHat(script[0])) return;
    const name = 'stack' + (scriptIndex + 1);
    const clickStack = isClickHat(script[0]);
    const signalHat = (DEFS[script[0].type] || {}).action === 'signal';
    if (signalHat) signalHandlers.push({ message: script[0].params.message || '', name: name });
    else if (!clickStack && isStartupHat(script[0])) entryNames.push(name);
    add(clickStack
      ? '// Click-triggered stack; invoked by clicking its sprite in the preview.'
      : (signalHat
        ? '// Signal-triggered stack: ' + String(script[0].params.message || '')
        : '// Stack ' + (scriptIndex + 1) + ': entry point'));
    add('static void ' + name + '(void) {');
    emitCppBlocks(clickStack || signalHat ? script.slice(1) : script, 1, lines);
    add('}');
    add('');
  });

  add('static void watch_broadcast(const char *message) {');
  add('  if (!message) return;');
  signalHandlers.forEach((handler) => {
    add('  if (strcmp(message, ' + cppString(handler.message) + ') == 0) ' + handler.name + '();');
  });
  add('}');
  add('');

  add('extern "C" int main(int argc, char **argv) {');
  add('  (void)argc;');
  add('  (void)argv;');
  add('  watch_switch_sprite(' + cppString(defaultSprite && defaultSprite.id || 'rocket') + ');');
  add('  watch_switch_background(' + cppString(defaultBackground && defaultBackground.id || 'mission') + ');');
  add('  watch_wait(0.14f);  // match the web preview start delay');
  if (entryNames.length) {
    entryNames.forEach((name) => add('  ' + name + '();'));
  } else {
    add('  // Add an "on start" block at the top of a stack to run it.');
  }
  add('  return 0;');
  add('}');
  add('');

  return lines.join('\n');
}

function generateWatchCppPreview() {
  const lines = [];
  previewCodeLines = lines;
  watchCodeLineBlocks = [];
  const add = (line, block) => {
    lines.push(line === undefined ? '' : line);
    watchCodeLineBlocks.push(block ? block.id : null);
  };
  const program = previewRunnableProgram();

  if (!program.hasProgram) {
    previewCodeLines = null;
    return '';
  }

  const containers = program.stacks
    .map((stack) => stack.script.slice(1))
    .concat(program.functions.map((definition) => definition.script.slice(1)));
  const helperInfo = collectPreviewHelperSeeds(containers);
  const neededHelpers = resolvePreviewHelpers(helperInfo.seeds);
  const selectedHelpers = previewHelperFunctions().ordered.filter((entry) =>
    neededHelpers.has(entry.name)
  );
  const entryNames = [];
  const signalHandlers = [];

  add('// Preview only. Copy or Download adds the full C++ app file.');
  add('');
  if (selectedHelpers.length) {
    add('// Functions used by the blocks under your starter blocks:');
    selectedHelpers.forEach((entry) => {
      entry.lines.forEach((line) => add(line));
      add('');
    });
  }

  if (helperInfo.usesBroadcast) {
    add('static void watch_broadcast(const char *message);');
    add('');
  }

  if (program.functions.length) {
    add('// User function prototypes');
    program.functions.forEach((definition) => {
      add('static void ' + functionCppName(definition.name) + '(void);');
    });
    add('');
  }

  program.functions.forEach((definition) => {
    const definitionBlock = definition.script[0];
    add('// Function: ' + definition.name, definitionBlock);
    add('static void ' + functionCppName(definition.name) + '(void) {', definitionBlock);
    emitCppBlocks(definition.script.slice(1), 1, lines);
    add('}', definitionBlock);
    add('');
  });

  program.stacks.forEach((stack) => {
    const script = stack.script;
    const scriptIndex = stack.index;
    const name = 'stack' + (scriptIndex + 1);
    const clickStack = isClickHat(script[0]);
    const signalHat = (DEFS[script[0].type] || {}).action === 'signal';
    if (signalHat) signalHandlers.push({ message: script[0].params.message || '', name: name });
    else if (!clickStack && isStartupHat(script[0])) entryNames.push(name);
    add(clickStack
      ? '// Click-triggered stack; invoked by clicking its sprite in the preview.'
      : (signalHat
        ? '// Signal-triggered stack: ' + String(script[0].params.message || '')
        : '// Stack ' + (scriptIndex + 1) + ': runs when started'), script[0]);
    add('static void ' + name + '(void) {', script[0]);
    emitCppBlocks(clickStack || signalHat ? script.slice(1) : script, 1, lines);
    add('}', script[0]);
    add('');
  });

  if (helperInfo.usesBroadcast || signalHandlers.length) {
    add('static void watch_broadcast(const char *message) {');
    add('  if (!message) return;');
    signalHandlers.forEach((handler) => {
      add('  if (strcmp(message, ' + cppString(handler.message) + ') == 0) ' + handler.name + '();');
    });
    add('}');
    add('');
  }

  add('int main(int argc, char **argv) {');
  if (entryNames.length) {
    entryNames.forEach((name) => add('  ' + name + '();'));
  } else {
    add('  // Add an "on start" block at the top of a stack to run it.');
  }
  add('}');
  add('');

  previewCodeLines = null;
  return lines.join('\n');
}

function scrollWatchToFocus(focusBlockId) {
  try {
    if (!focusBlockId || !watchCodeEl) return;

    let scriptIndex = workspace.findIndex((script) =>
      script.some((block) => block.id === focusBlockId)
    );
  if (scriptIndex < 0) scriptIndex = workspace.length ? 0 : -1;

  const marker = scriptIndex >= 0
    ? '// Stack ' + (scriptIndex + 1) + ':'
    : '// No blocks yet';

  const scroller = watchCodeEl.closest('.code-scroll');
  if (!scroller || scroller.clientHeight <= 0) return;

  const fullText = watchCodeEl.textContent || '';
  const index = fullText.indexOf(marker);
  if (index < 0) return;

  const spans = watchCodeEl.querySelectorAll('.code-line');
  if (!spans.length) return;

  let accumulated = 0;
  for (let i = 0; i < spans.length; i++) {
    const t = spans[i].textContent || '';
    if (index >= accumulated && index < accumulated + t.length + 1) {
      const rect = spans[i].getBoundingClientRect();
      const scrollerRect = scroller.getBoundingClientRect();
      const top = rect.top - scrollerRect.top;
      const margin = 40;
      if (top < margin || top > scroller.clientHeight - margin) {
        scroller.scrollTop = Math.max(0, top - margin);
      } else {
        scroller.scrollTop = Math.max(0, top - margin);
      }
      return;
    }
    accumulated += t.length + 1;
  }
  } catch (e) {
    return;
  }
}

function explainCodeBlock(block) {
  const def = DEFS[block.type] || {};
  const label = def.label || block.type;
  const action = def.action || block.type;
  const param = (key, fallback) => {
    const value = block.params ? block.params[key] : undefined;
    if (value && typeof value === 'object') return 'a number the program works out';
    if (value === undefined || value === null || value === '') {
      return fallback === undefined ? '?' : fallback;
    }
    return String(value);
  };

  let text;
  switch (action) {
    case 'start':
      text = 'These steps start when the app turns on.';
      break;
    case 'event':
      text = 'These steps start when you click the sprite.';
      break;
    case 'signal':
      text = 'These steps start when another part sends "' + param('message', '') + '".';
      break;
    case 'broadcast':
      text = 'Tells every part listening for "' + param('message', '') + '" to start.';
      break;
    case 'define':
      text = 'Gives these steps the name "' + param('name', 'unnamed') + '" so you can use them again.';
      break;
    case 'call':
      text = 'Runs the saved steps called "' + param('name', 'unnamed') + '".';
      break;
    case 'if':
      text = 'Runs the steps inside only if the check is true.';
      break;
    case 'elseif':
      text = 'Checks this when the earlier checks were not true.';
      break;
    case 'else':
      text = 'Runs these steps if the check above is not true.';
      break;
    case 'while':
      text = 'Keeps doing these steps while the check stays true.';
      break;
    case 'repeat':
      text = 'Does the steps inside ' + param('times', '0') + ' times.';
      break;
    case 'forever':
      text = 'Keeps doing the steps inside until you press Stop.';
      break;
    case 'move':
      text = 'Moves the sprite forward ' + param('steps', '0') + ' steps.';
      break;
    case 'turn':
      text = 'Turns the sprite ' + param('deg', '0') + ' degrees.';
      break;
    case 'goto':
      text = 'Puts the sprite in the middle, facing forward.';
      break;
    case 'wait':
      text = 'Waits for ' + param('secs', '0') + ' seconds before going on.';
      break;
    case 'stop':
      text = 'Stops these steps right away.';
      break;
    case 'setvar':
      text = 'Puts ' + param('value', '0') + ' into the box named "' + param('name', 'variable') + '".';
      break;
    case 'changevar':
      text = 'Adds ' + param('value', '0') + ' to the number in "' + param('name', 'variable') + '".';
      break;
    case 'listadd':
      text = 'Adds "' + param('item', '') + '" to the end of "' + param('list', 'list') + '".';
      break;
    case 'listdelete':
      text = 'Takes item ' + param('index', '1') + ' out of "' + param('list', 'list') + '".';
      break;
    case 'listinsert':
      text = 'Puts "' + param('item', '') + '" into spot ' + param('index', '1') + ' in "' + param('list', 'list') + '".';
      break;
    case 'listreplace':
      text = 'Changes item ' + param('index', '1') + ' in "' + param('list', 'list') + '" to "' + param('item', '') + '".';
      break;
    case 'switchsprite':
      text = 'Changes the picture to "' + param('sprite', 'sprite') + '".';
      break;
    case 'switchbg':
      text = 'Changes the background to "' + param('background', 'background') + '".';
      break;
    case 'show':
      text = 'Shows the sprite.';
      break;
    case 'hide':
      text = 'Hides the sprite.';
      break;
    case 'setsize':
      text = 'Makes the sprite ' + param('size', '100') + '% of its usual size.';
      break;
    case 'gotoxy':
      text = 'Moves the sprite to spot ' + param('x', '0') + ', ' + param('y', '0') + '.';
      break;
    case 'glide':
      text = 'Slides to spot ' + param('x', '0') + ', ' + param('y', '0') + ' in ' + param('secs', '1') + ' seconds.';
      break;
    case 'changex':
      text = 'Moves the sprite left or right by ' + param('dx', '0') + '.';
      break;
    case 'changey':
      text = 'Moves the sprite up or down by ' + param('dy', '0') + '.';
      break;
    case 'point':
      text = 'Turns the sprite to face ' + param('deg', '0') + ' degrees.';
      break;
    case 'say':
      text = 'Shows and says "' + param('text', 'Hello!') + '" for ' + param('secs', '1') + ' seconds.';
      break;
    case 'speak':
      text = 'Says "' + param('text', 'Hello!') + ' out loud.';
      break;
    case 'tone':
      text = 'Plays a beep for ' + param('secs', '0.5') + ' seconds.';
      break;
    case 'stopsounds':
      text = 'Stops the sounds.';
      break;
    case 'touching':
      text = 'Checks if the sprite is touching an edge or another sprite.';
      break;
    default:
      text = 'Runs the "' + label + '" block.';
  }

  return { title: label, text: text, action: action };
}

const WATCH_FUNCTION_HELP = {
  watch_render: {
    title: 'watch_render()',
    color: '#94a3b8',
    text: 'Draws the sprite and background on the watch screen.'
  },
  watch_clamp: {
    title: 'watch_clamp(value, low, high)',
    color: '#94a3b8',
    text: 'Keeps a number between its smallest and biggest allowed values.'
  },
  watch_sleep_ms: {
    title: 'watch_sleep_ms(ms)',
    color: '#94a3b8',
    text: 'Waits a little at a time, so the app can still stop when asked.'
  },
  watch_play_speech: {
    title: 'watch_play_speech(text)',
    color: '#94a3b8',
    text: 'Plays the spoken words. The real sound is added when you build the watch app.'
  },
  watch_random: {
    title: 'watch_random(low, high)',
    action: 'random',
    text: 'Picks a surprise number between the two numbers.'
  },
  watch_goto_start: {
    title: 'watch_goto_start()',
    action: 'goto',
    text: 'Puts the sprite in the middle, facing forward, at its normal size.'
  },
  watch_move: {
    title: 'watch_move(steps)',
    action: 'move',
    text: 'Moves the sprite forward and keeps it on the screen.'
  },
  watch_turn: {
    title: 'watch_turn(degrees)',
    action: 'turn',
    text: 'Turns the sprite smoothly.'
  },
  watch_point: {
    title: 'watch_point(degrees)',
    action: 'point',
    text: 'Points the sprite in a new direction.'
  },
  watch_wait: {
    title: 'watch_wait(seconds)',
    action: 'wait',
    text: 'Waits for the number of seconds you chose.'
  },
  watch_say: {
    title: 'watch_say(text, seconds)',
    action: 'say',
    text: 'Shows the words, says them out loud, and waits.'
  },
  watch_speak: {
    title: 'watch_speak(text)',
    action: 'speak',
    text: 'Shows the words and says them out loud.'
  },
  watch_tone: {
    title: 'watch_tone(hz, seconds)',
    action: 'tone',
    text: 'Plays a beep through the watch speaker.'
  },
  watch_stop_sounds: {
    title: 'watch_stop_sounds()',
    action: 'stopsounds',
    text: 'Tells the watch to stop its sounds.'
  },
  watch_switch_sprite: {
    title: 'watch_switch_sprite(name)',
    action: 'switchsprite',
    text: 'Changes the picture and draws it on the watch.'
  },
  watch_switch_background: {
    title: 'watch_switch_background(name)',
    action: 'switchbg',
    text: 'Changes the background picture on the watch.'
  },
  watch_show_sprite: {
    title: 'watch_show_sprite()',
    action: 'show',
    text: 'Shows the sprite on the watch.'
  },
  watch_hide_sprite: {
    title: 'watch_hide_sprite()',
    action: 'hide',
    text: 'Makes the sprite disappear.'
  },
  watch_set_size: {
    title: 'watch_set_size(percent)',
    action: 'setsize',
    text: 'Changes how big the sprite looks.'
  },
  watch_goto_xy: {
    title: 'watch_goto_xy(x, y)',
    action: 'gotoxy',
    text: 'Moves the sprite to the spot you picked. The middle is 0, 0.'
  },
  watch_glide: {
    title: 'watch_glide(x, y, seconds)',
    action: 'glide',
    text: 'Slides the sprite to a new spot.'
  },
  watch_change_x: {
    title: 'watch_change_x(dx)',
    action: 'changex',
    text: 'Moves the sprite left or right.'
  },
  watch_change_y: {
    title: 'watch_change_y(dy)',
    action: 'changey',
    text: 'Moves the sprite up or down.'
  },
  watch_touching: {
    title: 'watch_touching(target)',
    action: 'touching',
    text: 'Checks if the sprite touches the edge or another sprite.'
  },
  watch_broadcast: {
    title: 'watch_broadcast(message)',
    action: 'broadcast',
    text: 'Starts the parts that are listening for this message.'
  },
  watch_find_sprite: {
    title: 'watch_find_sprite(id)',
    color: '#94a3b8',
    text: 'Finds a sprite picture by its name.'
  },
  watch_find_background: {
    title: 'watch_find_background(id)',
    color: '#94a3b8',
    text: 'Finds a background picture by its name.'
  },
  watch_lz4_decode: {
    title: 'watch_lz4_decode(src, srcSize, dst, dstSize)',
    color: '#94a3b8',
    text: 'Unpacks a smaller picture so the watch can show it.'
  },
  main: {
    title: 'main()',
    action: 'start',
    text: 'This is where the app begins. It sets up the screen, then starts the on-start steps.'
  }
};

const codeActionCategoryCache = Object.create(null);

function categoryForAction(action) {
  if (!action) return null;
  if (!(action in codeActionCategoryCache)) {
    let category = null;
    Object.keys(DEFS).some((type) => {
      const def = DEFS[type];
      if ((def.action || def.type) === action) {
        category = def.category;
        return true;
      }
      return false;
    });
    codeActionCategoryCache[action] = category;
  }
  return codeActionCategoryCache[action];
}

function watchFunctionNameFromLine(line) {
  const match = String(line || '').match(
    /^\s*(?:static\s+)?(?:void|int|float|double|bool|const\s+char\s*\*|const\s+WatchSpriteAsset\s*\*|const\s+WatchBackgroundAsset\s*\*)\s+([A-Za-z_]\w*)\s*\(/
  );
  return match ? match[1] : null;
}

function functionHelpFor(name, userFunctions) {
  const helper = WATCH_FUNCTION_HELP[name];
  if (helper) return helper;
  if (name && name.indexOf('fn_') === 0 && userFunctions) {
    const definition = userFunctions.get(name);
    if (definition) {
      const help = explainCodeBlock(definition.script[0]);
      return {
        title: 'Function: ' + definition.name,
        text: 'This is a set of steps named "' + definition.name + '". It runs when a call function block uses this name.',
        color: categoryColor((DEFS[definition.script[0].type] || {}).category),
        linkedBlocks: [definition.script[0]]
      };
    }
  }
  return null;
}

function blocksForAction(action) {
  const blocks = [];
  if (!action) return blocks;
  walkBlocks((block) => {
    const def = DEFS[block.type] || {};
    if ((def.action || block.type) === action) blocks.push(block);
  });
  return blocks;
}

function highlightCodeBlocks(blocks) {
  if (!scriptsEl) return;
  scriptsEl.querySelectorAll('.block.is-code-highlight').forEach((block) => {
    block.classList.remove('is-code-highlight');
  });
  const ids = new Set();
  (blocks || []).forEach((item) => {
    if (!item) return;
    ids.add(typeof item === 'string' ? item : item.id);
  });
  if (!ids.size) return;
  scriptsEl.querySelectorAll('.block[data-id]').forEach((block) => {
    if (ids.has(block.dataset.id)) block.classList.add('is-code-highlight');
  });
}

function highlightCodeBlock(blockId) {
  highlightCodeBlocks(blockId ? [blockId] : []);
}

let codeTipEl = null;
let codeTipVisible = false;

function codeLineFromEvent(event) {
  const target = event.target;
  return target && target.closest
    ? target.closest('.code-line')
    : null;
}

function highlightCodeFunction(group) {
  if (!watchCodeEl) return;
  watchCodeEl.querySelectorAll('.code-line.is-function-highlight').forEach((line) => {
    line.classList.remove('is-function-highlight');
  });
  if (!group) return;
  watchCodeEl.querySelectorAll('.code-line[data-code-function]').forEach((line) => {
    if (line.dataset.codeFunction === group) line.classList.add('is-function-highlight');
  });
}

function placeCodeTip(x, y) {
  if (!codeTipEl) return;
  const margin = 12;
  const gap = 14;
  const rect = codeTipEl.getBoundingClientRect();
  let left = x + gap;
  let top = y + gap;
  if (left + rect.width > window.innerWidth - margin) {
    left = x - rect.width - gap;
  }
  if (top + rect.height > window.innerHeight - margin) {
    top = y - rect.height - gap;
  }
  left = Math.max(margin, Math.min(left, window.innerWidth - rect.width - margin));
  top = Math.max(margin, Math.min(top, window.innerHeight - rect.height - margin));
  codeTipEl.style.left = left + 'px';
  codeTipEl.style.top = top + 'px';
}

function showCodeTip(line, x, y) {
  if (!codeTipEl) return;
  const color = line.dataset.helpColor || '#38bdf8';
  codeTipEl.style.setProperty('--code-tip-color', color);
  codeTipEl.textContent = '';

  const head = document.createElement('div');
  head.className = 'code-tip-head';
  const dot = document.createElement('span');
  dot.className = 'code-tip-dot';
  const title = document.createElement('span');
  title.className = 'code-tip-title';
  title.textContent = line.dataset.helpTitle || '';
  head.append(dot, title);

  const body = document.createElement('div');
  body.className = 'code-tip-body';
  body.textContent = line.dataset.helpText || '';

  codeTipEl.append(head, body);

  if (line.dataset.helpCode) {
    const code = document.createElement('code');
    code.className = 'code-tip-code';
    code.textContent = line.dataset.helpCode;
    codeTipEl.appendChild(code);
  }

  codeTipEl.classList.add('is-visible');
  codeTipEl.setAttribute('aria-hidden', 'false');
  codeTipVisible = true;
  placeCodeTip(x, y);
}

function hideCodeTip() {
  if (!codeTipEl) return;
  codeTipEl.classList.remove('is-visible');
  codeTipEl.setAttribute('aria-hidden', 'true');
  codeTipVisible = false;
}

function initCodeTooltip() {
  if (codeTipEl || !watchCodeEl) return;
  codeTipEl = document.getElementById('codeTip');
  if (!codeTipEl) return;

  watchCodeEl.addEventListener('pointerover', (event) => {
    const line = codeLineFromEvent(event);
    if (!line || !watchCodeEl.contains(line)) return;
    if (event.relatedTarget && line.contains(event.relatedTarget)) return;
    highlightCodeFunction(line.dataset.codeFunction);
    if (line.dataset.helpTitle) showCodeTip(line, event.clientX, event.clientY);
    else hideCodeTip();
  });

  watchCodeEl.addEventListener('pointermove', (event) => {
    if (!codeTipVisible) return;
    placeCodeTip(event.clientX, event.clientY);
  });

  watchCodeEl.addEventListener('pointerout', (event) => {
    const line = codeLineFromEvent(event);
    if (!line) return;
    const next = event.relatedTarget && event.relatedTarget.closest
      ? event.relatedTarget.closest('.code-line')
      : null;
    if (next === line) return;
    if (!next || next.dataset.codeFunction !== line.dataset.codeFunction) {
      highlightCodeFunction(null);
    }
    hideCodeTip();
  });

  watchCodeEl.addEventListener('pointerleave', () => {
    highlightCodeFunction(null);
    hideCodeTip();
  });
  window.addEventListener('scroll', hideCodeTip, true);
  window.addEventListener('resize', hideCodeTip);
  window.addEventListener('blur', hideCodeTip);
}

function renderWatchCpp(focusBlockId) {
  if (!watchCodeEl) return;

  initCodeTooltip();
  hideCodeTip();
  highlightCodeBlocks([]);

  const code = generateWatchCppPreview();
  watchCodeEl.textContent = '';

  const pre = watchCodeEl.parentElement;
  pre.classList.add('code-block');

  const lines = code.split('\n');
  const userFunctions = new Map();
  uniqueFunctionDefinitions().forEach((definition) => {
    userFunctions.set(functionCppName(definition.name), definition);
  });

  const colors = {
    event: '#f0b32e',
    motion: '#3f7bf0',
    looks: '#a855f7',
    control: '#f97316',
    others: '#94a3b8'
  };
  let currentFunction = null;

  lines.forEach((line, index) => {
    const span = document.createElement('span');
    span.className = 'code-line';
    span.textContent = line;

    const functionName = watchFunctionNameFromLine(line);
    if (functionName) currentFunction = functionName;
    else if (!line.trim()) currentFunction = null;
    if (currentFunction) span.dataset.codeFunction = currentFunction;

    const blockId = watchCodeLineBlocks[index];
    const block = blockId ? findBlockById(blockId) : null;
    const isComment = line.trim().startsWith('//');
    let help = null;
    let linkedBlocks = [];
    let color = null;
    let isFunctionLine = false;

    if (block) {
      const def = DEFS[block.type] || {};
      help = explainCodeBlock(block);
      linkedBlocks = [block];
      color = categoryColor(def.category);
      span.classList.add('is-block-code');
    } else if (currentFunction && !isComment) {
      const functionHelp = functionHelpFor(currentFunction, userFunctions);
      if (functionHelp) {
        help = functionHelp;
        isFunctionLine = true;
        color = functionHelp.color ||
          categoryColor(categoryForAction(functionHelp.action));
        linkedBlocks = functionHelp.linkedBlocks ||
          (functionHelp.action ? blocksForAction(functionHelp.action) : []);
        span.classList.add('is-function-code');
      }
    }

    if (help) {
      span.dataset.helpTitle = help.title;
      span.dataset.helpText = help.text;
      span.dataset.helpColor = color || '#38bdf8';
      span.style.setProperty('--code-block-color', color || '#38bdf8');
      if (isFunctionLine && functionName) span.dataset.helpCode = line.trim();
      if (linkedBlocks.length) {
        span.dataset.blockId = linkedBlocks[0].id;
        span.dataset.blockIds = linkedBlocks.map((item) => item.id).join(' ');
        span.addEventListener('mouseenter', () => highlightCodeBlocks(linkedBlocks));
        span.addEventListener('mouseleave', () => highlightCodeBlocks([]));
      }
    }

    if (help && color) {
      span.style.color = 'color-mix(in srgb, ' + color + ' 68%, #ffffff)';
    } else if (!line.trim() || isComment) {
      span.style.color = colors.others;
    } else if (line.includes('stack')) {
      span.style.color = '#cbd5e1';
    } else {
      let cat = colors.others;
      if (line.includes('watch_move') || line.includes('watch_turn') || line.includes('watch_goto_start')) {
        cat = colors.motion;
      } else if (line.includes('watch_say')) {
        cat = colors.looks;
      } else if (line.includes('watch_wait')) {
        cat = colors.control;
      }
      span.style.color = cat === colors.others && /\b(static\s+)?(void|int)\s+\w+\s*\(/.test(line)
        ? '#38bdf8'
        : cat;
    }
    watchCodeEl.appendChild(span);
    watchCodeEl.appendChild(document.createTextNode('\n'));
  });

  const program = previewRunnableProgram();
  const blockCount = program.stacks.reduce((total, stack) => total + stack.script.length, 0) +
    program.functions.reduce((total, definition) => total + definition.script.length, 0);
  if (codeStatusEl) {
    if (!program.hasProgram) {
      codeStatusEl.textContent = workspace.length ? 'Add blocks under a starter' : 'No blocks yet';
    } else {
      codeStatusEl.textContent = blockCount + ' block' + (blockCount === 1 ? '' : 's') +
        ' | ' + lines.length + ' lines';
    }
  }

  try {
    scrollWatchToFocus(focusBlockId);
  } catch (e) {
    // ignore
  }
}

function fallbackCopyText(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch (error) {
    copied = false;
  }

  textarea.remove();
  return copied;
}

async function copyWatchCpp() {
  let text;
  try {
    const assets = await Promise.all([prepareSpriteAssets(), prepareBackgroundAssets()]);
    text = generateWatchCpp(assets[0], assets[1]);
  } catch (error) {
    showBuildError(error);
    return;
  }
  let copied = false;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch (error) {
      copied = false;
    }
  }

  if (!copied) copied = fallbackCopyText(text);
  showToast(copied ? 'Watch C++ and sprite data copied.' : 'Could not copy the Watch C++.');
}

async function downloadWatchCpp() {
  let blob;
  try {
    const assets = await Promise.all([prepareSpriteAssets(), prepareBackgroundAssets()]);
    blob = new Blob([generateWatchCpp(assets[0], assets[1])], { type: 'text/plain;charset=utf-8' });
  } catch (error) {
    showBuildError(error);
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = 'blockcode-app.cpp';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  showToast('Downloaded blockcode-app.cpp.');
}

function appIdFromName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 23) || 'blockcode-app';
}

let connectedWatchPort = null;

async function ensureWatchConnection() {
  if (connectedWatchPort) return connectedWatchPort;
  if (!navigator.serial) {
    throw new Error('Direct USB upload requires Chrome or Edge over HTTPS and a supported serial device.');
  }
  connectedWatchPort = await navigator.serial.requestPort({
    filters: [{ usbVendorId: 0x303A, usbProductId: 0x1001 }]
  });
  return connectedWatchPort;
}

function watchAppCrc32(bytes) {
  let crc = 0xFFFFFFFF;
  for (let index = 0; index < bytes.length; index++) {
    crc ^= bytes[index];
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

async function readWatchResponse(reader, needle, timeoutMs) {
  const decoder = new TextDecoder();
  let response = '';
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    let timer;
    const result = await Promise.race([
      reader.read(),
      new Promise((resolve) => {
        timer = setTimeout(() => resolve(null), Math.max(1, deadline - Date.now()));
      })
    ]);
    clearTimeout(timer);
    if (!result) {
      await reader.cancel();
      throw new Error('Timed out waiting for the watch. Check its USB connection and firmware.');
    }
    if (result.done) throw new Error('The watch disconnected during upload.');
    response += decoder.decode(result.value, { stream: true });
    if (response.includes(needle)) return response;
    if (response.includes('QOS_ERR')) throw new Error(response.trim());
  }
  throw new Error('Timed out waiting for ' + needle + ' from the watch.');
}

async function uploadWatchPackage(port, appBlob, appId) {
  const bytes = new Uint8Array(await appBlob.arrayBuffer());
  if (!bytes.length || bytes.length > 4 * 1024 * 1024) {
    throw new Error('The built app is empty or larger than the watch upload limit (4 MiB).');
  }
  const crc = watchAppCrc32(bytes).toString(16).padStart(8, '0');
  let reader = null;
  let writer = null;
  let opened = false;
  try {
    await port.open({ baudRate: 115200 });
    opened = true;
    await port.setSignals({ dataTerminalReady: false, requestToSend: false });
    reader = port.readable.getReader();
    writer = port.writable.getWriter();
    await new Promise((resolve) => setTimeout(resolve, 2200));
    await writer.write(new TextEncoder().encode(
      'QOSUPLOAD ' + bytes.length + ' ' + crc + ' ' + appId + '.app\n'
    ));
    await readWatchResponse(reader, 'QOS_READY', 30000);

    const chunkSize = 1024;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      await writer.write(bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)));
      if (offset + chunkSize < bytes.length) {
        await new Promise((resolve) => setTimeout(resolve, 2));
      }
    }
    await readWatchResponse(reader, 'QOS_OK', 30000);
  } finally {
    if (reader) reader.releaseLock();
    if (writer) writer.releaseLock();
    if (opened) await port.close();
  }
}

async function requestWatchApp(name, id, spriteAssets, backgroundAssets, upload) {
  const renderBuildApi = window.BLOCKCODE_RENDER_BUILD_API === true;

  const serviceOrigin = 'http://127.0.0.1:8765';
  const isBuildServicePage = location.protocol === 'http:' &&
    (location.hostname === '127.0.0.1' || location.hostname === 'localhost') &&
    location.port === '8765';
  const endpoint = upload ? 'upload' : 'build';
  const buildUrl = renderBuildApi ? '/' + endpoint :
    (isBuildServicePage ? '/' + endpoint : serviceOrigin + '/' + endpoint);
  const body = JSON.stringify({
    source: generateWatchCpp(spriteAssets, backgroundAssets),
    id: id,
    name: name
  });
  const headers = { 'Content-Type': 'application/json' };
  let requestBody = body;
  if (typeof CompressionStream === 'function') {
    requestBody = await new Response(
      new Blob([body]).stream().pipeThrough(new CompressionStream('gzip'))
    ).blob();
    headers['Content-Encoding'] = 'gzip';
  }
  let response;
  try {
    response = await fetch(buildUrl, {
      method: 'POST',
      headers: headers,
      body: requestBody
    });
  } catch (error) {
    throw new Error('Could not connect to the build service at ' +
      new URL(buildUrl, location.href).href + ' from page origin ' + location.origin +
      ': ' + (error.message || String(error)) +
      (renderBuildApi ? ' The Render service may be starting from its idle state; wait a minute and retry.' :
        ' Start the local build service at http://127.0.0.1:8765/ and allow this website to access your local network if your browser asks.'));
  }

  if (!response.ok) {
    let message = upload ? 'Watch upload failed.' : 'Build failed.';
    try {
      const detail = await response.json();
      if (detail.error) message = detail.error;
    } catch (error) { /* keep generic message */ }
    throw new Error(message);
  }

  if (renderBuildApi) {
    const job = await response.json();
    const deadline = Date.now() + 18 * 60 * 1000;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      let statusResponse;
      try {
        statusResponse = await fetch('/build/jobs/' + encodeURIComponent(job.job_id), {
          cache: 'no-store'
        });
      } catch (error) {
        throw new Error('Lost connection to the Render build service: ' + (error.message || String(error)));
      }
      let status;
      try {
        status = await statusResponse.json();
      } catch (error) {
        throw new Error('The Render build service returned an invalid status response.');
      }
      if (!statusResponse.ok) throw new Error(status.error || 'Could not check the Render build status.');
      if (status.status === 'failed') throw new Error(status.error || 'ESP-IDF build failed.');
      if (status.status === 'building') {
        const elapsed = Math.floor(status.elapsed_seconds || 0);
        const elapsedLabel = elapsed >= 60
          ? Math.floor(elapsed / 60) + 'm ' + (elapsed % 60) + 's'
          : elapsed + 's';
        showBuildNotice(
          'Building watch app',
          (status.progress || 'ESP-IDF build is running.') + ' (' + elapsedLabel + ' elapsed)',
          'loading',
          true
        );
      }
      if (status.status === 'ready') {
        const download = await fetch('/build/jobs/' + encodeURIComponent(job.job_id) + '/download', {
          cache: 'no-store'
        });
        if (!download.ok) {
          let detail = {};
          try { detail = await download.json(); } catch (error) { /* use the generic message */ }
          throw new Error(detail.error || 'Could not download the completed watch app.');
        }
        return download.blob();
      }
    }
    throw new Error('The Render build took longer than 18 minutes. Try a smaller project or retry.');
  }

  if (upload) {
    const result = await response.json();
    return result.message || 'The watch accepted the app.';
  }

  return response.blob();
}

function showBuildError(error) {
  const unavailable = /failed to fetch|networkerror|could not connect to the build service/i.test(error.message || '');
  showBuildNotice('Build failed', unavailable
    ? (error.message || 'Build service is unreachable. Open http://127.0.0.1:8765/.')
    : (error.message || 'Could not reach the local watch build service.'), 'error', false);
}

async function buildWatchApp() {
  if (state.running) {
    showToast('Stop the program before building it.');
    return;
  }

  const name = (window.prompt('Name for this watch app:', 'BlockCode App') || '').trim();
  if (!name) return;
  const id = appIdFromName(name);
  const originalText = buildAppBtn.textContent;
  buildAppBtn.disabled = true;
  buildAppBtn.textContent = 'Building…';
  showBuildNotice('Building watch app', 'Preparing sprite assets…', 'loading', true);

  try {
    const assets = await Promise.all([prepareSpriteAssets(), prepareBackgroundAssets()]);
    showBuildNotice('Building watch app', 'Compiling ' + id + '.app…', 'loading', true);
    const blob = await requestWatchApp(name, id, assets[0], assets[1]);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = id + '.app';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    showBuildNotice('Build complete', 'Built ' + id + '.app with its sprites. Upload it to run it on the watch.', 'success', false);
  } catch (error) {
    showBuildError(error);
  } finally {
    buildAppBtn.disabled = false;
    buildAppBtn.textContent = originalText;
  }
}

async function uploadWatchApp() {
  if (state.running) {
    showToast('Stop the program before building it.');
    return;
  }
  const renderBuildApi = window.BLOCKCODE_RENDER_BUILD_API === true;
  let port = null;
  if (renderBuildApi) {
    try {
      port = await ensureWatchConnection();
    } catch (error) {
      if (error && error.name === 'NotFoundError') return;
      showBuildError(error);
      return;
    }
  }
  const name = (window.prompt('Name for this watch app:', 'BlockCode App') || '').trim();
  if (!name) return;
  const id = appIdFromName(name);
  const originalText = uploadBtn.textContent;
  uploadBtn.disabled = true;
  uploadBtn.textContent = 'Building & uploading…';
  showBuildNotice('Building and uploading', 'Preparing sprite assets…', 'loading', true);

  try {
    const assets = await Promise.all([prepareSpriteAssets(), prepareBackgroundAssets()]);
    showBuildNotice('Building and uploading', 'Building ' + id + '.app…', 'loading', true);
    if (renderBuildApi) {
      const appBlob = await requestWatchApp(name, id, assets[0], assets[1]);
      showBuildNotice('Building and uploading', 'Sending ' + id + '.app to the watch…', 'loading', true);
      await uploadWatchPackage(port, appBlob, id);
      showBuildNotice('Upload complete', 'Uploaded ' + id + '.app and its sprites to the watch.', 'success', false);
    } else {
      const result = await requestWatchApp(name, id, assets[0], assets[1], true);
      showBuildNotice('Upload complete', result || ('Uploaded ' + id + '.app and its sprites to the watch.'), 'success', false);
    }
  } catch (error) {
    showBuildError(error);
  } finally {
    if (renderBuildApi) connectedWatchPort = null;
    uploadBtn.disabled = false;
    uploadBtn.textContent = originalText;
  }
}

function setRunning(running) {
  state.running = running;
  runBtn.disabled = running;
  stopBtn.disabled = !running;
  runBtn.classList.toggle('is-running', running);
  runBtn.textContent = running ? 'Running...' : 'Run';
}

function clearActive() {
  scriptsEl.querySelectorAll('.block.is-active').forEach((el) => {
    el.classList.remove('is-active');
  });
}

function isHat(block) {
  const def = DEFS[block.type];
  return !!def && (def.action === 'event' || def.hat);
}

async function runProgram() {
  if (state.running) return;

  const selectedSpriteId = activeWorkspaceSpriteId || state.spriteId;
  const spriteIds = allSprites().map((sprite) => sprite.id);
  if (selectedSpriteId && !spriteIds.includes(selectedSpriteId)) spriteIds.push(selectedSpriteId);
  const scriptsBySprite = spriteIds.map((spriteId) => ({
    spriteId: spriteId,
    scripts: (spriteId === activeWorkspaceSpriteId ? workspace : workspaceBySprite[spriteId] || [])
      .filter((script) => script.length > 0 && isStartupHat(script[0]))
  })).filter((item) => item.scripts.length > 0);

  if (!scriptsBySprite.length) {
    const hasBlocks = spriteIds.some((spriteId) =>
      (spriteId === activeWorkspaceSpriteId ? workspace : workspaceBySprite[spriteId] || []).length > 0
    );
    showToast(hasBlocks
      ? 'Add an "on start" block at the top of a stack to run it.'
      : 'Drag some blocks into the workspace first.');
    return;
  }

  state.token += 1;
  const token = state.token;
  const vars = createRuntimeVariables();
  renderMonitorPanel(vars);
  const runContext = {
    vars: vars,
    depth: 0,
    spriteId: selectedSpriteId
  };
  activeRuntimeContext = runContext;

  setRunning(true);
  hideBubble();

  try {
    await Promise.all(scriptsBySprite.map(async (item) => {
      await Promise.all(item.scripts.map(async (script) => {
        const ctx = { vars: vars, depth: 0, spriteId: item.spriteId };
        if (token !== state.token) return;
        await executeStack(script, token, ctx);
      }));
    }));
  } finally {
    if (selectedSpriteId) activateRuntimeSprite(selectedSpriteId);
    if (activeRuntimeContext === runContext) activeRuntimeContext = null;
    if (token === state.token) {
      setRunning(false);
      clearActive();
    }
  }
}

function stopProgram() {
  if (!state.running) return;

  state.token += 1;
  Array.from(sleepers).forEach((finish) => finish());
  sleepers.clear();
  stopAllAudio();

  setRunning(false);
  clearActive();
  rocketEl.classList.remove('is-burning');
  hideBubble();
}
