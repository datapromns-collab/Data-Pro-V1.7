import React from 'react';
import { WeeklyReport } from '@/components/planner/WeeklyReport';

// Dummy data for demonstration purposes
const demoData = {
  finishedProductInventory: {
    'Producto A': { '2Lts': 120, '1.5Lts': 80, '1Lt': 50, '0.4Lts': 30 },
    'Producto B': { '2Lts': 200, '1.5Lts': 150, '1Lt': 100, '0.4Lts': 60 },
  },
  logisticsInventory: {
    'M001': 500,
    'M002': 300,
  },
  plantInventory: {
    'M001': 200,
    'M002': 150,
  },
};

const WeeklyReportPage: React.FC = () => {
  return <WeeklyReport data={demoData} />;
};

export default WeeklyReportPage;
