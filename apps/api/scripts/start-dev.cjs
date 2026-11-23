const { spawn } = require('node:child_process');
const path = require('node:path');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const nestCli = path.join(
  path.dirname(require.resolve('@nestjs/cli/package.json')),
  'bin',
  'nest.js',
);

const child = spawn(process.execPath, [nestCli, 'start', '--watch'], {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
