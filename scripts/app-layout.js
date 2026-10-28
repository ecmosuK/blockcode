'use strict';

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
