const fs = require('fs');
const lines = fs.readFileSync('src/components/planner/JarabesModule.tsx', 'utf8').split('\n');
let balance = 0;
let opens = [];
let closes = [];
for (let i = 1330; i < lines.length && i < 2296; i++) {
  const line = lines[i];
  const openMatches = line.match(/<div\b/g);
  const closeMatches = line.match(/<\/div>/g);
  if (openMatches) {
    for (let j = 0; j < openMatches.length; j++) {
      opens.push({ line: i + 1, col: line.indexOf('<div') + 1 });
      balance++;
    }
  }
  if (closeMatches) {
    for (let j = 0; j < closeMatches.length; j++) {
      closes.push({ line: i + 1, col: line.indexOf('</div>') + 1 });
      balance--;
    }
  }
}
console.log('Final balance:', balance);
console.log('Open divs:', opens);
console.log('Close divs:', closes);
