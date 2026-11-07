'use strict';

/* ---------- Dragging ---------- */

let stackPreviewSources = [];
let sourceSnapPreview = null;
const STACK_SNAP_DISTANCE = 96;
const STACK_SNAP_LEFT = 120;
const STACK_SNAP_HYSTERESIS = 12;

function wrapperForPath(path) {
  const el = scriptsEl.querySelector('.block[data-path="' + blockPathKey(path) + '"]');
  if (!el) return null;
  if (el.classList.contains('cblock-head')) return el.closest('.cblock') || el;
  return el;
}

function pathIsInside(parentPath, childPath) {
  if (!parentPath || !childPath || childPath.length <= parentPath.length) return false;
  for (let i = 0; i < parentPath.length; i++) {
    if (parentPath[i] !== childPath[i]) return false;
  }
  return true;
}

function preserveWorkspaceDragScale(ghost, fromWorkspace) {
  if (!fromWorkspace || workspaceZoom === 1) return;
  ghost.style.transformOrigin = 'top left';
  ghost.style.transform = 'scale(' + workspaceZoom + ') rotate(-1.5deg) scale(1.03)';
}

function startDrag(event, block, from, sourceEl, group) {
  if (!block) return;
  if (event.button !== undefined && event.button !== 0) return;
  if (event.target.closest('input, select, textarea')) return;

  if (state.running) {
    showToast('Stop the program before editing.');
    return;
  }

  event.preventDefault();

  const dragBlocks = group ? group.blocks : [block];
  let sourceEls = [];

  if (from) {
    if (group) {
      sourceEls = group.blocks.map((item, index) => {
        return wrapperForPath(group.parentPath.concat(group.start + index));
      }).filter(Boolean);
    } else {
      sourceEls = [wrapperForPath(from.path)].filter(Boolean);
    }
  }

  if (!sourceEls.length) sourceEls.push(sourceEl);

  const rects = sourceEls.map((el) => el.getBoundingClientRect());
  const left = Math.min.apply(null, rects.map((rect) => rect.left));
  const top = Math.min.apply(null, rects.map((rect) => rect.top));
  const right = Math.max.apply(null, rects.map((rect) => rect.right));
  const bottom = Math.max.apply(null, rects.map((rect) => rect.bottom));

  let ghost = null;
  const ghostScale = from ? workspaceZoom : 1;
  if (dragBlocks.length > 1) {
    ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.style.width = ((right - left) / ghostScale) + 'px';
      sourceEls.forEach((el) => {
        const clone = el.cloneNode(true);
        clone.classList.remove('is-dragging', 'is-selected', 'is-active');
        clone.querySelectorAll('.is-dragging, .is-selected, .is-active, .is-ghost').forEach((node) => {
          node.classList.remove('is-dragging', 'is-selected', 'is-active', 'is-ghost');
        });
        clone.querySelectorAll('input, select').forEach((input) => {
        input.readOnly = true;
        input.tabIndex = -1;
      });
      ghost.appendChild(clone);
    });
  } else {
    ghost = sourceEls[0].cloneNode(true);
    ghost.classList.add('is-ghost');
    ghost.classList.remove('is-dragging', 'is-selected', 'is-active');
    ghost.querySelectorAll('.is-dragging, .is-selected, .is-active, .is-ghost').forEach((node) => {
      node.classList.remove('is-dragging', 'is-selected', 'is-active', 'is-ghost');
    });
    ghost.querySelectorAll('input, select').forEach((input) => {
      input.readOnly = true;
      input.tabIndex = -1;
    });
    ghost.style.width = ((right - left) / ghostScale) + 'px';
  }

  preserveWorkspaceDragScale(ghost, Boolean(from));
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
    parentPath: group ? group.parentPath : (from ? from.path.slice(0, -1) : null),
    startIndex: group ? group.start : (from ? from.path[from.path.length - 1] : 0),
    groupRect: { left: left, top: top, right: right, bottom: bottom },
    offsetX: event.clientX - left,
    offsetY: event.clientY - top,
    startX: event.clientX,
    startY: event.clientY,
    lastX: event.clientX,
    lastY: event.clientY,
    previousTargetKey: null,
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
    if (event.clientX === drag.startX && event.clientY === drag.startY) return;
    drag.moved = true;
    emptyEl.classList.add('is-hidden');

    if (drag.from) {
      if (drag.isolated) {
        selectBlockOnly(drag.block);
      } else {
        selectBlockRange(drag.from.path);
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

function clearDropHighlight() {
  document.querySelectorAll('.cblock.is-drop-target').forEach((el) => {
    el.classList.remove('is-drop-target');
  });
}

function clearStackPreview() {
  snapPreview.style.display = 'none';
  snapPreview.replaceChildren();
  if (sourceSnapPreview) {
    sourceSnapPreview.style.display = 'none';
    sourceSnapPreview.replaceChildren();
  }
  stackPreviewSources.forEach((source) => source.classList.remove('is-stack-preview-source'));
  stackPreviewSources = [];
}

function previewBlockInScript(blocks, id) {
  for (const block of blocks) {
    const match = findBlockInTree(block, id);
    if (match) return match;
  }
  return null;
}

function previewContainerForPath(blocks, path) {
  if (path.length === 1) return blocks;
  const parent = blockAtPath(path);
  const previewParent = parent && previewBlockInScript(blocks, parent.id);
  return previewParent && Array.isArray(previewParent.children)
    ? previewParent.children
    : null;
}

function cloneScriptBlocks(scriptIndex) {
  return (workspace[scriptIndex] || []).map((block) => JSON.parse(JSON.stringify(block)));
}

function removeFromPreviewScript(blocks, parentPath, start, count) {
  const source = previewContainerForPath(blocks, parentPath);
  if (source) source.splice(start, count);
}

function renderStackPreview(preview, scriptIndex, blocks, incomingIds) {
  const scriptEl = scriptsEl.querySelector('.script[data-script="' + scriptIndex + '"]');
  if (!scriptEl) return false;
  const rect = scriptEl.getBoundingClientRect();
  blocks.forEach((block, index) => {
    const rendered = renderBlock(block, [scriptIndex, index]);
    if (!rendered) return;
    if (incomingIds.has(block.id)) rendered.classList.add('stack-preview-incoming');
    rendered.querySelectorAll('input, select').forEach((input) => {
      input.readOnly = true;
      input.tabIndex = -1;
    });
    preview.appendChild(rendered);
  });
  preview.style.left = rect.left + 'px';
  preview.style.top = rect.top + 'px';
  preview.style.transform = 'scale(' + workspaceZoom + ')';
  preview.style.display = 'flex';
  scriptEl.classList.add('is-stack-preview-source');
  stackPreviewSources.push(scriptEl);
  return true;
}

function showStackPreview(target) {
  clearStackPreview();
  const targetScriptIndex = target.parentPath[0];
  const sourceScriptIndex = drag.from ? drag.parentPath[0] : null;
  const sameScript = sourceScriptIndex === targetScriptIndex;
  const sameContainer = drag.from &&
    containerAtPath(drag.parentPath) === target.container;
  const sourceBlocks = drag.groupBlocks || [drag.block];
  const sourceCount = sourceBlocks.length;
  const targetBlocks = cloneScriptBlocks(targetScriptIndex);
  if (sameScript && drag.from) {
    removeFromPreviewScript(targetBlocks, drag.parentPath, drag.startIndex, sourceCount);
  }

  const targetContainer = previewContainerForPath(targetBlocks, target.parentPath);
  if (!targetContainer) return;
  let index = target.index;
  if (sameContainer && drag.startIndex < target.index) index -= sourceCount;
  index = clamp(index, 0, targetContainer.length);
  const incoming = sourceBlocks.map((block) => JSON.parse(JSON.stringify(block)));
  targetContainer.splice(index, 0, ...incoming);

  if (isCBlock(drag.block)) {
    const following = targetContainer.splice(index + incoming.length);
    incoming[0].children = (incoming[0].children || []).concat(following);
  }

  const incomingIds = new Set(incoming.map((block) => block.id));
  if (!renderStackPreview(snapPreview, targetScriptIndex, targetBlocks, incomingIds)) return;

  if (drag.from && !sameScript) {
    if (!sourceSnapPreview) {
      sourceSnapPreview = document.createElement('div');
      sourceSnapPreview.className = 'snap-preview';
      sourceSnapPreview.setAttribute('aria-hidden', 'true');
      document.body.appendChild(sourceSnapPreview);
    }
    const sourceBlocksPreview = cloneScriptBlocks(sourceScriptIndex);
    removeFromPreviewScript(sourceBlocksPreview, drag.parentPath, drag.startIndex, sourceCount);
    renderStackPreview(sourceSnapPreview, sourceScriptIndex, sourceBlocksPreview, new Set());
  }
}

function targetInsideSource(d, parentPath) {
  const source = d.from && d.from.path;
  if (!source || !parentPath) return false;
  if (parentPath.length < source.length) return false;
  for (let i = 0; i < source.length; i++) {
    if (parentPath[i] !== source[i]) return false;
  }
  return true;
}

function candidatePreservesHatOrder(candidate, d) {
  const incoming = d.groupBlocks || [d.block];
  if (incoming.some((block) => isHat(block)) && candidate.parentPath.length !== 1) {
    return false;
  }

  const blocks = candidate.container.slice();
  const sourceContainer = d.from ? containerAtPath(d.parentPath) : null;
  const sourceCount = d.groupBlocks ? d.groupBlocks.length : 1;
  const movingWithinContainer = sourceContainer === candidate.container;
  if (movingWithinContainer) blocks.splice(d.startIndex, sourceCount);

  let index = candidate.index;
  if (movingWithinContainer && d.startIndex < candidate.index) index -= sourceCount;
  index = clamp(index, 0, blocks.length);
  blocks.splice(index, 0, ...incoming);

  return blocks.every((block, blockIndex) => !isHat(block) || blockIndex === 0);
}

function updateDropTarget(x, y) {
  const canvasRect = canvasEl.getBoundingClientRect();
  drag.inside = x >= canvasRect.left && x <= canvasRect.right &&
    y >= canvasRect.top && y <= canvasRect.bottom;

  const previousTargetKey = drag.previousTargetKey;
  drag.target = null;
  clearDropHighlight();

  if (!drag.inside) {
    clearStackPreview();
    drag.previousTargetKey = null;
    return;
  }

  const dx = x - drag.startX;
  const dy = y - drag.startY;
  const sourceTop = drag.sourceEls[0].classList.contains('cblock')
    ? drag.sourceEls[0].querySelector('.cblock-head')
    : drag.sourceEls[0];
  const sourceRect = sourceTop.getBoundingClientRect();
  const movingRect = {
    left: sourceRect.left + dx,
    right: sourceRect.right + dx,
    top: sourceRect.top + dy,
    bottom: sourceRect.bottom + dy
  };
  const movingCenterY = (movingRect.top + movingRect.bottom) / 2;

  const blocks = Array.prototype.slice.call(
    scriptsEl.querySelectorAll('.script .block[data-path]')
  ).filter((el) => {
    if (el.closest('.block.is-dragging, .cblock.is-dragging')) return false;
    if (el.classList.contains('reporter')) return false;
    return true;
  });

  const candidates = new Map();

  blocks.forEach((el) => {
    const path = parseBlockPath(el.dataset.path);
    const targetEl = el.classList.contains('cblock-head')
      ? (el.closest('.cblock') || el)
      : el;
    const rect = targetEl.getBoundingClientRect();
    if (Math.abs(movingRect.left - rect.left) > STACK_SNAP_LEFT) return;

    if (path.length < 2) return;
    const parentPath = path.slice(0, -1);
    if (targetInsideSource(drag, parentPath)) return;
    const container = containerAtPath(parentPath);
    if (!container) return;

    [true, false].forEach((before) => {
      if (before && isHat(blockAtPath(path))) return;
      const previewY = before ? rect.top : rect.bottom;
      const index = path[path.length - 1] + (before ? 0 : 1);
      const key = blockPathKey(parentPath) + ':' + index;
      const gap = Math.abs(movingCenterY - previewY);
      const candidate = {
        parentPath: parentPath,
        container: container,
        index: index,
        before: before,
        previewY: previewY,
        key: key,
        gap: gap,
        rect: rect,
        el: el
      };
      const existing = candidates.get(key);
      if (!existing || gap < existing.gap) candidates.set(key, candidate);
    });
  });

  document.querySelectorAll('.cblock-empty, .cblock-tail').forEach((zone) => {
    if (zone.closest('.snap-preview')) return;
    if (!zone.dataset.emptyPath) return;
    if (zone.closest('.block.is-dragging, .cblock.is-dragging')) return;
    const rect = zone.getBoundingClientRect();
    const hit = x >= rect.left - 24 && x <= rect.right + 40 &&
      y >= rect.top - 8 && y <= rect.bottom + 10;
    if (!hit) return;

    const parentPath = parseBlockPath(zone.dataset.emptyPath);
    if (targetInsideSource(drag, parentPath)) return;
    const container = containerAtPath(parentPath);
    if (!container) return;
    const gap = Math.abs(movingCenterY - rect.top);
    const key = 'zone:' + blockPathKey(parentPath);
    const candidate = {
      parentPath: parentPath,
      container: container,
      index: container.length,
      before: true,
      previewY: rect.top,
      key: key,
      gap: gap,
      rect: rect,
      el: zone,
      zone: true
    };
    const existing = candidates.get(key);
    if (!existing || gap < existing.gap) candidates.set(key, candidate);
  });

  const eligible = Array.from(candidates.values()).filter((candidate) =>
    candidate.gap <= STACK_SNAP_DISTANCE &&
    candidatePreservesHatOrder(candidate, drag));
  eligible.sort((a, b) => a.gap - b.gap || a.key.localeCompare(b.key));
  let best = eligible[0] || null;
  if (best && previousTargetKey) {
    const previous = eligible.find((candidate) => candidate.key === previousTargetKey);
    if (previous && previous.gap <= best.gap + STACK_SNAP_HYSTERESIS) best = previous;
  }

  if (best) {
    let insertIndex = best.index;
    const sourceContainer = drag.from ? containerAtPath(drag.parentPath) : null;
    if (sourceContainer === best.container && drag.startIndex < best.index) {
      insertIndex -= drag.groupBlocks ? drag.groupBlocks.length : 1;
    }
    drag.target = {
      parentPath: best.parentPath,
      container: best.container,
      index: best.index,
      insertIndex: insertIndex,
      append: false
    };
    drag.previousTargetKey = best.key;
    if (best.zone) {
      const block = best.el.closest('.cblock');
      if (block) block.classList.add('is-drop-target');
    }
    if (previousTargetKey !== best.key) {
      showStackPreview(best);
    }
  } else {
    clearStackPreview();
    drag.previousTargetKey = null;
    drag.target = { append: true };
  }
}

function removeDraggedSource(d) {
  if (!d.from) return null;
  const container = containerAtPath(d.parentPath);
  if (!container) return null;
  const count = d.groupBlocks ? d.groupBlocks.length : 1;
  container.splice(d.startIndex, count);
  return { container: container, index: d.startIndex, count: count };
}

function onPointerUp(event) {
  if (!drag) return;

  if (event && event.type !== 'pointercancel' && drag.moved) {
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    drag.ghost.style.left = (event.clientX - drag.offsetX) + 'px';
    drag.ghost.style.top = (event.clientY - drag.offsetY) + 'px';
    updateDropTarget(event.clientX, event.clientY);
  }

  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
  window.removeEventListener('pointercancel', onPointerUp);

  const d = drag;
  drag = null;

  document.body.classList.remove('is-dragging');
  toolboxEl.classList.remove('is-delete-target');
  clearStackPreview();
  clearDropHighlight();
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
      selectBlockRange(d.from.path);
      lastBlockClick = { id: d.block.id, time: now };
    }
  } else if (d.moved) {
    lastBlockClick = null;
    suppressCanvasClickUntil = performance.now() + 250;
  }

  if (!d.moved) {
    if (!d.from) {
      runPaletteBlock(d.block);
    }
  } else if (overPalette) {
    const removed = removeDraggedSource(d);
    if (removed) {
      const ids = new Set();
      collectBlockIds(dragBlocks, ids);
      ids.forEach((id) => selectedBlockIds.delete(id));
      if (ids.has(isolatedBlockId)) isolatedBlockId = null;
      changed = true;
      showToast(dragCount + (dragCount === 1 ? ' block deleted.' : ' blocks deleted.'));
    }
  } else if (d.inside && d.target) {
    if (d.target.append) {
      const pos = freeDropPosition(d);
      removeDraggedSource(d);
      workspace.push(makeScript(dragBlocks, pos.x, pos.y));
      changed = true;
    } else {
      const targetContainer = d.target.container;
      let index = d.target.insertIndex;
      removeDraggedSource(d);

      if (targetContainer) {
        index = clamp(index, 0, targetContainer.length);
        targetContainer.splice(index, 0, ...dragBlocks);
        if (isCBlock(dragBlocks[0])) {
          const loop = dragBlocks[0];
          const following = targetContainer.splice(index + dragCount);
          loop.children = (Array.isArray(loop.children) ? loop.children : []).concat(following);
        }
        changed = true;
      } else {
        const pos = freeDropPosition(d);
        workspace.push(makeScript(dragBlocks, pos.x, pos.y));
        changed = true;
      }
    }
  }

  if (changed) {
    workspace = workspace.filter((script) => script.length > 0);
    renderWorkspace(focusBlockId);
  } else {
    emptyEl.classList.toggle('is-hidden', workspace.length > 0);
  }
}

function clearExpressionTarget() {
  document.querySelectorAll('.expr-slot.is-expr-target').forEach((slot) => {
    slot.classList.remove('is-expr-target');
  });
}

function findExpressionBlockById(id) {
  let match = null;
  const visit = (block) => {
    if (!block || match) return;
    if (block.id === id) {
      match = block;
      return;
    }
    Object.keys(block.params || {}).forEach((field) => {
      const value = block.params[field];
      if (isExpression(value)) visit(value);
    });
    (block.children || []).forEach(visit);
  };

  workspace.forEach((script) => script.forEach(visit));
  return match;
}

function findBlockInTree(block, id) {
  if (!block) return null;
  if (block.id === id) return block;

  let match = null;
  Object.keys(block.params || {}).some((field) => {
    const value = block.params[field];
    if (isExpression(value)) match = findBlockInTree(value, id);
    return !!match;
  });
  if (match) return match;

  (block.children || []).some((child) => {
    match = findBlockInTree(child, id);
    return !!match;
  });
  return match;
}

function clearExpressionPreview(d) {
  if (Array.isArray(d.preview)) d.preview.forEach((preview) => preview.remove());
  else if (d.preview) d.preview.remove();
  (d.previewSources || []).forEach((source) => source.classList.remove('is-stack-preview-source'));
  d.preview = null;
  d.previewSources = [];
  d.previewSlot = null;
}

function scriptIndexForBlockId(id) {
  const elements = scriptsEl.querySelectorAll('.block[data-id]');
  for (const element of elements) {
    if (element.dataset.id !== id) continue;
    const script = element.closest('.script');
    return script ? Number(script.dataset.script) : null;
  }
  return null;
}

function renderExpressionScriptPreview(scriptIndex, blocks, incomingId) {
  const scriptEl = scriptsEl.querySelector('.script[data-script="' + scriptIndex + '"]');
  if (!scriptEl) return null;
  const rect = scriptEl.getBoundingClientRect();
  const preview = document.createElement('div');
  preview.className = 'expression-script-preview';
  blocks.forEach((block, index) => {
    const rendered = renderBlock(block, [scriptIndex, index]);
    if (!rendered) return;
    if (incomingId) {
      rendered.querySelectorAll('.block[data-id]').forEach((element) => {
        if (element.dataset.id === incomingId) element.classList.add('stack-preview-incoming');
      });
    }
    rendered.querySelectorAll('input, select').forEach((input) => {
      input.readOnly = true;
      input.tabIndex = -1;
    });
    preview.appendChild(rendered);
  });
  preview.style.left = rect.left + 'px';
  preview.style.top = rect.top + 'px';
  preview.style.transform = 'scale(' + workspaceZoom + ')';
  document.body.appendChild(preview);
  scriptEl.classList.add('is-stack-preview-source');
  return { preview: preview, source: scriptEl };
}

function showExpressionPreview(d, slot) {
  if (d.previewSlot === slot) return;
  clearExpressionPreview(d);
  if (!slot) return;

  const target = findExpressionBlockById(slot.dataset.blockId);
  const targetScriptIndex = target && scriptIndexForBlockId(target.id);
  if (!target || targetScriptIndex === null) return;
  const targetBlocks = cloneScriptBlocks(targetScriptIndex);

  if (d.fromPath && d.fromPath[0] === targetScriptIndex) {
    const sourcePath = d.fromPath;
    removeFromPreviewScript(
      targetBlocks,
      sourcePath.slice(0, -1),
      sourcePath[sourcePath.length - 1],
      1
    );
  } else if (d.sourceBlockId && d.sourceField &&
      scriptIndexForBlockId(d.sourceBlockId) === targetScriptIndex) {
    const source = previewBlockInScript(targetBlocks, d.sourceBlockId);
    if (source) source.params[d.sourceField] =
      defaultBlockFieldValue(source.type, d.sourceField);
  }

  const targetPreview = previewBlockInScript(targetBlocks, target.id);
  if (!targetPreview) return;
  targetPreview.params[slot.dataset.field] = JSON.parse(JSON.stringify(d.block));

  const previews = [];
  const targetPreviewResult = renderExpressionScriptPreview(targetScriptIndex, targetBlocks, d.block.id);
  if (!targetPreviewResult) return;
  previews.push(targetPreviewResult);

  const sourceScriptIndex = d.sourceBlockId
    ? scriptIndexForBlockId(d.sourceBlockId)
    : null;
  if (d.fromPath && d.fromPath[0] !== targetScriptIndex) {
    const sourceBlocks = cloneScriptBlocks(d.fromPath[0]);
    removeFromPreviewScript(
      sourceBlocks,
      d.fromPath.slice(0, -1),
      d.fromPath[d.fromPath.length - 1],
      1
    );
    const sourcePreviewResult = renderExpressionScriptPreview(d.fromPath[0], sourceBlocks);
    if (sourcePreviewResult) previews.push(sourcePreviewResult);
  } else if (d.sourceBlockId && d.sourceField && sourceScriptIndex !== targetScriptIndex) {
    const sourceBlocks = cloneScriptBlocks(sourceScriptIndex);
    const source = previewBlockInScript(sourceBlocks, d.sourceBlockId);
    if (source) {
      source.params[d.sourceField] = defaultBlockFieldValue(source.type, d.sourceField);
      const sourcePreviewResult = renderExpressionScriptPreview(sourceScriptIndex, sourceBlocks);
      if (sourcePreviewResult) previews.push(sourcePreviewResult);
    }
  }

  d.preview = previews.map((item) => item.preview);
  d.previewSources = previews.map((item) => item.source);
  d.previewSlot = slot;
}

function startExpressionDrag(event, block, sourceEl, sourceSlot, from) {
  if (!block || isReporter(block) === false) return;
  if (event.button !== undefined && event.button !== 0) return;
  if (state.running) {
    showToast('Stop the program before editing.');
    return;
  }

  event.preventDefault();

  const rect = sourceEl.getBoundingClientRect();
  const ghost = sourceEl.cloneNode(true);
  ghost.classList.add('is-ghost');
  ghost.classList.remove('is-selected', 'is-active');
  ghost.style.left = rect.left + 'px';
  ghost.style.top = rect.top + 'px';
  ghost.style.width = (rect.width / (sourceSlot ? workspaceZoom : 1)) + 'px';
  preserveWorkspaceDragScale(ghost, Boolean(sourceSlot || from));
  ghost.querySelectorAll('input, select').forEach((input) => {
    input.readOnly = true;
    input.tabIndex = -1;
  });
  document.body.appendChild(ghost);

  expressionDrag = {
    block: block,
    ghost: ghost,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
    startX: event.clientX,
    startY: event.clientY,
    lastX: event.clientX,
    lastY: event.clientY,
    target: null,
    moved: false,
    sourceBlockId: sourceSlot ? sourceSlot.dataset.blockId : (from ? block.id : null),
    sourceField: sourceSlot ? sourceSlot.dataset.field : null,
    sourceEl: sourceEl,
    sourceSlot: sourceSlot,
    fromPath: from ? from.path : null,
    groupRect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
    preview: null,
    previewSlot: null
  };

  document.body.classList.add('is-dragging');
  window.addEventListener('pointermove', onExpressionMove);
  window.addEventListener('pointerup', onExpressionUp);
  window.addEventListener('pointercancel', onExpressionUp);
}

function onExpressionMove(event) {
  if (!expressionDrag) return;

  if (!expressionDrag.moved) {
    if (event.clientX === expressionDrag.startX &&
        event.clientY === expressionDrag.startY) return;
    expressionDrag.moved = true;
    if (expressionDrag.sourceSlot || expressionDrag.fromPath) {
      expressionDrag.sourceEl.classList.add('is-dragging');
    }
  }

  expressionDrag.lastX = event.clientX;
  expressionDrag.lastY = event.clientY;
  expressionDrag.ghost.style.left = (event.clientX - expressionDrag.offsetX) + 'px';
  expressionDrag.ghost.style.top = (event.clientY - expressionDrag.offsetY) + 'px';

  clearExpressionTarget();
  expressionDrag.target = null;

  const ghostRect = expressionDrag.ghost.getBoundingClientRect();
  const frontHalfRight = ghostRect.left + ghostRect.width / 2;
  let bestSlot = null;
  let bestOverlap = 0;
  let bestDepth = -1;
  scriptsEl.querySelectorAll('.expr-slot').forEach((slot) => {
    const targetBlock = findExpressionBlockById(slot.dataset.blockId);
    if (targetBlock && findBlockInTree(expressionDrag.block, targetBlock.id)) return;
    if (slot.dataset.requiresConditionReporter === 'true' &&
        !isConditionReporter(expressionDrag.block)) return;

    const rect = slot.getBoundingClientRect();
    const overlapWidth = Math.max(0,
      Math.min(frontHalfRight, rect.right) - Math.max(ghostRect.left, rect.left));
    const overlapHeight = Math.max(0,
      Math.min(ghostRect.bottom, rect.bottom) - Math.max(ghostRect.top, rect.top));
    const overlap = overlapWidth * overlapHeight;
    if (overlap <= 0) return;

    let depth = 0;
    let parent = slot.parentElement;
    while (parent) {
      if (parent.classList.contains('expr-slot')) depth++;
      parent = parent.parentElement;
    }

    if (depth > bestDepth || (depth === bestDepth && overlap > bestOverlap)) {
      bestDepth = depth;
      bestOverlap = overlap;
      bestSlot = slot;
    }
  });

  if (bestSlot) {
    expressionDrag.target = bestSlot;
    bestSlot.classList.add('is-expr-target');
  }
  showExpressionPreview(expressionDrag, bestSlot);
}

function onExpressionUp(event) {
  if (!expressionDrag) return;

  window.removeEventListener('pointermove', onExpressionMove);
  window.removeEventListener('pointerup', onExpressionUp);
  window.removeEventListener('pointercancel', onExpressionUp);

  const d = expressionDrag;
  expressionDrag = null;

  document.body.classList.remove('is-dragging');
  clearExpressionTarget();
  clearExpressionPreview(d);
  d.ghost.remove();
  d.sourceEl.classList.remove('is-dragging');

  if (event && event.type === 'pointercancel') return;
  if (!d.moved) {
    if (!d.fromPath && !d.sourceBlockId) runPaletteBlock(d.block);
    return;
  }

  const sourceBlock = d.sourceBlockId
    ? findExpressionBlockById(d.sourceBlockId)
    : null;
  const targetBlock = d.target
    ? findExpressionBlockById(d.target.dataset.blockId)
    : null;
  if (d.target && !targetBlock) return;

  if (targetBlock && targetBlock.id === d.sourceBlockId &&
      d.target.dataset.field === d.sourceField) return;

  if (d.sourceBlockId && !sourceBlock) return;

  if (targetBlock) {
    targetBlock.params[d.target.dataset.field] = cloneBlockTree(d.block);
  }

  if (d.fromPath) {
    const sourceContainer = containerAtPath(d.fromPath.slice(0, -1));
    if (sourceContainer) sourceContainer.splice(d.fromPath[d.fromPath.length - 1], 1);
  } else if (sourceBlock && d.sourceField) {
    sourceBlock.params[d.sourceField] =
      defaultBlockFieldValue(sourceBlock.type, d.sourceField);
  }

  suppressCanvasClickUntil = performance.now() + 250;
  if (d.fromPath || sourceBlock) {
    if (targetBlock) {
      workspace = workspace.filter((script) => script.length > 0);
      renderWorkspace(targetBlock.id);
      return;
    }

    if (pointerInsideCanvas(d.lastX, d.lastY)) {
      const pos = freeDropPosition(d);
      if (d.fromPath) {
        const script = workspace[d.fromPath[0]];
        if (script) {
          script.x = pos.x;
          script.y = pos.y;
        }
      } else {
        workspace.push(makeScript([d.block], pos.x, pos.y));
      }
      workspace = workspace.filter((script) => script.length > 0);
      renderWorkspace(d.block.id);
      return;
    }

    workspace = workspace.filter((script) => script.length > 0);
    showToast('Math block deleted.');
    renderWorkspace();
    return;
  }

  if (targetBlock) {
    renderWorkspace(targetBlock.id);
  } else if (pointerInsideCanvas(d.lastX, d.lastY)) {
    const pos = freeDropPosition(d);
    workspace.push(makeScript([d.block], pos.x, pos.y));
    renderWorkspace(d.block.id);
  }
}
