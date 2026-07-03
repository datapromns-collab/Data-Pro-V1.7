const fs = require('fs');
const lines = fs.readFileSync('src/components/planner/JarabesModule.tsx', 'utf8').split('\n');
const opens = [];
for (let i = 1330; i < lines.length && i < 2296; i++) {
  const line = lines[i];
  const regex = /<div\b/g;
  let match;
  while ((match = regex.exec(line)) !== null) {
    opens.push({ index: opens.length, line: i + 1, col: match.index + 1, closed: false });
  }
}
for (let i = 1330; i < lines.length && i < 2296; i++) {
  const line = lines[i];
  const regex = /<\/div>/g;
  let match;
  while ((match = regex.exec(line)) !== null) {
    for (let j = opens.length - 1; j >= 0; j--) {
      if (!opens[j].closed) {
        opens[j].closed = true;
        opens[j].matchedWith = { line: i + 1, col: match.index + 1 };
        break;
      }
    }
  }
}
const unclosed = opens.filter(o => !o.closed);
console.log('Unclosed divs:', unclosed.length);
unclosed.forEach(o => console.log(`Opened at line ${o.line}, col ${o.col}: ${lines[o.line - 1].trim()}`));
