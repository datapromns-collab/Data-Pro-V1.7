# Plan: Planificación independiente por semana

## Objetivo
Hacer que la planificación del módulo `planning` (y módulos semanales relacionados) sea
**independiente para cada semana** según la fecha seleccionada en el selector (semana lunes-domingo).
Cambiar la fecha en el `Calendar` debe cargar/guardar el conjunto completo de datos de esa semana,
aislado de las demás semanas. Persistir en **localStorage y servidor remoto (json-db)**.

## Alcance (confirmado con el usuario)
- **Independiente por semana:** tareas (Gantt) + todo lo semanal (producción real, UBB, stock de
  materia prima, proyecciones de venta, inventarios, plan de producción, deletedTaskIds).
- **Global (NO por semana):** recetas base de materia prima (`customRecipes`) y recetas de empaque
  (`customPackagingRecipes`) — son definiciones de producto, no de la semana.
- Persistencia: remoto (json-db) + localStorage.
- Granularidad: **por semana completa (lunes-domingo)**.

## Clave de semana
`weekKey = format(weekStartDate, 'yyyy-MM-dd')` (lunes de la semana, weekStartsOn: 1).
`weekEnd = addDays(weekStartDate, 7)`.

## Nuevo modelo de estado en `use-planner-store.tsx`
Datos semanales se agrupan en un único objeto indexado por weekKey:

```ts
interface WeeklyData {
  tasks: ScheduledTask[];
  realProduction: DeepNestedRecord;
  rawMaterialStock: Record<string, RawMaterialStock>;
  manualUBB: NestedRecord;
  initialUBBTanks: Record<string, number>;
  finalUBBTanks: Record<string, number>;
  initialUBBTanksDaily: NestedRecord;
  finalUBBTanksDaily: NestedRecord;
  salesProjection: NestedRecord;
  finishedProductInventory: NestedRecord;
  productionPlan: NestedRecord;
  logisticsInventory: Record<string, number>;
  plantInventory: Record<string, number>;
  salesProjectionAW: NestedRecord;
  finishedProductInventoryAW: NestedRecord;
  productionPlanAW: NestedRecord;
  logisticsInventoryAW: Record<string, number>;
  plantInventoryAW: Record<string, number>;
  deletedTaskIds: string[];
}

const STORAGE_KEY_WEEKS = 'planner_weeks_v1';
```

Estado:
- `weeklyData: Record<string, WeeklyData>` (todas las semanas en memoria + persistencia).
- `weekStartDate` se mantiene igual (semana actual seleccionada).

Selector derivado: `const week = weeklyData[weekKey] ?? emptyWeek()`.
Se exponen los datos de la semana activa con los mismos nombres de hoy (`tasks`, `realProduction`, …)
para no romper la API del contexto que consumen page.tsx y componentes.

## API del contexto (sin romper consumidores)
Mantener los mismos nombres expuestos (`tasks`, `realProduction`, …) pero que sean los de la
semana activa. Internamente, cada `setX` escribe en `weeklyData[weekKey]`.

Para lograrlo con mínimo riesgo, envolver los setters:
- `setTasks` → actualiza `weeklyData[weekKey].tasks`.
- `addTask`/`updateTask`/`removeTask`/`clearAll` → operan sobre la semana activa.
- `setRealProduction`, `setRawMaterialStock`, etc. → igual.
- Helpers con `weekStartDate` (`updateRawMaterialStock`, `updateManualUBB`,
  `updateInitialUBBTanksDaily`, `updateFinalUBBTanksDaily`, `updateRawMaterialDailyInitial/Final`)
  ya usan `weekStartDate`; se mantienen igual porque siguen escribiendo en la semana activa.

`weekStartDate` sigue siendo global (preferencia de fecha). Al cambiar de semana, los datos
mostrados cambian automáticamente porque provienen de `weeklyData[weekKey]`.

## Acciones de carga/hidratación
- `loadFromLocalStorage`: leer `STORAGE_KEY_WEEKS` (nuevo). Mantener `planner_autosave_v1` como
  fallback de migración: si existe, convertir su contenido en `weeklyData[currentWeekKey]`.
- Hidratación remota (`applyRemoteToState`, `refreshFromServer`): el remoto ahora guarda
  `planner.weeks` (objeto indexado por weekKey). Para fusión por semana:
  - Para cada weekKey en remoto, merge profundo con local (por semana).
  - `deletedTaskIds` de cada semana se unen.
- `savePlannerData` (remoto) y `saveToLocalStorage` (local): enviar/guardar `weeks` completo.

## Persistencia remota `src/lib/json-db.ts`
- `PlannerData`: reemplazar campos semanales por `weeks: Record<string, WeeklyData>`.
  Mantener `customRecipes`, `customPackagingRecipes` y `config.lineSpeeds` globales.
  `config.weekStartDate` queda solo como última selección.
- `loadPlannerData`/`savePlannerData` mantienen interfaz (devuelven/reciben `planner`).
- Endpoint `/api/data` (verificar implementación) guarda el objeto completo; el payload cambia de shape.

## Consumidores a ajustar
La mayoría consumen vía el contexto (`usePlannerStore`), cuyos nombres no cambian → **no requieren
cambios** salvo donde se asuma datos globales:
- `src/app/page.tsx`: `filteredTasks`, secciones planning/management/raw-materials/jarabes,
  `handleClearContext` (clearAll con weekStartDate/weekEnd → borra solo la semana), reportes de
  impresión → todos leen del contexto y ya serán de la semana activa. ✅
- Componentes `planner/*` (ProductionGantt, DailyPlanSection, RequirementSection, RawMaterialModule,
  JarabesModule, AdminReportTool, LineSpeedsConfig, TaskDialog): consumen props del contexto →
  **sin cambios** siempre que el contexto exponga los datos de la semana activa.
- Verificar que ningún componente lea directamente `localStorage` con claves viejas
  (`planner_tasks_v2`, etc.). Reemplazar por el nuevo modelo.

## Migración de datos existentes
- Al hidratar por primera vez, si existe `planner_autosave_v1` o claves `planner_*_v2/v1`,
  mover su contenido a `weeklyData[weekKeyActual]` y luego limpiar claves obsoletas para no
  duplicar. Esto preserva la planificación actual como la semana en curso.

## Pasos de implementación
1. Definir tipos `WeeklyData` y `weekKey` helper en `use-planner-store.tsx`.
2. Reemplazar estados individuales semanales por `weeklyData` + selector de semana activa.
3. Reescribir setters/helpers para escribir en la semana activa.
4. Actualizar carga/hidratación (local + remoto) con merge por semana y migración.
5. Actualizar `json-db.ts` (`PlannerData` con `weeks`).
6. Verificar `/api/data` route (leer/escribir shape nuevo).
7. Revisar componentes consumidores (grep de claves viejas).
8. Compilar (`next build` / `tsc`) y corregir errores de tipos.

## Riesgos
- Tamaño del payload remoto crece con N semanas; aceptable para el uso actual.
- Refactor grande: priorizar no cambiar la API del contexto para minimizar impacto en componentes.
