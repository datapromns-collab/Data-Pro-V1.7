const fs = require('fs');
const file = 'C:/Users/yonny.h/Videos/DATA/Data Pro V1.9/src/app/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace header TD/TN/Total with BPM
const oldHeader = `                                                <th className="sticky left-0 z-20 bg-slate-100 px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 w-40 text-left">Línea</th>
                                                <th className="px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[120px]">TD</th>
                                                <th className="px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[120px]">TN</th>
                                                <th className="px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[120px]">Total</th>`;

const newHeader = `                                                <th className="sticky left-0 z-20 bg-slate-100 px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 w-40 text-left">Línea</th>
                                                <th className="px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[120px]">BPM</th>`;

if (content.includes(oldHeader)) {
  content = content.replace(oldHeader, newHeader);
  console.log('header replaced');
} else {
  console.log('header not found');
}

// Replace tbody TD/TN/Total with single BPM cell
const oldBody = `                                                    <td className="px-2 py-1 border-b border-slate-100">
                                                      <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        value={(velocidadesDt?.td?.[idx]) || ''}
                                                         onChange={(e) => {
                                                           const next = [...(velocidadesDt?.td || [])];
                                                          next[idx] = e.target.value;
                                                          setVelocidadesDt('td', next);
                                                        }}
                                                        className="w-full bg-transparent text-center text-[10px] text-slate-700 tabular-nums outline-none focus:bg-sky-50 rounded px-1 py-0.5"
                                                        placeholder="0"
                                                      />
                                                    </td>
                                                    <td className="px-2 py-1 border-b border-slate-100">
                                                      <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        value={(velocidadesDt?.tn?.[idx]) || ''}
                                                         onChange={(e) => {
                                                           const next = [...(velocidadesDt?.tn || [])];
                                                          next[idx] = e.target.value;
                                                          setVelocidadesDt('tn', next);
                                                        }}
                                                        className="w-full bg-transparent text-center text-[10px] text-slate-700 tabular-nums outline-none focus:bg-sky-50 rounded px-1 py-0.5"
                                                        placeholder="0"
                                                      />
                                                    </td>
                                                    <td className="px-2 py-1 border-b border-slate-100">
                                                      <input
                                                        type="text"
                                                        readOnly
                                                         value={(() => { const a = Number(velocidadesDt?.td?.[idx]) || 0; const b = Number(velocidadesDt?.tn?.[idx]) || 0; return String(a + b); })()}
                                                        className="w-full bg-transparent text-center text-[10px] text-slate-700 tabular-nums outline-none focus:bg-sky-50 rounded px-1 py-0.5"
                                                        placeholder="0"
                                                      />
                                                    </td>`;

const newBody = `                                                    <td className="px-2 py-1 border-b border-slate-100">
                                                      <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        value={(velocidadesDt?.td?.[idx]) || ''}
                                                         onChange={(e) => {
                                                           const next = [...(velocidadesDt?.td || [])];
                                                          next[idx] = e.target.value;
                                                          setVelocidadesDt('td', next);
                                                        }}
                                                        className="w-full bg-transparent text-center text-[10px] text-slate-700 tabular-nums outline-none focus:bg-sky-50 rounded px-1 py-0.5"
                                                        placeholder="0"
                                                      />
                                                    </td>`;

if (content.includes(oldBody)) {
  content = content.replace(oldBody, newBody);
  console.log('body replaced');
} else {
  console.log('body not found');
}

fs.writeFileSync(file, content);
console.log('done');
