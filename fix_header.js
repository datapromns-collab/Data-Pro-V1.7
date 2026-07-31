const fs = require('fs');
const file = 'C:/Users/yonny.h/Videos/DATA/Data Pro V1.9/src/app/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldHeader = `                                                 <th className="px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[120px]">TD</th>
                                                 <th className="px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[120px]">TN</th>
                                                 <th className="px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[120px]">Total</th>`;

const newHeader = `                                                 <th className="px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[120px]">BPM</th>`;

if (content.includes(oldHeader)) {
  content = content.replace(oldHeader, newHeader);
  fs.writeFileSync(file, content);
  console.log('header replaced');
} else {
  console.log('header not found, trying alternate...');
}
