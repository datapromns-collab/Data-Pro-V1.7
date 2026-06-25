import React from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';

export default function TestComponent() {
  return (
    <Tabs defaultValue="promedio">
      <TabsContent value="promedio">
        <div className="bg-white">
          <div className="flex justify-end no-print">
            <button>Export</button>
          </div>
          <div className="bg-white">
            <div>
              <div>
                <div>
                  <div>
                    <div className="border border-slate-100 rounded-2xl overflow-x-auto bg-white">
                      <table className="min-w-[600px]">
                        <thead>
                          <tr className="bg-[#4f81bd] hover:bg-[#4f81bd] text-white border-none h-12">
                            <th className="text-white font-black text-[11px] uppercase pl-6 text-right w-1/4">Estándar</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 odd:bg-white even:bg-slate-50/30">
                            <td className="text-right font-black text-xs text-slate-800 pl-6 py-3">{"100"}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
