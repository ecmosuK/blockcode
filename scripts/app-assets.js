'use strict';

/* ---------- Stage sprites and backgrounds ---------- */

let spritePreviewPositions = Object.create(null);
let spriteVisibilityById = Object.create(null);
let replacedEyeballSprite = false;

function loadRuntimeAssets() {
  runtimeSprites = ((PACK.sprites && PACK.sprites.list) || []).map((sprite) => {
    return Object.assign({}, sprite, { custom: false });
  });
  runtimeBackgrounds = ((PACK.backgrounds && PACK.backgrounds.list) || []).map((bg) => {
    return Object.assign({}, bg, { custom: false });
  });

  state.spriteId = (PACK.sprites && PACK.sprites.active) || (runtimeSprites[0] && runtimeSprites[0].id) || '';
  state.backgroundId = (PACK.backgrounds && PACK.backgrounds.active) || (runtimeBackgrounds[0] && runtimeBackgrounds[0].id) || '';

  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(ASSETS_KEY) || 'null');
  } catch (error) {
    saved = null;
  }
  if (!saved) return;

  if (Array.isArray(saved.sprites)) {
    saved.sprites.forEach((sprite) => {
      if (sprite && sprite.id && sprite.src) {
        const restored = Object.assign({}, sprite, {
          custom: Boolean(sprite.custom),
          modified: Boolean(sprite.modified)
        });
        const existingIndex = runtimeSprites.findIndex((item) => item.id === restored.id);
        if (existingIndex >= 0) runtimeSprites[existingIndex] = restored;
        else runtimeSprites.push(restored);
      }
    });
  }
  if (Array.isArray(saved.backgrounds)) {
    saved.backgrounds.forEach((bg) => {
      if (bg && bg.id && bg.css) {
        const restored = Object.assign({}, bg, {
          custom: Boolean(bg.custom),
          modified: Boolean(bg.modified)
        });
        const existingIndex = runtimeBackgrounds.findIndex((item) => item.id === restored.id);
        if (existingIndex >= 0) runtimeBackgrounds[existingIndex] = restored;
        else runtimeBackgrounds.push(restored);
      }
    });
  }
  if (Array.isArray(saved.deletedSprites)) {
    const deleted = new Set(saved.deletedSprites);
    runtimeSprites = runtimeSprites.filter((sprite) => !deleted.has(sprite.id));
  }
  if (saved.spritePreviewPositions && typeof saved.spritePreviewPositions === 'object') {
    Object.keys(saved.spritePreviewPositions).forEach((id) => {
      const position = saved.spritePreviewPositions[id];
      if (position && Number.isFinite(position.x) && Number.isFinite(position.y)) {
        spritePreviewPositions[id] = {
          x: clamp(position.x, 5, 95),
          y: clamp(position.y, 5, 95)
        };
      }
    });
  }
  if (saved.spriteVisibilityById && typeof saved.spriteVisibilityById === 'object') {
    Object.keys(saved.spriteVisibilityById).forEach((id) => {
      if (typeof saved.spriteVisibilityById[id] === 'boolean') {
        spriteVisibilityById[id] = saved.spriteVisibilityById[id];
      }
    });
  }

  if (saved.activeSprite && runtimeSprites.some((sprite) => sprite.id === saved.activeSprite)) {
    state.spriteId = saved.activeSprite;
  }
  if (saved.activeBackground && runtimeBackgrounds.some((bg) => bg.id === saved.activeBackground)) {
    state.backgroundId = saved.activeBackground;
  }

  if (!runtimeSprites.some((sprite) => sprite.id === state.spriteId)) {
    state.spriteId = runtimeSprites[0] ? runtimeSprites[0].id : '';
  }
  if (!runtimeBackgrounds.some((bg) => bg.id === state.backgroundId)) {
    state.backgroundId = runtimeBackgrounds[0] ? runtimeBackgrounds[0].id : '';
  }

  const eyeballSprites = runtimeSprites.filter((sprite) =>
    /eyeball/i.test(String(sprite.name || '') + ' ' + String(sprite.id || ''))
  );
  if (eyeballSprites.length) {
    const satelliteTemplate = ((PACK.sprites && PACK.sprites.library) || [])
      .find((sprite) => sprite.id === 'satellite' || /satellite/i.test(sprite.name || ''));
    if (satelliteTemplate) {
      let satellite = runtimeSprites.find((sprite) => sprite.src === satelliteTemplate.src);
      if (!satellite) {
        let id = satelliteTemplate.id;
        let suffix = 2;
        while (runtimeSprites.some((sprite) => sprite.id === id)) {
          id = satelliteTemplate.id + '-' + suffix++;
        }
        satellite = Object.assign({}, satelliteTemplate, { id: id, custom: true });
        runtimeSprites.push(satellite);
      }
      if (eyeballSprites.some((sprite) => sprite.id === state.spriteId)) {
        state.spriteId = satellite.id;
      }
      runtimeSprites = runtimeSprites.filter((sprite) => !eyeballSprites.includes(sprite));
      replacedEyeballSprite = true;
    }
  }
}

function initializeSpriteWorkspaces() {
  const savedWorkspace = Object.create(null);
  try {
    const saved = JSON.parse(localStorage.getItem(SPRITE_WORKSPACES_KEY) || 'null');
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
      Object.keys(saved).forEach((id) => {
        if (Array.isArray(saved[id])) savedWorkspace[id] = saved[id];
      });
    }
  } catch (error) {
    showToast('Saved sprite code could not be loaded.');
  }

  const current = workspace;
  workspaceBySprite = Object.create(null);
  allSprites().forEach((sprite) => {
    workspaceBySprite[sprite.id] = Array.isArray(savedWorkspace[sprite.id])
      ? savedWorkspace[sprite.id]
      : [];
  });

  activeWorkspaceSpriteId = state.spriteId;
  workspaceBySprite[activeWorkspaceSpriteId] = Array.isArray(savedWorkspace[activeWorkspaceSpriteId])
    ? savedWorkspace[activeWorkspaceSpriteId]
    : current;
  workspace = workspaceBySprite[activeWorkspaceSpriteId];
  saveSpriteWorkspaces();
  if (replacedEyeballSprite) {
    replacedEyeballSprite = false;
    saveRuntimeAssets();
    refreshSpritePicker();
    refreshAssetLists();
  }
  refreshSpriteStrip();
}

function saveSpriteWorkspaces() {
  if (!activeWorkspaceSpriteId || !workspaceBySprite) return;
  if (!allSprites().some((sprite) => sprite.id === activeWorkspaceSpriteId)) return;
  workspaceBySprite[activeWorkspaceSpriteId] = workspace;
  try {
    localStorage.setItem(SPRITE_WORKSPACES_KEY, JSON.stringify(workspaceBySprite));
  } catch (error) {
    showToast('Could not save sprite code.');
  }
}

function selectWorkspaceSprite(id) {
  if (!id || id === activeWorkspaceSpriteId) return;
  const sprite = allSprites().find((item) => item.id === id);
  if (!sprite) return;

  saveSpriteWorkspaces();
  saveActiveSpritePreviewPosition();
  if (!spritePreviewPositions[id]) spritePreviewPositions[id] = defaultSpritePreviewPosition(id);
  activeWorkspaceSpriteId = id;
  workspaceBySprite[id] = workspaceBySprite[id] || [];
  workspace = workspaceBySprite[id];
  applySpriteById(id, false);
  const position = spritePreviewPositions[id];
  const size = stageSize();
  state.x = position.x * size.w / 100;
  state.y = position.y * size.h / 100;
  updateSprite();
  saveRuntimeAssets();
  renderWorkspace();
  refreshAssetLists();
  refreshSpriteStrip();
}

function refreshSpriteStrip() {
  if (!spriteStripEl) return;
  spriteStripEl.innerHTML = '';
  allSprites().forEach((sprite) => {
    const item = document.createElement('div');
    item.className = 'sprite-card-item';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sprite-card' + (sprite.id === activeWorkspaceSpriteId ? ' is-selected' : '');
    button.setAttribute('aria-pressed', String(sprite.id === activeWorkspaceSpriteId));
    button.setAttribute('aria-label', 'Edit code for ' + (sprite.name || sprite.id));
    const image = document.createElement('img');
    image.src = sprite.src;
    image.alt = '';
    const name = document.createElement('span');
    name.textContent = sprite.name || sprite.id;
    button.append(image, name);
    button.addEventListener('click', () => selectWorkspaceSprite(sprite.id));
    item.appendChild(button);

    const duplicate = document.createElement('button');
    duplicate.type = 'button';
    duplicate.className = 'sprite-duplicate';
    duplicate.textContent = 'Duplicate';
    duplicate.setAttribute('aria-label', 'Duplicate ' + (sprite.name || sprite.id));
    duplicate.addEventListener('click', () => duplicateSpriteAsset(sprite.id));
    item.appendChild(duplicate);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'sprite-delete';
    remove.textContent = '×';
    remove.setAttribute('aria-label', 'Delete ' + (sprite.name || sprite.id));
    remove.title = 'Delete sprite';
    remove.addEventListener('click', () => removeSpriteAsset(sprite.id));
    item.appendChild(remove);
    spriteStripEl.appendChild(item);
  });

  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'sprite-add';
  add.textContent = '+ Add';
  add.setAttribute('aria-label', 'Add a sprite');
  add.addEventListener('click', () => {
    setView('assets');
    openSpriteCatalog();
  });
  spriteStripEl.appendChild(add);
  renderStageSpritePreviews();
}

function openSpriteCatalog() {
  const catalog = ((PACK.sprites && PACK.sprites.library) || []);
  const dialog = document.createElement('dialog');
  dialog.className = 'sprite-catalog';
  dialog.setAttribute('aria-labelledby', 'spriteCatalogTitle');

  const header = document.createElement('div');
  header.className = 'sprite-catalog-header';
  const title = document.createElement('h2');
  title.id = 'spriteCatalogTitle';
  title.textContent = 'Choose a sprite';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'btn btn-small btn-ghost';
  close.textContent = 'Close';
  close.addEventListener('click', () => dialog.close());
  header.append(title, close);
  dialog.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'sprite-catalog-grid';
  catalog.forEach((sprite) => {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'sprite-catalog-option';
    const image = document.createElement('img');
    image.src = sprite.src;
    image.alt = '';
    const name = document.createElement('span');
    name.textContent = sprite.name || sprite.id;
    option.append(image, name);
    option.addEventListener('click', () => {
      const added = addSpriteAsset(sprite.name, sprite.src);
      dialog.close();
      openAssetEditor(added, 'sprite');
    });
    grid.appendChild(option);
  });
  dialog.appendChild(grid);
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  document.body.appendChild(dialog);
  dialog.showModal();
}

function renderStageSpritePreviews() {
  if (!stageEl) return;
  stageEl.querySelectorAll('.stage-extra-sprite').forEach((element) => element.remove());
  const sprites = allSprites().filter((sprite) =>
    sprite.id !== state.spriteId && spriteVisibilityById[sprite.id] !== false
  );

  sprites.forEach((sprite) => {
    if (!spritePreviewPositions[sprite.id]) {
      spritePreviewPositions[sprite.id] = defaultSpritePreviewPosition(sprite.id);
    }
    const item = document.createElement('div');
    item.className = 'stage-extra-sprite';
    item.dataset.spriteId = sprite.id;
    item.style.left = spritePreviewPositions[sprite.id].x + '%';
    item.style.top = spritePreviewPositions[sprite.id].y + '%';
    item.style.zIndex = String(spritePreviewZIndex(sprite.id));

    const image = document.createElement('img');
    image.src = sprite.src;
    image.alt = sprite.name || sprite.id;
    item.appendChild(image);
    stageEl.appendChild(item);
  });
}

function spritePreviewZIndex(id) {
  const index = runtimeSprites.findIndex((sprite) => sprite.id === id);
  return Math.max(0, index) + 1;
}

function bringSpritePreviewToFront(id) {
  const sprite = id === state.spriteId
    ? spriteEl
    : stageEl.querySelector('.stage-extra-sprite[data-sprite-id="' + id + '"]');
  if (!sprite) return;
  const highest = Array.from(stageEl.querySelectorAll('.stage-extra-sprite'))
    .reduce((max, element) => Math.max(max, Number(element.style.zIndex) || 0),
      Number(spriteEl.style.zIndex) || 0);
  sprite.style.zIndex = String(highest + 1);
}

function defaultSpritePreviewPosition(id) {
  const sprites = allSprites().filter((sprite) => sprite.id !== state.spriteId);
  const index = Math.max(0, sprites.findIndex((sprite) => sprite.id === id));
  const columns = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(sprites.length))));
  const column = index % columns;
  const row = Math.floor(index / columns);
  return {
    x: 12 + (column + 0.5) * (76 / columns),
    y: row < 3 ? 18 + row * 14 : 88 - (row - 3) * 14
  };
}

function saveActiveSpritePreviewPosition() {
  if (!state.spriteId || !allSprites().some((sprite) => sprite.id === state.spriteId) ||
      typeof stageSize !== 'function') return;
  const size = stageSize();
  spritePreviewPositions[state.spriteId] = {
    x: clamp(state.x / size.w * 100, 5, 95),
    y: clamp(state.y / size.h * 100, 5, 95)
  };
}

function setSpritePreviewPosition(id, x, y) {
  spritePreviewPositions[id] = {
    x: clamp(x, 5, 95),
    y: clamp(y, 5, 95)
  };
  const sprite = stageEl.querySelector('.stage-extra-sprite[data-sprite-id="' + id + '"]');
  if (sprite) {
    sprite.style.left = spritePreviewPositions[id].x + '%';
    sprite.style.top = spritePreviewPositions[id].y + '%';
  }
}

function removeSpriteAsset(id) {
  if (allSprites().length <= 1) {
    showToast('Keep at least one sprite.');
    return;
  }

  runtimeSprites = runtimeSprites.filter((sprite) => sprite.id !== id);
  delete workspaceBySprite[id];
  delete spritePreviewPositions[id];
  if (activeWorkspaceSpriteId === id || state.spriteId === id) {
    activeWorkspaceSpriteId = '';
    state.spriteId = '';
    selectWorkspaceSprite(allSprites()[0].id);
  }
  saveSpriteWorkspaces();
  saveRuntimeAssets();
  refreshSpritePicker();
  refreshSpriteStrip();
  refreshAssetLists();
  renderPalette();
  renderWorkspace();
  showToast('Sprite deleted.');
}

function duplicateSpriteAsset(id) {
  const source = allSprites().find((sprite) => sprite.id === id);
  if (!source) return;

  const duplicate = Object.assign({}, source, {
    id: 'sprite-' + (++uid),
    name: (source.name || 'Sprite') + ' copy',
    custom: true,
    modified: false
  });
  runtimeSprites.push(duplicate);

  const sourceWorkspace = workspaceBySprite[id] || (activeWorkspaceSpriteId === id ? workspace : []);
  workspaceBySprite[duplicate.id] = sourceWorkspace.map((script) => {
    const copy = script.map(cloneBlockTree);
    copy.x = script.x;
    copy.y = script.y;
    copy.zIndex = script.zIndex;
    return copy;
  });

  saveSpriteWorkspaces();
  selectWorkspaceSprite(duplicate.id);
  refreshSpritePicker();
  refreshSpriteStrip();
  refreshAssetLists();
  saveRuntimeAssets();
  showToast('Sprite duplicated.');
}

function saveRuntimeAssets() {
  saveActiveSpritePreviewPosition();
  const payload = {
    sprites: runtimeSprites.filter((sprite) => sprite.custom || sprite.modified),
    backgrounds: runtimeBackgrounds.filter((bg) => bg.custom || bg.modified),
    deletedSprites: ((PACK.sprites && PACK.sprites.list) || [])
      .filter((sprite) => !runtimeSprites.some((item) => item.id === sprite.id))
      .map((sprite) => sprite.id),
    spritePreviewPositions: spritePreviewPositions,
    spriteVisibilityById: spriteVisibilityById,
    activeSprite: state.spriteId,
    activeBackground: state.backgroundId
  };
  try {
    localStorage.setItem(ASSETS_KEY, JSON.stringify(payload));
  } catch (error) {
    showToast('Could not save the new assets. Try a smaller image.');
  }
}

function makeBackgroundCss(color, accent) {
  return `radial-gradient(circle at 30% 18%, ${color}, ${accent} 62%, #020617)`;
}

function refreshSpritePicker() {
  const sprites = allSprites();
  spritePick.innerHTML = '';
  sprites.forEach((sprite) => {
    const option = document.createElement('option');
    option.value = sprite.id;
    option.textContent = sprite.name || sprite.id;
    spritePick.appendChild(option);
  });
  spritePick.value = state.spriteId;
  spritePick.hidden = sprites.length < 2;
}

function applySpriteById(id, persist) {
  const sprite = allSprites().find((item) => item.id === id) || allSprites()[0];
  if (!sprite) return;
  if (state.spriteId && state.spriteId !== sprite.id) {
    spriteVisibilityById[state.spriteId] = state.visible;
  }
  state.spriteId = sprite.id;
  state.visible = spriteVisibilityById[sprite.id] !== false;
  spriteImg.src = sprite.src;
  spriteImg.alt = sprite.name || 'Stage sprite';
  spritePick.value = sprite.id;
  renderStageSpritePreviews();
  if (persist) saveRuntimeAssets();
}

function applyBackgroundById(id, persist) {
  const background = allBackgrounds().find((item) => item.id === id) || allBackgrounds()[0];
  if (!background) return;
  state.backgroundId = background.id;
  stageEl.style.backgroundImage = background.css;
  stageEl.style.backgroundSize = background.size || 'cover';
  stageEl.style.backgroundPosition = background.position || 'center';
  stageEl.style.backgroundRepeat = background.repeat || 'no-repeat';
  if (persist) saveRuntimeAssets();
}

function makeAssetRow(item, active, kind) {
  const row = document.createElement('div');
  row.className = 'asset-row' + (active ? ' is-current' : '');

  const thumb = document.createElement('div');
  thumb.className = 'asset-thumb';
  if (kind === 'sprite') {
    const img = document.createElement('img');
    img.src = item.src;
    img.alt = '';
    thumb.appendChild(img);
  } else {
    thumb.style.backgroundImage = item.css;
    thumb.style.backgroundSize = item.size || 'cover';
  }
  row.appendChild(thumb);

  const info = document.createElement('div');
  info.className = 'asset-info';
  const title = document.createElement('strong');
  title.textContent = item.name || item.id;
  const meta = document.createElement('span');
  meta.textContent = item.custom ? 'Custom' : (item.modified ? 'Edited' : 'Built in');
  info.appendChild(title);
  info.appendChild(meta);
  row.appendChild(info);

  const use = document.createElement('button');
  use.type = 'button';
  use.className = 'btn btn-small';
  use.textContent = active ? 'Active' : 'Use';
  use.disabled = active;
  use.addEventListener('click', () => {
    if (kind === 'sprite') selectWorkspaceSprite(item.id);
    else applyBackgroundById(item.id, true);
    refreshAssetLists();
  });
  row.appendChild(use);

  const edit = document.createElement('button');
  edit.type = 'button';
  edit.className = 'btn btn-small btn-ghost';
  edit.textContent = 'Edit';
  edit.addEventListener('click', () => openAssetEditor(item, kind, row));
  row.appendChild(edit);

  if (item.custom) {
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'btn btn-small btn-ghost asset-remove';
    remove.textContent = 'Remove';
    remove.addEventListener('click', () => {
      if (kind === 'sprite') {
        removeSpriteAsset(item.id);
        return;
      } else {
        runtimeBackgrounds = runtimeBackgrounds.filter((bg) => bg.id !== item.id);
        if (state.backgroundId === item.id) {
          state.backgroundId = runtimeBackgrounds[0] ? runtimeBackgrounds[0].id : '';
          applyBackgroundById(state.backgroundId, false);
        }
      }
      saveRuntimeAssets();
      refreshSpritePicker();
      refreshSpriteStrip();
      refreshAssetLists();
      renderPalette();
      renderWorkspace();
    });
    row.appendChild(remove);
  }

  return row;
}

function openAssetEditor(item, kind, row) {
  assetEditorHost.innerHTML = '';
  assetEditorTitle.textContent = (kind === 'sprite' ? 'Create sprite from: ' : 'Edit background: ') + (item.name || item.id);

  const editor = document.createElement('form');
  editor.className = 'asset-editor';

  const nameLabel = document.createElement('label');
  nameLabel.className = 'asset-field';
  const nameCaption = document.createElement('span');
  nameCaption.textContent = 'Name';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.value = kind === 'sprite' ? (item.name || 'Sprite') + ' copy' : item.name || '';
  nameInput.maxLength = 48;
  nameLabel.append(nameCaption, nameInput);
  editor.appendChild(nameLabel);

  const tools = document.createElement('div');
  tools.className = 'paint-tools';

  const toolButtons = document.createElement('div');
  toolButtons.className = 'paint-tool-buttons';
  toolButtons.setAttribute('role', 'toolbar');
  toolButtons.setAttribute('aria-label', 'Drawing tools');
  let activeTool = 'brush';
  let autoSelectionReturnTool = null;
  [
    ['brush', 'Pencil'],
    ['erase', 'Eraser'],
    ['line', 'Line'],
    ['rectangle', 'Rectangle'],
    ['ellipse', 'Ellipse'],
    ['select', 'Select'],
    ['text', 'Text box'],
    ['fill', 'Fill canvas'],
    ['picker', 'Eyedropper']
  ].forEach(([tool, label]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'paint-tool-button' + (tool === activeTool ? ' is-selected' : '');
    button.dataset.tool = tool;
    button.textContent = label;
    button.setAttribute('aria-pressed', String(tool === activeTool));
    if (tool === 'select') {
      button.title = 'Select and move objects. Use the handles to resize or rotate; hold Shift to add to the selection.';
    }
    button.addEventListener('click', () => {
      setActiveTool(tool);
    });
    toolButtons.appendChild(button);
  });
  tools.appendChild(toolButtons);

  const colorLabel = document.createElement('label');
  colorLabel.className = 'paint-color';
  colorLabel.textContent = 'Color';
  const colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.value = kind === 'sprite' ? '#38bdf8' : '#17264f';
  colorInput.setAttribute('aria-label', 'Drawing color');
  colorLabel.appendChild(colorInput);
  tools.appendChild(colorLabel);

  const sizeLabel = document.createElement('label');
  sizeLabel.className = 'paint-size';
  sizeLabel.textContent = 'Size';
  const sizeInput = document.createElement('input');
  sizeInput.type = 'range';
  sizeInput.min = '1';
  sizeInput.max = kind === 'sprite' ? '128' : '160';
  sizeInput.value = kind === 'sprite' ? '32' : '48';
  sizeInput.setAttribute('aria-label', 'Brush size');
  sizeLabel.appendChild(sizeInput);
  tools.appendChild(sizeLabel);

  const textOptions = document.createElement('label');
  textOptions.className = 'paint-text-options';
  textOptions.hidden = true;
  const textCaption = document.createElement('span');
  textCaption.textContent = 'Text';
  const textInput = document.createElement('textarea');
  textInput.className = 'paint-text-input';
  textInput.rows = 2;
  textInput.maxLength = 500;
  textInput.placeholder = 'Type text to add';
  textInput.setAttribute('aria-label', 'Text to add to canvas');
  textOptions.append(textCaption, textInput);
  tools.appendChild(textOptions);

  const fontSizeLabel = document.createElement('label');
  fontSizeLabel.className = 'paint-font-size';
  fontSizeLabel.textContent = 'Font size';
  const fontSizeInput = document.createElement('input');
  fontSizeInput.type = 'number';
  fontSizeInput.min = '8';
  fontSizeInput.max = '128';
  fontSizeInput.value = '18';
  fontSizeInput.setAttribute('aria-label', 'Text font size');
  fontSizeLabel.appendChild(fontSizeInput);
  tools.appendChild(fontSizeLabel);
  fontSizeLabel.hidden = true;

  const undoButton = document.createElement('button');
  undoButton.type = 'button';
  undoButton.className = 'btn btn-small btn-ghost';
  undoButton.textContent = 'Undo';
  undoButton.disabled = true;
  tools.appendChild(undoButton);

  const redoButton = document.createElement('button');
  redoButton.type = 'button';
  redoButton.className = 'btn btn-small btn-ghost';
  redoButton.textContent = 'Redo';
  redoButton.disabled = true;
  tools.appendChild(redoButton);

  const clearButton = document.createElement('button');
  clearButton.type = 'button';
  clearButton.className = 'btn btn-small btn-ghost';
  clearButton.textContent = 'Clear canvas';
  tools.appendChild(clearButton);

  const imageLabel = document.createElement('label');
  imageLabel.className = 'btn btn-small upload-btn';
  imageLabel.textContent = 'Import image';
  const imageInput = document.createElement('input');
  imageInput.type = 'file';
  imageInput.accept = 'image/png,image/jpeg,image/gif,image/webp,image/svg+xml';
  imageInput.hidden = true;
  imageLabel.appendChild(imageInput);
  tools.appendChild(imageLabel);
  const canvasArea = document.createElement('div');
  canvasArea.className = 'paint-workspace';
  canvasArea.appendChild(tools);

  const canvasWrap = document.createElement('div');
  canvasWrap.className = 'paint-canvas-wrap' +
    (kind === 'sprite' ? ' is-transparent is-sprite-canvas' : '');
  if (kind === 'background') {
    canvasWrap.style.backgroundImage = item.css;
    canvasWrap.style.backgroundSize = item.size || 'cover';
    canvasWrap.style.backgroundPosition = item.position || 'center';
    canvasWrap.style.backgroundRepeat = item.repeat || 'no-repeat';
  }
  const canvas = document.createElement('canvas');
  canvas.width = kind === 'sprite' ? 512 : 820;
  canvas.height = kind === 'sprite' ? 512 : 1004;
  canvas.className = 'paint-canvas';
  canvas.setAttribute('aria-label', kind === 'sprite' ? 'Sprite drawing canvas' : 'Background drawing canvas');
  canvas.tabIndex = 0;
  canvasWrap.appendChild(canvas);
  const selectionOverlay = document.createElement('div');
  selectionOverlay.className = 'paint-selection';
  selectionOverlay.hidden = true;
  [
    ['nw', 'Resize selection from top left'],
    ['n', 'Resize selection from top'],
    ['ne', 'Resize selection from top right'],
    ['e', 'Resize selection from right'],
    ['se', 'Resize selection from bottom right'],
    ['s', 'Resize selection from bottom'],
    ['sw', 'Resize selection from bottom left'],
    ['w', 'Resize selection from left'],
    ['rotate', 'Rotate selection']
  ].forEach(([handle, label]) => {
    const control = document.createElement('button');
    control.type = 'button';
    control.className = 'paint-transform-handle paint-transform-' + handle;
    control.dataset.transformHandle = handle;
    control.setAttribute('aria-label', label);
    control.title = label;
    selectionOverlay.appendChild(control);
  });
  canvasWrap.appendChild(selectionOverlay);
  const orderPanel = document.createElement('div');
  orderPanel.className = 'paint-order-panel';
  const orderButton = document.createElement('button');
  orderButton.type = 'button';
  orderButton.className = 'paint-order-button';
  orderButton.textContent = 'Order';
  orderButton.setAttribute('aria-haspopup', 'menu');
  orderButton.setAttribute('aria-expanded', 'false');
  const orderMenu = document.createElement('div');
  orderMenu.className = 'paint-order-menu';
  orderMenu.setAttribute('role', 'menu');
  orderMenu.hidden = true;
  [
    ['forward', 'Bring forward'],
    ['backward', 'Send backward'],
    ['front', 'Bring to front'],
    ['back', 'Send to back']
  ].forEach(([direction, label]) => {
    const action = document.createElement('button');
    action.type = 'button';
    action.textContent = label;
    action.dataset.order = direction;
    action.setAttribute('role', 'menuitem');
    orderMenu.appendChild(action);
  });
  orderButton.addEventListener('click', () => {
    orderMenu.hidden = !orderMenu.hidden;
    orderButton.setAttribute('aria-expanded', String(!orderMenu.hidden));
  });
  orderPanel.append(orderButton, orderMenu);
  canvasArea.appendChild(canvasWrap);
  canvasArea.appendChild(orderPanel);
  editor.appendChild(canvasArea);

  const save = document.createElement('button');
  save.type = 'submit';
  save.className = 'btn btn-small';
  save.textContent = 'Save';
  save.disabled = Boolean(kind === 'sprite' ? item.src : item.drawSrc);
  editor.appendChild(save);

  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'btn btn-small btn-ghost';
  cancel.textContent = 'Cancel';
  cancel.addEventListener('click', () => setView('assets'));
  editor.appendChild(cancel);

  const context = canvas.getContext('2d');
  const undoStack = [];
  const redoStack = [];
  const layers = [];
  let drawing = false;
  let startPoint = null;
  let selectionStart = null;
  let selectionRect = null;
  let selectedLayer = null;
  let selectedLayers = new Set();
  let selectionMove = null;
  let marqueeSelecting = false;
  let marqueeAdditive = false;
  let transformGesture = null;
  let clipboard = null;
  let drawingLayer = null;
  let drawingContext = null;
  let drawingTool = null;
  let editingExistingLayer = false;
  let activePointerId = null;

  const makeLayer = () => {
    const layerCanvas = document.createElement('canvas');
    layerCanvas.width = canvas.width;
    layerCanvas.height = canvas.height;
    return { canvas: layerCanvas, x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };
  };

  const updateSelectionBounds = () => {
    selectionOverlay.classList.remove('is-marquee');
    const bounds = Array.from(selectedLayers)
      .map((index) => layers[index] && getLayerBounds(layers[index]))
      .filter(Boolean);
    orderButton.disabled = selectedLayers.size === 0;
    if (!bounds.length) {
      selectionRect = null;
      selectionOverlay.hidden = true;
      return;
    }
    const left = Math.min(...bounds.map((rect) => rect.x));
    const top = Math.min(...bounds.map((rect) => rect.y));
    const right = Math.max(...bounds.map((rect) => rect.x + rect.width));
    const bottom = Math.max(...bounds.map((rect) => rect.y + rect.height));
    updateSelection({ x: left, y: top, width: right - left, height: bottom - top });
  };

  const setActiveTool = (tool, returnTool) => {
    activeTool = tool;
    autoSelectionReturnTool = returnTool || null;
    if (tool !== 'select') selectionOverlay.hidden = true;
    else if (selectedLayers.size) updateSelectionBounds();
    const textSelected = tool === 'text';
    textOptions.hidden = !textSelected;
    fontSizeLabel.hidden = !textSelected;
    toolButtons.querySelectorAll('.paint-tool-button').forEach((button) => {
      const selected = button.dataset.tool === tool;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  };

  const renderLayers = () => {
    context.clearRect(0, 0, canvas.width, canvas.height);
    const drawLayer = (layer) => {
      context.save();
      context.translate(layer.x + canvas.width / 2, layer.y + canvas.height / 2);
      context.rotate(layer.rotation || 0);
      context.scale(layer.scaleX || 1, layer.scaleY || 1);
      context.drawImage(layer.canvas, -canvas.width / 2, -canvas.height / 2);
      context.restore();
    };
    layers.forEach(drawLayer);
    if (drawingLayer) drawLayer(drawingLayer);
  };

  const cloneLayers = () => layers.map((layer) => {
    const copy = makeLayer();
    copy.x = layer.x;
    copy.y = layer.y;
    copy.scaleX = layer.scaleX || 1;
    copy.scaleY = layer.scaleY || 1;
    copy.rotation = layer.rotation || 0;
    copy.bounds = layer.bounds && Object.assign({}, layer.bounds);
    copy.canvas.getContext('2d').drawImage(layer.canvas, 0, 0);
    return copy;
  });

  const reorderSelection = (direction) => {
    if (!selectedLayers.size) return;
    rememberCanvas();
    const selected = new Set(Array.from(selectedLayers, (index) => layers[index]));
    if (direction === 'front' || direction === 'back') {
      const selectedItems = layers.filter((layer) => selected.has(layer));
      const otherItems = layers.filter((layer) => !selected.has(layer));
      layers.splice(0, layers.length, ...(direction === 'front'
        ? otherItems.concat(selectedItems)
        : selectedItems.concat(otherItems)));
    } else if (direction === 'forward') {
      for (let index = layers.length - 2; index >= 0; index--) {
        if (selected.has(layers[index]) && !selected.has(layers[index + 1])) {
          [layers[index], layers[index + 1]] = [layers[index + 1], layers[index]];
        }
      }
    } else {
      for (let index = 1; index < layers.length; index++) {
        if (selected.has(layers[index]) && !selected.has(layers[index - 1])) {
          [layers[index], layers[index - 1]] = [layers[index - 1], layers[index]];
        }
      }
    }
    selectedLayers = new Set(layers.reduce((indices, layer, index) => {
      if (selected.has(layer)) indices.push(index);
      return indices;
    }, []));
    selectedLayer = selectedLayers.size ? Array.from(selectedLayers).pop() : null;
    orderMenu.hidden = true;
    orderButton.setAttribute('aria-expanded', 'false');
    updateSelectionBounds();
    renderLayers();
  };

  orderMenu.addEventListener('click', (event) => {
    const action = event.target.closest('[data-order]');
    if (action) reorderSelection(action.dataset.order);
  });

  const restoreLayers = (snapshot) => {
    layers.splice(0, layers.length, ...snapshot);
    selectedLayer = null;
    selectedLayers.clear();
    selectionRect = null;
    selectionOverlay.hidden = true;
    renderLayers();
  };

  const rememberCanvas = () => {
    undoStack.push(cloneLayers());
    if (undoStack.length > 8) undoStack.shift();
    redoStack.length = 0;
    undoButton.disabled = undoStack.length === 0;
    redoButton.disabled = true;
  };

  const updateSelection = (rect) => {
    selectionRect = rect;
    selectionOverlay.hidden = activeTool !== 'select';
    selectionOverlay.style.left = (rect.x / canvas.width * 100) + '%';
    selectionOverlay.style.top = (rect.y / canvas.height * 100) + '%';
    selectionOverlay.style.width = (rect.width / canvas.width * 100) + '%';
    selectionOverlay.style.height = (rect.height / canvas.height * 100) + '%';
  };

  const getLayerBounds = (layer) => {
    if (!layer.bounds) {
      const layerContext = layer.canvas.getContext('2d');
      const pixels = layerContext.getImageData(0, 0, canvas.width, canvas.height).data;
      let left = canvas.width;
      let top = canvas.height;
      let right = -1;
      let bottom = -1;
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          if (pixels[(y * canvas.width + x) * 4 + 3] === 0) continue;
          left = Math.min(left, x);
          top = Math.min(top, y);
          right = Math.max(right, x);
          bottom = Math.max(bottom, y);
        }
      }
      if (right < left || bottom < top) return null;
      layer.bounds = { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
    }
    const bounds = layer.bounds;
    const centerX = layer.x + canvas.width / 2;
    const centerY = layer.y + canvas.height / 2;
    const angle = layer.rotation || 0;
    const scaleX = layer.scaleX || 1;
    const scaleY = layer.scaleY || 1;
    const corners = [
      [bounds.x, bounds.y],
      [bounds.x + bounds.width, bounds.y],
      [bounds.x, bounds.y + bounds.height],
      [bounds.x + bounds.width, bounds.y + bounds.height]
    ].map(([x, y]) => {
      const scaledX = (x - canvas.width / 2) * scaleX;
      const scaledY = (y - canvas.height / 2) * scaleY;
      return {
        x: centerX + scaledX * Math.cos(angle) - scaledY * Math.sin(angle),
        y: centerY + scaledX * Math.sin(angle) + scaledY * Math.cos(angle)
      };
    });
    const left = Math.min(...corners.map((point) => point.x));
    const top = Math.min(...corners.map((point) => point.y));
    const right = Math.max(...corners.map((point) => point.x));
    const bottom = Math.max(...corners.map((point) => point.y));
    return {
      x: left,
      y: top,
      width: right - left,
      height: bottom - top
    };
  };

  const undo = () => {
    const previous = undoStack.pop();
    if (!previous) return;
    redoStack.push(cloneLayers());
    if (redoStack.length > 30) redoStack.shift();
    restoreLayers(previous);
    undoButton.disabled = undoStack.length === 0;
    redoButton.disabled = false;
  };

  const redo = () => {
    const next = redoStack.pop();
    if (!next) return;
    undoStack.push(cloneLayers());
    restoreLayers(next);
    undoButton.disabled = false;
    redoButton.disabled = redoStack.length === 0;
  };

  const copySelection = () => {
    const copies = Array.from(selectedLayers)
      .filter((index) => layers[index])
      .map((index) => {
        const layer = layers[index];
        const copy = makeLayer();
        copy.x = layer.x;
        copy.y = layer.y;
        copy.scaleX = layer.scaleX || 1;
        copy.scaleY = layer.scaleY || 1;
        copy.rotation = layer.rotation || 0;
        copy.bounds = layer.bounds && Object.assign({}, layer.bounds);
        copy.canvas.getContext('2d').drawImage(layer.canvas, 0, 0);
        return copy;
      });
    if (copies.length) clipboard = copies;
  };

  const pasteClipboard = () => {
    if (!clipboard || !clipboard.length) return;
    rememberCanvas();
    selectedLayers.clear();
    clipboard.forEach((source) => {
      const copy = makeLayer();
      copy.x = clamp(source.x + 12, 1 - canvas.width, canvas.width - 1);
      copy.y = clamp(source.y + 12, 1 - canvas.height, canvas.height - 1);
      copy.scaleX = source.scaleX || 1;
      copy.scaleY = source.scaleY || 1;
      copy.rotation = source.rotation || 0;
      copy.bounds = source.bounds && Object.assign({}, source.bounds);
      copy.canvas.getContext('2d').drawImage(source.canvas, 0, 0);
      layers.push(copy);
      selectedLayers.add(layers.length - 1);
    });
    selectedLayer = layers.length - 1;
    setActiveTool('select');
    updateSelectionBounds();
    renderLayers();
  };

  const deleteSelection = () => {
    if (!selectedLayers.size) return;
    rememberCanvas();
    Array.from(selectedLayers)
      .sort((a, b) => b - a)
      .forEach((index) => layers.splice(index, 1));
    selectedLayers.clear();
    selectedLayer = null;
    selectionRect = null;
    selectionOverlay.hidden = true;
    renderLayers();
  };

  editor.addEventListener('keydown', (event) => {
    if (event.target.matches('input, textarea, select')) return;
    if (!event.ctrlKey && !event.metaKey && !event.altKey) {
      const shortcutTools = {
        Escape: 'select',
        r: 'rectangle',
        c: 'ellipse',
        t: 'text',
        l: 'line'
      };
      const shortcut = shortcutTools[event.key] || shortcutTools[event.key.toLowerCase()];
      if (shortcut) {
        event.preventDefault();
        setActiveTool(shortcut);
        return;
      }
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      deleteSelection();
      return;
    }
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === 'c') {
      event.preventDefault();
      copySelection();
    } else if (key === 'v') {
      event.preventDefault();
      pasteClipboard();
    } else if (key === 'z' && event.shiftKey) {
      event.preventDefault();
      redo();
    } else if (key === 'z') {
      event.preventDefault();
      undo();
    } else if (key === 'y') {
      event.preventDefault();
      redo();
    }
  });

  const loadImage = (source) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not load this asset into the editor.'));
    image.src = source;
  });
  const imageSource = kind === 'sprite' ? item.src : item.drawSrc;
  if (kind === 'sprite' && Array.isArray(item.layers) && item.layers.length) {
    Promise.all(item.layers.map((savedLayer) => loadImage(savedLayer.src).then((image) => {
      const layer = makeLayer();
      layer.x = Number(savedLayer.x) || 0;
      layer.y = Number(savedLayer.y) || 0;
      layer.scaleX = Number(savedLayer.scaleX) || 1;
      layer.scaleY = Number(savedLayer.scaleY) || 1;
      layer.rotation = Number(savedLayer.rotation) || 0;
      layer.canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      return layer;
    }))).then((restoredLayers) => {
      layers.push(...restoredLayers);
      renderLayers();
      save.disabled = false;
    }).catch((error) => showToast(error.message));
  } else if (imageSource) {
    loadImage(imageSource).then((image) => {
      const layer = makeLayer();
      layer.canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      layers.push(layer);
      renderLayers();
      save.disabled = false;
    }).catch((error) => showToast(error.message));
  }

  const pointFromEvent = (event) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * canvas.width / rect.width,
      y: (event.clientY - rect.top) * canvas.height / rect.height
    };
  };

  selectionOverlay.addEventListener('pointerdown', (event) => {
    const handle = event.target.closest('[data-transform-handle]');
    if (!handle || !selectionRect || !selectedLayers.size) return;
    event.preventDefault();
    event.stopPropagation();
    selectionOverlay.setPointerCapture(event.pointerId);
    activePointerId = event.pointerId;
    const point = pointFromEvent(event);
    const rect = Object.assign({}, selectionRect);
    const center = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    const angle = Math.atan2(point.y - center.y, point.x - center.x);
    rememberCanvas();
    transformGesture = {
      handle: handle.dataset.transformHandle,
      start: point,
      rect: rect,
      center: center,
      startAngle: angle,
      layers: Array.from(selectedLayers).map((index) => {
        const layer = layers[index];
        return {
          layer: layer,
          x: layer.x,
          y: layer.y,
          scaleX: layer.scaleX || 1,
          scaleY: layer.scaleY || 1,
          rotation: layer.rotation || 0
        };
      })
    };
  });

  selectionOverlay.addEventListener('pointermove', (event) => {
    if (!transformGesture || event.pointerId !== activePointerId) return;
    const point = pointFromEvent(event);
    const gesture = transformGesture;
    if (gesture.handle === 'rotate') {
      const currentAngle = Math.atan2(
        point.y - gesture.center.y,
        point.x - gesture.center.x
      );
      const rotation = currentAngle - gesture.startAngle;
      gesture.layers.forEach((entry) => {
        const layerCenterX = entry.x + canvas.width / 2;
        const layerCenterY = entry.y + canvas.height / 2;
        const dx = layerCenterX - gesture.center.x;
        const dy = layerCenterY - gesture.center.y;
        entry.layer.x = gesture.center.x + dx * Math.cos(rotation) -
          dy * Math.sin(rotation) - canvas.width / 2;
        entry.layer.y = gesture.center.y + dx * Math.sin(rotation) +
          dy * Math.cos(rotation) - canvas.height / 2;
        entry.layer.rotation = entry.rotation + rotation;
      });
    } else {
      const directions = {
        nw: [-1, -1], n: [0, -1], ne: [1, -1], e: [1, 0],
        se: [1, 1], s: [0, 1], sw: [-1, 1], w: [-1, 0]
      };
      const [directionX, directionY] = directions[gesture.handle];
      let left = gesture.rect.x;
      let right = gesture.rect.x + gesture.rect.width;
      let top = gesture.rect.y;
      let bottom = gesture.rect.y + gesture.rect.height;
      if (directionX < 0) left = Math.min(point.x, right - 1);
      else if (directionX > 0) right = Math.max(point.x, left + 1);
      if (directionY < 0) top = Math.min(point.y, bottom - 1);
      else if (directionY > 0) bottom = Math.max(point.y, top + 1);
      const scaleX = Math.max(0.05, Math.min(20, (right - left) / gesture.rect.width));
      const scaleY = Math.max(0.05, Math.min(20, (bottom - top) / gesture.rect.height));
      const nextCenterX = (left + right) / 2;
      const nextCenterY = (top + bottom) / 2;
      const oldCenterX = gesture.rect.x + gesture.rect.width / 2;
      const oldCenterY = gesture.rect.y + gesture.rect.height / 2;
      gesture.layers.forEach((entry) => {
        const layerCenterX = entry.x + canvas.width / 2;
        const layerCenterY = entry.y + canvas.height / 2;
        entry.layer.x = nextCenterX + (layerCenterX - oldCenterX) * scaleX -
          canvas.width / 2;
        entry.layer.y = nextCenterY + (layerCenterY - oldCenterY) * scaleY -
          canvas.height / 2;
        entry.layer.scaleX = entry.scaleX * scaleX;
        entry.layer.scaleY = entry.scaleY * scaleY;
      });
    }
    updateSelectionBounds();
    renderLayers();
  });

  const finishTransform = (event) => {
    if (!transformGesture || (event && event.pointerId !== activePointerId)) return;
    transformGesture = null;
    activePointerId = null;
    updateSelectionBounds();
  };
  selectionOverlay.addEventListener('pointerup', finishTransform);
  selectionOverlay.addEventListener('pointercancel', finishTransform);

  const drawShape = (targetContext, tool, from, to) => {
    const width = Math.max(1, Number(sizeInput.value) || 1);
    targetContext.lineWidth = width;
    targetContext.lineCap = 'round';
    targetContext.lineJoin = 'round';
    targetContext.globalCompositeOperation = tool === 'erase' ? 'destination-out' : 'source-over';
    targetContext.strokeStyle = colorInput.value;
    targetContext.fillStyle = colorInput.value;

    if (tool === 'brush' || tool === 'erase' || tool === 'line') {
      targetContext.beginPath();
      targetContext.moveTo(from.x, from.y);
      targetContext.lineTo(to.x, to.y);
      targetContext.stroke();
    } else if (tool === 'rectangle') {
      targetContext.fillRect(from.x, from.y, to.x - from.x, to.y - from.y);
    } else if (tool === 'ellipse') {
      const rx = Math.abs(to.x - from.x) / 2;
      const ry = Math.abs(to.y - from.y) / 2;
      targetContext.beginPath();
      targetContext.ellipse((from.x + to.x) / 2, (from.y + to.y) / 2, rx, ry, 0, 0, Math.PI * 2);
      targetContext.fill();
    }
    targetContext.globalCompositeOperation = 'source-over';
  };

  const drawText = (point) => {
    const text = textInput.value.trim();
    if (!text) {
      textInput.focus();
      return;
    }

    rememberCanvas();
    drawingLayer = makeLayer();
    drawingContext = drawingLayer.canvas.getContext('2d');
    const resolutionScale = canvas.width / (kind === 'sprite' ? 128 : 410);
    const fontSize = Math.max(8, Math.min(128, Number(fontSizeInput.value) || 18)) *
      resolutionScale;
    const lineHeight = fontSize * 1.2;
    const maxWidth = Math.max(fontSize, canvas.width - point.x - fontSize / 2);
    const lines = [];
    drawingContext.font = '600 ' + fontSize + 'px sans-serif';
    text.split(/\r?\n/).forEach((paragraph) => {
      let line = '';
      paragraph.split(/\s+/).forEach((word) => {
        const candidate = line ? line + ' ' + word : word;
        if (line && drawingContext.measureText(candidate).width > maxWidth) {
          lines.push(line);
          line = word;
        } else {
          line = candidate;
        }
      });
      lines.push(line);
    });

    drawingContext.save();
    drawingContext.fillStyle = colorInput.value;
    drawingContext.font = '600 ' + fontSize + 'px sans-serif';
    drawingContext.textBaseline = 'top';
    lines.forEach((line, index) => {
      drawingContext.fillText(line, point.x, point.y + index * lineHeight, maxWidth);
    });
    drawingContext.restore();
    layers.push(drawingLayer);
    selectedLayer = layers.length - 1;
    selectedLayers.clear();
    selectedLayers.add(selectedLayer);
    drawingLayer = null;
    drawingContext = null;
    selectionRect = getLayerBounds(layers[selectedLayer]);
    renderLayers();
    setActiveTool('select', 'text');
    updateSelectionBounds();
  };

  const findLayerAt = (point) => {
    for (let index = layers.length - 1; index >= 0; index--) {
      const layer = layers[index];
      const centerX = layer.x + canvas.width / 2;
      const centerY = layer.y + canvas.height / 2;
      const dx = point.x - centerX;
      const dy = point.y - centerY;
      const angle = -(layer.rotation || 0);
      const unrotatedX = dx * Math.cos(angle) - dy * Math.sin(angle);
      const unrotatedY = dx * Math.sin(angle) + dy * Math.cos(angle);
      const localX = Math.floor(unrotatedX / (layer.scaleX || 1) + canvas.width / 2);
      const localY = Math.floor(unrotatedY / (layer.scaleY || 1) + canvas.height / 2);
      const left = Math.max(0, localX - 3);
      const top = Math.max(0, localY - 3);
      const right = Math.min(canvas.width, localX + 4);
      const bottom = Math.min(canvas.height, localY + 4);
      if (left >= right || top >= bottom) continue;
      const pixels = layer.canvas.getContext('2d')
        .getImageData(left, top, right - left, bottom - top).data;
      for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] > 8) return index;
      }
    }
    return -1;
  };

  const selectLayer = (index) => {
    selectedLayer = index >= 0 ? index : null;
    selectedLayers.clear();
    if (selectedLayer !== null) selectedLayers.add(selectedLayer);
    updateSelectionBounds();
  };

  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    event.preventDefault();
    canvas.focus({ preventScroll: true });
    canvas.setPointerCapture(event.pointerId);
    activePointerId = event.pointerId;
    const point = pointFromEvent(event);
    const tool = activeTool;

    if (tool === 'text') {
      drawText(point);
      activePointerId = null;
      return;
    }

    if (tool === 'picker') {
      const pixel = context.getImageData(
        Math.floor(point.x),
        Math.floor(point.y),
        1,
        1
      ).data;
      if (pixel[3]) {
        colorInput.value = '#' + Array.from(pixel.slice(0, 3))
          .map((channel) => channel.toString(16).padStart(2, '0'))
          .join('');
      }
      activePointerId = null;
      return;
    }

    if (tool === 'select') {
      const hit = findLayerAt(point);
      if (hit >= 0) {
        if (!selectedLayers.has(hit)) {
          if (!event.shiftKey) selectedLayers.clear();
          selectedLayers.add(hit);
        }
        selectedLayer = hit;
        updateSelectionBounds();
        rememberCanvas();
        selectionMove = {
          start: point,
          layers: Array.from(selectedLayers).map((index) => ({
            layer: layers[index],
            startX: layers[index].x,
            startY: layers[index].y
          }))
        };
        drawing = true;
      } else {
        if (autoSelectionReturnTool && !event.shiftKey) {
          selectedLayer = null;
          selectedLayers.clear();
          selectionRect = null;
          selectionOverlay.hidden = true;
          const returnTool = autoSelectionReturnTool;
          setActiveTool(returnTool);
          activePointerId = null;
          return;
        }
        if (!event.shiftKey) {
          selectedLayer = null;
          selectedLayers.clear();
        }
        selectionStart = point;
        marqueeAdditive = event.shiftKey;
        marqueeSelecting = true;
        drawing = true;
        selectionOverlay.classList.add('is-marquee');
        updateSelection({ x: point.x, y: point.y, width: 0, height: 0 });
      }
      return;
    }

    if (tool === 'erase') {
      const hit = findLayerAt(point);
      if (hit < 0) return;
      rememberCanvas();
      selectedLayer = hit;
      selectedLayers.clear();
      selectedLayers.add(hit);
      drawingLayer = layers[hit];
      drawingLayer.bounds = null;
      drawingContext = drawingLayer.canvas.getContext('2d');
      editingExistingLayer = true;
      drawing = true;
      startPoint = point;
      drawShape(drawingContext, tool, point, point);
      renderLayers();
      return;
    }

    rememberCanvas();
    drawingLayer = makeLayer();
    drawingContext = drawingLayer.canvas.getContext('2d');

    if (tool === 'fill') {
      drawingContext.fillStyle = colorInput.value;
      drawingContext.fillRect(0, 0, canvas.width, canvas.height);
      layers.push(drawingLayer);
      selectedLayer = layers.length - 1;
      selectedLayers.clear();
      selectedLayers.add(selectedLayer);
      drawingLayer = null;
      drawingContext = null;
      selectionRect = getLayerBounds(layers[selectedLayer]);
      renderLayers();
      setActiveTool('select', tool);
      updateSelectionBounds();
      activePointerId = null;
      return;
    }

    drawingTool = tool;
    drawing = true;
    startPoint = point;
    if (tool === 'brush' || tool === 'erase') {
      drawShape(drawingContext, tool, point, point);
      renderLayers();
    }
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!drawing || event.pointerId !== activePointerId) return;
    const point = pointFromEvent(event);
    const tool = activeTool;
    if (tool === 'select') {
      if (selectionMove) {
        const deltaX = point.x - selectionMove.start.x;
        const deltaY = point.y - selectionMove.start.y;
        const minX = Math.min(...selectionMove.layers.map((entry) => entry.startX));
        const maxX = Math.max(...selectionMove.layers.map((entry) => entry.startX));
        const minY = Math.min(...selectionMove.layers.map((entry) => entry.startY));
        const maxY = Math.max(...selectionMove.layers.map((entry) => entry.startY));
        const boundedX = clamp(deltaX, 1 - canvas.width - minX, canvas.width - 1 - maxX);
        const boundedY = clamp(deltaY, 1 - canvas.height - minY, canvas.height - 1 - maxY);
        selectionMove.layers.forEach((entry) => {
          entry.layer.x = entry.startX + boundedX;
          entry.layer.y = entry.startY + boundedY;
        });
        updateSelectionBounds();
        renderLayers();
      } else if (marqueeSelecting) {
        const left = Math.min(selectionStart.x, point.x);
        const top = Math.min(selectionStart.y, point.y);
        const right = Math.max(selectionStart.x, point.x);
        const bottom = Math.max(selectionStart.y, point.y);
        updateSelection({ x: left, y: top, width: right - left, height: bottom - top });
      }
    } else if (tool === 'brush' || tool === 'erase') {
      drawShape(drawingContext, tool, startPoint, point);
      startPoint = point;
      renderLayers();
    } else {
      drawingContext.clearRect(0, 0, canvas.width, canvas.height);
      drawShape(drawingContext, tool, startPoint, point);
      renderLayers();
    }
  });

  const finishDrawing = (event) => {
    if (!drawing || (event && event.pointerId !== activePointerId)) return;
    drawing = false;
    if (selectionMove) {
      updateSelectionBounds();
      selectionMove = null;
    } else if (marqueeSelecting) {
      const rect = selectionRect;
      if (!marqueeAdditive) selectedLayers.clear();
      layers.forEach((layer, index) => {
        const bounds = getLayerBounds(layer);
        if (!bounds || !rect) return;
        const intersects = bounds.x <= rect.x + rect.width &&
          bounds.x + bounds.width >= rect.x &&
          bounds.y <= rect.y + rect.height &&
          bounds.y + bounds.height >= rect.y;
        if (intersects) selectedLayers.add(index);
      });
      selectedLayer = selectedLayers.size
        ? Array.from(selectedLayers).pop()
        : null;
      marqueeSelecting = false;
      marqueeAdditive = false;
      updateSelectionBounds();
    } else if (editingExistingLayer) {
      editingExistingLayer = false;
      drawingLayer = null;
      drawingContext = null;
      selectionOverlay.hidden = activeTool !== 'select';
      renderLayers();
    } else if (drawingLayer) {
      if (getLayerBounds(drawingLayer)) {
        layers.push(drawingLayer);
        selectedLayer = layers.length - 1;
        selectedLayers.clear();
        selectedLayers.add(selectedLayer);
      }
      drawingLayer = null;
      drawingContext = null;
      renderLayers();
      if (selectedLayer !== null) {
        setActiveTool('select', drawingTool);
        updateSelectionBounds();
      } else {
        selectionOverlay.hidden = true;
      }
    }
    drawingTool = null;
    startPoint = null;
    activePointerId = null;
  };
  canvas.addEventListener('pointerup', finishDrawing);
  canvas.addEventListener('pointercancel', finishDrawing);

  undoButton.addEventListener('click', () => {
    undo();
  });

  redoButton.addEventListener('click', () => {
    redo();
  });

  clearButton.addEventListener('click', () => {
    rememberCanvas();
    layers.length = 0;
    selectedLayer = null;
    selectedLayers.clear();
    selectionRect = null;
    selectionOverlay.hidden = true;
    context.clearRect(0, 0, canvas.width, canvas.height);
  });

  imageInput.addEventListener('change', () => {
    const file = imageInput.files && imageInput.files[0];
    if (!file) return;
    readImageFile(file, (src) => {
      const image = new Image();
      image.onload = () => {
        rememberCanvas();
        const layer = makeLayer();
        const scale = Math.min(canvas.width / image.width, canvas.height / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        layer.canvas.getContext('2d').drawImage(
          image,
          (canvas.width - width) / 2,
          (canvas.height - height) / 2,
          width,
          height
        );
        layers.push(layer);
        selectedLayer = layers.length - 1;
        selectedLayers.clear();
        selectedLayers.add(selectedLayer);
        selectionRect = getLayerBounds(layer);
        updateSelectionBounds();
        renderLayers();
      };
      image.onerror = () => showToast('Could not load that image into the editor.');
      image.src = src;
      imageInput.value = '';
    });
  });

  editor.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = String(nameInput.value || '').trim();
    if (!name) {
      nameInput.focus();
      showToast('Enter a name for this asset.');
      return;
    }

    const updated = Object.assign({}, item, {
      name: name,
      custom: Boolean(item.custom),
      modified: !item.custom || Boolean(item.modified)
    });
    const imageData = canvas.toDataURL('image/png');
    if (kind === 'sprite') {
      updated.src = imageData;
      updated.layers = layers.map((layer) => ({
        src: layer.canvas.toDataURL('image/png'),
        x: layer.x,
        y: layer.y,
        scaleX: layer.scaleX || 1,
        scaleY: layer.scaleY || 1,
        rotation: layer.rotation || 0
      }));
      saveSpriteWorkspaces();
      if (state.spriteId === item.id) saveActiveSpritePreviewPosition();
      const created = Object.assign({}, updated, {
        id: 'sprite-' + (++uid),
        custom: true,
        modified: false
      });
      runtimeSprites.push(created);
      const sourceWorkspace = workspaceBySprite[item.id] ||
        (activeWorkspaceSpriteId === item.id ? workspace : []);
      workspaceBySprite[created.id] = sourceWorkspace.map((script) => {
        const copy = script.map(cloneBlockTree);
        copy.x = script.x;
        copy.y = script.y;
        copy.zIndex = script.zIndex;
        return copy;
      });
      const sourcePosition = spritePreviewPositions[item.id] || defaultSpritePreviewPosition(item.id);
      spritePreviewPositions[created.id] = {
        x: clamp(sourcePosition.x + 6, 5, 95),
        y: clamp(sourcePosition.y + 6, 5, 95)
      };
      spriteVisibilityById[created.id] = true;
      selectWorkspaceSprite(created.id);
    } else {
      const baseCss = item.baseCss || item.css;
      updated.baseCss = baseCss;
      updated.drawSrc = imageData;
      updated.css = 'url("' + imageData + '"), ' + baseCss;
      updated.size = 'cover, ' + (item.baseSize || item.size || 'cover');
      updated.position = 'center, ' + (item.basePosition || item.position || 'center');
      updated.repeat = 'no-repeat, ' + (item.baseRepeat || item.repeat || 'no-repeat');
      updated.baseSize = item.baseSize || item.size || 'cover';
      updated.basePosition = item.basePosition || item.position || 'center';
      updated.baseRepeat = item.baseRepeat || item.repeat || 'no-repeat';
      runtimeBackgrounds = runtimeBackgrounds.map((bg) => bg.id === item.id ? updated : bg);
      if (state.backgroundId === item.id) applyBackgroundById(item.id, false);
    }

    saveRuntimeAssets();
    refreshSpritePicker();
    refreshSpriteStrip();
    refreshAssetLists();
    renderPalette();
    renderWorkspace();
    showToast(kind === 'sprite' ? 'New sprite created; original unchanged.' : 'Background updated.');
    setView('assets');
  });

  assetEditorHost.appendChild(editor);
  setView('asset-editor');
  nameInput.focus();
}

function refreshAssetLists() {
  if (spriteListEl) {
    spriteListEl.innerHTML = '';
    allSprites().forEach((sprite) => {
      spriteListEl.appendChild(makeAssetRow(sprite, sprite.id === state.spriteId, 'sprite'));
    });
  }
  if (bgListEl) {
    bgListEl.innerHTML = '';
    allBackgrounds().forEach((bg) => {
      bgListEl.appendChild(makeAssetRow(bg, bg.id === state.backgroundId, 'background'));
    });
  }
}

function addSpriteAsset(name, src) {
  const sprite = {
    id: 'sprite-' + (++uid),
    name: name || 'New sprite',
    src: src,
    custom: true
  };
  runtimeSprites.push(sprite);
  workspaceBySprite[sprite.id] = [];
  selectWorkspaceSprite(sprite.id);
  refreshSpritePicker();
  refreshSpriteStrip();
  refreshAssetLists();
  renderPalette();
  renderWorkspace();
  showToast('Sprite created.');
  return sprite;
}

function addBackgroundAsset(name, css, size) {
  const background = {
    id: 'bg-' + (++uid),
    name: name || 'New background',
    css: css,
    baseCss: css,
    size: size || 'cover',
    custom: true
  };
  runtimeBackgrounds.push(background);
  applyBackgroundById(background.id, true);
  refreshAssetLists();
  renderPalette();
  renderWorkspace();
  showToast('Background created.');
}

function readImageFile(file, onLoad) {
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    showToast('Choose an image smaller than 2 MB.');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => onLoad(String(reader.result || ''));
  reader.onerror = () => showToast('Could not read that image.');
  reader.readAsDataURL(file);
}

function baseFileName(file) {
  return String(file.name || 'Image').replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
}

function initAssetManager() {
  if (newSpriteBtn) {
    newSpriteBtn.addEventListener('click', openSpriteCatalog);
  }

  if (makeCustomSpriteBtn) {
    makeCustomSpriteBtn.addEventListener('click', () => {
      const blankCanvas = document.createElement('canvas');
      blankCanvas.width = 512;
      blankCanvas.height = 512;
      const sprite = addSpriteAsset('New sprite', blankCanvas.toDataURL('image/png'));
      openAssetEditor(sprite, 'sprite');
    });
  }

  if (spritePick && !spritePick.dataset.bound) {
    spritePick.dataset.bound = 'true';
    spritePick.addEventListener('change', () => {
      const selectedId = spritePick.value;
      const selectedSprite = allSprites().find((sprite) => sprite.id === selectedId);
      if (selectedSprite) {
        selectWorkspaceSprite(selectedId);
        return;
      }
      selectWorkspaceSprite(selectedId);
    });
  }

  if (spriteUploadInput) {
    spriteUploadInput.addEventListener('change', () => {
      const file = spriteUploadInput.files && spriteUploadInput.files[0];
      readImageFile(file, (src) => {
        addSpriteAsset(baseFileName(file), src);
        spriteUploadInput.value = '';
      });
    });
  }

  if (createBgBtn) {
    createBgBtn.addEventListener('click', () => {
      const name = String(bgNameInput.value || '').trim() || 'New background';
      const color = bgColorInput.value || '#17264f';
      const accent = bgAccentInput.value || '#060a14';
      addBackgroundAsset(name, makeBackgroundCss(color, accent), 'cover');
    });
  }

  if (bgUploadInput) {
    bgUploadInput.addEventListener('change', () => {
      const file = bgUploadInput.files && bgUploadInput.files[0];
      readImageFile(file, (src) => {
        addBackgroundAsset(baseFileName(file), 'url("' + src + '")', 'cover');
        bgUploadInput.value = '';
      });
    });
  }
}

function initSprites() {
  loadRuntimeAssets();
  refreshSpritePicker();
  applySpriteById(state.spriteId, false);
  applyBackgroundById(state.backgroundId, false);
  refreshAssetLists();
  initAssetManager();
  initSpriteDragging();
}
