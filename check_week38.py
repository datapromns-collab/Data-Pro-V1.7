import json
from datetime import datetime, timedelta

with open('data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Week 38 of 2026: Monday Sept 14 to Sunday Sept 20
week_start = datetime(2026, 9, 14)
week_end = datetime(2026, 9, 20, 23, 59, 59)

tasks = data.get('planner', {}).get('tasks', [])
week_tasks = []
for t in tasks:
    start = t.get('startTime', '')
    if start:
        try:
            dt = datetime.fromisoformat(start.replace('Z', '+00:00'))
            if week_start <= dt <= week_end:
                week_tasks.append(t)
        except:
            pass

print(f'Tasks in week 38: {len(week_tasks)}')
for t in week_tasks[:20]:
    print(f"  {t.get('name')} line {t.get('lineId')} {t.get('startTime')} -> {t.get('endTime')} dur={t.get('durationHours')}h")

# Check hrs-programadas
collections = data.get('collections', {})
hrs_prog = collections.get('planta-hrs-programadas', {})
hrs_prog_dt = collections.get('planta-hrs-programadas-dt', {})

print("\nplanta-hrs-programadas keys:", list(hrs_prog.keys())[:10])
print("planta-hrs-programadas-dt keys:", list(hrs_prog_dt.keys())[:10])

# Check for week 38 dates
week_dates = [(week_start + timedelta(days=i)).strftime('%Y-%m-%d') for i in range(7)]
print("\nWeek 38 dates:", week_dates)

for d in week_dates:
    if d in hrs_prog:
        print(f"  hrs_prog[{d}]: {hrs_prog[d]}")
    if d in hrs_prog_dt:
        print(f"  hrs_prog_dt[{d}]: {hrs_prog_dt[d]}")
