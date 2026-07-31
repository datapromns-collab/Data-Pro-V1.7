const fs = require('fs');
const file = 'C:/Users/yonny.h/Videos/DATA/Data Pro V1.9/src/app/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace TOTAL TD with BPM in the table header
if (content.includes('TOTAL TD')) {
  content = content.replace(/TOTAL TD/g, 'BPM');
  fs.writeFileSync(file, content);
  console.log('replaced TOTAL TD with BPM');
} else {
  console.log('TOTAL TD not found');
}
