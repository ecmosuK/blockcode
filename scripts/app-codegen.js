'use strict';

/* ---------- Watch C++ code generation ---------- */

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

function collectVariableNames() {
  const names = new Set();
  walkBlocks((block) => {
    const def = DEFS[block.type] || {};
    const action = def.action || block.type;
    if (action === 'setvar' || action === 'changevar') {
      names.add(variableName(block.params.name));
    }
    Object.keys(block.params || {}).forEach((key) => {
      collectExpressionVariables(block.params[key], names);
    });
  });
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

function cppPush(lines, indent, text) {
  lines.push('  '.repeat(indent) + text);
}

function emitCppBlock(block, indent, lines) {
  const def = DEFS[block.type] || {};
  const action = def.action || block.type;

  switch (action) {
    case 'event':
      cppPush(lines, indent, '// when clicked');
      break;

    case 'start':
      cppPush(lines, indent, '// on start');
      break;

    case 'define':
      break;

    case 'repeat': {
      cppPush(lines, indent, 'for (int i = 0; i < (int)(' + exprToCpp(block.params.times) + '); ++i) {');
      (block.children || []).forEach((child) => emitCppBlock(child, indent + 1, lines));
      cppPush(lines, indent, '}');
      break;
    }

    case 'forever': {
      cppPush(lines, indent, 'while (true) {');
      (block.children || []).forEach((child) => emitCppBlock(child, indent + 1, lines));
      if (!block.children || !block.children.length) {
        cppPush(lines, indent + 1, 'watch_wait(0.016f);');
      }
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
}

function emitCppBlocks(blocks, indent, lines) {
  (blocks || []).forEach((block) => emitCppBlock(block, indent, lines));
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

function watchCppActionSupport() {
  return [
    'static float watch_x = 205.0f;',
    'static float watch_y = 251.0f;',
    'static float watch_heading = 0.0f;',
    'static float watch_size = 100.0f;',
    'static int watch_visible = 1;',
    '',
    'static float watch_clamp(float value, float low, float high) {',
    '  if (value < low) return low;',
    '  if (value > high) return high;',
    '  return value;',
    '}',
    '',
    'static void watch_sleep_ms(unsigned long ms) {',
    '  while (ms > 0) {',
    '    unsigned long chunk = ms > 1000UL ? 1000UL : ms;',
    '    usleep((useconds_t)(chunk * 1000UL));',
    '    ms -= chunk;',
    '  }',
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
    'void watch_goto_start(void) {',
    '  watch_x = 205.0f;',
    '  watch_y = 251.0f;',
    '  watch_heading = 0.0f;',
    '  watch_size = 100.0f;',
    '  watch_visible = 1;',
    '}',
    '',
    'void watch_move(float steps) {',
    '  const float radians = watch_heading * 0.0174532925f;',
    '  watch_x = watch_clamp(watch_x + cosf(radians) * steps * 1.6f, 40.0f, 370.0f);',
    '  watch_y = watch_clamp(watch_y + sinf(radians) * steps * 1.6f, 40.0f, 462.0f);',
    '  printf("[watch] position %.1f, %.1f\\n", watch_x, watch_y);',
    '}',
    '',
    'void watch_turn(float degrees) {',
    '  watch_heading = fmodf(watch_heading + degrees, 360.0f);',
    '  if (watch_heading < 0.0f) watch_heading += 360.0f;',
    '}',
    '',
    'void watch_point(float degrees) {',
    '  watch_heading = fmodf(degrees, 360.0f);',
    '  if (watch_heading < 0.0f) watch_heading += 360.0f;',
    '}',
    '',
    'void watch_wait(float seconds) {',
    '  if (seconds > 0.0f) {',
    '    watch_sleep_ms((unsigned long)(seconds * 1000.0f + 0.5f));',
    '  }',
    '}',
    '',
    'void watch_say(const char *text, float seconds) {',
    '  printf("[watch] %s\\n", text);',
    '  watch_wait(seconds);',
    '}',
    '',
    'void watch_speak(const char *text) {',
    '  printf("[watch] speak: %s\\n", text);',
    '  watch_wait(1.2f);',
    '}',
    '',
    'void watch_tone(float hz, float seconds) {',
    '  printf("[watch] tone %.0f Hz for %.2f s\\n", hz, seconds);',
    '  watch_wait(seconds);',
    '}',
    '',
    'void watch_stop_sounds(void) {',
    '  printf("[watch] stop sounds\\n");',
    '}',
    '',
    'void watch_switch_sprite(const char *name) {',
    '  printf("[watch] sprite %s\\n", name);',
    '}',
    '',
    'void watch_switch_background(const char *name) {',
    '  printf("[watch] background %s\\n", name);',
    '}',
    '',
    'void watch_show_sprite(void) {',
    '  watch_visible = 1;',
    '}',
    '',
    'void watch_hide_sprite(void) {',
    '  watch_visible = 0;',
    '}',
    '',
    'void watch_set_size(float percent) {',
    '  watch_size = watch_clamp(percent, 10.0f, 400.0f);',
    '  printf("[watch] size %.0f%%\\n", watch_size);',
    '}',
    '',
    'void watch_goto_xy(float x, float y) {',
    '  watch_x = watch_clamp(205.0f + x, 40.0f, 370.0f);',
    '  watch_y = watch_clamp(251.0f - y, 40.0f, 462.0f);',
    '  printf("[watch] position %.1f, %.1f\\n", watch_x, watch_y);',
    '}',
    '',
    'void watch_glide(float x, float y, float seconds) {',
    '  watch_goto_xy(x, y);',
    '  watch_wait(seconds);',
    '}',
    '',
    'void watch_change_x(float dx) {',
    '  watch_x = watch_clamp(watch_x + dx, 40.0f, 370.0f);',
    '  printf("[watch] position %.1f, %.1f\\n", watch_x, watch_y);',
    '}',
    '',
    'void watch_change_y(float dy) {',
    '  watch_y = watch_clamp(watch_y - dy, 40.0f, 462.0f);',
    '  printf("[watch] position %.1f, %.1f\\n", watch_x, watch_y);',
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

function generateWatchCpp() {
  const lines = [];
  const add = (line) => lines.push(line === undefined ? '' : line);
  const functions = uniqueFunctionDefinitions();
  const variables = collectVariableNames();

  add('// Generated by BlockCode.');
  add('// ESP-IDF ELF app. Build it to blockcode-app.app.elf, then copy the');
  add('// ELF to the watch storage and launch it from the watch app menu.');
  add('// The watch_* functions below are generated stand-ins. Replace their');
  add('// bodies with display and hardware calls for the real watch.');
  add('');

  watchCppActionPrelude().forEach((line) => add(line));
  watchCppActionSupport().forEach((line) => add(line));

  if (variables.length) {
    add('// Program variables');
    variables.forEach((name) => add('static float ' + variableCppName(name) + ' = 0.0f;'));
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
  workspace.forEach((script, scriptIndex) => {
    if (!script.length || isDefine(script[0])) return;
    const name = 'stack' + (scriptIndex + 1);
    const hat = isHat(script[0]);
    if (hat) entryNames.push(name);

    add(hat
      ? '// Stack ' + (scriptIndex + 1) + ': entry point'
      : '// Stack ' + (scriptIndex + 1) + ': not run (no hat block)');
    add('static void ' + name + '(void) {');
    emitCppBlocks(script, 1, lines);
    add('}');
    add('');
  });

  add('extern "C" int main(int argc, char **argv) {');
  add('  (void)argc;');
  add('  (void)argv;');
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
  const add = (line) => lines.push(line === undefined ? '' : line);
  const blockCount = workspace.reduce((total, script) => total + script.length, 0);
  const functions = uniqueFunctionDefinitions();
  const entryNames = [];

  add('// Preview only. Copy or Download adds the full C++ app file.');
  add('');

  if (!blockCount) {
    add('// No blocks yet');
    return lines.join('\n');
  }

  add('// Block action functions:');
  watchCppActionCode().forEach((line) => add(line));

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

  workspace.forEach((script, scriptIndex) => {
    if (!script.length || isDefine(script[0])) return;
    const name = 'stack' + (scriptIndex + 1);
    const hat = isHat(script[0]);
    if (hat) entryNames.push(name);

    add('// Stack ' + (scriptIndex + 1) + ': ' +
      (hat ? 'runs when started' : 'not used (add an "on start" block)'));
    add('static void ' + name + '(void) {');
    emitCppBlocks(script, 1, lines);
    add('}');
    add('');
  });

  add('int main(int argc, char **argv) {');
  if (entryNames.length) {
    entryNames.forEach((name) => add('  ' + name + '();'));
  } else {
    add('  // Add an "on start" block at the top of a stack to run it.');
  }
  add('}');
  add('');

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

function renderWatchCpp(focusBlockId) {
  if (!watchCodeEl) return;

  const code = generateWatchCppPreview();
  watchCodeEl.textContent = '';

  const pre = watchCodeEl.parentElement;
  pre.classList.add('code-block');

  const lines = code.split('\n');
  const colors = {
    event: '#f0b32e',
    motion: '#3f7bf0',
    looks: '#a855f7',
    control: '#f97316',
    others: '#94a3b8'
  };

  lines.forEach((line) => {
    const span = document.createElement('span');
    span.className = 'code-line';
    span.textContent = line;
    if (!line.trim() || line.trim().startsWith('//')) {
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

  const blockCount = workspace.reduce((total, script) => total + script.length, 0);
  if (codeStatusEl) {
    codeStatusEl.textContent = blockCount
      ? blockCount + ' block' + (blockCount === 1 ? '' : 's') +
        ' | ' + lines.length + ' lines'
      : 'No blocks yet';
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
  const text = generateWatchCpp();
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
  showToast(copied ? 'Watch C++ copied.' : 'Could not copy the Watch C++.');
}

function downloadWatchCpp() {
  const blob = new Blob([generateWatchCpp()], { type: 'text/plain;charset=utf-8' });
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

  if (!workspace.length) {
    showToast('Drag some blocks into the workspace first.');
    return;
  }

  const scripts = workspace.filter((script) => {
    return script.length > 0 && isHat(script[0]) && !isDefine(script[0]);
  });

  if (!scripts.length) {
    showToast('Add an "on start" block at the top of a stack to run it.');
    return;
  }

  state.token += 1;
  const token = state.token;
  const ctx = { vars: Object.create(null), depth: 0 };

  setRunning(true);
  hideBubble();

  try {
    for (const script of scripts) {
      if (token !== state.token) return;
      await executeStack(script, token, ctx);
    }
  } finally {
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
