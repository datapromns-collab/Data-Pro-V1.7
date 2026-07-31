const fs = require('fs');
const file = 'C:/Users/yonny.h/Videos/DATA/Data Pro V1.9/src/app/page.tsx';
let content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

// Remove TN cell (lines 3092-3105, indices 3091-3104)
for (let i = 3091; i <= 3104; i++) {
  lines[i] = null;
}

// Remove Total cell (lines 3106-3114, indices 3105-3113)
for (let i = 3105; i <= 3113; i++) {
  lines[i] = null;
}

const newLines = lines.filter(l => l !== null);
fs.writeFileSync(file, newLines.join('\n'));
console.log('body fixed');
