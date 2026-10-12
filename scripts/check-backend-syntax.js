const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const backendRoot = path.resolve(__dirname, '..', 'backend');
const ignoredDirectories = new Set(['node_modules', '.git']);
const files = [];

const collectJavaScript = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) collectJavaScript(path.join(directory, entry.name));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(path.join(directory, entry.name));
    }
  }
};

collectJavaScript(backendRoot);

const failures = [];
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    failures.push({ file, output: `${result.stdout || ''}${result.stderr || ''}`.trim() });
  }
}

if (failures.length) {
  for (const failure of failures) {
    console.error(`FAIL ${path.relative(backendRoot, failure.file)}\n${failure.output}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Sintaxis correcta en ${files.length} archivos JavaScript del backend.`);
}
