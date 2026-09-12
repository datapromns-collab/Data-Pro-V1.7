const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));

const PROD_DAY_START_HOUR = 7;
const PROD_DAY_END_NEXT_HOUR = 7;
const SHIFT_SPLIT_HOUR = 18;
const SHIFT_SPLIT_MINUTE = 30;

function getProdDayStart(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  if (date.getHours() < PROD_DAY_START_HOUR) {
    d.setDate(d.getDate() - 1);
  }
  return d;
}

const weeks = data.planner?.weeks || {};
const weekKeys = Object.keys(weeks).sort();

const results = {};

for (const weekKey of weekKeys) {
  const tasks = weeks[weekKey]?.tasks || [];
  if (tasks.length === 0) continue;

  const weekStart = new Date(weekKey + 'T00:00:00Z');
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    weekDates.push(d.toISOString().split('T')[0]);
  }

  const result = {};
  const totalsByLine = {};
  const cpHoursByLine = {};

  for (const task of tasks) {
    const start = new Date(task.startTime);
    const end = new Date(task.endTime);
    const durationHours = Number(task.durationHours) || 0;
    const linea = String(task.lineId || '').trim();
    const name = String(task.name || '').trim();

    if (durationHours <= 0 || isNaN(start.getTime()) || isNaN(end.getTime()) || !linea) continue;

    const isCP = name.includes('CP') && !name.includes('CIP');

    if (!totalsByLine[linea]) totalsByLine[linea] = 0;
    totalsByLine[linea] += durationHours;

    if (isCP) {
      if (!cpHoursByLine[linea]) cpHoursByLine[linea] = 0;
      cpHoursByLine[linea] += durationHours;
    }

    const prodDayStart = getProdDayStart(start);
    const prodDayEnd = getProdDayStart(end);
    let currentDay = new Date(prodDayStart);

    while (currentDay <= prodDayEnd) {
      const dayKey = currentDay.toISOString().split('T')[0];

      if (!result[linea]) result[linea] = {};
      if (!result[linea][dayKey]) result[linea][dayKey] = { diurno: 0, nocturno: 0 };

      const dayStart = new Date(currentDay);
      dayStart.setHours(PROD_DAY_START_HOUR, 0, 0, 0);
      const dayEnd = new Date(currentDay);
      dayEnd.setDate(dayEnd.getDate() + 1);
      dayEnd.setHours(PROD_DAY_START_HOUR, 0, 0, 0);

      const taskStartInDay = start < dayStart ? dayStart : start;
      const taskEndInDay = end > dayEnd ? dayEnd : end;

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

  results[weekKey] = { result, totalsByLine, cpHoursByLine, weekDates };
}

const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function getDayName(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z');
  const dayNum = d.getDay();
  return dayNames[dayNum];
}

console.log('Horas programadas por linea, dia y turno - Todas las semanas:\n');
console.log('Reglas:');
console.log('- Horas reales de permanencia por tarea');
console.log('- CP: se incluye en diurno/nocturno, NO en total general');
console.log('- CS/CIP: se incluye en diurno/nocturno y en total general\n');

for (const weekKey of weekKeys) {
  const { result, totalsByLine, cpHoursByLine, weekDates } = results[weekKey];
  if (!result || Object.keys(result).length === 0) continue;

  console.log(`=== Semana ${weekKey} ===`);

  const lineas = Object.keys(result).sort((a, b) => Number(a) - Number(b));
  for (const linea of lineas) {
    console.log(`\nLinea ${linea}:`);
    let lineTotal = 0;
    for (const date of weekDates) {
      const horas = result[linea][date] || { diurno: 0, nocturno: 0 };
      const diurno = horas.diurno.toFixed(2);
      const nocturno = horas.nocturno.toFixed(2);
      const total = (horas.diurno + horas.nocturno).toFixed(2);
      lineTotal += Number(total);
      const dayName = getDayName(date);
      if (Number(total) > 0) {
        console.log(`  ${dayName} ${date}: Diurno=${diurno}h, Nocturno=${nocturno}h, Total=${total}h`);
      }
    }
    const cp = cpHoursByLine[linea] || 0;
    const finalTotal = lineTotal - cp;
    console.log(`  TOTAL LINEA ${linea}: ${finalTotal.toFixed(2)}h (desglose: ${lineTotal.toFixed(2)}h - CP: ${cp.toFixed(2)}h)`);
  }

  const grandTotal = Object.values(result).reduce((sum, lineaData) => {
    return sum + Object.values(lineaData).reduce((s, h) => s + h.diurno + h.nocturno, 0);
  }, 0);
  const totalCP = Object.values(cpHoursByLine).reduce((sum, val) => sum + val, 0);
  console.log(`\nTOTAL SEMANA ${weekKey}: ${(grandTotal - totalCP).toFixed(2)}h (desglose: ${grandTotal.toFixed(2)}h - CP: ${totalCP.toFixed(2)}h)\n`);
}
