// TDD tests for the toolchain download planner.
// Written BEFORE the implementation (RED phase).
//
// The planner is the pure decision layer used by toolchain.cjs to decide
// whether a large archive should be reused, resumed, downloaded fresh, or
// rejected before any bytes are transferred (stale manifest).

const {
  DOWNLOAD_ACTIONS,
  DOWNLOAD_REASONS,
  normalizeByteSize,
  normalizeSha256,
  isStaleManifest,
  buildRangeHeader,
  planToolchainDownload
} = require('./toolchain-download');

const LIVE_URL = 'https://example.test/archive_v6.1_windows-x64.zst';
const LIVE_SHA = 'a'.repeat(64);

function plan(overrides = {}) {
  return planToolchainDownload({
    url: LIVE_URL,
    expectedSize: 1000,
    expectedSha256: LIVE_SHA,
    ...overrides
  });
}

describe('normalizeByteSize', () => {
  it('returns null for null, undefined, and empty string', () => {
    expect(normalizeByteSize(null)).toBeNull();
    expect(normalizeByteSize(undefined)).toBeNull();
    expect(normalizeByteSize('')).toBeNull();
  });

  it('returns null for negative, NaN, and infinite values', () => {
    expect(normalizeByteSize(-1)).toBeNull();
    expect(normalizeByteSize(Number.NaN)).toBeNull();
    expect(normalizeByteSize(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it('returns null for non-numeric strings and objects', () => {
    expect(normalizeByteSize('not-a-number')).toBeNull();
    expect(normalizeByteSize({})).toBeNull();
  });

  it('truncates fractional byte counts', () => {
    expect(normalizeByteSize(10.9)).toBe(10);
  });

  it('accepts numeric strings from HTTP headers', () => {
    expect(normalizeByteSize('2048')).toBe(2048);
  });

  it('accepts zero', () => {
    expect(normalizeByteSize(0)).toBe(0);
  });
});

describe('normalizeSha256', () => {
  it('lowercases and trims a hex digest', () => {
    const expected = 'abcdef0123456789'.repeat(4);
    expect(normalizeSha256(`  ${expected.toUpperCase()}  `)).toBe(expected);
  });

  it('returns null for missing or non-hex values', () => {
    expect(normalizeSha256(null)).toBeNull();
    expect(normalizeSha256(undefined)).toBeNull();
    expect(normalizeSha256('')).toBeNull();
    expect(normalizeSha256('xyz')).toBeNull();
  });

  it('rejects digests that are the wrong length', () => {
    expect(normalizeSha256('abc123')).toBeNull();
  });
});

describe('isStaleManifest', () => {
  it('reports staleness when pinned and remote sizes differ', () => {
    expect(isStaleManifest(1000, 1001)).toBe(true);
  });

  it('is not stale when sizes match', () => {
    expect(isStaleManifest(1000, 1000)).toBe(false);
  });

  it('cannot judge staleness without both sizes', () => {
    expect(isStaleManifest(null, 1000)).toBe(false);
    expect(isStaleManifest(1000, null)).toBe(false);
    expect(isStaleManifest(null, null)).toBe(false);
  });
});

describe('buildRangeHeader', () => {
  it('returns null for a fresh download from byte zero', () => {
    expect(buildRangeHeader(0)).toBeNull();
    expect(buildRangeHeader(null)).toBeNull();
  });

  it('returns an open-ended range for resuming', () => {
    expect(buildRangeHeader(512)).toBe('bytes=512-');
  });

  it('ignores an unknown total size', () => {
    expect(buildRangeHeader(512, null)).toBe('bytes=512-');
    expect(buildRangeHeader(512, 1000)).toBe('bytes=512-');
  });

  it('treats invalid offsets as a fresh download', () => {
    expect(buildRangeHeader(-5)).toBeNull();
    expect(buildRangeHeader('nope')).toBeNull();
  });
});

describe('planToolchainDownload', () => {
  it('reuses a complete local archive that matches the pinned size', () => {
    const result = plan({ localSize: 1000 });

    expect(result.action).toBe(DOWNLOAD_ACTIONS.REUSE);
    expect(result.startByte).toBe(1000);
    expect(result.totalBytes).toBe(1000);
    expect(result.reason).toBe(DOWNLOAD_REASONS.LOCAL_COMPLETE);
  });

  it('reuses a complete local archive whose hash matches', () => {
    const result = plan({ localSize: 1000, localSha256: LIVE_SHA });

    expect(result.action).toBe(DOWNLOAD_ACTIONS.REUSE);
  });

  it('re-downloads a complete local archive whose hash does not match', () => {
    const result = plan({ localSize: 1000, localSha256: 'b'.repeat(64) });

    expect(result.action).toBe(DOWNLOAD_ACTIONS.DOWNLOAD);
    expect(result.startByte).toBe(0);
    expect(result.reason).toBe(DOWNLOAD_REASONS.LOCAL_HASH_MISMATCH);
  });

  it('resumes a partial download from the exact partial offset', () => {
    const result = plan({ partialSize: 400 });

    expect(result.action).toBe(DOWNLOAD_ACTIONS.RESUME);
    expect(result.startByte).toBe(400);
    expect(result.totalBytes).toBe(1000);
    expect(result.reason).toBe(DOWNLOAD_REASONS.RESUME_PARTIAL);
  });

  it('prefers reusing a complete file over resuming a partial file', () => {
    const result = plan({ localSize: 1000, partialSize: 400 });

    expect(result.action).toBe(DOWNLOAD_ACTIONS.REUSE);
  });

  it('restarts when the partial file is already at the expected size', () => {
    const result = plan({ partialSize: 1000 });

    expect(result.action).toBe(DOWNLOAD_ACTIONS.DOWNLOAD);
    expect(result.startByte).toBe(0);
    expect(result.reason).toBe(DOWNLOAD_REASONS.PARTIAL_TOO_LARGE);
  });

  it('restarts when the partial file exceeds the expected size', () => {
    const result = plan({ partialSize: 4096 });

    expect(result.action).toBe(DOWNLOAD_ACTIONS.DOWNLOAD);
    expect(result.reason).toBe(DOWNLOAD_REASONS.PARTIAL_TOO_LARGE);
  });

  it('does a fresh download when no local data exists', () => {
    const result = plan();

    expect(result.action).toBe(DOWNLOAD_ACTIONS.DOWNLOAD);
    expect(result.startByte).toBe(0);
    expect(result.totalBytes).toBe(1000);
    expect(result.reason).toBe(DOWNLOAD_REASONS.NO_LOCAL_DATA);
  });

  it('cannot resume when the total size is unknown', () => {
    const result = plan({ expectedSize: null, partialSize: 400 });

    expect(result.action).toBe(DOWNLOAD_ACTIONS.DOWNLOAD);
    expect(result.startByte).toBe(0);
    expect(result.totalBytes).toBeNull();
  });

  it('uses the remote size as the total when the manifest omits a size', () => {
    const result = plan({ expectedSize: null, remoteSize: 2000, partialSize: 500 });

    expect(result.action).toBe(DOWNLOAD_ACTIONS.RESUME);
    expect(result.startByte).toBe(500);
    expect(result.totalBytes).toBe(2000);
  });

  it('ignores zero-length partial files', () => {
    const result = plan({ partialSize: 0 });

    expect(result.action).toBe(DOWNLOAD_ACTIONS.DOWNLOAD);
    expect(result.startByte).toBe(0);
  });

  it('rejects a stale manifest BEFORE any bytes are transferred', () => {
    const result = plan({ remoteSize: 3548481118, expectedSize: 3449598715 });

    expect(result.action).toBe(DOWNLOAD_ACTIONS.REJECT);
    expect(result.reason).toBe(DOWNLOAD_REASONS.STALE_MANIFEST);
    expect(result.startByte).toBe(0);
    expect(result.totalBytes).toBe(3548481118);
    expect(result.message).toMatch(/manifest/i);
  });

  it('rejects a stale manifest even when a partial download exists', () => {
    const result = plan({ remoteSize: 1001, partialSize: 400 });

    expect(result.action).toBe(DOWNLOAD_ACTIONS.REJECT);
    expect(result.reason).toBe(DOWNLOAD_REASONS.STALE_MANIFEST);
  });

  it('does not treat tiny float differences as stale', () => {
    const result = plan({ expectedSize: 1000, remoteSize: 1000.4 });

    expect(result.action).not.toBe(DOWNLOAD_ACTIONS.REJECT);
  });

  it('reuses a complete file when both sizes are unknown but the hash matches', () => {
    const result = plan({
      expectedSize: null,
      remoteSize: null,
      localSize: 777,
      localSha256: LIVE_SHA
    });

    expect(result.action).toBe(DOWNLOAD_ACTIONS.REUSE);
  });

  it('throws when the URL is missing', () => {
    expect(() => planToolchainDownload()).toThrow(/url/i);
    expect(() => planToolchainDownload({ url: '' })).toThrow(/url/i);
    expect(() => planToolchainDownload({ url: '   ' })).toThrow(/url/i);
  });

  it('tolerates a null input object without crashing on sizes', () => {
    const result = planToolchainDownload({
      url: LIVE_URL,
      expectedSize: undefined,
      expectedSha256: undefined,
      localSize: undefined,
      partialSize: undefined,
      remoteSize: undefined
    });

    expect(result.action).toBe(DOWNLOAD_ACTIONS.DOWNLOAD);
    expect(result.startByte).toBe(0);
    expect(result.totalBytes).toBeNull();
  });

  it('exposes actions and reasons as frozen constants', () => {
    expect(Object.isFrozen(DOWNLOAD_ACTIONS)).toBe(true);
    expect(Object.isFrozen(DOWNLOAD_REASONS)).toBe(true);
  });
});
