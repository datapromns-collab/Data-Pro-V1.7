const fs = require('fs');
const file = 'C:/Users/yonny.h/Videos/DATA/Data Pro V1.9/src/app/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldHeader = `                                                 <th className="px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[120px]">TD</th>
                                                 <th className="px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[120px]">TN</th>
                                                 <th className="px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[120px]">Total</th>`;

const newHeader = `                                                 <th className="px-2 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 min-w-[120px]">BPM</th>`;

if (!content.includes(oldHeader)) {
  console.log('old header not found');
  process.exit(1);
}

content = content.replace(oldHeader, newHeader);

const oldBody = `                                                {(velocidadesDt?.td || []).map((bpm, idx) => (
                                                  <tr key={idx} className="even:bg-slate-50/60">
                                                    <td className="sticky left-0 z-10 bg-white even:bg-slate-50/60 px-2 py-1 text-[10px] font-bold text-slate-700 text-left border-r border-b border-slate-100 whitespace-nowrap">
                                                      Línea {idx + 1}
                                                    </td>
                                                    <td className="px-2 py-1 border-b border-slate-100">
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
                                                    </td>
                                                  </tr>
                                                ))}`;

const newBody = `                                                {(velocidadesDt?.td || []).map((bpm, idx) => (
                                                  <tr key={idx} className="even:bg-slate-50/60">
                                                    <td className="sticky left-0 z-10 bg-white even:bg-slate-50/60 px-2 py-1 text-[10px] font-bold text-slate-700 text-left border-r border-b border-slate-100 whitespace-nowrap">
                                                      Línea {idx + 1}
                                                    </td>
                                                    <td className="px-2 py-1 border-b border-slate-100">
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
                                                  </tr>
                                                ))}`;

if (!content.includes(oldBody)) {
  console.log('old body not found');
  process.exit(1);
}

content = content.replace(oldBody, newBody);
fs.writeFileSync(file, content);
console.log('reverted velocidades table');
