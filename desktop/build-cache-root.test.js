'use strict';

const { planBuildCacheRoot, fallbackBuildCacheRoot } = require('./build-cache-root');

const LOCAL = 'C:\\Users\\kaede\\AppData\\Local\\BlockCode';

describe('planBuildCacheRoot', () => {
  test('prefers a short drive-root cache on Windows', () => {
    const plan = planBuildCacheRoot({
      managedRoot: LOCAL,
      toolchainId: 'esp-idf-6.1-esp32s3',
      platform: 'win32'
    });
    expect(plan.root).toBe('C:\\bc\\esp-idf-6.1-esp32s3');
    expect(plan.fallback).toBe(`${LOCAL}\\build-cache\\esp-idf-6.1-esp32s3`);
    expect(plan.short).toBe(true);
    expect(plan.root.length).toBeLessThan(plan.fallback.length);
  });

  test('keeps the generated build path comfortably under the 260-char limit', () => {
    const plan = planBuildCacheRoot({
      managedRoot: LOCAL,
      toolchainId: 'esp-idf-6.1-esp32s3',
      platform: 'win32'
    });
    const deepest =
      `${plan.root}\\BlockCodeWatchBuild\\watch-elf-app\\build\\esp-idf\\mbedtls\\mbedtls\\` +
      'tf-psa-crypto\\core\\CMakeFiles\\tfpsacrypto.dir\\c0100641e3bfea1559105d1f42bc8cb0\\' +
      'psa_crypto_driver_esp_hmac_transparent.c.obj.d';
    expect(deepest.length).toBeLessThan(260);
  });

  test('does not change non-Windows behavior', () => {
    const plan = planBuildCacheRoot({
      managedRoot: '/home/user/.local/share/BlockCode',
      toolchainId: 'esp-idf-6.1-esp32s3',
      platform: 'linux'
    });
    expect(plan.short).toBe(false);
    expect(plan.root).toBe(plan.fallback);
  });

  test('falls back when the managed root has no drive letter', () => {
    const plan = planBuildCacheRoot({
      managedRoot: '\\\\server\\share\\BlockCode',
      toolchainId: 'esp-idf-6.1-esp32s3',
      platform: 'win32'
    });
    expect(plan.short).toBe(false);
    expect(plan.root).toBe(plan.fallback);
  });

  test('accepts forward-slash Windows roots', () => {
    const plan = planBuildCacheRoot({
      managedRoot: 'C:/Users/kaede/AppData/Local/BlockCode',
      toolchainId: 'esp-idf-6.1-esp32s3',
      platform: 'win32'
    });
    expect(plan.root).toBe('C:\\bc\\esp-idf-6.1-esp32s3');
  });

  test('deduplicates separators in the fallback path', () => {
    expect(fallbackBuildCacheRoot('C:\\BlockCode\\', 'dev')).toBe('C:\\BlockCode\\build-cache\\dev');
  });
});
