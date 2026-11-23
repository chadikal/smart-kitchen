const { spawn } = require('node:child_process');
const path = require('node:path');

const extra = process.argv.slice(2);
const exporting = extra[0] === 'export';
const args = exporting
  ? ['expo', 'export', '--platform', 'web', '--output-dir', 'dist']
  : ['expo', 'start', ...extra];

const child = spawn('npx', args, {
  cwd: path.join(__dirname, '..'),
  env: { ...process.env, EXPO_PUBLIC_SAVORA_DEMO: '1' },
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => process.exit(code ?? 1));
