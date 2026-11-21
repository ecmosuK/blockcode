'use strict';

/**
 * Pure download-planning helpers for the managed watch toolchain.
 *
 * These functions contain no I/O so they can be exhaustively unit-tested.
 * `toolchain.cjs` supplies local file sizes and an HTTP `HEAD` size, then
 * follows the returned plan. The goal is to stop the app from re-transferring
 * a multi-gigabyte archive when a verified copy or a resumable partial exists,
 * and to refuse to start a doomed download when the bundled manifest is stale.
 */

const DOWNLOAD_ACTIONS = Object.freeze({
  REUSE: 'reuse',
  RESUME: 'resume',
  DOWNLOAD: 'download',
  REJECT: 'reject'
});

const DOWNLOAD_REASONS = Object.freeze({
  LOCAL_COMPLETE: 'local-complete',
  LOCAL_HASH_MISMATCH: 'local-hash-mismatch',
  RESUME_PARTIAL: 'resume-partial',
  PARTIAL_TOO_LARGE: 'partial-too-large',
  NO_LOCAL_DATA: 'no-local-data',
  STALE_MANIFEST: 'stale-manifest',
  UNVERIFIABLE_LOCAL_COPY: 'unverifiable-local-copy'
});

const SHA256_PATTERN = /^[0-9a-f]{64}$/;

function normalizeByteSize(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return Math.trunc(number);
}

function normalizeSha256(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return SHA256_PATTERN.test(normalized) ? normalized : null;
}

function isStaleManifest(expectedSize, remoteSize) {
  const expected = normalizeByteSize(expectedSize);
  const remote = normalizeByteSize(remoteSize);
  if (expected === null || remote === null) return false;
  return expected !== remote;
}

function buildRangeHeader(startByte) {
  const start = normalizeByteSize(startByte);
  if (start === null || start <= 0) return null;
  return `bytes=${start}-`;
}

function result(action, reason, startByte, totalBytes, extra = {}) {
  return {
    action,
    reason,
    startByte,
    totalBytes: totalBytes === null || totalBytes === undefined ? null : totalBytes,
    ...extra
  };
}

/**
 * Decide how to obtain the pinned archive.
 *
 * @param {object} input
 * @param {string} input.url                 Download URL (required).
 * @param {number} [input.expectedSize]      Pinned size from the manifest.
 * @param {string} [input.expectedSha256]    Pinned hash from the manifest.
 * @param {number} [input.localSize]         Size of a completed local archive.
 * @param {string} [input.localSha256]       Hash of the completed local archive.
 * @param {number} [input.partialSize]       Size of a `.part` file, if any.
 * @param {number} [input.remoteSize]        Content-Length reported by the server.
 * @returns {{action: string, reason: string, startByte: number, totalBytes: number|null, message?: string}}
 */
function planToolchainDownload(input) {
  const options = input || {};
  if (typeof options.url !== 'string' || !options.url.trim()) {
    throw new Error('A download URL is required to plan a toolchain download.');
  }

  const expectedSize = normalizeByteSize(options.expectedSize);
  const remoteSize = normalizeByteSize(options.remoteSize);
  const localSize = normalizeByteSize(options.localSize);
  const partialSize = normalizeByteSize(options.partialSize);
  const expectedSha256 = normalizeSha256(options.expectedSha256);
  const localSha256 = normalizeSha256(options.localSha256);

  // Fail fast on a stale pin before transferring gigabytes that can never
  // pass the size/hash gate. The bundled manifest must be regenerated.
  if (isStaleManifest(expectedSize, remoteSize)) {
    return result(DOWNLOAD_ACTIONS.REJECT, DOWNLOAD_REASONS.STALE_MANIFEST, 0, remoteSize, {
      message:
        'The bundled watch toolchain manifest is out of date: the server now serves ' +
        `${remoteSize} bytes but the manifest pins ${expectedSize}. ` +
        'Update BlockCode so it ships a matching manifest and toolchain archive.'
    });
  }

  const totalBytes = expectedSize !== null ? expectedSize : remoteSize;
  const hashesConflict =
    expectedSha256 !== null && localSha256 !== null && expectedSha256 !== localSha256;

  if (localSize !== null) {
    if (totalBytes !== null && localSize === totalBytes) {
      if (hashesConflict) {
        return result(DOWNLOAD_ACTIONS.DOWNLOAD, DOWNLOAD_REASONS.LOCAL_HASH_MISMATCH, 0, totalBytes);
      }
      return result(DOWNLOAD_ACTIONS.REUSE, DOWNLOAD_REASONS.LOCAL_COMPLETE, totalBytes, totalBytes);
    }

    if (totalBytes === null) {
      // Without a known total we can only trust a completed copy when its
      // hash matches the pinned hash.
      if (localSha256 !== null && expectedSha256 !== null && !hashesConflict) {
        return result(DOWNLOAD_ACTIONS.REUSE, DOWNLOAD_REASONS.LOCAL_COMPLETE, localSize, null);
      }
      return result(
        DOWNLOAD_ACTIONS.DOWNLOAD,
        DOWNLOAD_REASONS.UNVERIFIABLE_LOCAL_COPY,
        0,
        null
      );
    }
  }

  if (
    partialSize !== null &&
    partialSize > 0 &&
    totalBytes !== null &&
    partialSize < totalBytes
  ) {
    return result(DOWNLOAD_ACTIONS.RESUME, DOWNLOAD_REASONS.RESUME_PARTIAL, partialSize, totalBytes);
  }

  const reason =
    partialSize !== null && partialSize > 0 && totalBytes !== null && partialSize >= totalBytes
      ? DOWNLOAD_REASONS.PARTIAL_TOO_LARGE
      : DOWNLOAD_REASONS.NO_LOCAL_DATA;

  return result(DOWNLOAD_ACTIONS.DOWNLOAD, reason, 0, totalBytes);
}

module.exports = {
  DOWNLOAD_ACTIONS,
  DOWNLOAD_REASONS,
  normalizeByteSize,
  normalizeSha256,
  isStaleManifest,
  buildRangeHeader,
  planToolchainDownload
};
