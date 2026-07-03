const fs = require('fs');
const lines = fs.readFileSync('src/components/planner/JarabesModule.tsx', 'utf8').split('\n');
const stack = [];
for (let i = 1330; i < lines.length && i < 2296; i++) {
  const line = lines[i];
  const openRegex = /<div\b/g;
  let match;
  while ((match = openRegex.exec(line)) !== null) {
    stack.push(`L${i + 1}`);
  }
  const closeRegex = /<\/div>/g;
  while ((match = closeRegex.exec(line)) !== null) {
    if (stack.length === 0) {
      console.log(`L${i + 1}: Extra </div>`);
    } else {
      const open = stack.pop();
    }
  }
  if (stack.length > 0 && stack.length % 5 === 0) {
    console.log(`L${i + 1}: stack size = ${stack.length}`);
  }
}
console.log('Final stack size:', stack.length);
console.log('Remaining opens:', stack.slice(-10));
