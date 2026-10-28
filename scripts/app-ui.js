'use strict';

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

  const path = parseBlockPath(el.dataset.path);
  const block = blockAtPath(path);
  if (!block) return;

  const group = dragGroupAt(path);
  startDrag(event, block, { path }, el, group);
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
