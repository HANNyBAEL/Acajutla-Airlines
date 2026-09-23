# Plan: mejoras en Vuelos, Aeronaves y Operaciones

**Stack confirmado:** backend Express + MySQL (SQL puro con mysql2, sin ORM) en `backend/`, panel admin en `frontend-backoffice/` (React 18 + Tailwind). Ya existen patrones reutilizables para todo lo pedido: el endpoint de activar/desactivar aeropuertos, el componente `SearchableSelect` (ya usado en Gestión de Vuelos) y la columna `multiplier` en `fare_classes`.

---

## 1. Orden del listado de vuelos: los últimos creados primero

**Causa raíz:** `backend/src/models/Vuelo.js:53` ordena por `departure_datetime DESC`. TEST-999 aparece siempre primero porque tiene la fecha de salida más lejana de la base de datos (fue creado por la UI, no hay seed). 

**Cambio:** en `Vuelo.listarTodos()` cambiar a `ORDER BY f.id DESC` (el ID autoincremental refleja el orden de creación; la tabla `flights` no garantiza tener `created_at`). Así los recién creados quedan arriba y TEST-999 irá bajando conforme se creen vuelos nuevos.

## 2. Buscador por fecha de salida en Gestión de Vuelos

**Backend:**
- `Vuelo.listarTodos(fecha)` acepta fecha opcional: si viene, agrega `AND DATE(f.departure_datetime) = ?` (mismo patrón que ya usa `buscarDisponibles` en `Vuelo.js:26`).
- `vuelosController.listarVuelos` lee `req.query.fecha` y lo pasa al modelo.

**Frontend (`frontend-backoffice/src/pages/Vuelos.jsx`):**
- Junto al buscador de texto (línea 167-172), agregar un `<input type="date">` "Fecha de salida" que recarga la lista con `api.get('/vuelos', { params: { fecha } })`. El filtro de texto sigue aplicándose encima (client-side). Al limpiar la fecha se recarga todo.

## 3. Clases tarifarias automáticas con multiplicadores al crear vuelo

**Estado actual:** `crearVuelo` (`vuelosController.js:105-111`) ya crea una tarifa por cada clase activa, pero todas al precio base (ignora `multiplier`).

**Cambios:**
- En `crearVuelo`: `SELECT id, multiplier FROM fare_classes WHERE active = 1` y crear cada tarifa con `price = ROUND(base_price * multiplier, 2)`. Queda configurable: si mañana cambian el multiplicador de una clase en Operaciones, los vuelos nuevos lo usan.
- Nueva migración `backend/migracion-clases-tarifarias.js` (siguiendo la convención de los `migracion-*.js`): asegura las 4 clases estándar del sistema (los códigos que ya usa `utils/fareClass.js`) con sus multiplicadores:
  - `ECONOMICA` × 1.00 (precio base)
  - `PREMIUM` × 1.35
  - `BUSINESS` × 1.90
  - `PRIMERA` × 2.60
  (inserta la clase si no existe; actualiza el multiplicador si ya existe)
- Los vuelos ya existentes conservan sus tarifas actuales (no se tocan; se pueden ajustar manualmente desde Operaciones → Asignar tarifa).

## 4. Aeronaves: nada se elimina, sólo se desactiva

### Tipos de aeronave (hoy sí se pueden eliminar)
- **Migración** `backend/migracion-aeronaves-estado.js`: agregar columna `active TINYINT(1) NOT NULL DEFAULT 1` a `aircraft_types` (con chequeo `columnExists` como en `migracion-tarifas-reservas.js`).
- **Backend:** eliminar la ruta `DELETE /tipos/:id` y el handler `eliminarTipo` (`aircraftRoutes.js:13`, `aircraftController.js:151-170`). Agregar `PATCH /aeronaves/tipos/:id/estado` con body `{ active }` (copia del patrón de `airportsController.cambiarEstado`, con advertencia si el tipo tiene aeronaves en flota). `listarTipos` pasa a incluir `active`. Al crear una aeronave se rechaza un tipo inactivo.
- **Frontend (`Aeronaves.jsx`):** quitar el botón "Eliminar" (líneas 228-230) y su handler; agregar botón **Desactivar/Activar** (iconos toggle, patrón de `Aeropuertos.jsx`), columna "Estado" con badge Activo/Inactivo y fila atenuada para inactivos. El select de tipos del formulario "Nueva Aeronave" sólo muestra tipos activos.

### Flota (aeronaves)
- El borrado de aeronaves **ya no existe** en la API (no hay ruta DELETE ni botón): se mantiene así.
- Desactivar = estado `out_of_service` que ya existe en el modelo. Ventajas: ya desaparecen del selector de creación de vuelos (`/vuelos/aeronaves` filtra `available/in_flight`) y de los reportes de disponibilidad. Se agrega en la tabla de flota una columna "Acciones" con botón **Desactivar/Activar** rápido (además del selector de estado que ya está en el drawer).

## 5. Operaciones: escribir para buscar en todos los catálogos

Reemplazar los 5 `<select>` planos de `Operaciones.jsx` por el componente existente `SearchableSelect` (filtra mientras se escribe y muestra máx. 10 coincidencias, sin tocar backend):
1. **Vuelo** (asignación de tripulación, línea 184) — búsqueda por número de vuelo, origen y destino; etiqueta con número · ruta · fecha.
2. **Tripulante** (línea 188) — por nombre y rol (sólo activos, como hoy).
3. **Vuelo** (asignación de tarifas, línea 299).
4. **Clase tarifaria** (línea 303).
5. **Aeropuerto** (infraestructura, línea 333) — por código IATA y nombre.

Los selects pequeños de opciones fijas (rol, tipo de instalación) quedan como están.

---

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `backend/src/models/Vuelo.js` | Orden por `id DESC` + filtro `fecha` |
| `backend/src/controllers/vuelosController.js` | Parámetro `fecha`; multiplicadores en `crearVuelo` |
| `backend/src/controllers/aircraftController.js` | `active` en tipos, toggle de estado, sin eliminar |
| `backend/src/routes/aircraftRoutes.js` | Quitar DELETE, agregar PATCH estado |
| `backend/migracion-clases-tarifarias.js` | **Nuevo** — clases estándar con multiplicadores |
| `backend/migracion-aeronaves-estado.js` | **Nuevo** — columna `active` en `aircraft_types` |
| `frontend-backoffice/src/pages/Vuelos.jsx` | Input de fecha de salida |
| `frontend-backoffice/src/pages/Aeronaves.jsx` | Desactivar/Activar en flota y tipos, sin Eliminar |
| `frontend-backoffice/src/pages/Operaciones.jsx` | 5 `SearchableSelect` |

## Verificación
1. Ejecutar las 2 migraciones (idempotentes) contra la BD configurada en `.env`.
2. `node --check` en los archivos backend modificados y `npm run build` en `frontend-backoffice`.
3. Revisar el panel: crear un vuelo de prueba y confirmar que quedan las 3 clases con los precios base×1.90/1.35/2.60, que el listado muestra primero el más reciente, el filtro por fecha, y los toggles de aeronaves/tipos.

**Nota:** TEST-999 no está en el código, está en la base de datos. Con el nuevo orden seguirá primero hasta que se creen vuelos más nuevos; si se quiere fuera de la vista, se cancela desde la UI.