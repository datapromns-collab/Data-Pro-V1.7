const fs = require('fs');
const lines = fs.readFileSync('src/components/planner/JarabesModule.tsx', 'utf8').split('\n');
const stack = [];
const pairs = [];
for (let i = 1330; i < lines.length && i < 2296; i++) {
  const line = lines[i];
  const regex = /<div\b/g;
  let match;
  while ((match = regex.exec(line)) !== null) {
    stack.push({ line: i + 1, col: match.index + 1, text: line.trim() });
  }
  const closeRegex = /<\/div>/g;
  while ((match = closeRegex.exec(line)) !== null) {
    if (stack.length === 0) {
      console.log(`Extra </div> at line ${i + 1}`);
    } else {
      const open = stack.pop();
      pairs.push({ openLine: open.line, openCol: open.col, closeLine: i + 1, closeCol: match.index + 1 });
    }
  }
}
console.log('Remaining open divs:', stack.length);
stack.forEach(item => {
  console.log(`Opened at line ${item.line}, col ${item.col}: ${item.text}`);
});
