'use strict';

/* ---------- Stage ---------- */

let activeRuntimeContext = null;
let draggedStageSprite = null;
let suppressSpriteClickUntil = 0;
const runtimeSpriteStates = Object.create(null);

function stageSize() {
  // Match the coordinate space used by generated watch apps.
  return { w: 410, h: 502 };
}

function updateSprite() {
  const size = stageSize();
  const scaleX = stageEl.clientWidth / size.w || 1;
  const scaleY = stageEl.clientHeight / size.h || 1;
  spriteEl.style.left = (state.x * scaleX) + 'px';
  spriteEl.style.top = (state.y * scaleY) + 'px';
  spriteEl.style.display = state.visible ? '' : 'none';
  const scale = clamp(state.size, 10, 400) / 100;
  rocketEl.style.transform =
    'translate(-50%, -50%) rotate(' + state.heading + 'deg) scale(' + scale + ')';
  posEl.textContent =
    'x ' + Math.round(state.x - size.w / 2) + ' | y ' + Math.round(size.h / 2 - state.y);
}

function initSpriteDragging() {
  if (!stageEl || stageEl.dataset.spriteDragging === 'true') return;
  stageEl.dataset.spriteDragging = 'true';

  stageEl.addEventListener('pointerdown', (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    const target = event.target.closest('.stage-extra-sprite, #rocket');
    if (!target) return;
    const extra = target.closest('.stage-extra-sprite');
    const spriteId = extra ? extra.dataset.spriteId : state.spriteId;
    if (!spriteId) return;

    const targetRect = target.getBoundingClientRect();
    event.preventDefault();
    draggedStageSprite = {
      element: extra || target,
      spriteId: spriteId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      grabOffsetX: event.clientX - (targetRect.left + targetRect.width / 2),
      grabOffsetY: event.clientY - (targetRect.top + targetRect.height / 2),
      moved: false,
      isActive: !extra
    };
    target.setPointerCapture(event.pointerId);
  });

  stageEl.addEventListener('pointermove', (event) => {
    const drag = draggedStageSprite;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const rect = stageEl.getBoundingClientRect();

    if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 3) {
      drag.moved = true;
      drag.element.classList.add('is-preview-dragging');
      if (drag.isActive) spriteEl.classList.add('is-preview-dragging');
    }

    const x = clamp(
      (event.clientX - drag.grabOffsetX - rect.left) / rect.width * 100,
      5,
      95
    );
    const y = clamp(
      (event.clientY - drag.grabOffsetY - rect.top) / rect.height * 100,
      5,
      95
    );

    if (drag.isActive) {
      const size = stageSize();
      state.x = x * size.w / 100;
      state.y = y * size.h / 100;
      updateSprite();
    } else {
      setSpritePreviewPosition(drag.spriteId, x, y);
    }
  });

  const finishDrag = (event) => {
    const drag = draggedStageSprite;
    if (!drag || drag.pointerId !== event.pointerId) return;
    draggedStageSprite = null;
    drag.element.classList.remove('is-preview-dragging');
    if (drag.isActive) spriteEl.classList.remove('is-preview-dragging');
    if (drag.moved) {
      suppressSpriteClickUntil = Date.now() + 400;
      if (drag.isActive) saveActiveSpritePreviewPosition();
      saveRuntimeAssets();
    }
  };
  stageEl.addEventListener('pointerup', finishDrag);
  stageEl.addEventListener('pointercancel', finishDrag);

  stageEl.addEventListener('click', (event) => {
    if (Date.now() > suppressSpriteClickUntil || !event.target.closest('#rocket')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
}

function renderMonitorPanel(vars) {
  if (!monitorPanelEl) return;
  if (vars) monitorRuntimeValues = vars;
  const values = monitorRuntimeValues;
  monitorPanelEl.innerHTML = '';
  const rows = [];

  visibleVariables.forEach((name) => {
    const value = values && values[name] != null ? values[name] : 0;
    rows.push({ name: name, value: String(value) });
  });
  visibleLists.forEach((name) => {
    const items = values && values.__lists && values.__lists[name]
      ? values.__lists[name]
      : [];
    rows.push({ name: name, value: items.length + (items.length === 1 ? ' item' : ' items') });
  });

  rows.forEach((row) => {
    const item = document.createElement('div');
    item.className = 'monitor-item';
    const label = document.createElement('span');
    label.className = 'monitor-name';
    label.textContent = row.name;
    const value = document.createElement('span');
    value.className = 'monitor-value';
    value.textContent = row.value;
    item.append(label, value);
    monitorPanelEl.appendChild(item);
  });
  monitorPanelEl.hidden = !rows.length;
}

function createRuntimeVariables() {
  const vars = Object.create(null);
  vars.__lists = Object.create(null);
  ensureRuntimeVariables(vars);
  return vars;
}

function ensureRuntimeVariables(vars) {
  workspaceVariables.forEach((name) => {
    if (vars[name] == null) vars[name] = 0;
  });
  workspaceLists.forEach((name) => {
    if (!vars.__lists[name]) vars.__lists[name] = [];
  });
}

async function runPaletteBlock(block) {
  if (!block) return;
  if (state.running) {
    showToast('Stop the program before running a palette block.');
    return;
  }

  if (activeWorkspaceSpriteId) applySpriteById(activeWorkspaceSpriteId, false);
  const vars = monitorRuntimeValues || createRuntimeVariables();
  ensureRuntimeVariables(vars);
  renderMonitorPanel(vars);
  if (isReporter(block)) {
    showToast(String(evalNumber(block, vars)));
    return;
  }

  state.token += 1;
  const token = state.token;
  setRunning(true);
  hideBubble();
  const previousContext = activeRuntimeContext;
  const ctx = { vars: vars, depth: 0, spriteId: activeWorkspaceSpriteId || state.spriteId };
  activeRuntimeContext = ctx;
  try {
    await executeBlock(block, token, ctx);
  } finally {
    if (activeRuntimeContext === ctx) activeRuntimeContext = previousContext;
    if (token === state.token) {
      setRunning(false);
      clearActive();
    }
  }
}

function resetSprite(animate) {
  const size = stageSize();

  if (!animate) spriteEl.style.transition = 'none';
  state.x = size.w / 2;
  state.y = size.h / 2;
  state.heading = 0;
  state.size = 100;
  state.visible = true;
  spriteVisibilityById[state.spriteId] = true;
  updateSprite();
  if (!animate) {
    void spriteEl.offsetWidth;
    spriteEl.style.transition = '';
  }

  hideBubble();
  rocketEl.classList.remove('is-burning');
}

function showBubble(text) {
  bubbleEl.textContent = text;
  bubbleEl.classList.add('is-visible');
}

function hideBubble() {
  bubbleEl.classList.remove('is-visible');
}

function sleep(ms, token) {
  return new Promise((resolve) => {
    if (token !== state.token) {
      resolve();
      return;
    }

    let timer = null;
    const finish = () => {
      if (timer) clearTimeout(timer);
      sleepers.delete(finish);
      resolve();
    };

    timer = setTimeout(finish, Math.max(0, ms));
    sleepers.add(finish);
  });
}

/* ---------- Program execution ---------- */

function evalNumber(value, vars) {
  if (isExpression(value)) {
    const a = () => evalNumber(value.params.a, vars);
    const b = () => evalNumber(value.params.b, vars);
    switch (value.type) {
      case 'add': return a() + b();
      case 'subtract': return a() - b();
      case 'multiply': return a() * b();
      case 'divide': {
        const divisor = b();
        return divisor === 0 ? 0 : a() / divisor;
      }
      case 'round': return Math.round(a());
      case 'random': {
        const low = Math.min(a(), b());
        const high = Math.max(a(), b());
        return low + Math.floor(Math.random() * (high - low + 1));
      }
      case 'variable': {
        const name = String(value.params.name || '').trim();
        return Number(vars[name]) || 0;
      }
      case 'listitem': {
        const list = vars.__lists[value.params.list] || [];
        const index = Math.floor(evalNumber(value.params.index, vars)) - 1;
        return index >= 0 && index < list.length ? Number(list[index]) || 0 : 0;
      }
      case 'listlength': {
        const list = vars.__lists[value.params.list] || [];
        return list.length;
      }
      case 'listcontains': {
        const list = vars.__lists[value.params.list] || [];
        return list.includes(String(value.params.item || '')) ? 1 : 0;
      }
      case 'equals': return a() === b() ? 1 : 0;
      case 'and': return a() !== 0 && b() !== 0 ? 1 : 0;
      case 'or': return a() !== 0 || b() !== 0 ? 1 : 0;
      case 'not': return a() === 0 ? 1 : 0;
      case 'touching': {
        const target = String(value.params.sprite || '');
        const size = stageSize();
        if (target === 'edge') {
          const radius = 32 * state.size / 100;
          return state.x - radius <= 40 || state.x + radius >= size.w - 40 ||
            state.y - radius <= 40 || state.y + radius >= size.h - 40 ? 1 : 0;
        }
        if (!target || target === state.spriteId) return 0;
        const position = spritePreviewPositions[target] || defaultSpritePreviewPosition(target);
        const otherX = size.w * position.x / 100;
        const otherY = size.h * position.y / 100;
        const radius = 32 * (state.size + 100) / 100;
        return Math.abs(state.x - otherX) <= radius &&
          Math.abs(state.y - otherY) <= radius ? 1 : 0;
      }
      default: return 0;
    }
  }

  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function variableName(value) {
  const name = String(value || '').trim();
  return name || 'value';
}

function getAudioContext() {
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  if (!audioContext) {
    try {
      audioContext = new Ctor();
    } catch (error) {
      audioContext = null;
    }
  }
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

function stopAllAudio() {
  if (window.speechSynthesis) {
    try { window.speechSynthesis.cancel(); } catch (error) { /* ignore */ }
  }
  activeOscillators.forEach((oscillator) => {
    try { oscillator.stop(); } catch (error) { /* ignore */ }
  });
  activeOscillators.clear();
}

async function playTone(hz, secs, token) {
  const frequency = clamp(hz, 20, 12000);
  const duration = clamp(secs, 0, 10);
  const ctx = getAudioContext();

  if (!ctx || duration <= 0) {
    await sleep(duration * 1000, token);
    return;
  }

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  activeOscillators.add(oscillator);

  await sleep(duration * 1000, token);

  try { oscillator.stop(); } catch (error) { /* ignore */ }
  activeOscillators.delete(oscillator);
}

function speakText(text, token) {
  const message = String(text || '').slice(0, 200);
  if (!message) return Promise.resolve();

  if (!window.speechSynthesis || typeof window.SpeechSynthesisUtterance !== 'function') {
    showBubble(message);
    return sleep(900, token).then(() => {
      if (token === state.token) hideBubble();
    });
  }

  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(finish, Math.min(8000, 900 + message.length * 70));
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onend = finish;
    utterance.onerror = finish;
    try {
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      finish();
    }
  });
}

function stagePointToPixels(x, y) {
  const size = stageSize();
  return {
    x: clamp(size.w / 2 + x, PAD, size.w - PAD),
    y: clamp(size.h / 2 - y, PAD, size.h - PAD)
  };
}

async function executeStack(blocks, token, ctx) {
  const stack = blocks || [];
  for (let index = 0; index < stack.length; index++) {
    const block = stack[index];
    if (token !== state.token) return false;
    if (ctx.spriteId && state.spriteId !== ctx.spriteId) activateRuntimeSprite(ctx.spriteId);

    const el = scriptsEl.querySelector('.block[data-id="' + block.id + '"]');
    if (el) el.classList.add('is-active');

    const action = (DEFS[block.type] && DEFS[block.type].action) || block.type;
    if (action === 'if') {
      const condition = evalNumber(block.params.condition, ctx.vars) !== 0;
      const next = stack[index + 1];
      const hasElse = next && ((DEFS[next.type] && DEFS[next.type].action) || next.type) === 'else';
      if (condition) {
        await executeStack(block.children, token, ctx);
        if (hasElse) index++;
      } else if (hasElse) {
        await executeStack(next.children, token, ctx);
        index++;
      }
    } else if (action === 'else') {
      await executeStack(block.children, token, ctx);
    } else {
      await executeBlock(block, token, ctx);
    }

    if (el) el.classList.remove('is-active');
    if (token !== state.token) return false;
  }
  return true;
}

async function executeBlock(block, token, ctx) {
  const def = DEFS[block.type] || {};
  const action = def.action || block.type;
  const size = stageSize();
  const vars = ctx.vars;

  switch (action) {
    case 'event':
    case 'start':
      await sleep(140, token);
      break;

    case 'signal':
      break;

    case 'broadcast':
      await dispatchSignal(String(block.params.message || ''), token, ctx);
      break;

    case 'define':
      break;

    case 'repeat': {
      const times = clamp(Math.floor(evalNumber(block.params.times, vars)), 0, 10000);
      for (let i = 0; i < times; i++) {
        if (token !== state.token) return;
        if (!await executeStack(block.children, token, ctx)) return;
      }
      break;
    }

    case 'forever': {
      while (token === state.token) {
        if (!await executeStack(block.children, token, ctx)) return;
        if (!block.children || !block.children.length) await sleep(16, token);
        await sleep(0, token);
      }
      break;
    }

    case 'call': {
      const name = String(block.params.name || '').trim();
      const script = findFunctionScript(name);
      if (!script) {
        showToast('No function named "' + (name || 'unnamed') + '".');
        await sleep(300, token);
        break;
      }
      if (ctx.depth >= MAX_CALL_DEPTH) {
        showToast('Too many nested function calls.');
        await sleep(300, token);
        break;
      }
      const nextCtx = { vars: vars, depth: ctx.depth + 1, spriteId: ctx.spriteId };
      await executeStack(script.slice(1), token, nextCtx);
      break;
    }

    case 'move': {
      const steps = evalNumber(block.params.steps, vars);
      const radians = (state.heading * Math.PI) / 180;
      state.x = clamp(state.x + Math.cos(radians) * steps * 1.6, PAD, size.w - PAD);
      state.y = clamp(state.y + Math.sin(radians) * steps * 1.6, PAD, size.h - PAD);
      rocketEl.classList.add('is-burning');
      updateSprite();
      await sleep(380, token);
      rocketEl.classList.remove('is-burning');
      break;
    }

    case 'turn': {
      const degrees = evalNumber(block.params.deg, vars);
      state.heading += degrees;
      updateSprite();
      await sleep(330, token);
      break;
    }

    case 'goto': {
      state.x = size.w / 2;
      state.y = size.h / 2;
      state.heading = 0;
      state.size = 100;
      state.visible = true;
      spriteVisibilityById[state.spriteId] = true;
      updateSprite();
      await sleep(360, token);
      break;
    }

    case 'stop':
      stopProgram();
      break;

    case 'setvar':
    case 'changevar': {
      const name = variableName(block.params.name);
      const value = evalNumber(block.params.value, vars);
      if (action === 'setvar') vars[name] = value;
      else vars[name] = (Number(vars[name]) || 0) + value;
      renderMonitorPanel(vars);
      await sleep(80, token);
      break;
    }

    case 'listadd':
    case 'listdelete':
    case 'listinsert':
    case 'listreplace': {
      const list = vars.__lists[block.params.list];
      if (!list) break;
      const index = Math.floor(evalNumber(block.params.index, vars)) - 1;
      const item = String(block.params.item == null ? '' : block.params.item);
      if (action === 'listadd') list.push(item);
      if (action === 'listdelete' && index >= 0 && index < list.length) list.splice(index, 1);
      if (action === 'listinsert') list.splice(clamp(index, 0, list.length), 0, item);
      if (action === 'listreplace' && index >= 0 && index < list.length) list[index] = item;
      renderMonitorPanel(vars);
      await sleep(80, token);
      break;
    }

    case 'switchsprite': {
      const spriteId = String(block.params.sprite || '');
      applySpriteById(spriteId, false);
      ctx.spriteId = spriteId;
      updateSprite();
      await sleep(220, token);
      break;
    }

    case 'switchbg': {
      applyBackgroundById(String(block.params.background || ''), false);
      await sleep(220, token);
      break;
    }

    case 'show':
      state.visible = true;
      spriteVisibilityById[state.spriteId] = true;
      updateSprite();
      await sleep(160, token);
      break;

    case 'hide':
      state.visible = false;
      spriteVisibilityById[state.spriteId] = false;
      updateSprite();
      await sleep(160, token);
      break;

    case 'setsize':
      state.size = clamp(evalNumber(block.params.size, vars), 10, 400);
      updateSprite();
      await sleep(160, token);
      break;

    case 'gotoxy': {
      const point = stagePointToPixels(
        evalNumber(block.params.x, vars),
        evalNumber(block.params.y, vars)
      );
      state.x = point.x;
      state.y = point.y;
      updateSprite();
      await sleep(320, token);
      break;
    }

    case 'glide': {
      const secs = clamp(evalNumber(block.params.secs, vars), 0, 10);
      const point = stagePointToPixels(
        evalNumber(block.params.x, vars),
        evalNumber(block.params.y, vars)
      );
      const startX = state.x;
      const startY = state.y;
      const steps = Math.max(1, Math.round(secs * 30));
      if (secs <= 0) {
        state.x = point.x;
        state.y = point.y;
        updateSprite();
        break;
      }
      for (let i = 1; i <= steps; i++) {
        if (token !== state.token) return;
        if (ctx.spriteId && state.spriteId !== ctx.spriteId) activateRuntimeSprite(ctx.spriteId);
        const t = i / steps;
        state.x = startX + (point.x - startX) * t;
        state.y = startY + (point.y - startY) * t;
        updateSprite();
        await sleep((secs * 1000) / steps, token);
      }
      break;
    }

    case 'changex': {
      const dx = evalNumber(block.params.dx, vars);
      state.x = clamp(state.x + dx, PAD, size.w - PAD);
      updateSprite();
      await sleep(220, token);
      break;
    }

    case 'changey': {
      const dy = evalNumber(block.params.dy, vars);
      state.y = clamp(state.y - dy, PAD, size.h - PAD);
      updateSprite();
      await sleep(220, token);
      break;
    }

    case 'point': {
      state.heading = evalNumber(block.params.deg, vars);
      updateSprite();
      await sleep(220, token);
      break;
    }

    case 'say': {
      const text = String(block.params.text == null ? '' : block.params.text).slice(0, 80) || 'Hello from BlockCode';
      const secs = clamp(evalNumber(block.params.secs, vars), 0, 10);
      showBubble(text);
      await sleep(secs * 1000, token);
      if (token === state.token) hideBubble();
      break;
    }

    case 'speak': {
      const text = String(block.params.text == null ? '' : block.params.text).slice(0, 200);
      await speakText(text, token);
      break;
    }

    case 'tone': {
      await playTone(
        evalNumber(block.params.hz, vars),
        evalNumber(block.params.secs, vars),
        token
      );
      break;
    }

    case 'stopsounds':
      stopAllAudio();
      await sleep(120, token);
      break;

    case 'wait': {
      const secs = clamp(evalNumber(block.params.secs, vars), 0, 10);
      await sleep(secs * 1000, token);
      break;
    }

    default:
      showToast('No action is registered for "' + action + '".');
      await sleep(300, token);
  }
}

async function dispatchSignal(message, token, ctx) {
  const spriteIds = new Set(Object.keys(workspaceBySprite || {}));
  if (activeWorkspaceSpriteId) spriteIds.add(activeWorkspaceSpriteId);

  for (const spriteId of spriteIds) {
    const scripts = (workspaceBySprite[spriteId] || []).filter((script) => {
      const hat = script[0];
      return hat && (DEFS[hat.type] && DEFS[hat.type].action) === 'signal' &&
        String(hat.params.message || '') === message;
    });
    for (const script of scripts) {
      if (token !== state.token) return;
      const previousSpriteId = state.spriteId;
      const previousContextSpriteId = ctx.spriteId;
      ctx.spriteId = spriteId;
      activateRuntimeSprite(spriteId);
      try {
        await executeStack(script.slice(1), token, ctx);
      } finally {
        saveRuntimeSpriteState(state.spriteId);
        ctx.spriteId = previousContextSpriteId;
        activateRuntimeSprite(previousSpriteId);
      }
    }
  }
}

function saveRuntimeSpriteState(spriteId) {
  if (!spriteId) return;
  const size = stageSize();
  spritePreviewPositions[spriteId] = {
    x: clamp(state.x / size.w * 100, 5, 95),
    y: clamp(state.y / size.h * 100, 5, 95)
  };
  spriteVisibilityById[spriteId] = state.visible;
  runtimeSpriteStates[spriteId] = {
    x: state.x,
    y: state.y,
    heading: state.heading,
    size: state.size,
    visible: state.visible
  };
}

function activateRuntimeSprite(spriteId) {
  if (!spriteId || !allSprites().some((sprite) => sprite.id === spriteId)) return;
  saveRuntimeSpriteState(state.spriteId);
  applySpriteById(spriteId, false);
  let spriteState = runtimeSpriteStates[spriteId];
  if (!spriteState) {
    const position = spritePreviewPositions[spriteId] || defaultSpritePreviewPosition(spriteId);
    const size = stageSize();
    spriteState = {
      x: size.w * position.x / 100,
      y: size.h * position.y / 100,
      heading: 0,
      size: 100,
      visible: spriteVisibilityById[spriteId] !== false
    };
    runtimeSpriteStates[spriteId] = spriteState;
  }
  state.x = spriteState.x;
  state.y = spriteState.y;
  state.heading = spriteState.heading;
  state.size = spriteState.size;
  state.visible = spriteState.visible;
  updateSprite();
}

async function runSpriteClickScripts() {
  const scripts = workspace.filter((script) => script.length > 0 && isClickHat(script[0]));
  if (!scripts.length) return;

  const wasRunning = state.running;
  const token = wasRunning ? state.token : ++state.token;
  const ctx = activeRuntimeContext || { vars: createRuntimeVariables(), depth: 0 };
  activeRuntimeContext = ctx;

  if (!wasRunning) {
    renderMonitorPanel(ctx.vars);
    setRunning(true);
    hideBubble();
  }

  try {
    for (const script of scripts) {
      if (token !== state.token) return;
      await executeStack(script, token, ctx);
    }
  } finally {
    if (!wasRunning && token === state.token) {
      setRunning(false);
      clearActive();
    }
  }
}

rocketEl.addEventListener('click', runSpriteClickScripts);
