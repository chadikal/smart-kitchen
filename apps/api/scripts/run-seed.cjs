const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

const sourceRoot = path.resolve(__dirname, '..');
const resolveFilename = Module._resolveFilename;
const compileJavaScript = Module._extensions['.js'];

Module._resolveFilename = function (request, parent, isMain, options) {
  if (typeof request === 'string' && request.endsWith('.js')) {
    try {
      return resolveFilename.call(this, `${request.slice(0, -3)}.ts`, parent, isMain, options);
    } catch {
      // The import refers to a JavaScript file.
    }
  }
  return resolveFilename.call(this, request, parent, isMain, options);
};

function compileTypeScript(module, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2023,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText;
  module._compile(output, filename);
}

Module._extensions['.ts'] = compileTypeScript;
Module._extensions['.js'] = function (module, filename) {
  if (filename.startsWith(sourceRoot) && filename.endsWith('.ts')) {
    compileTypeScript(module, filename);
    return;
  }
  return compileJavaScript(module, filename);
};

const entry = process.argv[2] ?? path.join('prisma', 'seed.ts');
if (path.isAbsolute(entry) || entry.split(/[\\/]/).includes('..')) {
  console.error('The catalog script path must stay inside the API project.');
  process.exit(1);
}
require(path.join(sourceRoot, entry));
