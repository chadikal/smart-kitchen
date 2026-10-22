const { spawnSync } = require('node:child_process');
const { createRequire } = require('node:module');
const path = require('node:path');

const requireFromPackage = createRequire(path.join(__dirname, '..', 'package.json'));
const jestBin = requireFromPackage.resolve('jest/bin/jest');
const result = spawnSync(
  process.execPath,
  ['--experimental-vm-modules', jestBin, ...process.argv.slice(2)],
  { stdio: 'inherit' },
);

process.exit(result.status ?? 1);
