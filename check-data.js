const raw = require('fs').readFileSync('data.json', 'utf8');
const matches = raw.match(/"planta-ordenes-trabajo":\s*\[/g);
console.log('Array occurrences:', matches ? matches.length : 0);
const objMatches = raw.match(/"planta-ordenes-trabajo":\s*\{/g);
console.log('Object occurrences:', objMatches ? objMatches.length : 0);
