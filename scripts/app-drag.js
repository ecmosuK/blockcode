'use strict';

/* ---------- Dragging ---------- */

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
  if (dragBlocks.length > 1) {
    ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.style.width = (right - left) + 'px';
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
    parentPath: group ? group.parentPath : (from ? from.path.slice(0, -1) : null),
    startIndex: group ? group.start : (from ? from.path[from.path.length - 1] : 0),
    groupRect: { left: left, top: top, right: right, bottom: bottom },
    offsetX: event.clientX - left,
    offsetY: event.clientY - top,
    startX: event.clientX,
    startY: event.clientY,
    lastX: event.clientX,
    lastY: event.clientY,
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
}

function showStackPreview(rect, top) {
  clearStackPreview();
  drag.sourceEls.forEach((source) => {
    const clone = source.cloneNode(true);
    clone.classList.remove('is-dragging', 'is-ghost', 'is-selected', 'is-active');
    clone.querySelectorAll('.is-dragging, .is-ghost, .is-selected, .is-active').forEach((node) => {
      node.classList.remove('is-dragging', 'is-ghost', 'is-selected', 'is-active');
    });
    clone.querySelectorAll('input, select').forEach((input) => {
      input.readOnly = true;
      input.tabIndex = -1;
    });
    snapPreview.appendChild(clone);
  });
  snapPreview.style.left = rect.left + 'px';
  snapPreview.style.top = top + 'px';
  snapPreview.style.display = 'flex';
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

function updateDropTarget(x, y) {
  const canvasRect = canvasEl.getBoundingClientRect();
  drag.inside = x >= canvasRect.left && x <= canvasRect.right &&
    y >= canvasRect.top && y <= canvasRect.bottom;

  drag.target = null;
  clearStackPreview();
  clearDropHighlight();

  if (!drag.inside) return;

  const dx = x - drag.startX;
  const dy = y - drag.startY;
  const groupLeft = drag.groupRect.left + dx;
  const groupTop = drag.groupRect.top + dy;
  const groupBottom = drag.groupRect.bottom + dy;

  const blocks = Array.prototype.slice.call(
    scriptsEl.querySelectorAll('.script .block[data-path]')
  ).filter((el) => {
    if (el.closest('.block.is-dragging, .cblock.is-dragging')) return false;
    if (el.classList.contains('reporter')) return false;
    return true;
  });

  let best = null;
  let bestGap = Infinity;

  blocks.forEach((el) => {
    const path = parseBlockPath(el.dataset.path);
    const targetEl = el.classList.contains('cblock-head')
      ? (el.closest('.cblock') || el)
      : el;
    const rect = targetEl.getBoundingClientRect();
    if (Math.abs(groupLeft - rect.left) > SNAP_LEFT) return;

    const beforeGap = Math.abs(groupBottom - rect.top);
    const afterGap = Math.abs(groupTop - rect.bottom);
    const before = beforeGap <= afterGap;
    const gap = before ? beforeGap : afterGap;
    if (gap > SNAP_DISTANCE || gap >= bestGap) return;

    if (path.length < 2) return;
    const parentPath = path.slice(0, -1);
    if (targetInsideSource(drag, parentPath)) return;

    bestGap = gap;
    best = {
      parentPath: parentPath,
      index: path[path.length - 1] + (before ? 0 : 1),
      before: before,
      rect: rect,
      el: el
    };
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
    if (bestGap <= 0) return;

    bestGap = 0;
    best = {
      parentPath: parentPath,
      index: container.length,
      before: true,
      rect: rect,
      el: zone,
      zone: true
    };
  });

  if (best) {
    drag.target = { parentPath: best.parentPath, index: best.index, append: false };
    if (best.zone) {
      const block = best.el.closest('.cblock');
      if (block) block.classList.add('is-drop-target');
      const zoneOffset = best.el.classList.contains('cblock-empty') ? 4 : 6;
      showStackPreview(best.rect, best.rect.top - zoneOffset);
    } else {
      showStackPreview(
        best.rect,
        best.before ? best.rect.top : best.rect.bottom - STACK_OVERLAP
      );
    }
  } else {
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
      const pos = defaultScriptPosition();
      workspace.push(makeScript([d.block], pos.x, pos.y));
      changed = true;
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
      const targetParent = d.target.parentPath;
      let index = d.target.index;
      const sourceContainer = d.from ? containerAtPath(d.parentPath) : null;
      const targetBefore = containerAtPath(targetParent);

      if (d.from && sourceContainer && sourceContainer === targetBefore &&
          d.startIndex < index) {
        index -= dragCount;
      }

      removeDraggedSource(d);
      const targetContainer = containerAtPath(targetParent);

      if (targetContainer) {
        index = clamp(index, 0, targetContainer.length);
        targetContainer.splice(index, 0, ...dragBlocks);
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

function startExpressionDrag(event, block, sourceEl) {
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
  ghost.style.width = rect.width + 'px';
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
    moved: false
  };

  document.body.classList.add('is-dragging');
  window.addEventListener('pointermove', onExpressionMove);
  window.addEventListener('pointerup', onExpressionUp);
  window.addEventListener('pointercancel', onExpressionUp);
}

function onExpressionMove(event) {
  if (!expressionDrag) return;

  if (!expressionDrag.moved) {
    if (Math.hypot(event.clientX - expressionDrag.startX, event.clientY - expressionDrag.startY) < 4) return;
    expressionDrag.moved = true;
  }

  expressionDrag.lastX = event.clientX;
  expressionDrag.lastY = event.clientY;
  expressionDrag.ghost.style.left = (event.clientX - expressionDrag.offsetX) + 'px';
  expressionDrag.ghost.style.top = (event.clientY - expressionDrag.offsetY) + 'px';

  clearExpressionTarget();
  expressionDrag.target = null;

  const hit = document.elementFromPoint(event.clientX, event.clientY);
  const slot = hit && hit.closest ? hit.closest('.expr-slot') : null;
  if (slot && scriptsEl.contains(slot)) {
    expressionDrag.target = slot;
    slot.classList.add('is-expr-target');
  }
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
  d.ghost.remove();

  if (event && event.type === 'pointercancel') return;
  if (!d.moved || !d.target) {
    if (d.moved) showToast('Drop math blocks into a value slot.');
    return;
  }

  const targetBlock = findBlockById(d.target.dataset.blockId);
  if (!targetBlock) return;

  const expression = cloneBlockTree(d.block);
  targetBlock.params[d.target.dataset.field] = expression;
  suppressCanvasClickUntil = performance.now() + 250;
  renderWorkspace(targetBlock.id);
}
