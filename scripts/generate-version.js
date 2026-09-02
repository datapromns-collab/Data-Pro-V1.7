const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const versionFile = path.join(__dirname, '..', 'public', 'version.json');
let build = 'dev';

try {
  build = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
} catch {
  build = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

const data = {
  version: '1.0.0',
  build,
};

fs.writeFileSync(versionFile, JSON.stringify(data, null, 2) + '\n');
console.log(`version.json actualizado: build=${build}`);
