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
  const SNAP_DISTANCE = 30;
  const SNAP_LEFT = 64;
  const STACK_OVERLAP = 6.5;
  const sleepers = new Set();

  let uid = 0;
  let drag = null;
  let toastTimer = null;
  let lastBlockClick = null;
  let suppressCanvasClickUntil = 0;
  let isolatedBlockId = null;
  const selectedBlockIds = new Set();
  const DOUBLE_CLICK_MS = 500;

  const state = { running: false, token: 0, x: 0, y: 0, heading: 0 };

  const $ = (id) => document.getElementById(id);
  const toolboxEl = $('panelToolbox');
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
  const watchCodeEl = $('watchCode');
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

  const snapToDevicePixel = (value) => {
    const ratio = window.devicePixelRatio || 1;
    return Math.round(value * ratio) / ratio;
  };

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

    normalizeLayoutSizes();
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
    if (!palette && selectedBlockIds.has(block.id)) {
      el.classList.add('is-selected');
    }
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
        renderWatchCpp(block.id);
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

  function updateSelectionClasses() {
    scriptsEl.querySelectorAll('.block').forEach((el) => {
      el.classList.toggle('is-selected', selectedBlockIds.has(el.dataset.id));
    });
  }

  function selectBlockRange(scriptIndex, blockIndex) {
    const script = workspace[scriptIndex] || [];

    isolatedBlockId = null;
    selectedBlockIds.clear();
    script.slice(blockIndex).forEach((block) => selectedBlockIds.add(block.id));
    updateSelectionClasses();
  }

  function selectBlockOnly(block) {
    isolatedBlockId = block ? block.id : null;
    selectedBlockIds.clear();
    if (block) selectedBlockIds.add(block.id);
    updateSelectionClasses();
  }

  function clearSelection() {
    isolatedBlockId = null;
    selectedBlockIds.clear();
    lastBlockClick = null;
    updateSelectionClasses();
  }

  function isOverPalette(x, y) {
    const rect = toolboxEl.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }

  function deleteSelectedBlocks() {
    if (!selectedBlockIds.size) return false;

    let removed = 0;
    workspace = workspace.map((script) => {
      const next = script.filter((block) => {
        if (!selectedBlockIds.has(block.id)) return true;
        removed += 1;
        return false;
      });
      next.x = script.x;
      next.y = script.y;
      return next;
    }).filter((script) => script.length > 0);

    const focusBlockId = selectedBlockIds.values().next().value || null;
    isolatedBlockId = null;
    selectedBlockIds.clear();
    lastBlockClick = null;

    if (!removed) return false;

    renderWorkspace(focusBlockId);
    showToast(removed + (removed === 1 ? ' block deleted.' : ' blocks deleted.'));
    return true;
  }

  function dragGroupAt(scriptIndex, blockIndex) {
    const script = workspace[scriptIndex] || [];
    const block = script[blockIndex];

    if (!block) return null;
    if (isolatedBlockId === block.id) {
      return { start: blockIndex, blocks: [block], isolated: true };
    }

    return { start: blockIndex, blocks: script.slice(blockIndex), isolated: false };
  }

  function makeScript(blocks, x, y) {
    const script = blocks.slice();
    script.x = x;
    script.y = y;
    return script;
  }

  function snapScriptPosition(x, y) {
    const rect = scriptsEl.getBoundingClientRect();
    return {
      x: snapToDevicePixel(rect.left + x) - rect.left,
      y: snapToDevicePixel(rect.top + y) - rect.top
    };
  }

  function defaultScriptPosition() {
    const offset = 24 + (workspace.length % 5) * 20;
    return snapScriptPosition(offset, offset);
  }

  function freeDropPosition(d) {
    const rect = scriptsEl.getBoundingClientRect();
    const width = d.groupRect.right - d.groupRect.left;
    const height = d.groupRect.bottom - d.groupRect.top;
    const maxX = Math.max(0, rect.width - width);
    const maxY = Math.max(0, rect.height - height);
    const pos = snapScriptPosition(
      clamp(d.lastX - d.offsetX - rect.left, 0, maxX),
      clamp(d.lastY - d.offsetY - rect.top, 0, maxY)
    );
    return {
      x: clamp(pos.x, 0, maxX),
      y: clamp(pos.y, 0, maxY)
    };
  }

  function renderWorkspace(focusBlockId) {
    scriptsEl.innerHTML = '';

    workspace.forEach((script, scriptIndex) => {
      if (!script.length) return;
      const column = document.createElement('div');
      column.className = 'script';
      column.dataset.script = scriptIndex;
      const pos = snapScriptPosition(
        Number.isFinite(script.x) ? script.x : 24,
        Number.isFinite(script.y) ? script.y : 24
      );
      column.style.left = pos.x + 'px';
      column.style.top = pos.y + 'px';
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
      : 'Drag freely. Snap matching edges to connect stacks.';

    renderWatchCpp(focusBlockId);
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

  function startDrag(event, block, from, sourceEl, group) {
    if (!block) return;
    if (event.button !== undefined && event.button !== 0) return;
    if (event.target.closest('input')) return;

    if (state.running) {
      showToast('Stop the program before editing.');
      return;
    }

    event.preventDefault();

    const dragBlocks = group ? group.blocks : [block];
    const sourceEls = dragBlocks.map((item) => {
      return scriptsEl.querySelector('.block[data-id="' + item.id + '"]');
    }).filter(Boolean);

    if (!sourceEls.length) sourceEls.push(sourceEl);

    const rects = sourceEls.map((el) => el.getBoundingClientRect());
    const left = Math.min.apply(null, rects.map((rect) => rect.left));
    const top = Math.min.apply(null, rects.map((rect) => rect.top));
    const right = Math.max.apply(null, rects.map((rect) => rect.right));
    const bottom = Math.max.apply(null, rects.map((rect) => rect.bottom));

    let ghost = null;
    if (dragBlocks.length > 1) {
      ghost = document.createElement('div');
      ghost.className = 'drag-ghost';
      ghost.style.width = (right - left) + 'px';
      sourceEls.forEach((el) => {
        const clone = el.cloneNode(true);
        clone.classList.remove('is-dragging', 'is-selected');
        ghost.appendChild(clone);
      });
    } else {
      ghost = sourceEl.cloneNode(true);
      ghost.classList.add('is-ghost');
      ghost.classList.remove('is-dragging', 'is-selected');
      ghost.style.width = (right - left) + 'px';
    }

    ghost.style.left = left + 'px';
    ghost.style.top = top + 'px';
    document.body.appendChild(ghost);

    if (from) sourceEls.forEach((el) => el.classList.add('is-dragging'));

    drag = {
      block: block,
      from: from,
      sourceEl: sourceEl,
      sourceEls: sourceEls,
      ghost: ghost,
      groupBlocks: group ? group.blocks : null,
      isolated: Boolean(group && group.isolated),
      groupRect: { left: left, top: top, right: right, bottom: bottom },
      offsetX: event.clientX - left,
      offsetY: event.clientY - top,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      moved: false,
      target: null,
      inside: false,
      previewHidden: [],
      previewShifted: [],
      previewEl: null
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

      if (drag.from) {
        if (drag.isolated) {
          selectBlockOnly(drag.block);
        } else {
          selectBlockRange(drag.from.si, drag.from.bi);
        }
      }
    }

    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    drag.ghost.style.left = (event.clientX - drag.offsetX) + 'px';
    drag.ghost.style.top = (event.clientY - drag.offsetY) + 'px';

    const overPalette = Boolean(drag.from) && isOverPalette(event.clientX, event.clientY);
    toolboxEl.classList.toggle('is-delete-target', overPalette);

    updateDropTarget(event.clientX, event.clientY);
  }

  function ensurePreviewEl() {
    if (drag.previewEl) return drag.previewEl;

    const el = document.createElement('div');
    el.className = 'snap-preview';
    el.style.width = (drag.groupRect.right - drag.groupRect.left) + 'px';

    drag.sourceEls.forEach((source) => {
      const clone = source.cloneNode(true);
      clone.classList.remove('is-dragging', 'is-selected', 'is-active');
      clone.removeAttribute('data-script');
      clone.removeAttribute('data-index');
      clone.querySelectorAll('input').forEach((input) => {
        input.readOnly = true;
        input.tabIndex = -1;
      });
      el.appendChild(clone);
    });

    document.body.appendChild(el);
    drag.previewEl = el;
    return el;
  }

  function clearPreview(remove) {
    if (!drag) return;
    (drag.previewHidden || []).forEach((el) => {
      el.style.display = '';
    });
    (drag.previewShifted || []).forEach((el) => {
      el.style.transform = '';
    });
    drag.previewHidden = [];
    drag.previewShifted = [];

    if (drag.previewEl) {
      if (remove) {
        drag.previewEl.remove();
        drag.previewEl = null;
      } else {
        drag.previewEl.style.display = 'none';
      }
    }
  }

  function applyPreview(best) {
    const groupHeight = drag.groupRect.bottom - drag.groupRect.top;
    const push = Math.max(0, groupHeight - STACK_OVERLAP);
    const sameScript = Boolean(drag.from && drag.from.si === best.si);
    const targetEl = best.el;
    const preview = ensurePreviewEl();

    if (sameScript) {
      drag.sourceEls.forEach((el) => {
        if (el.classList.contains('is-dragging')) {
          el.style.display = 'none';
          drag.previewHidden.push(el);
        }
      });
    }

    const rect = targetEl.getBoundingClientRect();
    const previewTop = best.before ? rect.top : rect.bottom - STACK_OVERLAP;
    const shifted = [];

    if (best.before) {
      for (let el = targetEl; el; el = el.nextElementSibling) {
        if (el.classList.contains('block') && !el.classList.contains('is-dragging')) {
          shifted.push(el);
        }
      }
    } else {
      for (let el = targetEl.nextElementSibling; el; el = el.nextElementSibling) {
        if (el.classList.contains('block') && !el.classList.contains('is-dragging')) {
          shifted.push(el);
        }
      }
    }

    shifted.forEach((el) => {
      el.style.transform = 'translateY(' + push + 'px)';
    });

    drag.previewShifted = shifted;
    preview.style.display = 'flex';
    preview.style.left = rect.left + 'px';
    preview.style.top = previewTop + 'px';
  }

  function updateDropTarget(x, y) {
    clearPreview();

    const canvasRect = canvasEl.getBoundingClientRect();
    drag.inside = x >= canvasRect.left && x <= canvasRect.right &&
      y >= canvasRect.top && y <= canvasRect.bottom;

    drag.target = null;
    hideDropLine();

    if (!drag.inside) return;

    const blocks = Array.prototype.slice.call(
      scriptsEl.querySelectorAll('.script .block')
    ).filter((el) => !el.classList.contains('is-dragging'));

    const dx = x - drag.startX;
    const dy = y - drag.startY;
    const groupLeft = drag.groupRect.left + dx;
    const groupTop = drag.groupRect.top + dy;
    const groupBottom = drag.groupRect.bottom + dy;

    let best = null;
    let bestGap = Infinity;

    blocks.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (Math.abs(groupLeft - rect.left) > SNAP_LEFT) return;

      const beforeGap = Math.abs(groupBottom - rect.top);
      const afterGap = Math.abs(groupTop - rect.bottom);
      const before = beforeGap <= afterGap;
      const gap = before ? beforeGap : afterGap;

      if (gap > SNAP_DISTANCE || gap >= bestGap) return;

      const si = Number(el.dataset.script);
      const bi = Number(el.dataset.index);

      bestGap = gap;
      best = {
        si: si,
        index: bi + (before ? 0 : 1),
        before: before,
        el: el
      };
    });

    if (best) {
      drag.target = { si: best.si, index: best.index, append: false };
      applyPreview(best);
    } else {
      drag.target = { append: true };
    }
  }

  function onPointerUp(event) {
    if (!drag) return;

    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);

    clearPreview(true);
    const d = drag;
    drag = null;

    document.body.classList.remove('is-dragging');
    toolboxEl.classList.remove('is-delete-target');
    hideDropLine();
    d.ghost.remove();
    (d.sourceEls || [d.sourceEl]).forEach((el) => el.classList.remove('is-dragging'));

    if (event && event.type === 'pointercancel') return;

    const dragBlocks = d.groupBlocks || [d.block];
    const dragCount = dragBlocks.length;
    const overPalette = Boolean(d.from) && d.moved && isOverPalette(d.lastX, d.lastY);
    const focusBlockId = dragBlocks[0] ? dragBlocks[0].id : null;
    let changed = false;

    if (!d.moved && d.from) {
      const now = performance.now();
      const isDoubleClick = lastBlockClick &&
        lastBlockClick.id === d.block.id &&
        now - lastBlockClick.time <= DOUBLE_CLICK_MS;

      if (isDoubleClick) {
        selectBlockOnly(d.block);
        lastBlockClick = null;
      } else {
        selectBlockRange(d.from.si, d.from.bi);
        lastBlockClick = { id: d.block.id, time: now };
      }
    } else if (d.moved) {
      lastBlockClick = null;
      suppressCanvasClickUntil = performance.now() + 250;
    }

    if (!d.moved) {
      if (!d.from) {
        const pos = defaultScriptPosition();
        workspace.push(makeScript([d.block], pos.x, pos.y));
        changed = true;
      }
    } else if (overPalette) {
      if (workspace[d.from.si]) {
        workspace[d.from.si].splice(d.from.bi, dragCount);
      }
      workspace = workspace.filter((script) => script.length > 0);
      dragBlocks.forEach((block) => selectedBlockIds.delete(block.id));
      if (dragBlocks.some((block) => block.id === isolatedBlockId)) isolatedBlockId = null;

      changed = true;
      showToast(dragCount + (dragCount === 1 ? ' block deleted.' : ' blocks deleted.'));
    } else if (d.inside && d.target) {
      if (d.target.append) {
        const pos = freeDropPosition(d);
        if (d.from && workspace[d.from.si]) {
          workspace[d.from.si].splice(d.from.bi, dragCount);
        }
        workspace.push(makeScript(dragBlocks, pos.x, pos.y));
      } else {
        let si = d.target.si;
        let index = d.target.index;

        if (d.from && workspace[d.from.si]) {
          const sameScript = d.from.si === si;
          workspace[d.from.si].splice(d.from.bi, dragCount);
          if (sameScript && d.from.bi < index) index -= dragCount;
        }

        if (workspace[si]) workspace[si].splice(index, 0, ...dragBlocks);
      }
      workspace = workspace.filter((script) => script.length > 0);
      changed = true;
    }

    if (changed) {
      renderWorkspace(focusBlockId);
    } else {
      emptyEl.classList.toggle('is-hidden', workspace.length > 0);
    }
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
      'x ' + Math.round(state.x - size.w / 2) + ' | y ' + Math.round(size.h / 2 - state.y);
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
        const text = String(block.params.text == null ? '' : block.params.text).slice(0, 80) || 'Hello from BlockCode';
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

  function blockToWatchCpp(block) {
    const def = DEFS[block.type] || {};
    const action = def.action || block.type;

    switch (action) {
      case 'event':
        return ['// when clicked'];

      case 'move': {
        const steps = toNum(block.params.steps, 50, 1000);
        return [
          '// move ' + formatNumber(steps) + ' steps',
          'watch_move(' + formatFloat(steps) + ');'
        ];
      }

      case 'turn': {
        const deg = toNum(block.params.deg, 90, 3600);
        return [
          '// turn ' + formatNumber(deg) + ' degrees',
          'watch_turn(' + formatFloat(deg) + ');'
        ];
      }

      case 'goto':
        return ['// go to start', 'watch_goto_start();'];

      case 'say': {
        const text = String(block.params.text == null ? '' : block.params.text).slice(0, 80) || 'Hello from BlockCode';
        const secs = clamp(toNum(block.params.secs, 1, 10), 0, 10);
        return [
          '// say for ' + formatNumber(secs) + ' s',
          'watch_say(' + cppString(text) + ', ' + formatFloat(secs) + ');'
        ];
      }

      case 'wait': {
        const secs = clamp(toNum(block.params.secs, 1, 10), 0, 10);
        return [
          '// wait ' + formatNumber(secs) + ' s',
          'watch_wait(' + formatFloat(secs) + ');'
        ];
      }

      default:
        return ['// unsupported block: ' + block.type];
    }
  }

  function watchCppActionPrelude() {
    return [
      '#include <math.h>',
      '#include <stdio.h>',
      '#include <unistd.h>',
      ''
    ];
  }

  function watchCppActionSupport() {
    return [
      'static float watch_x = 205.0f;',
      'static float watch_y = 251.0f;',
      'static float watch_heading = 0.0f;',
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
      ''
    ];
  }

  function watchCppActionCode() {
    return [
      'void watch_goto_start(void) {',
      '  watch_x = 205.0f;',
      '  watch_y = 251.0f;',
      '  watch_heading = 0.0f;',
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
      ''
    ];
  }

  function generateWatchCpp() {
    const lines = [];
    const add = (line) => lines.push(line === undefined ? '' : line);

    add('// Generated by BlockCode.');
    add('// ESP-IDF ELF app. Build it to blockcode-app.app.elf, then copy the');
    add('// ELF to the watch storage and launch it from the watch app menu.');
    add('// The watch_* functions below are generated stand-ins. Replace their');
    add('// bodies with display and hardware calls for the real watch.');
    add('');

    watchCppActionPrelude().forEach((line) => add(line));
    watchCppActionSupport().forEach((line) => add(line));
    add('extern "C" {');
    watchCppActionCode().forEach((line) => add(line));
    add('}');
    add('');

    const entryNames = [];
    workspace.forEach((script, scriptIndex) => {
      if (!script.length) return;
      const name = 'stack' + (scriptIndex + 1);
      const hat = isHat(script[0]);
      if (hat) entryNames.push(name);

      add(hat
        ? '// Stack ' + (scriptIndex + 1) + ': entry point'
        : '// Stack ' + (scriptIndex + 1) + ': not run (no hat block)');
      add('static void ' + name + '(void) {');
      script.forEach((block) => {
        blockToWatchCpp(block).forEach((line) => add('  ' + line));
      });
      add('}');
      add('');
    });

    add('extern "C" int main(int argc, char **argv) {');
    add('  (void)argc;');
    add('  (void)argv;');
    if (entryNames.length) {
      entryNames.forEach((name) => add('  ' + name + '();'));
    } else {
      add('  // Add a "when clicked" block at the top of a stack to run it.');
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
    const entryNames = [];

    add('// Preview only. Copy or Download adds the full C++ app file.');
    add('');

    if (!blockCount) {
      add('// No blocks yet');
      return lines.join('\n');
    }

    add('// Block action functions:');
    watchCppActionCode().forEach((line) => add(line));

    workspace.forEach((script, scriptIndex) => {
      if (!script.length) return;
      const name = 'stack' + (scriptIndex + 1);
      const hat = isHat(script[0]);
      if (hat) entryNames.push(name);

      add('// Stack ' + (scriptIndex + 1) + ': ' +
        (hat ? 'runs when started' : 'not used (add a "when clicked" block)'));
      add('static void ' + name + '(void) {');
      script.forEach((block) => {
        blockToWatchCpp(block).forEach((line) => add('  ' + line));
      });
      add('}');
      add('');
    });

    add('int main(int argc, char **argv) {');
    if (entryNames.length) {
      entryNames.forEach((name) => add('  ' + name + '();'));
    } else {
      add('  // Add a "when clicked" block at the top of a stack to run it.');
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

    const group = dragGroupAt(scriptIndex, blockIndex);
    const from = { si: scriptIndex, bi: group ? group.start : blockIndex };
    startDrag(event, block, from, el, group);
  });

  runBtn.addEventListener('click', runProgram);
  stopBtn.addEventListener('click', stopProgram);
  resetBtn.addEventListener('click', () => resetSprite(true));
  clearBtn.addEventListener('click', () => {
    stopProgram();
    isolatedBlockId = null;
    selectedBlockIds.clear();
    workspace = [];
    renderWorkspace('empty');
    resetSprite(true);
    showToast('Workspace cleared.');
  });

  canvasEl.addEventListener('click', (event) => {
    if (event.target.closest('.block')) return;
    if (performance.now() < suppressCanvasClickUntil) return;
    clearSelection();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Delete' && event.key !== 'Backspace') return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    const target = event.target;
    if (target && target.closest &&
        target.closest('input, textarea, select, [contenteditable="true"]')) return;

    const active = document.activeElement;
    if (active && active.closest &&
        active.closest('input, textarea, select, [contenteditable="true"]')) return;

    if (!selectedBlockIds.size) return;
    event.preventDefault();

    if (state.running) {
      showToast('Stop the program before editing.');
      return;
    }

    deleteSelectedBlocks();
  });

  copyCodeBtn.addEventListener('click', copyWatchCpp);
  downloadCodeBtn.addEventListener('click', downloadWatchCpp);

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

  let workspace = initialScript.length ? [makeScript(initialScript, 24, 24)] : [];

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
