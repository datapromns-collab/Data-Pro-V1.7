const fs = require('fs');
const file = 'C:/Users/yonny.h/Videos/DATA/Data Pro V1.9/src/app/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace the header lines by index
const lines = content.split('\n');
// lines 3069, 3070, 3071 -> replace with single BPM column
lines[3068] = '                                                <th className="px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[120px]">BPM</th>';
lines[3069] = null;
lines[3070] = null;

const newLines = lines.filter(l => l !== null);
fs.writeFileSync(file, newLines.join('\n'));
console.log('header fixed');
