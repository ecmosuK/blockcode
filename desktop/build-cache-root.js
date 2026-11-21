'use strict';

/**
 * Chooses the root directory for the watch build cache.
 *
 * Windows limits file paths to 260 characters unless LongPathsEnabled is set.
 * ESP-IDF generates deeply nested object/dependency paths under the build
 * directory, so keeping the cache under `%LOCALAPPDATA%\BlockCode` can exceed
 * that limit and fail with "opening dependency file ... No such file or
 * directory". A short root such as `C:\bc\<toolchainId>` leaves enough room.
 *
 * These helpers are pure so they can be unit-tested; `main.cjs` performs the
 * directory creation and falls back to the old location if that fails.
 */

function fallbackBuildCacheRoot(managedRoot, toolchainId) {
  return pathJoin(managedRoot, 'build-cache', toolchainId);
}

// Kept as a tiny local join so the module has no runtime dependency on
// `node:path` behavior that differs between POSIX and Windows in tests.
function pathJoin(...parts) {
  return parts.filter(Boolean).join('\\').replace(/\\{2,}/g, '\\');
}

function driveRootOf(target) {
  const match = /^([A-Za-z]:)[\\/]/.exec(target || '');
  return match ? `${match[1]}\\` : null;
}

/**
 * @returns {{ root: string, fallback: string, short: boolean }}
 */
function planBuildCacheRoot({ managedRoot, toolchainId, platform = process.platform }) {
  const fallback = fallbackBuildCacheRoot(managedRoot, toolchainId);
  if (platform !== 'win32') {
    return { root: fallback, fallback, short: false };
  }
  const driveRoot = driveRootOf(managedRoot);
  if (!driveRoot) {
    return { root: fallback, fallback, short: false };
  }
  const candidate = pathJoin(driveRoot, 'bc', toolchainId);
  if (candidate.length >= fallback.length) {
    return { root: fallback, fallback, short: false };
  }
  return { root: candidate, fallback, short: true };
}

module.exports = { planBuildCacheRoot, fallbackBuildCacheRoot };
