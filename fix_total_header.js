const fs = require('fs');
const file = 'C:/Users/yonny.h/Videos/DATA/Data Pro V1.9/src/app/page.tsx';
let content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
lines[3069] = null;
const newLines = lines.filter(l => l !== null);
fs.writeFileSync(file, newLines.join('\n'));
console.log('removed Total header');
