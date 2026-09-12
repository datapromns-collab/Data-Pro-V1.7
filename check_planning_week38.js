const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));

const PROD_DAY_START_HOUR = 7;
const SHIFT_SPLIT_HOUR = 18;
const SHIFT_SPLIT_MINUTE = 30;
const TIMEZONE_OFFSET = -4; // UTC-4

function toLocalMs(utcMs) {
  return utcMs + TIMEZONE_OFFSET * 60 * 60 * 1000;
}

function getLocalDate(utcDate) {
  const localMs = toLocalMs(utcDate.getTime());
  const d = new Date(localMs);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const weekStart = new Date('2026-09-14T00:00:00Z');
const weekDates = [];
for (let i = 0; i < 7; i++) {
  const d = new Date(weekStart);
  d.setUTCDate(d.getUTCDate() + i);
  weekDates.push(getLocalDate(d));
}

const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function getDayName(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z');
  const dayNum = d.getUTCDay();
  return dayNames[dayNum];
}

const weeks = data.planner?.weeks || {};
const tasks = weeks['2026-09-14']?.tasks || [];

const result = {};
const totalsByLine = {};
const excludedHoursByLine = {};

for (const task of tasks) {
  const start = new Date(task.startTime);
  const end = new Date(task.endTime);
  const durationHours = Number(task.durationHours) || 0;
  const linea = String(task.lineId || '').trim();
  const name = String(task.name || '').trim();
  
  if (durationHours <= 0 || isNaN(start.getTime()) || isNaN(end.getTime()) || !linea) continue;
  
  const isCP = name.includes('CP') || name.includes('CIP');
  const isCS = name.includes('CS');
  
  if (!totalsByLine[linea]) totalsByLine[linea] = 0;
  totalsByLine[linea] += durationHours;
  
  if (isCP) {
    if (!excludedHoursByLine[linea]) excludedHoursByLine[linea] = 0;
    excludedHoursByLine[linea] += durationHours;
    continue;
  }
  
  const localStartMs = toLocalMs(start.getTime());
  const localEndMs = toLocalMs(end.getTime());
  const localStart = new Date(localStartMs);
  const localEnd = new Date(localEndMs);
  
  const totalDuration = localEnd.getTime() - localStart.getTime();
  if (totalDuration <= 0) continue;
  
  let currentDay = new Date(localStart);
  currentDay.setHours(PROD_DAY_START_HOUR, 0, 0, 0);
  if (localStart.getHours() < PROD_DAY_START_HOUR) {
    currentDay.setDate(currentDay.getDate() - 1);
  }
  
  const lastDay = new Date(localEnd);
  lastDay.setHours(PROD_DAY_START_HOUR, 0, 0, 0);
  if (localEnd.getHours() < PROD_DAY_START_HOUR) {
    lastDay.setDate(lastDay.getDate() - 1);
  }
  
  while (currentDay <= lastDay) {
    const dayKey = getLocalDate(currentDay);
    if (!weekDates.includes(dayKey)) {
      currentDay.setDate(currentDay.getDate() + 1);
      continue;
    }
    
    if (!result[linea]) result[linea] = {};
    if (!result[linea][dayKey]) result[linea][dayKey] = { diurno: 0, nocturno: 0 };
    
    const dayStart = new Date(currentDay);
    dayStart.setHours(PROD_DAY_START_HOUR, 0, 0, 0);
    const dayEnd = new Date(currentDay);
    dayEnd.setDate(dayEnd.getDate() + 1);
    dayEnd.setHours(PROD_DAY_START_HOUR, 0, 0, 0);
    
    const taskStartInDay = localStart < dayStart ? dayStart : localStart;
    const taskEndInDay = localEnd > dayEnd ? dayEnd : localEnd;
    
    if (taskStartInDay < taskEndInDay) {
      const splitTime = new Date(dayStart);
      splitTime.setHours(SHIFT_SPLIT_HOUR, SHIFT_SPLIT_MINUTE, 0, 0);
      
      let diurnoDia = 0;
      let nocturnoDia = 0;
      
      if (taskStartInDay < splitTime) {
        const dEnd = taskEndInDay < splitTime ? taskEndInDay : splitTime;
        const ms = dEnd.getTime() - taskStartInDay.getTime();
        if (ms > 0) diurnoDia += ms / (1000 * 60 * 60);
      }
      if (taskEndInDay > splitTime) {
        const nStart = taskStartInDay > splitTime ? taskStartInDay : splitTime;
        const ms = taskEndInDay.getTime() - nStart.getTime();
        if (ms > 0) nocturnoDia += ms / (1000 * 60 * 60);
      }
      
      result[linea][dayKey].diurno += diurnoDia;
      result[linea][dayKey].nocturno += nocturnoDia;
    }
    
    currentDay.setDate(currentDay.getDate() + 1);
  }
}

console.log('Horas programadas por linea, dia y turno - Semana 38 (Lun 14/09 a Dom 20/09):\n');
console.log('Reglas:');
console.log('- Zona horaria: UTC-4');
console.log('- Dia de produccion: 07:00 a 07:00 del dia siguiente');
console.log('- Turno diurno: 07:00 a 18:30 | Turno nocturno: 18:30 a 07:00');
console.log('- CP: NO se suma | CS/CIP: SÍ se suman al total general\n');

const lineas = Object.keys(result).sort((a, b) => Number(a) - Number(b));
for (const linea of lineas) {
  console.log(`=== Linea ${linea} ===`);
  let lineTotal = 0;
  for (const date of weekDates) {
    const hours = result[linea][date] || { diurno: 0, nocturno: 0 };
    const diurno = hours.diurno.toFixed(2);
    const nocturno = hours.nocturno.toFixed(2);
    const total = (hours.diurno + hours.nocturno).toFixed(2);
    lineTotal += Number(total);
    const dayName = getDayName(date);
    console.log(`  ${dayName} ${date}: Diurno=${diurno}h, Nocturno=${nocturno}h, Total=${total}h`);
  }
  const cp = excludedHoursByLine[linea] || 0;
  const finalTotal = lineTotal + (totalsByLine[linea] - cp);
  console.log(`  TOTAL LINEA ${linea}: ${finalTotal.toFixed(2)}h (produccion: ${lineTotal.toFixed(2)}h + CS/CIP: ${(totalsByLine[linea] - cp).toFixed(2)}h - CP: ${cp.toFixed(2)}h)\n`);
}

const grandTotal = Object.values(result).reduce((sum, lineaData) => {
  return sum + Object.values(lineaData).reduce((s, h) => s + h.diurno + h.nocturno, 0);
}, 0);
const totalCS_CIP = Object.values(totalsByLine).reduce((sum, val) => sum + val, 0) - Object.values(excludedHoursByLine).reduce((sum, val) => sum + val, 0);
const totalCP = Object.values(excludedHoursByLine).reduce((sum, val) => sum + val, 0);
console.log(`TOTAL SEMANA 38 (produccion): ${grandTotal.toFixed(2)}h`);
console.log(`TOTAL SEMANA 38 (CS/CIP): ${totalCS_CIP.toFixed(2)}h`);
console.log(`TOTAL SEMANA 38 (CP excluido): ${totalCP.toFixed(2)}h`);
console.log(`TOTAL SEMANA 38 (general): ${(grandTotal + totalCS_CIP).toFixed(2)}h`);
