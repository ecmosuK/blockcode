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

const buildNoticeEl = $('buildNotice');
const buildNoticeCloseEl = $('buildNoticeClose');
const buildNoticeProgressEl = $('buildNoticeProgress');
const buildNoticeTitleEl = $('buildNoticeTitle');
const buildNoticeMessageEl = $('buildNoticeMessage');
const buildNoticeActionsEl = $('buildNoticeActions');
const buildNoticeRetryEl = $('buildNoticeRetry');
const buildNoticeRepairEl = $('buildNoticeRepair');
const buildNoticeCancelEl = $('buildNoticeCancel');

function setBuildNoticeActions(actions = {}) {
  const visible = {
    retry: Boolean(actions.retry),
    repair: Boolean(actions.repair),
    cancel: Boolean(actions.cancel)
  };
  buildNoticeRetryEl.hidden = !visible.retry;
  buildNoticeRepairEl.hidden = !visible.repair;
  buildNoticeCancelEl.hidden = !visible.cancel;
  buildNoticeActionsEl.hidden = !(visible.retry || visible.repair || visible.cancel);
}

function setBuildNoticeProgress(loading, percent) {
  const determinate = Boolean(loading) && typeof percent === 'number' && Number.isFinite(percent);
  buildNoticeProgressEl.classList.toggle('is-determinate', determinate);
  buildNoticeProgressEl.hidden = !loading;
  if (determinate) {
    buildNoticeProgressEl.style.setProperty(
      '--build-progress',
      `${Math.max(0, Math.min(100, percent))}%`
    );
  } else {
    buildNoticeProgressEl.style.removeProperty('--build-progress');
  }
}

function showBuildNotice(title, message, status, loading, options = {}) {
  buildNoticeEl.classList.toggle('is-error', status === 'error');
  buildNoticeEl.classList.toggle('is-success', status === 'success');
  buildNoticeEl.classList.toggle('is-loading', Boolean(loading));
  buildNoticeEl.setAttribute('aria-busy', String(Boolean(loading)));
  buildNoticeTitleEl.textContent = title;
  buildNoticeMessageEl.textContent = message;
  setBuildNoticeProgress(Boolean(loading), options.percent);
  setBuildNoticeActions(options.actions || {});
  buildNoticeEl.hidden = false;
}

function toolchainNotice(status) {
  if (!status || !status.phase || status.phase === 'idle') return null;
  if (status.phase === 'ready') {
    return {
      title: 'Watch build tools ready',
      message: status.message || 'ESP-IDF 6.1 and the ESP32-S3 build tools are installed.',
      status: 'success',
      loading: false,
      actions: {}
    };
  }
  if (status.phase === 'error' || status.phase === 'cancelled') {
    return {
      title: status.phase === 'cancelled' ? 'Watch build setup cancelled' : 'Watch build setup failed',
      message: status.message || 'The watch build tools could not be set up.',
      status: 'error',
      loading: false,
      actions: { retry: true, repair: true }
    };
  }
  return {
    title: 'Setting up watch build tools',
    message: status.message || 'Preparing the ESP-IDF 6.1 and ESP32-S3 build tools…',
    status: 'loading',
    loading: true,
    actions: { cancel: Boolean(status.canCancel) },
    percent: typeof status.percent === 'number' ? status.percent : undefined
  };
}

function renderToolchainStatus(status) {
  const notice = toolchainNotice(status);
  if (!notice) return;
  showBuildNotice(notice.title, notice.message, notice.status, notice.loading, {
    actions: notice.actions,
    percent: notice.percent
  });
  if (status.phase === 'ready') {
    setTimeout(() => {
      if (buildNoticeEl.classList.contains('is-success')) buildNoticeEl.hidden = true;
    }, 3500);
  }
}

if (window.blockCodeDesktop && window.blockCodeDesktop.onBuildServiceStatus) {
  window.blockCodeDesktop.onBuildServiceStatus((status) => {
    if (!status || !status.message) {
      buildNoticeEl.hidden = true;
      return;
    }
    showBuildNotice('Starting watch build service', status.message, 'loading', true);
  });
}

if (window.blockCodeDesktop && window.blockCodeDesktop.onToolchainStatus) {
  window.blockCodeDesktop.onToolchainStatus(renderToolchainStatus);
}

if (window.blockCodeDesktop && window.blockCodeDesktop.getToolchainStatus) {
  window.blockCodeDesktop.getToolchainStatus().then((status) => {
    if (status && status.phase && status.phase !== 'idle' && status.phase !== 'ready') {
      renderToolchainStatus(status);
    }
  }).catch(() => {
    /* the desktop bridge is unavailable in the browser build */
  });
}

buildNoticeCloseEl.addEventListener('click', () => {
  buildNoticeEl.hidden = true;
});

buildNoticeRetryEl.addEventListener('click', async () => {
  showBuildNotice(
    'Setting up watch build tools',
    'Retrying the watch build tools setup…',
    'loading',
    true,
    { actions: { cancel: true } }
  );
  try {
    await window.blockCodeDesktop.retryToolchainSetup();
  } catch {
    /* failures are reported through the toolchain status channel */
  }
});

buildNoticeRepairEl.addEventListener('click', async () => {
  showBuildNotice(
    'Repairing watch build tools',
    'Removing and reinstalling ESP-IDF 6.1 and the ESP32-S3 build tools…',
    'loading',
    true,
    { actions: { cancel: true } }
  );
  try {
    await window.blockCodeDesktop.repairToolchain();
  } catch {
    /* failures are reported through the toolchain status channel */
  }
});

buildNoticeCancelEl.addEventListener('click', () => {
  if (window.blockCodeDesktop && window.blockCodeDesktop.cancelToolchainSetup) {
    window.blockCodeDesktop.cancelToolchainSetup().catch(() => {});
  }
});

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
  if (assetEditorBack) {
    assetEditorBack.addEventListener('click', () => setView('assets'));
  }

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
  const scriptEl = el.closest('.script');
  if (scriptEl) bringScriptToFront(Number(scriptEl.dataset.script));
  if (event.target.closest('input')) return;
  if (event.button !== undefined && event.button !== 0) return;

  if (el.classList.contains('reporter')) {
    const sourceSlot = el.closest('.expr-slot');
    const sourceBlock = sourceSlot
      ? findExpressionBlockById(sourceSlot.dataset.blockId)
      : null;
    const expression = sourceBlock && sourceSlot
      ? sourceBlock.params[sourceSlot.dataset.field]
      : null;
    if (sourceSlot && isExpression(expression) && expression.id === el.dataset.id) {
      startExpressionDrag(event, expression, el, sourceSlot);
      return;
    }
    if (!sourceSlot) {
      const path = parseBlockPath(el.dataset.path);
      const block = blockAtPath(path);
      if (block) {
        startExpressionDrag(event, block, el, null, { path: path });
        return;
      }
    }
  }

  const path = parseBlockPath(el.dataset.path);
  const block = blockAtPath(path);
  if (!block) return;

  const now = performance.now();
  if (lastBlockClick &&
      lastBlockClick.id === block.id &&
      now - lastBlockClick.time <= DOUBLE_CLICK_MS) {
    selectBlockOnly(block);
  }

  const group = dragGroupAt(path);
  startDrag(event, block, { path }, el, group);
});

scriptsEl.addEventListener('dblclick', (event) => {
  if (event.target.closest('input, select, textarea')) return;
  const el = event.target.closest('.block[data-path]');
  if (!el || el.classList.contains('reporter')) return;
  const block = blockAtPath(parseBlockPath(el.dataset.path));
  if (!block) return;

  event.preventDefault();
  lastBlockClick = null;
  selectBlockOnly(block);
});

canvasEl.addEventListener('wheel', (event) => {
  if (!event.ctrlKey && !event.metaKey) return;
  event.preventDefault();
  const factor = Math.exp(-event.deltaY * 0.001);
  const rect = canvasEl.getBoundingClientRect();
  setWorkspaceZoom(
    workspaceZoom * factor,
    event.clientX - rect.left - canvasEl.clientLeft,
    event.clientY - rect.top - canvasEl.clientTop
  );
}, { passive: false });

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
buildAppBtn.addEventListener('click', buildWatchApp);
uploadBtn.addEventListener('click', uploadWatchApp);

window.addEventListener('resize', () => {
  normalizeLayoutSizes();
  syncStageGeometry();
});
