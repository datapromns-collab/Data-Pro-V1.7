'use client';

import { useState } from 'react';
import { DailyPlanSection } from '@/components/planner/DailyPlanSection';
import { AdminReportTool } from '@/components/planner/AdminReportTool';
import { ScheduledTask } from '@/lib/types';

interface WeeklyData {
  tasks: ScheduledTask[];
  realProduction: Record<string, Record<string, Record<string, number>>>;
}

interface ManagementDailyPlanProps {
  weeklyData: Record<string, WeeklyData>;
  currentWeekKey: string;
  realProduction: Record<string, Record<string, Record<string, number>>>;
  updateRealProduction: (lineId: string, flavor: string, dateKey: string, quantity: number) => void;
  onPrintWeeklyControl?: () => void;
  onPrintMonthly?: (month: string, year: string) => void;
}

export default function ManagementDailyPlan({
  weeklyData,
  currentWeekKey,
  realProduction,
  updateRealProduction,
  onPrintWeeklyControl,
  onPrintMonthly
}: ManagementDailyPlanProps) {
  const [productionSubTab, setProductionTab] = useState('weekly');

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      <div className="w-full lg:w-[380px] shrink-0 overflow-y-auto">
        <DailyPlanSection tasks={weeklyData[currentWeekKey]?.tasks || []} weekStartDate={new Date(currentWeekKey + 'T00:00:00')} onPrint={undefined} />
      </div>
      <div className="flex-1 overflow-auto">
        <AdminReportTool
          view="production"
          weeklyData={weeklyData}
          currentWeekKey={currentWeekKey}
          realProduction={realProduction}
          updateRealProduction={updateRealProduction}
          onPrintWeeklyControl={onPrintWeeklyControl}
          onPrintMonthly={onPrintMonthly}
        />
      </div>
    </div>
  );
}
