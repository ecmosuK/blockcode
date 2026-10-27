(function () {
  'use strict';

  const PACK = window.BLOCK_PACK;

  if (!PACK || !Array.isArray(PACK.blocks)) {
    console.error('BlockCode: assets/block-pack.js is missing or invalid.');
    return;
  }

  const CATEGORIES = PACK.categories || {};
  const DEFS = {};
  PACK.blocks.forEach((def) => {
    if (def && def.type) DEFS[def.type] = def;
  });

  const PAD = 40;
  const sleepers = new Set();

  let uid = 0;
  let drag = null;
  let toastTimer = null;

  const state = { running: false, token: 0, x: 0, y: 0, heading: 0 };

  const $ = (id) => document.getElementById(id);
  const paletteEl = $('palette');
  const scriptsEl = $('scripts');
  const canvasEl = $('canvas');
  const emptyEl = $('empty');
  const hintEl = $('hint');
  const toastEl = $('toast');
  const dropLine = $('dropLine');
  const stageEl = $('stage');
  const spriteEl = $('sprite');
  const rocketEl = $('rocket');
  const spriteImg = $('spriteImg');
  const spritePick = $('spritePick');
  const bubbleEl = $('bubble');
  const posEl = $('posLabel');
  const runBtn = $('runBtn');
  const stopBtn = $('stopBtn');
  const resetBtn = $('resetBtn');
  const clearBtn = $('clearBtn');
  const layoutEl = $('layout');
  const codeStatusEl = $('codeStatus');
  const arduinoCodeEl = $('arduinoCode');
  const copyCodeBtn = $('copyCodeBtn');
  const downloadCodeBtn = $('downloadCodeBtn');

  const tabEls = Array.prototype.slice.call(document.querySelectorAll('.tabs .tab'));
  const viewEls = Array.prototype.slice.call(document.querySelectorAll('[data-view-panel]'));
  const splitterEls = Array.prototype.slice.call(document.querySelectorAll('.splitter'));
  const panelEls = {};
  document.querySelectorAll('[data-panel]').forEach((panel) => {
    panelEls[panel.dataset.panel] = panel;
  });

  const LAYOUT_KEY = 'blockcode.layout.v1';
  const PANEL_LABELS = { toolbox: 'Blocks', workspace: 'Workspace', code: 'Code', stage: 'Stage' };
  const DEFAULT_SIZE = { toolbox: 300, stage: 348 };
  let layoutState = {
    toolbox: DEFAULT_SIZE.toolbox,
    stage: DEFAULT_SIZE.stage,
    collapsed: { toolbox: false, workspace: false, code: false, stage: false }
  };
  let stageCache = { w: 0, h: 0 };
  let stageObserver = null;

  function makeBlock(type, params) {
    const def = DEFS[type];
    if (!def) {
      console.warn('BlockCode: unknown block type "' + type + '" in asset pack.');
      return null;
    }

    const base = {};
    Object.keys(def.fields || {}).forEach((key) => {
      base[key] = def.fields[key];
    });

    return {
      id: 'blk-' + (++uid),
      type: type,
      params: Object.assign(base, params || {})
    };
  }

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const toNum = (value, fallback, limit) => {
    const n = parseFloat(value);
    if (!Number.isFinite(n)) return fallback;
    return clamp(n, -(limit || 9999), limit || 9999);
  };

  /* ---------- View layout ---------- */

  function loadLayoutState() {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(LAYOUT_KEY) || 'null');
    } catch (error) {
      saved = null;
    }

    const savedToolbox = saved && saved.toolbox != null ? Number(saved.toolbox) : NaN;
    const savedStage = saved && saved.stage != null ? Number(saved.stage) : NaN;
    const collapsed = (saved && saved.collapsed) || {};

    layoutState = {
      toolbox: Number.isFinite(savedToolbox) ? clamp(savedToolbox, 200, 720) : DEFAULT_SIZE.toolbox,
      stage: Number.isFinite(savedStage) ? clamp(savedStage, 260, 760) : DEFAULT_SIZE.stage,
      collapsed: {
        toolbox: !!collapsed.toolbox,
        workspace: !!collapsed.workspace,
        code: !!collapsed.code,
        stage: !!collapsed.stage
      }
    };
  }

  function saveLayoutState() {
    try {
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(layoutState));
    } catch (error) {
      /* Storage can be unavailable on some file:// setups. */
    }
  }

  function layoutContentWidth() {
    const styles = getComputedStyle(layoutEl);
    const paddingLeft = parseFloat(styles.paddingLeft) || 0;
    const paddingRight = parseFloat(styles.paddingRight) || 0;
    return layoutEl.clientWidth - paddingLeft - paddingRight;
  }

  function panelMinWidth(key) {
    return key === 'toolbox' ? 200 : 260;
  }

  function maxPanelWidth(key) {
    const otherKey = key === 'toolbox' ? 'stage' : 'toolbox';
    const contentWidth = layoutContentWidth();
    if (contentWidth <= 0) return DEFAULT_SIZE[key];
    return Math.max(
      panelMinWidth(key),
      contentWidth - layoutState[otherKey] - 28 - 360
    );
  }

  function setPanelSize(key, width, persist) {
    if (key !== 'toolbox' && key !== 'stage') return;
    const next = Math.round(clamp(width, panelMinWidth(key), maxPanelWidth(key)));
    layoutState[key] = next;
    layoutEl.style.setProperty(key === 'toolbox' ? '--toolbox-w' : '--stage-w', next + 'px');
    if (persist) saveLayoutState();
  }

  function updateSplitterState() {
    splitterEls.forEach((splitter) => {
      const key = splitter.dataset.split;
      const disabled = !!layoutState.collapsed[key] || !!layoutState.collapsed.workspace;
      splitter.classList.toggle('is-disabled', disabled);
      splitter.setAttribute('aria-disabled', String(disabled));
      splitter.tabIndex = disabled ? -1 : 0;
    });
  }

  function setPanelCollapsed(key, collapsed, persist) {
    const panel = panelEls[key];
    if (!panel) return;

    panel.classList.toggle('is-collapsed', collapsed);
    layoutState.collapsed[key] = collapsed;

    const button = panel.querySelector('.panel-toggle');
    if (button) {
      const label = PANEL_LABELS[key] || key;
      button.textContent = collapsed ? '+' : '−';
      button.setAttribute('aria-expanded', String(!collapsed));
      button.setAttribute('aria-label', (collapsed ? 'Expand ' : 'Collapse ') + label + ' panel');
      button.title = (collapsed ? 'Expand ' : 'Collapse ') + label + ' panel';
    }

    updateSplitterState();

    if (persist) {
      saveLayoutState();
      scheduleStageSync();
    }
  }

  function applyLayoutState() {
    setPanelSize('toolbox', layoutState.toolbox, false);
    setPanelSize('stage', layoutState.stage, false);
    Object.keys(PANEL_LABELS).forEach((key) => {
      setPanelCollapsed(key, layoutState.collapsed[key], false);
    });
  }

  function normalizeLayoutSizes() {
    if (window.innerWidth <= 1180 || layoutEl.clientWidth <= 0) return;
    setPanelSize('toolbox', layoutState.toolbox, false);
    setPanelSize('stage', layoutState.stage, false);
    saveLayoutState();
  }

  let stageSyncFrame = 0;

  function scheduleStageSync() {
    if (stageSyncFrame) return;
    stageSyncFrame = requestAnimationFrame(() => {
      stageSyncFrame = 0;
      syncStageGeometry();
    });
  }

  function syncStageGeometry() {
    const w = stageEl.clientWidth;
    const h = stageEl.clientHeight;
    if (w <= 0 || h <= 0) return;

    stageCache = { w: w, h: h };
    state.x = clamp(state.x, PAD, w - PAD);
    state.y = clamp(state.y, PAD, h - PAD);
    updateSprite();
  }

  function startResize(event, splitter) {
    if (event.button !== undefined && event.button !== 0) return;

    const key = splitter.dataset.split;
    if (!key || window.innerWidth <= 1180) return;
    if (layoutState.collapsed[key] || layoutState.collapsed.workspace) return;

    event.preventDefault();

    const startX = event.clientX;
    const startWidth = panelEls[key] ? panelEls[key].getBoundingClientRect().width : layoutState[key];
    const sign = key === 'toolbox' ? 1 : -1;

    splitter.classList.add('is-active');
    document.body.classList.add('is-resizing');

    try {
      splitter.setPointerCapture(event.pointerId);
    } catch (error) {
      /* Synthetic pointer events may not support capture. */
    }

    const onMove = (moveEvent) => {
      if (moveEvent.pointerId !== undefined && event.pointerId !== undefined &&
          moveEvent.pointerId !== event.pointerId) return;
      setPanelSize(key, startWidth + sign * (moveEvent.clientX - startX), false);
      scheduleStageSync();
    };

    const finish = (upEvent) => {
      if (upEvent && upEvent.pointerId !== undefined && event.pointerId !== undefined &&
          upEvent.pointerId !== event.pointerId) return;

      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);

      splitter.classList.remove('is-active');
      document.body.classList.remove('is-resizing');

      try {
        if (splitter.hasPointerCapture(event.pointerId)) {
          splitter.releasePointerCapture(event.pointerId);
        }
      } catch (error) {
        /* Ignore capture cleanup failures. */
      }

      saveLayoutState();
      syncStageGeometry();
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
  }

  function nudgePanel(key, delta) {
    if (layoutState.collapsed[key] || layoutState.collapsed.workspace) return;
    setPanelSize(key, layoutState[key] + delta, true);
    syncStageGeometry();
  }

  function setView(name, focusTab) {
    tabEls.forEach((tab) => {
      const active = tab.dataset.view === name;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active && focusTab) tab.focus();
    });

    viewEls.forEach((view) => {
      const active = view.dataset.viewPanel === name;
      view.classList.toggle('is-active', active);
      view.hidden = !active;
    });

    if (name === 'arduino') {
      renderArduino();
    } else {
      normalizeLayoutSizes();
    }

    scheduleStageSync();
  }

  /* ---------- Block rendering ---------- */

  function renderBlock(block, scriptIndex, blockIndex, opts) {
    opts = opts || {};
    const def = DEFS[block.type];
    if (!def) return null;

    const palette = !!opts.palette;
    const el = document.createElement('div');

    el.className = 'block';
    el.dataset.id = block.id;
    el.dataset.type = block.type;
    el.style.width = def.width + 'px';
    el.style.height = def.height + 'px';
    if (!palette) {
      el.dataset.script = scriptIndex;
      el.dataset.index = blockIndex;
    }

    const img = document.createElement('img');
    img.className = 'block-img';
    img.src = def.sprite;
    img.alt = def.label || block.type;
    img.draggable = false;
    el.appendChild(img);

    (def.slots || []).forEach((slot) => {
      const type = slot.type === 'text' ? 'text' : 'number';
      const input = document.createElement('input');
      input.className = 'block-slot' + (type === 'text' ? ' text' : '');
      input.type = type;
      input.style.left = slot.x + 'px';
      input.style.top = slot.y + 'px';
      input.style.width = slot.w + 'px';
      input.style.height = slot.h + 'px';
      if (type === 'number') {
        if (slot.min != null) input.min = slot.min;
        if (slot.max != null) input.max = slot.max;
        if (slot.step != null) input.step = slot.step;
      }
      input.value = block.params[slot.field] != null ? block.params[slot.field] : '';
      input.setAttribute('aria-label', slot.label || slot.field || 'value');
      if (type === 'text') input.spellcheck = false;
      if (palette) {
        input.readOnly = true;
        input.tabIndex = -1;
      }
      input.addEventListener('pointerdown', (event) => event.stopPropagation());
      input.addEventListener('input', () => {
        block.params[slot.field] = input.value;
        renderArduino();
      });
      el.appendChild(input);
    });

    return el;
  }

  function renderPalette() {
    paletteEl.innerHTML = '';

    (PACK.palette || []).forEach((categoryKey) => {
      const items = PACK.blocks.filter((def) => def.category === categoryKey);
      if (!items.length) return;

      const category = CATEGORIES[categoryKey] || {};
      const wrap = document.createElement('div');
      wrap.className = 'palette-group';

      const title = document.createElement('div');
      title.className = 'palette-title';
      title.textContent = category.title || categoryKey;
      wrap.appendChild(title);

      items.forEach((def) => {
        const template = makeBlock(def.type);
        if (!template) return;
        const el = renderBlock(template, -1, -1, { palette: true });
        if (!el) return;
        el.addEventListener('pointerdown', (event) => {
          startDrag(event, makeBlock(template.type, template.params), null, el);
        });
        wrap.appendChild(el);
      });

      paletteEl.appendChild(wrap);
    });
  }

  function renderWorkspace() {
    scriptsEl.innerHTML = '';

    workspace.forEach((script, scriptIndex) => {
      if (!script.length) return;
      const column = document.createElement('div');
      column.className = 'script';
      column.dataset.script = scriptIndex;
      script.forEach((block, blockIndex) => {
        const el = renderBlock(block, scriptIndex, blockIndex);
        if (el) column.appendChild(el);
      });
      scriptsEl.appendChild(column);
    });

    const isEmpty = workspace.length === 0;
    emptyEl.classList.toggle('is-hidden', !isEmpty);
    hintEl.textContent = isEmpty
      ? 'Snap blocks under the hat block'
      : 'Drag to arrange · drop in empty space for a new stack';

    renderArduino();
  }

  /* ---------- Stage sprites ---------- */

  function initSprites() {
    const config = PACK.sprites || {};
    const sprites = Array.isArray(config.list) ? config.list : [];
    if (!sprites.length) return;

    const active = sprites.find((sprite) => sprite.id === config.active) || sprites[0];

    const apply = (sprite) => {
      spriteImg.src = sprite.src;
      spriteImg.alt = sprite.name || 'Stage sprite';
    };

    apply(active);

    if (sprites.length < 2) {
      spritePick.hidden = true;
      return;
    }

    spritePick.innerHTML = '';
    sprites.forEach((sprite) => {
      const option = document.createElement('option');
      option.value = sprite.id;
      option.textContent = sprite.name || sprite.id;
      spritePick.appendChild(option);
    });
    spritePick.value = active.id;

    spritePick.addEventListener('change', () => {
      const next = sprites.find((sprite) => sprite.id === spritePick.value);
      if (next) apply(next);
    });
  }

  /* ---------- Dragging ---------- */

  function startDrag(event, block, from, sourceEl) {
    if (!block) return;
    if (event.button !== undefined && event.button !== 0) return;
    if (event.target.closest('input')) return;

    if (state.running) {
      showToast('Stop the program before editing.');
      return;
    }

    event.preventDefault();

    const rect = sourceEl.getBoundingClientRect();
    const ghost = sourceEl.cloneNode(true);
    ghost.classList.add('is-ghost');
    ghost.classList.remove('is-dragging');
    ghost.style.width = rect.width + 'px';
    ghost.style.left = rect.left + 'px';
    ghost.style.top = rect.top + 'px';
    document.body.appendChild(ghost);

    if (from) sourceEl.classList.add('is-dragging');

    drag = {
      block: block,
      from: from,
      sourceEl: sourceEl,
      ghost: ghost,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      target: null,
      inside: false
    };

    document.body.classList.add('is-dragging');
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }

  function onPointerMove(event) {
    if (!drag) return;

    if (!drag.moved) {
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 4) return;
      drag.moved = true;
      emptyEl.classList.add('is-hidden');
    }

    drag.ghost.style.left = (event.clientX - drag.offsetX) + 'px';
    drag.ghost.style.top = (event.clientY - drag.offsetY) + 'px';
    updateDropTarget(event.clientX, event.clientY);
  }

  function updateDropTarget(x, y) {
    const canvasRect = canvasEl.getBoundingClientRect();
    drag.inside = x >= canvasRect.left && x <= canvasRect.right &&
      y >= canvasRect.top && y <= canvasRect.bottom;

    drag.target = null;
    hideDropLine();

    if (!drag.inside) return;

    const blocks = Array.prototype.slice.call(
      scriptsEl.querySelectorAll('.script .block')
    ).filter((el) => !el.classList.contains('is-dragging'));

    let best = null;
    let bestDistance = Infinity;

    blocks.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (x < rect.left - 80 || x > rect.right + 80) return;

      const si = Number(el.dataset.script);
      const bi = Number(el.dataset.index);
      const isLast = workspace[si] && bi === workspace[si].length - 1;
      const extraBelow = isLast ? 90 : 26;

      if (y < rect.top - 26 || y > rect.bottom + extraBelow) return;

      const midpoint = rect.top + rect.height / 2;
      const before = y < midpoint;
      const distance = Math.abs(y - midpoint);

      if (distance < bestDistance) {
        bestDistance = distance;
        best = {
          si: si,
          index: bi + (before ? 0 : 1),
          left: rect.left,
          top: before ? rect.top - 2 : rect.bottom - 8,
          width: rect.width
        };
      }
    });

    if (best) {
      drag.target = { si: best.si, index: best.index, append: false };
      showDropLine(best.left, best.top, best.width);
    } else {
      drag.target = { append: true };
      showDropLine(x - 80, y, 160);
    }
  }

  function onPointerUp() {
    if (!drag) return;

    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);

    const d = drag;
    drag = null;

    document.body.classList.remove('is-dragging');
    hideDropLine();
    d.ghost.remove();
    d.sourceEl.classList.remove('is-dragging');

    let changed = false;

    if (!d.moved) {
      if (!d.from) {
        workspace.push([d.block]);
        changed = true;
      }
    } else if (d.inside && d.target) {
      if (d.target.append) {
        if (d.from) workspace[d.from.si].splice(d.from.bi, 1);
        workspace.push([d.block]);
      } else {
        let si = d.target.si;
        let index = d.target.index;

        if (d.from) {
          const sameScript = d.from.si === si;
          workspace[d.from.si].splice(d.from.bi, 1);
          if (sameScript && d.from.bi < index) index -= 1;
        }

        if (workspace[si]) workspace[si].splice(index, 0, d.block);
      }
      workspace = workspace.filter((script) => script.length > 0);
      changed = true;
    }

    if (changed) {
      renderWorkspace();
    } else {
      emptyEl.classList.toggle('is-hidden', workspace.length > 0);
    }
  }

  function showDropLine(left, top, width) {
    dropLine.style.display = 'block';
    dropLine.style.left = left + 'px';
    dropLine.style.top = top + 'px';
    dropLine.style.width = Math.max(60, width) + 'px';
  }

  function hideDropLine() {
    dropLine.style.display = 'none';
  }

  /* ---------- Stage ---------- */

  function stageSize() {
    const w = stageEl.clientWidth;
    const h = stageEl.clientHeight;
    if (w > 0 && h > 0) {
      stageCache = { w: w, h: h };
    }
    if (stageCache.w > 0 && stageCache.h > 0) {
      return stageCache;
    }
    return { w: 800, h: 600 };
  }

  function updateSprite() {
    const size = stageSize();
    spriteEl.style.left = state.x + 'px';
    spriteEl.style.top = state.y + 'px';
    rocketEl.style.transform = 'translate(-50%, -50%) rotate(' + state.heading + 'deg)';
    posEl.textContent =
      'x ' + Math.round(state.x - size.w / 2) + ' · y ' + Math.round(size.h / 2 - state.y);
  }

  function resetSprite(animate) {
    const size = stageSize();

    if (!animate) spriteEl.style.transition = 'none';
    state.x = size.w / 2;
    state.y = size.h / 2;
    state.heading = 0;
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

  async function execute(block, token) {
    const def = DEFS[block.type] || {};
    const action = def.action || block.type;
    const size = stageSize();

    switch (action) {
      case 'event':
        await sleep(150, token);
        break;

      case 'move': {
        const steps = toNum(block.params.steps, 50, 1000);
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
        const degrees = toNum(block.params.deg, 90, 3600);
        state.heading += degrees;
        updateSprite();
        await sleep(330, token);
        break;
      }

      case 'goto': {
        state.x = size.w / 2;
        state.y = size.h / 2;
        state.heading = 0;
        updateSprite();
        await sleep(360, token);
        break;
      }

      case 'say': {
        const text = String(block.params.text == null ? '' : block.params.text).slice(0, 80) || '…';
        const secs = clamp(toNum(block.params.secs, 1, 10), 0, 10);
        showBubble(text);
        await sleep(secs * 1000, token);
        if (token === state.token) hideBubble();
        break;
      }

      case 'wait': {
        const secs = clamp(toNum(block.params.secs, 1, 10), 0, 10);
        await sleep(secs * 1000, token);
        break;
      }

      default:
        showToast('No action is registered for "' + action + '".');
        await sleep(300, token);
    }
  }

  /* ---------- Arduino code generation ---------- */

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

  function blockToArduino(block) {
    const def = DEFS[block.type] || {};
    const action = def.action || block.type;

    switch (action) {
      case 'event':
        return ['// when clicked'];

      case 'move': {
        const steps = toNum(block.params.steps, 50, 1000);
        return [
          '// move ' + formatNumber(steps) + ' steps',
          'moveSteps(' + formatNumber(steps) + ');'
        ];
      }

      case 'turn': {
        const deg = toNum(block.params.deg, 90, 3600);
        return [
          '// turn ' + formatNumber(deg) + ' degrees',
          'turnDegrees(' + formatNumber(deg) + ');'
        ];
      }

      case 'goto':
        return ['// go to start', 'goToStart();'];

      case 'say': {
        const text = String(block.params.text == null ? '' : block.params.text).slice(0, 80) || '…';
        const secs = clamp(toNum(block.params.secs, 1, 10), 0, 10);
        return [
          '// say for ' + formatNumber(secs) + ' s',
          'sayFor(' + cppString(text) + ', ' + formatNumber(secs) + ');'
        ];
      }

      case 'wait': {
        const secs = clamp(toNum(block.params.secs, 1, 10), 0, 10);
        const ms = Math.round(secs * 1000);
        return [
          '// wait ' + formatNumber(secs) + ' s',
          'delay(' + ms + ');'
        ];
      }

      default:
        return ['// unsupported block: ' + block.type];
    }
  }

  function generateArduinoCode() {
    const size = stageSize();
    const stageW = Math.max(320, Math.round(size.w));
    const stageH = Math.max(240, Math.round(size.h));
    const lines = [];
    const add = (line) => lines.push(line === undefined ? '' : line);
    const runnable = [];

    add('// Generated by BlockCode');
    add('// Simulated stage. Replace updateSprite() with hardware output if needed.');
    add('');
    add('#include <math.h>');
    add('');
    add('const float STAGE_W = ' + stageW + '.0;');
    add('const float STAGE_H = ' + stageH + '.0;');
    add('const float STAGE_PAD = 40.0;');
    add('');
    add('float spriteX = STAGE_W / 2.0;');
    add('float spriteY = STAGE_H / 2.0;');
    add('float heading = 0.0;');
    add('');
    add('float clampFloat(float value, float low, float high) {');
    add('  if (value < low) return low;');
    add('  if (value > high) return high;');
    add('  return value;');
    add('}');
    add('');
    add('void updateSprite() {');
    add('  // Hook for hardware output. The simulator only updates these variables.');
    add('}');
    add('');
    add('void goToStart() {');
    add('  spriteX = STAGE_W / 2.0;');
    add('  spriteY = STAGE_H / 2.0;');
    add('  heading = 0.0;');
    add('  updateSprite();');
    add('  delay(360); // BlockCode animation timing');
    add('}');
    add('');
    add('void moveSteps(float steps) {');
    add('  float radians = heading * PI / 180.0;');
    add('  spriteX = clampFloat(spriteX + cos(radians) * steps * 1.6, STAGE_PAD, STAGE_W - STAGE_PAD);');
    add('  spriteY = clampFloat(spriteY + sin(radians) * steps * 1.6, STAGE_PAD, STAGE_H - STAGE_PAD);');
    add('  updateSprite();');
    add('  delay(380); // BlockCode animation timing');
    add('}');
    add('');
    add('void turnDegrees(float degrees) {');
    add('  heading += degrees;');
    add('  updateSprite();');
    add('  delay(330); // BlockCode animation timing');
    add('}');
    add('');
    add('void sayFor(const char *text, float seconds) {');
    add('  Serial.println(text);');
    add('  delay((unsigned long)(seconds * 1000.0));');
    add('}');
    add('');

    if (!workspace.length) {
      add('// No blocks yet. Build a stack in Block Code.');
      add('');
    }

    workspace.forEach((script, scriptIndex) => {
      if (!script.length) return;
      const name = 'stack' + (scriptIndex + 1);
      const hat = isHat(script[0]);
      if (hat) runnable.push(name);

      add('// Stack ' + (scriptIndex + 1) + ': ' +
        (hat ? 'runs at program start' : 'not called because it has no hat block'));
      add('void ' + name + '() {');
      script.forEach((block) => {
        blockToArduino(block).forEach((line) => add('  ' + line));
      });
      add('}');
      add('');
    });

    add('void runProgram() {');
    if (runnable.length) {
      runnable.forEach((name) => add('  ' + name + '();'));
    } else {
      add('  // Add a "when clicked" block at the top of a stack to run it.');
    }
    add('}');
    add('');
    add('void setup() {');
    add('  Serial.begin(9600);');
    add('  runProgram();');
    add('}');
    add('');
    add('void loop() {');
    add('  // Runs once from setup(). Add repeating behavior here if needed.');
    add('}');

    return lines.join('\n');
  }

  function renderArduino() {
    if (!arduinoCodeEl) return;

    const code = generateArduinoCode();
    arduinoCodeEl.textContent = code;

    const blockCount = workspace.reduce((total, script) => total + script.length, 0);
    codeStatusEl.textContent = blockCount
      ? blockCount + ' block' + (blockCount === 1 ? '' : 's') +
        ' · ' + code.split('\n').length + ' lines'
      : 'No blocks yet';
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

  async function copyArduinoCode() {
    const text = generateArduinoCode();
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
    showToast(copied ? 'Arduino code copied.' : 'Could not copy the Arduino code.');
  }

  function downloadArduinoCode() {
    const blob = new Blob([generateArduinoCode()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'blockcode.ino';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    showToast('Downloaded blockcode.ino.');
  }

  function setRunning(running) {
    state.running = running;
    runBtn.disabled = running;
    stopBtn.disabled = !running;
    runBtn.classList.toggle('is-running', running);
    runBtn.textContent = running ? '▶ Running…' : '▶ Run';
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
      return script.length > 0 && isHat(script[0]);
    });

    if (!scripts.length) {
      showToast('Add a hat block at the top of a stack to run it.');
      return;
    }

    state.token += 1;
    const token = state.token;

    setRunning(true);
    hideBubble();

    try {
      for (const script of scripts) {
        for (const block of script) {
          if (token !== state.token) return;

          const el = scriptsEl.querySelector('.block[data-id="' + block.id + '"]');
          if (el) el.classList.add('is-active');

          await execute(block, token);

          if (el) el.classList.remove('is-active');
          if (token !== state.token) return;
        }
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

    setRunning(false);
    clearActive();
    rocketEl.classList.remove('is-burning');
    hideBubble();
  }

  /* ---------- Toast ---------- */

  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('is-visible');
    }, 2800);
  }

  /* ---------- View controls ---------- */

  function initPanels() {
    document.querySelectorAll('.panel-toggle').forEach((button) => {
      button.addEventListener('click', () => {
        const key = button.dataset.panelToggle;
        if (!key) return;
        setPanelCollapsed(key, !layoutState.collapsed[key], true);
        syncStageGeometry();
      });
    });

    splitterEls.forEach((splitter) => {
      const key = splitter.dataset.split;
      if (!key) return;

      splitter.addEventListener('pointerdown', (event) => startResize(event, splitter));

      splitter.addEventListener('dblclick', () => {
        if (layoutState.collapsed[key] || layoutState.collapsed.workspace) return;
        setPanelSize(key, DEFAULT_SIZE[key], true);
        syncStageGeometry();
      });

      splitter.addEventListener('keydown', (event) => {
        if (layoutState.collapsed[key] || layoutState.collapsed.workspace) return;

        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          const direction = event.key === 'ArrowRight' ? 20 : -20;
          nudgePanel(key, key === 'toolbox' ? direction : -direction);
          event.preventDefault();
        } else if (event.key === 'Home') {
          setPanelSize(key, panelMinWidth(key), true);
          syncStageGeometry();
          event.preventDefault();
        } else if (event.key === 'End') {
          setPanelSize(key, maxPanelWidth(key), true);
          syncStageGeometry();
          event.preventDefault();
        }
      });
    });
  }

  function initTabs() {
    tabEls.forEach((tab) => {
      tab.addEventListener('click', () => setView(tab.dataset.view));
    });

    const tabsEl = document.querySelector('.tabs');
    if (tabsEl) {
      tabsEl.addEventListener('keydown', (event) => {
        const current = tabEls.indexOf(document.activeElement);
        if (current < 0) return;

        let next = null;
        if (event.key === 'ArrowRight') next = (current + 1) % tabEls.length;
        if (event.key === 'ArrowLeft') next = (current - 1 + tabEls.length) % tabEls.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = tabEls.length - 1;
        if (next === null) return;

        event.preventDefault();
        setView(tabEls[next].dataset.view, true);
      });
    }
  }

  function initStageObserver() {
    if (typeof ResizeObserver !== 'function') return;
    const observer = new ResizeObserver(() => syncStageGeometry());
    observer.observe(stageEl);
    stageObserver = observer;
  }

  /* ---------- Events ---------- */

  scriptsEl.addEventListener('pointerdown', (event) => {
    const el = event.target.closest('.block');
    if (!el) return;
    if (event.target.closest('input')) return;
    if (event.button !== undefined && event.button !== 0) return;

    const scriptIndex = Number(el.dataset.script);
    const blockIndex = Number(el.dataset.index);
    const block = workspace[scriptIndex] && workspace[scriptIndex][blockIndex];
    if (!block) return;

    startDrag(event, block, { si: scriptIndex, bi: blockIndex }, el);
  });

  runBtn.addEventListener('click', runProgram);
  stopBtn.addEventListener('click', stopProgram);
  resetBtn.addEventListener('click', () => resetSprite(true));
  clearBtn.addEventListener('click', () => {
    stopProgram();
    workspace = [];
    renderWorkspace();
    resetSprite(true);
    showToast('Workspace cleared.');
  });

  copyCodeBtn.addEventListener('click', copyArduinoCode);
  downloadCodeBtn.addEventListener('click', downloadArduinoCode);

  window.addEventListener('resize', () => {
    normalizeLayoutSizes();
    syncStageGeometry();
  });

  /* ---------- Boot ---------- */

  const initialScript = [
    makeBlock('event'),
    makeBlock('goto'),
    makeBlock('move', { steps: 60 }),
    makeBlock('turn', { deg: 90 }),
    makeBlock('say', { text: 'Hello, NASA!', secs: 1.2 }),
    makeBlock('wait', { secs: 0.4 })
  ].filter(Boolean);

  let workspace = initialScript.length ? [initialScript] : [];

  loadLayoutState();
  applyLayoutState();

  initSprites();
  renderPalette();
  renderWorkspace();
  setRunning(false);
  resetSprite(false);

  initPanels();
  initTabs();
  initStageObserver();
  syncStageGeometry();
})();
