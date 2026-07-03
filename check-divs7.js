const fs = require('fs');
const lines = fs.readFileSync('src/components/planner/JarabesModule.tsx', 'utf8').split('\n');
const stack = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const openRegex = /<div\b/g;
  let match;
  while ((match = openRegex.exec(line)) !== null) {
    stack.push(`L${i + 1}`);
  }
  const closeRegex = /<\/div>/g;
  while ((match = closeRegex.exec(line)) !== null) {
    if (stack.length === 0) {
      console.log(`L${i + 1}: EXTRA </div>`);
    } else {
      stack.pop();
    }
  }
}
console.log('Remaining open divs:', stack.length);
stack.forEach(item => console.log(item));
