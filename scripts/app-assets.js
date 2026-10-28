'use strict';

/* ---------- Stage sprites and backgrounds ---------- */

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
        runtimeSprites.push(Object.assign({}, sprite, { custom: true }));
      }
    });
  }
  if (Array.isArray(saved.backgrounds)) {
    saved.backgrounds.forEach((bg) => {
      if (bg && bg.id && bg.css) {
        runtimeBackgrounds.push(Object.assign({}, bg, { custom: true }));
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
}

function saveRuntimeAssets() {
  const payload = {
    sprites: runtimeSprites.filter((sprite) => sprite.custom),
    backgrounds: runtimeBackgrounds.filter((bg) => bg.custom),
    activeSprite: state.spriteId,
    activeBackground: state.backgroundId
  };
  try {
    localStorage.setItem(ASSETS_KEY, JSON.stringify(payload));
  } catch (error) {
    showToast('Could not save the new assets. Try a smaller image.');
  }
}

function makeSpriteDataUrl(name, color, symbol) {
  const label = String(symbol || (name || 'S').slice(0, 1)).slice(0, 2);
  const safeLabel = label
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const safeName = String(name || 'Sprite')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
<defs>
  <radialGradient id="g" cx="35%" cy="25%" r="80%">
    <stop offset="0%" stop-color="#ffffff" stop-opacity=".55"/>
    <stop offset="55%" stop-color="${color}" stop-opacity=".95"/>
    <stop offset="100%" stop-color="${color}"/>
  </radialGradient>
</defs>
<circle cx="64" cy="64" r="56" fill="url(#g)" stroke="#ffffff" stroke-opacity=".35" stroke-width="3"/>
<text x="64" y="82" text-anchor="middle" font-family="'Segoe UI', system-ui, sans-serif" font-size="${label.length > 1 ? 42 : 54}" font-weight="700" fill="#ffffff">${safeLabel}</text>
<title>${safeName}</title>
</svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
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
  state.spriteId = sprite.id;
  spriteImg.src = sprite.src;
  spriteImg.alt = sprite.name || 'Stage sprite';
  spritePick.value = sprite.id;
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
  meta.textContent = item.custom ? 'Custom' : 'Built in';
  info.appendChild(title);
  info.appendChild(meta);
  row.appendChild(info);

  const use = document.createElement('button');
  use.type = 'button';
  use.className = 'btn btn-small';
  use.textContent = active ? 'Active' : 'Use';
  use.disabled = active;
  use.addEventListener('click', () => {
    if (kind === 'sprite') applySpriteById(item.id, true);
    else applyBackgroundById(item.id, true);
    refreshAssetLists();
  });
  row.appendChild(use);

  if (item.custom) {
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'btn btn-small btn-ghost asset-remove';
    remove.textContent = 'Remove';
    remove.addEventListener('click', () => {
      if (kind === 'sprite') {
        runtimeSprites = runtimeSprites.filter((sprite) => sprite.id !== item.id);
        if (state.spriteId === item.id) {
          state.spriteId = runtimeSprites[0] ? runtimeSprites[0].id : '';
          applySpriteById(state.spriteId, false);
        }
      } else {
        runtimeBackgrounds = runtimeBackgrounds.filter((bg) => bg.id !== item.id);
        if (state.backgroundId === item.id) {
          state.backgroundId = runtimeBackgrounds[0] ? runtimeBackgrounds[0].id : '';
          applyBackgroundById(state.backgroundId, false);
        }
      }
      saveRuntimeAssets();
      refreshSpritePicker();
      refreshAssetLists();
      renderPalette();
      renderWorkspace();
    });
    row.appendChild(remove);
  }

  return row;
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
  applySpriteById(sprite.id, true);
  refreshSpritePicker();
  refreshAssetLists();
  renderPalette();
  renderWorkspace();
  showToast('Sprite created.');
}

function addBackgroundAsset(name, css, size) {
  const background = {
    id: 'bg-' + (++uid),
    name: name || 'New background',
    css: css,
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
  if (spritePick && !spritePick.dataset.bound) {
    spritePick.dataset.bound = 'true';
    spritePick.addEventListener('change', () => {
      applySpriteById(spritePick.value, true);
      refreshAssetLists();
    });
  }

  if (createSpriteBtn) {
    createSpriteBtn.addEventListener('click', () => {
      const name = String(spriteNameInput.value || '').trim() || 'New sprite';
      const color = spriteColorInput.value || '#38bdf8';
      const symbol = String(spriteSymbolInput.value || '').trim();
      addSpriteAsset(name, makeSpriteDataUrl(name, color, symbol));
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
}
