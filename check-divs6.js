const fs = require('fs');
const lines = fs.readFileSync('src/components/planner/JarabesModule.tsx', 'utf8').split('\n');
const stack = [];
for (let i = 1330; i < lines.length && i < 2296; i++) {
  const line = lines[i];
  const openRegex = /<div\b/g;
  let match;
  while ((match = openRegex.exec(line)) !== null) {
    stack.push(`L${i + 1}`);
    console.log(`L${i + 1}: OPEN div (stack size ${stack.length})`);
  }
  const closeRegex = /<\/div>/g;
  let cMatch;
  while ((cMatch = closeRegex.exec(line)) !== null) {
    if (stack.length === 0) {
      console.log(`L${i + 1}: EXTRA </div>`);
    } else {
      const popped = stack.pop();
      console.log(`L${i + 1}: CLOSE div (popped ${popped}, stack size ${stack.length})`);
    }
  }
}
console.log('Remaining open divs:', stack.length);
stack.forEach(item => console.log(item));
