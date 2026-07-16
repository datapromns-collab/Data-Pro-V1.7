# Plan: Sincronización compartida de Jarabes, Planta y Seguimiento

## Objetivo
Que los datos cargados por cualquier usuario en los módulos **Jarabes**, **Planta** y
**Seguimiento** se guarden en el servidor compartido (`data.json`) y sean visibles para
todos los usuarios, con refresco automático (~15 s), igual que ya ocurre con
Planificación / Órdenes SAP / Notificaciones.

## Causa raíz
El almacén compartido del servidor ya existe y funciona:
- `/api/data` (planner, ordenesSap, notifications)
- `/api/collection/[ns]` (colecciones genéricas por namespace)
- Hook `useRemoteCollection(namespace, initial)` que cachea en `localStorage`,
  hace POST al servidor y hace polling cada 15 s + al volver a la pestaña.

Pero los tres módulos afectados persisten **solo en `localStorage`** (local a cada
navegador), por eso nadie más ve lo que carga otro usuario:
- **Planta**: `plantaStore = useRemoteCollection('planta-informes-ordenes', ...)`
  está declarado en `src/app/page.tsx:246` pero **nunca se conecta**. Los datos
  reales (`informesOperacionales`, `ordenesTrabajo`) usan `useState` + `localStorage`
  (`src/app/page.tsx:479-503`).
- **Jarabes** (`src/components/planner/JarabesModule.tsx`): claves por fecha en
  `localStorage` (`jarabes-ubb-<fecha>`, `jarabes-sugar-<fecha>`,
  `jarabes-tanques-<fecha>`, `jarabes-real-kg-per-sack-<fecha>`,
  `jarabes-costo-azucar-<fecha>`).
- **Seguimiento** (`EnfardadoraPanel`, `EtiquetadoraPanel`, `EficienciaPanel`,
  `CapacidadesPanel`): claves fijas en `localStorage`
  (`eficiencia_enfardadoras_stops`, `..._efficiency_v2`, `..._capacidades_v1`, y
  equivalentes de etiquetadora).

## Consideración transversal: eliminaciones
El merge del servidor une arrays por `id` (nunca elimina). Para que las eliminaciones
se propaguen entre usuarios (y no "revivan" en el siguiente polling) se usará el patrón
de *tombstones* que ya usa el planner (`deletedTaskIds`).

### Cambio en `src/app/api/collection/[ns]/route.ts`
Añadir soporte genérico de tombstones en el POST. Convención: el payload puede incluir
`_deletedIds: { <arrayKey>: [ids...] }`. Tras el merge:
1. Unir los `_deletedIds` existentes con los entrantes (Set por arrayKey).
2. Para cada `arrayKey`, filtrar el array resultante quitando los `id` presentes en el
   tombstone correspondiente.
3. Persistir `_deletedIds` dentro de la colección para que se aplique a POSTs futuros
   de otros clientes.

Esto es retrocompatible: colecciones sin `_deletedIds` no cambian de comportamiento.

## Namespaces a usar
(`sanitizeNs` permite `[a-z0-9-]`, sin guiones bajos.)
- Planta: `planta-informes-ordenes` (ya existe) →
  `{ informesOperacionales: [], ordenesTrabajo: [], _deletedIds: {} }`
- Jarabes: `jarabes` →
  `{ ubb: {<fecha>:{}}, sugar: {<fecha>:{}}, tanques: {<fecha>:{}},
     realKgPerSack: {<fecha>:''}, costoAzucar: {<fecha>:''} }`
- Seguimiento enfardadora: `seguimiento-enfardadora` →
  `{ stops: [], efficiency: {}, capacidades: {}, _deletedIds: {} }`
- Seguimiento etiquetadora: `seguimiento-etiquetadora` →
  `{ stops: [], efficiency: {}, capacidades: {}, _deletedIds: {} }`

Nota: la **fecha/semana seleccionada** es estado de UI por usuario y **se mantiene en
`localStorage`** (no se comparte). Solo se comparten los datos.

---

## 1) Planta (en `src/app/page.tsx`) — cambio contenido
1. Eliminar los `useState` `informesOperacionales` / `ordenesTrabajo`
   (`src/app/page.tsx:339-340`) y los `useEffect` de carga/guardado en `localStorage`
   (`src/app/page.tsx:479-503`).
2. Derivar los datos desde el store ya declarado:
   - `const informesOperacionales = plantaStore.data.informesOperacionales ?? []`
   - `const ordenesTrabajo = plantaStore.data.ordenesTrabajo ?? []`
3. Reemplazar cada escritura por `plantaStore.setData(prev => ...)`:
   - Alta de informe (`src/app/page.tsx:2448`).
   - Edición de informe (`src/app/page.tsx:1764`).
   - Alta de orden de trabajo (`src/app/page.tsx:2466`).
   - Cualquier eliminación de fila: quitar del array **y** agregar el `id` a
     `_deletedIds.informesOperacionales` / `_deletedIds.ordenesTrabajo`.
4. Verificar que todos los `id` usados sean estables (hoy `Date.now()`), correcto.

## 2) Jarabes (`src/components/planner/JarabesModule.tsx`) — refactor mayor
Problema: los subcomponentes leen `localStorage` directamente y por fecha, e incluso
leen "el día anterior" (arrastre de inventario final → inicial) y toda la semana
(`computeResumenForDate`, `getRealKgPerSackForDate`).

Solución: introducir un **contexto de datos de Jarabes** respaldado por
`useRemoteCollection('jarabes', {...})`.

1. Crear `JarabesDataProvider` (nuevo, dentro de `JarabesModule.tsx` o
   `src/hooks/use-jarabes-store.tsx`) que:
   - Use `useRemoteCollection('jarabes', { ubb:{}, sugar:{}, tanques:{},
     realKgPerSack:{}, costoAzucar:{} })`.
   - Exponga getters/setters por fecha y tipo:
     `getUbb(fecha)`, `setUbb(fecha, values)`, y análogos para `sugar`, `tanques`,
     `realKgPerSack`, `costoAzucar`.
   - Exponga helpers que hoy leen `localStorage`:
     `getRealKgPerSackForDate(fecha)` y `computeResumenForDate(fecha, kg)` leyendo del
     estado del contexto en vez de `localStorage`.
2. Refactorizar los subcomponentes para leer/escribir vía contexto (quitar todo
   `localStorage.*`):
   - `RealKgPerSackInput`, `CostoAzucarInput`
   - `UbbTable`, `SugarTable`, `TanquesTable`
   - `ResumenTable`, `REstandarSemTable`, `RPromedioSemTable`
   - `computeResumenForDate`, `getRealKgPerSackForDate`
3. Mantener la lógica de "arrastre del día anterior" (final → inicial) leyendo la fecha
   anterior desde el contexto. Solo autocompletar si la fecha actual está vacía.
4. Escrituras con debounce ya las da `useRemoteCollection` (150 ms) — quitar los
   guardados manuales.

## 3) Seguimiento — refactor moderado/mayor
Elevar el estado a cada panel raíz y pasar datos + setters por props a los hijos.

### `EnfardadoraPanel.tsx`
1. En `EnfardadoraPanel`, usar
   `useRemoteCollection('seguimiento-enfardadora', { stops:[], efficiency:{}, capacidades:{}, _deletedIds:{} })`.
2. Pasar a `ParadasControl` los `stops`, un setter y la función de escritura de
   `efficiency` (hoy `syncToEfficiency` escribe a `localStorage`; pasará a escribir en
   `store.setData(prev => ({...prev, efficiency}))`).
3. Eliminaciones de paradas → filtrar `stops` y agregar `id` a
   `_deletedIds.stops`.
4. `EficienciaPanel` y `CapacidadesPanel` pasan a ser **controlados**: reciben
   `efficiency` / `capacidades` y `onChange` por props en lugar de leer/escribir
   `localStorage`. La fecha/semana seleccionada sigue en `localStorage` (UI local).

### `EtiquetadoraPanel.tsx`
- Igual que Enfardadora pero con namespace `seguimiento-etiquetadora`.
- Nota: hoy la etiquetadora **no** tiene `syncToEfficiency`; mantener ese
  comportamiento (solo `stops`), pero `efficiency`/`capacidades` de sus paneles hijos
  también deben guardarse en el mismo namespace.

### `EficienciaPanel.tsx` y `CapacidadesPanel.tsx`
- Convertir a componentes controlados (props `data` + `onChange`), eliminando sus
  `useState`+`localStorage` de datos. Conservar el estado local de la semana/fecha
  seleccionada.

## 4) Migración de datos existentes (una sola vez)
Para no perder lo ya cargado en cada PC: en el primer load de cada namespace, si el
remoto viene vacío y existen claves antiguas en `localStorage`, subirlas al servidor.
- Planta: leer `planta-informes-operacionales` / `planta-ordenes-trabajo`.
- Jarabes: recorrer claves `jarabes-*` y agruparlas por tipo/fecha.
- Seguimiento: leer `eficiencia_*_stops`, `..._efficiency_v2`, `..._capacidades_v1`.
Se ejecuta solo si el remoto está vacío para evitar sobrescribir datos de otros.

## 5) Verificación
1. `npm run dev`.
2. Abrir dos navegadores/perfiles (o ventana normal + incógnito) y loguear con dos
   usuarios distintos con permisos a estos módulos.
3. En cada módulo (Jarabes, Planta, Seguimiento) cargar datos con un usuario y
   confirmar que aparecen en el otro tras ~15 s o al refrescar.
4. Probar edición y **eliminación** (que la eliminación se propague y no reaparezca).
5. Jarabes: confirmar que el arrastre del inventario final→inicial del día siguiente
   sigue funcionando.
6. Confirmar que la fecha/semana seleccionada NO se comparte entre usuarios.

## Archivos a modificar
- `src/app/api/collection/[ns]/route.ts` (tombstones `_deletedIds`).
- `src/app/page.tsx` (Planta → `plantaStore`).
- `src/components/planner/JarabesModule.tsx` (+ posible `src/hooks/use-jarabes-store.tsx`).
- `src/components/seguimiento/EnfardadoraPanel.tsx`
- `src/components/seguimiento/EtiquetadoraPanel.tsx`
- `src/components/seguimiento/EficienciaPanel.tsx`
- `src/components/seguimiento/CapacidadesPanel.tsx`

## Riesgos / notas
- Edición concurrente: last-write-wins por campo (deep merge). Aceptable para este uso.
- El remount por polling no se usará; los datos entran por estado del hook, evitando
  perder foco mientras se escribe (el hook hace merge no destructivo del estado).
- `useRemoteCollection` ya cachea en `localStorage`, por lo que se conserva soporte
  offline básico.
