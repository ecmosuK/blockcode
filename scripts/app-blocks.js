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
  el.dataset.field = slot.field;
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
  if (type === 'signal') {
    const names = signalNames();
    return (names.length ? names : ['message1']).map((name) => ({ value: name, label: name }));
  }
  if (type === 'operator') {
    return ['<', '=', '>'].map((operator) => ({ value: operator, label: operator }));
  }
  if (type === 'variable') {
    return workspaceVariables.map((name) => ({ value: name, label: name }));
  }
  if (type === 'list') {
    return workspaceLists.map((name) => ({ value: name, label: name }));
  }
  return [];
}

function distanceTargetOptions() {
  const edges = ['top', 'bottom', 'left', 'right'].map((edge) => ({
    value: 'edge:' + edge,
    label: edge
  }));
  return edges.concat(selectOptionsFor('sprite'));
}

let variablesLoaded = false;
let listsLoaded = false;

function loadWorkspaceVariables() {
  if (variablesLoaded) return;
  variablesLoaded = true;
  try {
    const saved = JSON.parse(localStorage.getItem(VARIABLES_KEY) || '[]');
    if (Array.isArray(saved)) {
      workspaceVariables = Array.from(new Set(saved
        .filter((name) => typeof name === 'string')
        .map((name) => name.trim())
        .filter(Boolean)));
    }
    const visible = JSON.parse(localStorage.getItem(VISIBLE_VARIABLES_KEY) || '[]');
    if (Array.isArray(visible)) {
      visibleVariables = new Set(visible.filter((name) => workspaceVariables.includes(name)));
    }
  } catch (error) {
    console.warn('BlockCode: Could not load saved variables.', error);
  }
}

function saveWorkspaceVariables() {
  try {
    localStorage.setItem(VARIABLES_KEY, JSON.stringify(workspaceVariables));
    return true;
  } catch (error) {
    console.error('BlockCode: Could not save variables.', error);
    showToast('Could not save variables.');
    return false;
  }
}

function loadWorkspaceLists() {
  if (listsLoaded) return;
  listsLoaded = true;
  try {
    const saved = JSON.parse(localStorage.getItem(LISTS_KEY) || '[]');
    if (Array.isArray(saved)) {
      workspaceLists = Array.from(new Set(saved
        .filter((name) => typeof name === 'string')
        .map((name) => name.trim())
        .filter(Boolean)));
    }
    const visible = JSON.parse(localStorage.getItem(VISIBLE_LISTS_KEY) || '[]');
    if (Array.isArray(visible)) {
      visibleLists = new Set(visible.filter((name) => workspaceLists.includes(name)));
    }
  } catch (error) {
    console.warn('BlockCode: Could not load saved lists.', error);
  }
}

function saveWorkspaceLists() {
  try {
    localStorage.setItem(LISTS_KEY, JSON.stringify(workspaceLists));
    return true;
  } catch (error) {
    console.error('BlockCode: Could not save lists.', error);
    showToast('Could not save lists.');
    return false;
  }
}

const VALUE_SOCKET_DIAMETER = 30;
const HEXAGONAL_SOCKET_WIDTH = VALUE_SOCKET_DIAMETER * 2 / Math.sqrt(3);
const BLOCK_CONTENT_INSET = 22;
const HEXAGONAL_REPORTER_ACTIONS = new Set([
  'equals', 'less', 'greater', 'not-equal'
]);
let blockTextMeasureContext = null;

function blockTextWidth(text, font) {
  if (!blockTextMeasureContext) {
    blockTextMeasureContext = document.createElement('canvas').getContext('2d');
  }
  if (!blockTextMeasureContext) return String(text || '').length * 8;
  blockTextMeasureContext.font = font;
  return blockTextMeasureContext.measureText(String(text || '')).width;
}

function blockSlotContentWidth(block, slot) {
  if (slot.type === 'text' || slot.type === 'password') {
    const def = DEFS[block.type];
    const text = block.params[slot.field] == null
      ? (def.fields && def.fields[slot.field]) || ''
      : block.params[slot.field];
    return Math.max(slot.w, Math.ceil(blockTextWidth(text, '600 12.5px sans-serif') + 16));
  }
  if (slot.type === 'variable') return slot.w;
  if (slot.type === 'sprite' || slot.type === 'touching' || slot.type === 'background' ||
      slot.type === 'function' || slot.type === 'signal' || slot.type === 'operator' ||
      slot.type === 'list') {
    let options = block.type === 'distance' && slot.field === 'sprite'
      ? distanceTargetOptions()
      : selectOptionsFor(slot.type);
    if (slot.type === 'touching') {
      options = [{ value: 'edge', label: 'edge' }].concat(selectOptionsFor('sprite'));
    }
    if (!options.length && slot.type === 'function') options = [{ label: 'no functions' }];
    if (!options.length && (slot.type === 'sprite' || slot.type === 'touching')) {
      options = [{ label: 'no sprites' }];
    }
    const textWidth = options.reduce((width, option) =>
      Math.max(width, blockTextWidth(option.label, '600 11px sans-serif')), 0);
    return Math.max(slot.w, Math.ceil(textWidth + 26));
  }
  if (slot.type === 'value' && isExpression(block.params[slot.field])) {
    return Math.max(slot.w, blockRenderSize(block.params[slot.field]).width);
  }
  return slot.w;
}

function expressionSuffixSpace(slot) {
  return slot.suffix ? 6 + (slot.suffixWidth || 0) : 0;
}

function blockSlotLayouts(block) {
  const def = DEFS[block.type];
  if (!def) return [];

  let shift = 0;
  return (def.slots || []).map((slot) => {
    const layout = Object.assign({}, slot, {
      x: slot.x + shift,
      w: blockSlotContentWidth(block, slot)
    });
    const hasExpression = slot.type === 'value' && isExpression(block.params[slot.field]);
    shift += Math.max(0, layout.w - slot.w) +
      (hasExpression ? expressionSuffixSpace(slot) : 0);
    return layout;
  });
}

function blockRenderSize(block) {
  const def = DEFS[block.type];
  if (!def) return { width: 0, height: 0 };

  let requiredWidth = def.width;
  let contentRight = 0;
  let hasExpression = false;

  blockSlotLayouts(block).forEach((slot) => {
    const value = block.params[slot.field];
    const slotHasExpression = slot.type === 'value' && isExpression(value);
    hasExpression = hasExpression || slotHasExpression;
    const slotRight = slot.x + slot.w +
      (slotHasExpression ? expressionSuffixSpace(slot) : 0);
    contentRight = Math.max(contentRight, slotRight);
    requiredWidth = Math.max(requiredWidth, slot.x + slot.w +
      (slotHasExpression ? expressionSuffixSpace(slot) : 0));
  });

  if (hasExpression) {
    requiredWidth = Math.max(requiredWidth, contentRight + BLOCK_CONTENT_INSET);
  }

  return { width: Math.ceil(requiredWidth), height: def.height };
}

function renderSelectSlot(block, slot, palette) {
  const select = document.createElement('select');
  select.className = 'block-slot select';
  applySlotGeometry(select, slot);
  select.setAttribute('aria-label', slot.label || slot.field || 'value');

  const isSpriteSlot = slot.type === 'sprite' || slot.type === 'touching';
  const current = block.params[slot.field] == null ? '' : String(block.params[slot.field]);
  const isVariableSlot = slot.type === 'variable';
  const isListSlot = slot.type === 'list';

  const refreshOptions = () => {
    const options = slot.type === 'touching'
      ? [{ value: 'edge', label: 'edge' }].concat(selectOptionsFor('sprite'))
      : (block.type === 'distance' && slot.field === 'sprite'
        ? distanceTargetOptions()
        : selectOptionsFor(slot.type));
    const selected = block.params[slot.field] == null
      ? (slot.type === 'operator' ? String(DEFS[block.type].fields[slot.field]) : '')
      : String(block.params[slot.field]);
    select.replaceChildren();

    if (!options.length) {
      const empty = document.createElement('option');
      empty.value = '';
      empty.textContent = slot.type === 'function'
        ? 'no functions'
        : (isSpriteSlot ? 'no sprites' : '');
      select.appendChild(empty);
    }

    options.forEach((option) => {
      const node = document.createElement('option');
      node.value = option.value;
      node.textContent = option.label;
      select.appendChild(node);
    });

    if (!isVariableSlot && !isListSlot && !isSpriteSlot &&
        slot.type !== 'signal' && slot.type !== 'operator' && selected &&
        !options.some((option) => option.value === selected)) {
      const node = document.createElement('option');
      node.value = selected;
      node.textContent = selected;
      select.appendChild(node);
    }

    const selectedAvailable = options.some((option) => option.value === selected);
    if (isSpriteSlot && selected && !selectedAvailable) {
      block.params[slot.field] = '';
    }
    if ((slot.type === 'signal' || slot.type === 'operator') && selected && !selectedAvailable) {
      block.params[slot.field] = options[0] ? options[0].value : '';
    }
    select.value = selectedAvailable
      ? selected
      : (isSpriteSlot ? '' : (options[0] ? options[0].value : ''));
    if (!selected && !isSpriteSlot && select.value) {
      block.params[slot.field] = select.value;
    }
  };
  refreshOptions();
  const options = selectOptionsFor(slot.type);

  if (isVariableSlot && !select.value) select.value = '';
  if ((isVariableSlot || isListSlot) && !select.value) select.value = '';
  if (isVariableSlot || isListSlot) select.disabled = !options.length;
  if (isSpriteSlot) select.addEventListener('focus', refreshOptions);

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
  input.type = slot.type === 'password' ? 'password' : 'text';
  applySlotGeometry(input, slot);
  input.value = block.params[slot.field] != null ? block.params[slot.field] : '';
  input.setAttribute('aria-label', slot.label || slot.field || 'value');
  input.spellcheck = false;

  input.addEventListener('pointerdown', (event) => {
    event.stopPropagation();
    input.focus();
  });
  input.addEventListener('input', () => {
    const previousContentWidth = blockSlotContentWidth(block, slot);
    const previousWidth = blockRenderSize(block).width;
    block.params[slot.field] = input.value;
    let rerendered = false;
    if (!palette && (block.type === 'broadcast' ||
        blockSlotContentWidth(block, slot) !== previousContentWidth ||
        blockRenderSize(block).width !== previousWidth)) {
      const start = input.selectionStart;
      const end = input.selectionEnd;
      renderWorkspace(block.id);
      rerendered = true;
      const nextInput = scriptsEl.querySelector(
        '.block[data-id="' + block.id + '"] .block-slot.text[data-field="' + slot.field + '"]'
      );
      if (nextInput) {
        nextInput.focus();
        if (start !== null && end !== null) nextInput.setSelectionRange(start, end);
      }
    }
    if (block.type === 'define') refreshFunctionSelects();
    if (!rerendered) renderWatchCpp(block.id);
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
  if (slot.field === 'condition' && BOOLEAN_CONDITION_BLOCKS.has(block.type)) {
    holder.dataset.requiresConditionReporter = 'true';
  }
  const value = slotValue(block, slot);
  const isConditionSlot = holder.dataset.requiresConditionReporter === 'true';
  const expression = isExpression(value);
  const expressionSize = expression ? blockRenderSize(value) : null;
  const socketWidth = expressionSize
    ? expressionSize.width
    : (isConditionSlot ? HEXAGONAL_SOCKET_WIDTH : VALUE_SOCKET_DIAMETER);
  const socketHeight = expressionSize ? expressionSize.height : VALUE_SOCKET_DIAMETER;
  holder.style.left = (expression
    ? slot.x
    : slot.x + slot.w / 2 - socketWidth / 2) + 'px';
  holder.style.top = (slot.y + slot.h / 2 - socketHeight / 2) + 'px';
  holder.style.width = socketWidth + 'px';
  holder.style.height = socketHeight + 'px';

  if (isExpression(value)) {
    holder.classList.add('has-expression');
    const expression = renderBlock(value, null, {
      palette: palette,
      reporterShape: holder.dataset.requiresConditionReporter === 'true'
        ? 'hexagon'
        : 'circle'
    });
    if (expression) holder.appendChild(expression);
    if (slot.suffix) {
      const suffix = document.createElement('span');
      suffix.className = 'expr-suffix';
      suffix.textContent = slot.suffix;
      suffix.style.color = slot.suffixColor || categoryColor(DEFS[block.type].category);
      holder.appendChild(suffix);
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
    input.addEventListener('pointerdown', (event) => event.stopPropagation());
    input.addEventListener('input', () => {
      block.params[slot.field] = input.value;
      renderWatchCpp(block.id);
    });
    holder.appendChild(input);
    if (slot.suffixOnInput && slot.suffix) {
      const suffix = document.createElement('span');
      suffix.className = 'expr-suffix';
      suffix.textContent = slot.suffix;
      suffix.style.color = slot.suffixColor || categoryColor(DEFS[block.type].category);
      holder.appendChild(suffix);
    }
  }

  return holder;
}

function saveVisibleNames(key, names) {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(names)));
    return true;
  } catch (error) {
    console.error('BlockCode: Could not save monitor visibility.', error);
    showToast('Could not save visibility settings.');
    return false;
  }
}

function appendCreatedNameItems(wrap, names, blockType, field, kind, visibleNames, visibleKey, saveNames) {
  names.forEach((name) => {
    const block = makeBlock(blockType, { [field]: name });
    const el = block && renderBlock(block, null, { palette: true });
    if (!el) return;
    el.classList.add('created-name-block');
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', name + ' ' + kind);
    el.title = name;
    if (kind === 'variable') {
      el.removeAttribute('role');
      el.addEventListener('pointerdown', (event) => {
        startExpressionDrag(event, makeBlock(blockType, { [field]: name }), el);
      });
    }

    const row = document.createElement('div');
    row.className = 'created-name-row';
    row.appendChild(el);

    const visibleLabel = document.createElement('label');
    visibleLabel.className = 'created-name-visible';
    const visibleCheckbox = document.createElement('input');
    visibleCheckbox.type = 'checkbox';
    visibleCheckbox.checked = visibleNames.has(name);
    visibleCheckbox.setAttribute('aria-label', 'Show ' + name + ' in watch preview');
    visibleCheckbox.addEventListener('change', () => {
      if (visibleCheckbox.checked) visibleNames.add(name);
      else visibleNames.delete(name);
      if (!saveVisibleNames(visibleKey, visibleNames)) {
        visibleCheckbox.checked = !visibleCheckbox.checked;
        if (visibleCheckbox.checked) visibleNames.add(name);
        else visibleNames.delete(name);
        return;
      }
      renderMonitorPanel();
    });
    visibleLabel.append(visibleCheckbox, document.createTextNode('Visible'));
    row.appendChild(visibleLabel);

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'created-name-delete';
    deleteButton.textContent = 'Delete';
    deleteButton.setAttribute('aria-label', 'Delete ' + kind + ' ' + name);
    deleteButton.addEventListener('click', () => {
      const index = names.indexOf(name);
      if (index < 0) return;
      const wasVisible = visibleNames.has(name);
      names.splice(index, 1);
      visibleNames.delete(name);
      if (!saveNames() || !saveVisibleNames(visibleKey, visibleNames)) {
        names.splice(index, 0, name);
        if (wasVisible) visibleNames.add(name);
        saveNames();
        saveVisibleNames(visibleKey, visibleNames);
        return;
      }
      renderPalette();
      renderWorkspace();
      renderMonitorPanel();
    });
    row.appendChild(deleteButton);
    wrap.appendChild(row);
  });
}

function renderBlock(block, path, opts) {
  opts = opts || {};
  const def = DEFS[block.type];
  if (!def) return null;
  if (BOOLEAN_CONDITION_BLOCKS.has(block.type) && !isConditionReporter(block.params.condition)) {
    block.params.condition = defaultBlockFieldValue(block.type, 'condition');
  }

  const palette = !!opts.palette;
  const size = blockRenderSize(block);
  const el = document.createElement('div');
  const isReporterBlock = !!def.reporter;
  const isHexagonalReporter = isReporterBlock &&
    (opts.reporterShape === 'hexagon' ||
      (opts.reporterShape !== 'circle' &&
        (def.category === 'sensing' || HEXAGONAL_REPORTER_ACTIONS.has(def.action))));

  el.className = 'block' + (isReporterBlock ? ' reporter' : '') +
    (isHexagonalReporter ? ' is-hexagonal-reporter' : '') +
    (def.cblock ? ' cblock-head' : '');
  el.dataset.id = block.id;
  el.dataset.type = block.type;
  el.style.width = size.width + 'px';
  el.style.height = size.height + 'px';
  if (!palette && selectedBlockIds.has(block.id)) {
    el.classList.add('is-selected');
  }
  if (!palette && path) {
    el.dataset.path = blockPathKey(path);
  }

  if (size.width > def.width) {
    const extension = document.createElement('div');
    extension.className = 'block-extension' + (isReporterBlock ? ' is-reporter' : '');
    extension.style.left = (def.width - 6) + 'px';
    extension.style.width = (size.width - def.width + 6) + 'px';
    extension.style.height = def.height + 'px';
    extension.style.setProperty('--block-color', categoryColor(def.category));
    el.appendChild(extension);
  }

  const img = document.createElement('img');
  img.className = 'block-img';
  img.src = def.sprite;
  img.alt = def.label || block.type;
  img.draggable = false;
  img.style.width = def.width + 'px';
  img.style.height = def.height + 'px';
  el.appendChild(img);

  blockSlotLayouts(block).forEach((slot) => {
    let control = null;
    if (slot.type === 'value') {
      control = renderValueSlot(block, slot, palette);
    } else if (slot.type === 'sprite' || slot.type === 'touching' || slot.type === 'background' ||
        slot.type === 'function' || slot.type === 'signal' || slot.type === 'operator' ||
        slot.type === 'variable' || slot.type === 'list') {
      control = renderSelectSlot(block, slot, palette);
    } else if (slot.type === 'text' || slot.type === 'password') {
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
  loadWorkspaceVariables();
  loadWorkspaceLists();
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

    if (categoryKey === 'math') {
      const createSection = document.createElement('form');
      createSection.className = 'variable-create';
      createSection.addEventListener('submit', (event) => {
        event.preventDefault();
        const name = variableNameInput.value.trim();
        if (!name) {
          variableNameInput.focus();
          return;
        }
        if (workspaceVariables.some((existing) =>
          existing.toLocaleLowerCase() === name.toLocaleLowerCase())) {
          showToast('That variable already exists.');
          variableNameInput.focus();
          return;
        }

        workspaceVariables.push(name);
        if (!saveWorkspaceVariables()) {
          workspaceVariables.pop();
          return;
        }
        renderPalette();
        renderWorkspace();
        showToast('Variable created.');
      });

      const createTitle = document.createElement('div');
      createTitle.className = 'variable-create-title';
      createTitle.textContent = 'Create variable';
      const variableNameInput = document.createElement('input');
      variableNameInput.type = 'text';
      variableNameInput.className = 'variable-name-input';
      variableNameInput.maxLength = 32;
      variableNameInput.placeholder = 'Variable name';
      variableNameInput.setAttribute('aria-label', 'New variable name');
      const createButton = document.createElement('button');
      createButton.type = 'submit';
      createButton.className = 'btn btn-small';
      createButton.textContent = 'Create';
      createSection.append(createTitle, variableNameInput, createButton);
      wrap.appendChild(createSection);
      appendCreatedNameItems(
        wrap, workspaceVariables, 'variable', 'name', 'variable',
        visibleVariables, VISIBLE_VARIABLES_KEY, saveWorkspaceVariables
      );
    }

    if (categoryKey === 'lists') {
      const createSection = document.createElement('form');
      createSection.className = 'variable-create';
      createSection.addEventListener('submit', (event) => {
        event.preventDefault();
        const name = listNameInput.value.trim();
        if (!name) {
          listNameInput.focus();
          return;
        }
        if (workspaceLists.some((existing) =>
          existing.toLocaleLowerCase() === name.toLocaleLowerCase())) {
          showToast('That list already exists.');
          listNameInput.focus();
          return;
        }

        workspaceLists.push(name);
        if (!saveWorkspaceLists()) {
          workspaceLists.pop();
          return;
        }
        renderPalette();
        renderWorkspace();
        showToast('List created.');
      });

      const createTitle = document.createElement('div');
      createTitle.className = 'variable-create-title';
      createTitle.textContent = 'Create list';
      const listNameInput = document.createElement('input');
      listNameInput.type = 'text';
      listNameInput.className = 'variable-name-input';
      listNameInput.maxLength = 32;
      listNameInput.placeholder = 'List name';
      listNameInput.setAttribute('aria-label', 'New list name');
      const createButton = document.createElement('button');
      createButton.type = 'submit';
      createButton.className = 'btn btn-small';
      createButton.textContent = 'Create';
      createSection.append(createTitle, listNameInput, createButton);
      wrap.appendChild(createSection);
      appendCreatedNameItems(
        wrap, workspaceLists, 'listlength', 'list', 'list',
        visibleLists, VISIBLE_LISTS_KEY, saveWorkspaceLists
      );
    }

    items.forEach((def) => {
      if (categoryKey === 'math' && def.type === 'variable') return;
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
  renderMonitorPanel();
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
    next.zIndex = script.zIndex;
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
  script.zIndex = workspace.reduce((highest, current) => {
    return Math.max(highest, Number(current.zIndex) || 0);
  }, 0) + 1;
  return script;
}

function bringScriptToFront(index) {
  const script = workspace[index];
  if (!script) return;
  const highest = workspace.reduce((value, item) => {
    return Math.max(value, Number(item.zIndex) || 0);
  }, 0);
  script.zIndex = highest + 1;
  const element = scriptsEl.querySelector('.script[data-script="' + index + '"]');
  if (element) element.style.zIndex = String(script.zIndex);
}

function snapScriptPosition(x, y) {
  return {
    x: snapToDevicePixel(x * workspaceZoom) / workspaceZoom,
    y: snapToDevicePixel(y * workspaceZoom) / workspaceZoom
  };
}

function defaultScriptPosition() {
  const offset = 24 + (workspace.length % 5) * 20;
  return snapScriptPosition(offset, offset);
}

function freeDropPosition(d) {
  const canvasRect = canvasEl.getBoundingClientRect();
  const originX = canvasRect.left + canvasEl.clientLeft - canvasEl.scrollLeft;
  const originY = canvasRect.top + canvasEl.clientTop - canvasEl.scrollTop;
  const pos = snapScriptPosition(
    Math.max(0, (d.lastX - d.offsetX - originX) / workspaceZoom),
    Math.max(0, (d.lastY - d.offsetY - originY) / workspaceZoom)
  );
  return pos;
}

function pointerInsideCanvas(x, y) {
  const rect = canvasEl.getBoundingClientRect();
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function renderWorkspace(focusBlockId) {
  if (activeWorkspaceSpriteId) saveSpriteWorkspaces();
  scriptsEl.innerHTML = '';
  const layer = document.createElement('div');
  layer.className = 'workspace-layer';

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
    column.style.zIndex = String(Number(script.zIndex) || scriptIndex + 1);
    script.forEach((block, blockIndex) => {
      const el = renderBlock(block, [scriptIndex, blockIndex]);
      if (el) column.appendChild(el);
    });
    layer.appendChild(column);
  });

  const extent = workspace.reduce((size, script) => {
    const column = layer.querySelector('.script[data-script="' + workspace.indexOf(script) + '"]');
    if (!column) return size;
    const x = Number.isFinite(script.x) ? script.x : 24;
    const y = Number.isFinite(script.y) ? script.y : 24;
    return {
      width: Math.max(size.width, x + column.offsetWidth + 32),
      height: Math.max(size.height, y + column.offsetHeight + 32)
    };
  }, { width: canvasEl.clientWidth, height: canvasEl.clientHeight });
  scriptsEl.style.width = (extent.width * workspaceZoom) + 'px';
  scriptsEl.style.height = (extent.height * workspaceZoom) + 'px';
  layer.style.width = extent.width + 'px';
  layer.style.height = extent.height + 'px';
  layer.style.transform = 'scale(' + workspaceZoom + ')';
  scriptsEl.appendChild(layer);
  canvasEl.style.setProperty('--workspace-grid-size', (22 * workspaceZoom) + 'px');

  const isEmpty = workspace.length === 0;
  emptyEl.classList.toggle('is-hidden', !isEmpty);
  hintEl.textContent = isEmpty
    ? 'Snap blocks under a hat block'
    : 'Drag blocks into loops, or snap stacks together.';

  renderWatchCpp(focusBlockId);
}

function setWorkspaceZoom(zoom, anchorX, anchorY) {
  const nextZoom = clamp(zoom, 0.01, 1);
  if (nextZoom === workspaceZoom) return;
  const x = anchorX == null ? canvasEl.clientWidth / 2 : anchorX;
  const y = anchorY == null ? canvasEl.clientHeight / 2 : anchorY;
  const ratio = nextZoom / workspaceZoom;
  const scrollLeft = (canvasEl.scrollLeft + x) * ratio - x;
  const scrollTop = (canvasEl.scrollTop + y) * ratio - y;
  workspaceZoom = nextZoom;
  zoomLevelEl.textContent = 'Ctrl + scroll · ' + Math.round(workspaceZoom * 100) + '%';
  renderWorkspace();
  requestAnimationFrame(() => {
    canvasEl.scrollLeft = Math.max(0, scrollLeft);
    canvasEl.scrollTop = Math.max(0, scrollTop);
  });
}
