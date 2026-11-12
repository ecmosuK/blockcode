'use strict';

// Downloads the pinned ESP-IDF Installation Manager CLI used by the
// first-launch toolchain setup. Run automatically by `npm run dist` and
// `npm run release`, or manually with `npm run prepare:eim`.

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'tools', 'toolchain-manifest.json');
const destination = path.join(root, 'tools', 'eim-cli.exe');

function sha256(filePath) {
  const hash = crypto.createHash('sha256');
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  const handle = fs.openSync(filePath, 'r');
  try {
    let position = 0;
    for (;;) {
      const bytesRead = fs.readSync(handle, buffer, 0, buffer.length, position);
      if (!bytesRead) break;
      hash.update(buffer.subarray(0, bytesRead));
      position += bytesRead;
    }
  } finally {
    fs.closeSync(handle);
  }
  return hash.digest('hex');
}

async function download(url, target) {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok || !response.body) {
    throw new Error(`Could not download ${url}: HTTP ${response.status}`);
  }
  const temporaryPath = `${target}.part`;
  const handle = fs.openSync(temporaryPath, 'w');
  try {
    const reader = response.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      fs.writeSync(handle, Buffer.from(value));
    }
  } finally {
    fs.closeSync(handle);
  }
  fs.renameSync(temporaryPath, target);
}

async function main() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const eim = manifest && manifest.eim;
  if (!eim || typeof eim.url !== 'string' || typeof eim.sha256 !== 'string') {
    throw new Error(`Invalid EIM entry in ${manifestPath}`);
  }

  const expected = eim.sha256.toLowerCase();
  if (fs.existsSync(destination)) {
    const actual = sha256(destination);
    if (actual === expected) {
      console.log(`Pinned EIM CLI is ready: ${destination}`);
      return;
    }
    console.log('Existing EIM CLI does not match the pinned hash; downloading it again.');
    fs.rmSync(destination, { force: true });
  }

  console.log(`Downloading EIM CLI ${eim.version || ''}…`);
  await download(eim.url, destination);

  const actual = sha256(destination);
  if (actual !== expected) {
    fs.rmSync(destination, { force: true });
    throw new Error(`EIM CLI hash mismatch: expected ${expected}, got ${actual}`);
  }
  console.log(`Pinned EIM CLI is ready: ${destination}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
