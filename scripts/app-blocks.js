'use strict';

/* ---------- Block rendering ---------- */

function categoryColor(key) {
  return (CATEGORIES[key] && CATEGORIES[key].color) || '#38bdf8';
}

function slotValue(block, slot) {
  const value = block.params[slot.field];
  if (value !== undefined && value !== null && value !== '') return value;
  const def = DEFS[block.type];
  const fallback = def && def.fields ? def.fields[slot.field] : 0;
  return fallback !== undefined ? fallback : 0;
}

function applySlotGeometry(el, slot) {
  el.style.left = slot.x + 'px';
  el.style.top = slot.y + 'px';
  el.style.width = slot.w + 'px';
  el.style.height = slot.h + 'px';
}

function selectOptionsFor(type) {
  if (type === 'sprite') {
    return allSprites().map((sprite) => ({ value: sprite.id, label: sprite.name || sprite.id }));
  }
  if (type === 'background') {
    return allBackgrounds().map((bg) => ({ value: bg.id, label: bg.name || bg.id }));
  }
  if (type === 'function') {
    return functionNames().map((name) => ({ value: name, label: name }));
  }
  return [];
}

function renderSelectSlot(block, slot, palette) {
  const select = document.createElement('select');
  select.className = 'block-slot select';
  applySlotGeometry(select, slot);
  select.setAttribute('aria-label', slot.label || slot.field || 'value');

  const options = selectOptionsFor(slot.type);
  const current = block.params[slot.field] == null ? '' : String(block.params[slot.field]);

  if (!options.length) {
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = slot.type === 'function' ? 'no functions' : 'none';
    select.appendChild(empty);
  }

  options.forEach((option) => {
    const node = document.createElement('option');
    node.value = option.value;
    node.textContent = option.label;
    select.appendChild(node);
  });

  if (current && !options.some((option) => option.value === current)) {
    const node = document.createElement('option');
    node.value = current;
    node.textContent = current;
    select.appendChild(node);
  }

  select.value = current || (options[0] ? options[0].value : '');
  if (!current && select.value) {
    block.params[slot.field] = select.value;
  }

  if (palette) {
    select.tabIndex = -1;
    select.disabled = true;
  }

  select.addEventListener('pointerdown', (event) => event.stopPropagation());
  select.addEventListener('change', () => {
    block.params[slot.field] = select.value;
    renderWatchCpp(block.id);
  });

  return select;
}

function renderTextSlot(block, slot, palette) {
  const input = document.createElement('input');
  input.className = 'block-slot text';
  input.type = 'text';
  applySlotGeometry(input, slot);
  input.value = block.params[slot.field] != null ? block.params[slot.field] : '';
  input.setAttribute('aria-label', slot.label || slot.field || 'value');
  input.spellcheck = false;

  if (palette) {
    input.readOnly = true;
    input.tabIndex = -1;
  }

  input.addEventListener('pointerdown', (event) => event.stopPropagation());
  input.addEventListener('input', () => {
    block.params[slot.field] = input.value;
    if (block.type === 'define') refreshFunctionSelects();
    renderWatchCpp(block.id);
  });
  input.addEventListener('blur', () => {
    if (block.type === 'define') refreshFunctionSelects();
  });

  return input;
}

function renderValueSlot(block, slot, palette) {
  const holder = document.createElement('div');
  holder.className = 'expr-slot';
  holder.dataset.blockId = block.id;
  holder.dataset.field = slot.field;
  holder.dataset.type = 'value';
  applySlotGeometry(holder, slot);

  const value = slotValue(block, slot);
  if (isExpression(value)) {
    holder.classList.add('has-expression');
    const expression = renderBlock(value, null, { palette: palette });
    if (expression) holder.appendChild(expression);
    if (!palette) {
      const clear = document.createElement('button');
      clear.type = 'button';
      clear.className = 'expr-clear';
      clear.title = 'Clear expression';
      clear.setAttribute('aria-label', 'Clear expression');
      clear.textContent = '\u00d7';
      clear.addEventListener('pointerdown', (event) => event.stopPropagation());
      clear.addEventListener('click', (event) => {
        event.stopPropagation();
        const def = DEFS[block.type];
        block.params[slot.field] = def && def.fields ? def.fields[slot.field] : 0;
        renderWorkspace(block.id);
      });
      holder.appendChild(clear);
    }
  } else {
    const input = document.createElement('input');
    input.className = 'block-slot';
    input.type = 'number';
    input.step = 'any';
    input.style.width = '100%';
    input.style.height = '100%';
    input.style.left = '0';
    input.style.top = '0';
    input.value = value;
    input.setAttribute('aria-label', slot.label || slot.field || 'value');
    if (palette) {
      input.readOnly = true;
      input.tabIndex = -1;
    }
    input.addEventListener('pointerdown', (event) => event.stopPropagation());
    input.addEventListener('input', () => {
      block.params[slot.field] = input.value;
      renderWatchCpp(block.id);
    });
    holder.appendChild(input);
  }

  return holder;
}

function renderBlock(block, path, opts) {
  opts = opts || {};
  const def = DEFS[block.type];
  if (!def) return null;

  const palette = !!opts.palette;
  const el = document.createElement('div');
  const isReporterBlock = !!def.reporter;

  el.className = 'block' + (isReporterBlock ? ' reporter' : '') + (def.cblock ? ' cblock-head' : '');
  el.dataset.id = block.id;
  el.dataset.type = block.type;
  el.style.width = def.width + 'px';
  el.style.height = def.height + 'px';
  if (!palette && selectedBlockIds.has(block.id)) {
    el.classList.add('is-selected');
  }
  if (!palette && path) {
    el.dataset.path = blockPathKey(path);
  }

  const img = document.createElement('img');
  img.className = 'block-img';
  img.src = def.sprite;
  img.alt = def.label || block.type;
  img.draggable = false;
  el.appendChild(img);

  (def.slots || []).forEach((slot) => {
    let control = null;
    if (slot.type === 'value') {
      control = renderValueSlot(block, slot, palette);
    } else if (slot.type === 'sprite' || slot.type === 'background' || slot.type === 'function') {
      control = renderSelectSlot(block, slot, palette);
    } else if (slot.type === 'text') {
      control = renderTextSlot(block, slot, palette);
    } else {
      control = renderValueSlot(block, slot, palette);
    }
    if (control) el.appendChild(control);
  });

  if (isReporterBlock) return el;

  if (!def.cblock) return el;

  const wrapper = document.createElement('div');
  wrapper.className = 'cblock' + (palette ? ' is-palette' : '');
  wrapper.dataset.blockId = block.id;
  if (!palette && path) wrapper.dataset.path = blockPathKey(path);
  wrapper.style.setProperty('--c-color', categoryColor(def.category));

  const svgNs = 'http://www.w3.org/2000/svg';
  const shape = document.createElementNS(svgNs, 'svg');
  shape.classList.add('cblock-shape');
  shape.setAttribute('aria-hidden', 'true');
  shape.setAttribute('focusable', 'false');

  const shapePath = document.createElementNS(svgNs, 'path');
  shapePath.setAttribute('stroke-linejoin', 'round');
  shapePath.setAttribute('stroke-width', '2');
  shapePath.setAttribute('stroke', 'rgba(0,0,0,.18)');
  shapePath.setAttribute('fill', categoryColor(def.category));
  shape.appendChild(shapePath);

  const body = document.createElement('div');
  body.className = 'cblock-body';
  body.style.minWidth = Math.max(80, def.width) + 'px';

  const childrenEl = document.createElement('div');
  childrenEl.className = 'cblock-children';
  const children = Array.isArray(block.children) ? block.children : [];
  children.forEach((child, childIndex) => {
    if (!palette && path) {
      const childEl = renderBlock(child, path.concat(childIndex));
      if (childEl) childrenEl.appendChild(childEl);
    }
  });

  if (!palette && !children.length) {
    const empty = document.createElement('div');
    empty.className = 'cblock-empty';
    empty.dataset.emptyPath = path ? blockPathKey(path) : '';
    empty.textContent = 'Drop blocks here';
    childrenEl.appendChild(empty);
  } else if (palette && !children.length) {
    const spacer = document.createElement('div');
    spacer.className = 'cblock-empty';
    spacer.setAttribute('aria-hidden', 'true');
    childrenEl.appendChild(spacer);
  } else if (!palette) {
    const tail = document.createElement('div');
    tail.className = 'cblock-tail';
    tail.dataset.emptyPath = path ? blockPathKey(path) : '';
    childrenEl.appendChild(tail);
  }

  body.appendChild(childrenEl);

  const footSpace = document.createElement('div');
  footSpace.className = 'cblock-foot-space';
  footSpace.setAttribute('aria-hidden', 'true');

  requestAnimationFrame(() => {
    const width = Math.round(wrapper.clientWidth * 100) / 100;
    const height = Math.round(wrapper.clientHeight * 100) / 100;
    if (!width || !height) return;

    const outer = [
      'M4 0 H16 V1 Q16 6 19 6 H33 Q36 6 36 1 V0',
      'H' + (width - 4) + ' Q' + width + ' 0 ' + width + ' 4',
      'V40 Q' + width + ' 44 ' + (width - 4) + ' 44 H68',
      'V45 Q68 50 65 50 H51 Q48 50 48 46 V44 H32',
      'V' + (height - 26) + ' H48 V' + (height - 25),
      'Q48 ' + (height - 20) + ' 51 ' + (height - 20) + ' H65',
      'Q68 ' + (height - 20) + ' 68 ' + (height - 25) + ' V' + (height - 26) + ' H' + (width - 4),
      'Q' + width + ' ' + (height - 26) + ' ' + width + ' ' + (height - 22),
      'V' + (height - 10) + ' Q' + width + ' ' + (height - 6) + ' ' + (width - 4) + ' ' + (height - 6),
      'H36 V' + (height - 4) + ' Q36 ' + height + ' 32 ' + height,
      'H20 Q16 ' + height + ' 16 ' + (height - 4) + ' V' + (height - 6) + ' H0 V44 H0 V4 Q0 0 4 0 Z'
    ].join(' ');

    shape.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
    shape.setAttribute('preserveAspectRatio', 'none');
    shapePath.setAttribute('d', outer);
  });

  wrapper.appendChild(shape);
  wrapper.appendChild(el);
  wrapper.appendChild(body);
  wrapper.appendChild(footSpace);
  return wrapper;
}

function refreshFunctionSelects() {
  const names = functionNames();
  document.querySelectorAll('.block-slot.select').forEach((select) => {
    const label = select.getAttribute('aria-label') || '';
    if (label !== 'name' && label !== 'function') return;
    const holder = select.closest('.block');
    if (!holder) return;
    const type = holder.dataset.type;
    if (type !== 'call') return;

    const current = select.value;
    select.innerHTML = '';
    if (!names.length) {
      const empty = document.createElement('option');
      empty.value = '';
      empty.textContent = 'no functions';
      select.appendChild(empty);
    }
    names.forEach((name) => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      select.appendChild(option);
    });
    select.value = names.indexOf(current) >= 0 ? current : (names[0] || '');
    const block = findBlockById(holder.dataset.id);
    if (block) block.params.name = select.value;
  });
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
      const el = renderBlock(template, null, { palette: true });
      if (!el) return;
      el.addEventListener('pointerdown', (event) => {
        if (isReporter(template)) {
          startExpressionDrag(event, makeBlock(template.type, template.params), el);
        } else {
          const fresh = makeBlock(template.type, template.params);
          if (def.cblock) fresh.children = [];
          startDrag(event, fresh, null, el);
        }
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

function selectBlockRange(path) {
  const container = containerAtPath(path.slice(0, -1));
  if (!container) return;
  const start = path[path.length - 1];

  isolatedBlockId = null;
  selectedBlockIds.clear();
  collectBlockIds(container.slice(start), selectedBlockIds);
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

  const filterContainer = (container) => {
    return container.filter((block) => {
      if (selectedBlockIds.has(block.id)) {
        removed += 1;
        return false;
      }
      if (isCBlock(block) && Array.isArray(block.children)) {
        block.children = filterContainer(block.children);
      }
      return true;
    });
  };

  workspace = workspace.map((script) => {
    const next = filterContainer(script);
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

function dragGroupAt(path) {
  const container = containerAtPath(path.slice(0, -1));
  if (!container) return null;
  const start = path[path.length - 1];
  const block = container[start];
  if (!block) return null;

  if (isolatedBlockId === block.id) {
    return { start: start, blocks: [block], isolated: true, parentPath: path.slice(0, -1) };
  }

  return {
    start: start,
    blocks: container.slice(start),
    isolated: false,
    parentPath: path.slice(0, -1)
  };
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
      const el = renderBlock(block, [scriptIndex, blockIndex]);
      if (el) column.appendChild(el);
    });
    scriptsEl.appendChild(column);
  });

  const isEmpty = workspace.length === 0;
  emptyEl.classList.toggle('is-hidden', !isEmpty);
  hintEl.textContent = isEmpty
    ? 'Snap blocks under a hat block'
    : 'Drag blocks into loops, or snap stacks together.';

  renderWatchCpp(focusBlockId);
}
