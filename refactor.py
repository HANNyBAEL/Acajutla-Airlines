import re

with open('frontend-backoffice/src/pages/Operaciones.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update imports
content = content.replace(
    "import { FiUsers, FiTag, FiMap, FiSettings, FiActivity, FiEdit2, FiX, FiToggleLeft, FiToggleRight } from 'react-icons/fi';",
    "import { FiUsers, FiTag, FiMap, FiSettings, FiActivity, FiEdit2, FiX, FiToggleLeft, FiToggleRight, FiPlus } from 'react-icons/fi';"
)

# 2. Add state variables
state_vars = '''  const [drawerConfig, setDrawerConfig] = useState(null);
  
  const [modalNuevoTripulante, setModalNuevoTripulante] = useState(false);
  const [modalAsignarTripulacion, setModalAsignarTripulacion] = useState(false);
  const [modalNuevaClase, setModalNuevaClase] = useState(false);
  const [modalAsignarTarifa, setModalAsignarTarifa] = useState(false);
  const [modalNuevaInstalacion, setModalNuevaInstalacion] = useState(false);'''
content = content.replace("  const [drawerConfig, setDrawerConfig] = useState(null);", state_vars)

# 3. Add modal closes in functions
content = content.replace("setFCrew({ full_name: '', role_operativo: 'pilot', license_type: '', license_number: '', license_expiry: '' });\\n      cargarBase();", "setFCrew({ full_name: '', role_operativo: 'pilot', license_type: '', license_number: '', license_expiry: '' });\\n      setModalNuevoTripulante(false);\\n      cargarBase();")

content = content.replace("setCrewVuelo(r.data.datos || []);\\n    } catch", "setCrewVuelo(r.data.datos || []);\\n      setModalAsignarTripulacion(false);\\n    } catch")

content = content.replace("setFClase({ code: '', name: '', multiplier: '1.00', conditions: '' });\\n      cargarBase();", "setFClase({ code: '', name: '', multiplier: '1.00', conditions: '' });\\n      setModalNuevaClase(false);\\n      cargarBase();")

content = content.replace("setFaresVuelo(fr.data.datos || []);\\n    } catch", "setFaresVuelo(fr.data.datos || []);\\n      setModalAsignarTarifa(false);\\n    } catch")

content = content.replace("setFFac({ airport_id: '', type: 'gate', code: '' });\\n      cargarBase();", "setFFac({ airport_id: '', type: 'gate', code: '' });\\n      setModalNuevaInstalacion(false);\\n      cargarBase();")

# 4. Refactor Tripulacion UI
old_tripulacion_ui = '''      {tab === 'tripulacion' && (
        <div className="space-y-4">
          <div className="card p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
            <input className="input-field" placeholder="Nombre completo" value={fCrew.full_name} onChange={(e) => setFCrew(Object.assign({}, fCrew, { full_name: e.target.value }))} />
            <select className="input-field" value={fCrew.role_operativo} onChange={(e) => setFCrew(Object.assign({}, fCrew, { role_operativo: e.target.value }))}>
              <option value="pilot">Piloto</option><option value="copilot">Copiloto</option>
              <option value="cabin">Auxiliar de vuelo</option><option value="maintenance">Mantenimiento</option>
            </select>
            <input className="input-field" placeholder="Tipo licencia" value={fCrew.license_type} onChange={(e) => setFCrew(Object.assign({}, fCrew, { license_type: e.target.value }))} />
            <input className="input-field" placeholder="N° licencia" value={fCrew.license_number} onChange={(e) => setFCrew(Object.assign({}, fCrew, { license_number: e.target.value }))} />
            <div className="flex gap-2">
              <input type="date" className="input-field" value={fCrew.license_expiry} onChange={(e) => setFCrew(Object.assign({}, fCrew, { license_expiry: e.target.value }))} />
              <button className="btn-primary whitespace-nowrap" onClick={crearTripulante}>Crear</button>
            </div>
          </div>
          <div className="card p-4 grid grid-cols-1 md:grid-cols-6 gap-3">
            <SearchableSelect options={opcionesVuelos} value={fAsig.flight_id} onChange={(valor) => verCrewVuelo(valor)} placeholder="Vuelo: número, origen, destino..." />
            <SearchableSelect options={opcionesTripulantes} value={fAsig.crew_member_id} onChange={(valor) => setFAsig(Object.assign({}, fAsig, { crew_member_id: valor }))} placeholder="Tripulante: nombre o rol..." />
            <input type="datetime-local" className="input-field" value={fAsig.duty_start} onChange={(e) => setFAsig(Object.assign({}, fAsig, { duty_start: e.target.value }))} />
            <input type="datetime-local" className="input-field" value={fAsig.duty_end} onChange={(e) => setFAsig(Object.assign({}, fAsig, { duty_end: e.target.value }))} />
            <button className="btn-primary" onClick={asignar}>Asignar</button>
          </div>
          <div className="card overflow-hidden">'''

new_tripulacion_ui = '''      {tab === 'tripulacion' && (
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <button className="btn-primary flex items-center gap-2" onClick={() => setModalNuevoTripulante(true)}>
              <FiPlus /> Nuevo Tripulante
            </button>
            <button className="btn-secondary flex items-center gap-2" onClick={() => setModalAsignarTripulacion(true)}>
              <FiPlus /> Asignar a Vuelo
            </button>
          </div>
          <div className="card overflow-hidden">'''
content = content.replace(old_tripulacion_ui, new_tripulacion_ui)


tripulacion_modals = '''          {modalNuevoTripulante && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-800">Nuevo Tripulante</h2>
                  <button onClick={() => setModalNuevoTripulante(false)} className="text-gray-500 hover:text-gray-700"><FiX size={22} /></button>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo *</label>
                    <input className="input-field" placeholder="Nombre completo" value={fCrew.full_name} onChange={(e) => setFCrew(Object.assign({}, fCrew, { full_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rol operativo *</label>
                    <select className="input-field" value={fCrew.role_operativo} onChange={(e) => setFCrew(Object.assign({}, fCrew, { role_operativo: e.target.value }))}>
                      <option value="pilot">Piloto</option><option value="copilot">Copiloto</option>
                      <option value="cabin">Auxiliar de vuelo</option><option value="maintenance">Mantenimiento</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo licencia</label>
                      <input className="input-field" placeholder="Tipo licencia" value={fCrew.license_type} onChange={(e) => setFCrew(Object.assign({}, fCrew, { license_type: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">N° licencia</label>
                      <input className="input-field" placeholder="N° licencia" value={fCrew.license_number} onChange={(e) => setFCrew(Object.assign({}, fCrew, { license_number: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vencimiento licencia</label>
                    <input type="date" className="input-field" value={fCrew.license_expiry} onChange={(e) => setFCrew(Object.assign({}, fCrew, { license_expiry: e.target.value }))} />
                  </div>
                </div>
                <div className="flex justify-end space-x-2 mt-6">
                  <button className="btn-secondary" onClick={() => setModalNuevoTripulante(false)}>Cancelar</button>
                  <button className="btn-primary" onClick={crearTripulante}>Crear</button>
                </div>
              </div>
            </div>
          )}

          {modalAsignarTripulacion && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-800">Asignar a Vuelo</h2>
                  <button onClick={() => setModalAsignarTripulacion(false)} className="text-gray-500 hover:text-gray-700"><FiX size={22} /></button>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vuelo</label>
                    <SearchableSelect options={opcionesVuelos} value={fAsig.flight_id} onChange={(valor) => verCrewVuelo(valor)} placeholder="Vuelo: número, origen, destino..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tripulante</label>
                    <SearchableSelect options={opcionesTripulantes} value={fAsig.crew_member_id} onChange={(valor) => setFAsig(Object.assign({}, fAsig, { crew_member_id: valor }))} placeholder="Tripulante: nombre o rol..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Inicio de turno</label>
                    <input type="datetime-local" className="input-field" value={fAsig.duty_start} onChange={(e) => setFAsig(Object.assign({}, fAsig, { duty_start: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fin de turno</label>
                    <input type="datetime-local" className="input-field" value={fAsig.duty_end} onChange={(e) => setFAsig(Object.assign({}, fAsig, { duty_end: e.target.value }))} />
                  </div>
                </div>
                <div className="flex justify-end space-x-2 mt-6">
                  <button className="btn-secondary" onClick={() => setModalAsignarTripulacion(false)}>Cancelar</button>
                  <button className="btn-primary" onClick={asignar}>Asignar</button>
                </div>
              </div>
            </div>
          )}
'''
content = content.replace("{/* Drawers */}", tripulacion_modals + "\\n      {/* Drawers */}")


# 5. Refactor Clases UI
old_clases_ui = '''      {tab === 'clases' && (
        <div className="space-y-4">
          <div className="card p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
            <input className="input-field" placeholder="Código (Y, B, M...)" value={fClase.code} onChange={(e) => setFClase(Object.assign({}, fClase, { code: e.target.value }))} />
            <input className="input-field" placeholder="Nombre" value={fClase.name} onChange={(e) => setFClase(Object.assign({}, fClase, { name: e.target.value }))} />
            <input type="number" step="0.01" className="input-field" value={fClase.multiplier} onChange={(e) => setFClase(Object.assign({}, fClase, { multiplier: e.target.value }))} />
            <input className="input-field" placeholder="Condiciones" value={fClase.conditions} onChange={(e) => setFClase(Object.assign({}, fClase, { conditions: e.target.value }))} />
            <button className="btn-primary" onClick={crearClase}>Crear clase</button>
          </div>
          <div className="card p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
            <SearchableSelect options={opcionesVuelos} value={fFare.flight_id} onChange={(valor) => verFares(valor)} placeholder="Vuelo: número, origen, destino..." />
            <SearchableSelect options={opcionesClases} value={fFare.fare_class_id} onChange={(valor) => setFFare(Object.assign({}, fFare, { fare_class_id: valor }))} placeholder="Clase: código o nombre..." />
            <input type="number" step="0.01" className="input-field" placeholder="Precio final con impuestos" value={fFare.price} onChange={(e) => setFFare(Object.assign({}, fFare, { price: e.target.value }))} />
            <input type="number" className="input-field" placeholder="Asientos" value={fFare.seats_allocated} onChange={(e) => setFFare(Object.assign({}, fFare, { seats_allocated: e.target.value }))} />
            <button className="btn-primary" onClick={asignarFare}>Asignar tarifa</button>
          </div>
          {fFare.flight_id && ('''

new_clases_ui = '''      {tab === 'clases' && (
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <button className="btn-primary flex items-center gap-2" onClick={() => setModalNuevaClase(true)}>
              <FiPlus /> Nueva Clase
            </button>
            <button className="btn-secondary flex items-center gap-2" onClick={() => setModalAsignarTarifa(true)}>
              <FiPlus /> Asignar Tarifa
            </button>
          </div>
          {fFare.flight_id && ('''
content = content.replace(old_clases_ui, new_clases_ui)

clases_modals = '''          {modalNuevaClase && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-800">Nueva Clase Tarifaria</h2>
                  <button onClick={() => setModalNuevaClase(false)} className="text-gray-500 hover:text-gray-700"><FiX size={22} /></button>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Código (Y, B, M...)</label>
                    <input className="input-field" placeholder="Código" value={fClase.code} onChange={(e) => setFClase(Object.assign({}, fClase, { code: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                    <input className="input-field" placeholder="Nombre" value={fClase.name} onChange={(e) => setFClase(Object.assign({}, fClase, { name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Multiplicador</label>
                    <input type="number" step="0.01" className="input-field" value={fClase.multiplier} onChange={(e) => setFClase(Object.assign({}, fClase, { multiplier: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Condiciones</label>
                    <input className="input-field" placeholder="Condiciones" value={fClase.conditions} onChange={(e) => setFClase(Object.assign({}, fClase, { conditions: e.target.value }))} />
                  </div>
                </div>
                <div className="flex justify-end space-x-2 mt-6">
                  <button className="btn-secondary" onClick={() => setModalNuevaClase(false)}>Cancelar</button>
                  <button className="btn-primary" onClick={crearClase}>Crear</button>
                </div>
              </div>
            </div>
          )}

          {modalAsignarTarifa && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-800">Asignar Tarifa</h2>
                  <button onClick={() => setModalAsignarTarifa(false)} className="text-gray-500 hover:text-gray-700"><FiX size={22} /></button>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vuelo</label>
                    <SearchableSelect options={opcionesVuelos} value={fFare.flight_id} onChange={(valor) => verFares(valor)} placeholder="Vuelo: número, origen, destino..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Clase Tarifaria</label>
                    <SearchableSelect options={opcionesClases} value={fFare.fare_class_id} onChange={(valor) => setFFare(Object.assign({}, fFare, { fare_class_id: valor }))} placeholder="Clase: código o nombre..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Precio final con impuestos</label>
                    <input type="number" step="0.01" className="input-field" placeholder="Precio" value={fFare.price} onChange={(e) => setFFare(Object.assign({}, fFare, { price: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Asientos Asignados</label>
                    <input type="number" className="input-field" placeholder="Asientos" value={fFare.seats_allocated} onChange={(e) => setFFare(Object.assign({}, fFare, { seats_allocated: e.target.value }))} />
                  </div>
                </div>
                <div className="flex justify-end space-x-2 mt-6">
                  <button className="btn-secondary" onClick={() => setModalAsignarTarifa(false)}>Cancelar</button>
                  <button className="btn-primary" onClick={asignarFare}>Asignar</button>
                </div>
              </div>
            </div>
          )}
'''
content = content.replace("{/* Drawers */}", clases_modals + "\\n      {/* Drawers */}")

# 6. Refactor Infraestructura UI
old_infra_ui = '''      {tab === 'infra' && (
        <div className="space-y-4">
          <div className="card p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <SearchableSelect options={opcionesAeropuertos} value={fFac.airport_id} onChange={(valor) => setFFac(Object.assign({}, fFac, { airport_id: valor }))} placeholder="Aeropuerto: IATA o nombre..." />
            <select className="input-field" value={fFac.type} onChange={(e) => setFFac(Object.assign({}, fFac, { type: e.target.value }))}>
              <option value="terminal">Terminal</option><option value="gate">Puerta de embarque</option><option value="checkin_point">Punto de check-in</option>
            </select>
            <input className="input-field" placeholder="Código (T1, A5, C3...)" value={fFac.code} onChange={(e) => setFFac(Object.assign({}, fFac, { code: e.target.value }))} />
            <button className="btn-primary" onClick={crearFac}>Crear instalación</button>
          </div>
          <div className="card overflow-hidden">'''

new_infra_ui = '''      {tab === 'infra' && (
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <button className="btn-primary flex items-center gap-2" onClick={() => setModalNuevaInstalacion(true)}>
              <FiPlus /> Nueva Instalación
            </button>
          </div>
          <div className="card overflow-hidden">'''
content = content.replace(old_infra_ui, new_infra_ui)

infra_modals = '''          {modalNuevaInstalacion && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-800">Nueva Instalación</h2>
                  <button onClick={() => setModalNuevaInstalacion(false)} className="text-gray-500 hover:text-gray-700"><FiX size={22} /></button>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Aeropuerto</label>
                    <SearchableSelect options={opcionesAeropuertos} value={fFac.airport_id} onChange={(valor) => setFFac(Object.assign({}, fFac, { airport_id: valor }))} placeholder="Aeropuerto: IATA o nombre..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                    <select className="input-field" value={fFac.type} onChange={(e) => setFFac(Object.assign({}, fFac, { type: e.target.value }))}>
                      <option value="terminal">Terminal</option><option value="gate">Puerta de embarque</option><option value="checkin_point">Punto de check-in</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Código (T1, A5, C3...)</label>
                    <input className="input-field" placeholder="Código" value={fFac.code} onChange={(e) => setFFac(Object.assign({}, fFac, { code: e.target.value }))} />
                  </div>
                </div>
                <div className="flex justify-end space-x-2 mt-6">
                  <button className="btn-secondary" onClick={() => setModalNuevaInstalacion(false)}>Cancelar</button>
                  <button className="btn-primary" onClick={crearFac}>Crear</button>
                </div>
              </div>
            </div>
          )}
'''
content = content.replace("{/* Drawers */}", infra_modals + "\\n      {/* Drawers */}")


with open('frontend-backoffice/src/pages/Operaciones.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
