import { useEffect, useState } from 'react';
import api from '../services/api';
import SearchableSelect from '../components/SearchableSelect';
import { FiUsers, FiUser, FiTag, FiMap, FiSettings, FiActivity, FiEdit2, FiX, FiToggleLeft, FiToggleRight, FiPlus, FiBriefcase, FiCheckCircle, FiAlertTriangle, FiTrendingUp, FiAward, FiMonitor } from 'react-icons/fi';
import toast from 'react-hot-toast';

const KPICard = ({ title, value, icon: Icon, colorClass = "text-primary-600 bg-primary-50" }) => (
  <div className="card p-4 flex items-center space-x-4">
    <div className={`p-3 rounded-full ${colorClass}`}>
      <Icon size={24} />
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
  </div>
);

const Operaciones = () => {
  const [tab, setTab] = useState('tripulacion');
  const [crew, setCrew] = useState([]);
  const [clases, setClases] = useState([]);
  const [vuelos, setVuelos] = useState([]);
  const [aeropuertos, setAeropuertos] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [config, setConfig] = useState([]);
  const [traza, setTraza] = useState([]);
  const [uuidTraza, setUuidTraza] = useState('');
  const [fCrew, setFCrew] = useState({ full_name: '', role_operativo: 'pilot', license_type: '', license_number: '', license_expiry: '' });
  const [modalCrew, setModalCrew] = useState(false);
  const [crewEditando, setCrewEditando] = useState(null);
  const [fCrewEdit, setFCrewEdit] = useState({ full_name: '', role_operativo: 'pilot', license_type: '', license_number: '', license_expiry: '', active: true });
  const [guardandoCrew, setGuardandoCrew] = useState(false);
  const [fAsig, setFAsig] = useState({ flight_id: '', crew_member_id: '', role: '', duty_start: '', duty_end: '' });
  const [crewVuelo, setCrewVuelo] = useState([]);
  const [fClase, setFClase] = useState({ code: '', name: '', multiplier: '1.00', conditions: '' });
  const [fFare, setFFare] = useState({ flight_id: '', fare_class_id: '', price: '', seats_allocated: '' });
  const [faresVuelo, setFaresVuelo] = useState([]);
  const [fFac, setFFac] = useState({ airport_id: '', type: 'gate', code: '' });
  const [drawerTripulacion, setDrawerTripulacion] = useState(null);
  const [drawerFacilidad, setDrawerFacilidad] = useState(null);
  const [drawerConfig, setDrawerConfig] = useState(null);
  
  const [modalNuevoTripulante, setModalNuevoTripulante] = useState(false);
  const [modalAsignarTripulacion, setModalAsignarTripulacion] = useState(false);
  const [modalNuevaClase, setModalNuevaClase] = useState(false);
  const [modalAsignarTarifa, setModalAsignarTarifa] = useState(false);
  const [modalNuevaInstalacion, setModalNuevaInstalacion] = useState(false);

  const InfoFila = ({ label, valor }) => (
    <div className="mb-4">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</div>
      <div className="text-sm text-gray-900 mt-1">{valor || '-'}</div>
    </div>
  );

  const cargarBase = () => {
    api.get('/operaciones/tripulacion').then((r) => setCrew(r.data.datos || [])).catch(() => {});
    api.get('/operaciones/clases').then((r) => setClases(r.data.datos || [])).catch(() => {});
    api.get('/vuelos').then((r) => setVuelos(r.data.datos || [])).catch(() => {});
    api.get('/aeropuertos').then((r) => setAeropuertos(r.data.datos || [])).catch(() => {});
    api.get('/operaciones/infraestructura').then((r) => setFacilities(r.data.datos || [])).catch(() => {});
    api.get('/operaciones/config').then((r) => setConfig(r.data.datos || [])).catch(() => {});
  };
  useEffect(() => { cargarBase(); }, []);

  const crearTripulante = async () => {
    if (!fCrew.full_name) return toast.error('Nombre obligatorio');
    try {
      await api.post('/operaciones/tripulacion', fCrew);
      toast.success('Tripulante creado');
      setFCrew({ full_name: '', role_operativo: 'pilot', license_type: '', license_number: '', license_expiry: '' });
      cargarBase();
    } catch (e) { toast.error(e.response && e.response.data ? e.response.data.error : 'Error'); }
  };

  const editarTripulante = (c) => {
    setCrewEditando(c);
    setFCrewEdit({
      full_name: c.full_name || '',
      role_operativo: c.role_operativo || 'pilot',
      license_type: c.license_type || '',
      license_number: c.license_number || '',
      license_expiry: c.license_expiry ? String(c.license_expiry).slice(0, 10) : '',
      active: c.active !== 0 && c.active !== false
    });
    setModalCrew(true);
  };

  const guardarTripulante = async () => {
    if (!fCrewEdit.full_name) return toast.error('Nombre obligatorio');
    setGuardandoCrew(true);
    try {
      await api.put('/operaciones/tripulacion/' + crewEditando.id, fCrewEdit);
      toast.success('Tripulante actualizado');
      setModalCrew(false);
      cargarBase();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al guardar');
    } finally { setGuardandoCrew(false); }
  };

  const rolLabel = (r) => ({ pilot: 'Piloto', copilot: 'Copiloto', cabin: 'Auxiliar de vuelo', maintenance: 'Mantenimiento' }[r] || r);

  // Catálogos extensos: se buscan escribiendo (SearchableSelect) en vez de
  // recorrer un menú nativo con miles de opciones.
  const opcionesVuelos = vuelos.map((v) => ({
    value: v.id,
    label: v.flight_number + ' · ' + (v.origin || '') + '→' + (v.destination || '') + ' · ' + new Date(v.departure_datetime).toLocaleString('es-SV'),
    searchText: v.flight_number + ' ' + (v.origin || '') + ' ' + (v.destination || '')
  }));
  const opcionesTripulantes = crew
    .filter((c) => c.active !== 0 && c.active !== false)
    .map((c) => ({ value: c.id, label: c.full_name + ' (' + rolLabel(c.role_operativo) + ')', searchText: c.full_name + ' ' + rolLabel(c.role_operativo) }));
  const opcionesClases = clases.map((c) => ({
    value: c.id,
    label: c.code + ' - ' + c.name + ' (x' + c.multiplier + ')',
    searchText: c.code + ' ' + c.name
  }));
  const opcionesAeropuertos = aeropuertos.map((a) => ({
    value: a.id,
    label: (a.code || a.iata_code) + ' - ' + a.name,
    searchText: (a.code || a.iata_code) + ' ' + a.name + ' ' + (a.city || '')
  }));

  const asignar = async () => {
    if (!fAsig.flight_id || !fAsig.crew_member_id) return toast.error('Selecciona vuelo y tripulante');
    try {
      await api.post('/operaciones/tripulacion/asignar', fAsig);
      toast.success('Tripulación asignada');
      const r = await api.get('/operaciones/tripulacion/vuelo/' + fAsig.flight_id);
      setCrewVuelo(r.data.datos || []);
    } catch (e) { toast.error(e.response && e.response.data ? e.response.data.error : 'Error'); }
  };

  const verCrewVuelo = async (fid) => {
    setFAsig(Object.assign({}, fAsig, { flight_id: fid }));
    const r = await api.get('/operaciones/tripulacion/vuelo/' + fid);
    setCrewVuelo(r.data.datos || []);
  };

  const crearClase = async () => {
    if (!fClase.code || !fClase.name) return toast.error('Código y nombre obligatorios');
    try {
      await api.post('/operaciones/clases', fClase);
      toast.success('Clase tarifaria creada');
      setFClase({ code: '', name: '', multiplier: '1.00', conditions: '' });
      cargarBase();
    } catch (e) { toast.error(e.response && e.response.data ? e.response.data.error : 'Error'); }
  };

  const asignarFare = async () => {
    if (!fFare.flight_id || !fFare.fare_class_id) return toast.error('Selecciona vuelo y clase');
    try {
      const r = await api.post('/operaciones/fares', fFare);
      toast.success('Tarifa vigente actualizada: $' + r.data.datos.price + ' (impuestos incluidos)');
      const fr = await api.get('/operaciones/fares/vuelo/' + fFare.flight_id);
      setFaresVuelo(fr.data.datos || []);
    } catch (e) { toast.error(e.response && e.response.data ? e.response.data.error : 'Error'); }
  };

  const verFares = async (fid) => {
    setFFare(Object.assign({}, fFare, { flight_id: fid }));
    const r = await api.get('/operaciones/fares/vuelo/' + fid);
    setFaresVuelo(r.data.datos || []);
  };

  const crearFac = async () => {
    if (!fFac.airport_id || !fFac.code) return toast.error('Aeropuerto y código obligatorios');
    try {
      await api.post('/operaciones/infraestructura', fFac);
      toast.success('Instalación creada');
      setFFac({ airport_id: '', type: 'gate', code: '' });
      cargarBase();
    } catch (e) { toast.error(e.response && e.response.data ? e.response.data.error : 'Error'); }
  };

  const guardarConfig = async (key, value) => {
    try {
      await api.put('/operaciones/config', { key: key, value: value });
      toast.success('Parámetro actualizado');
      const r = await api.get('/operaciones/config');
      setConfig(r.data.datos || []);
    } catch (e) { toast.error('Error al guardar'); }
  };

  const verTraza = async () => {
    if (!uuidTraza) return toast.error('Ingresa el código de generación');
    try {
      const r = await api.get('/operaciones/trazabilidad/' + uuidTraza);
      setTraza(r.data.datos || []);
      if (!r.data.datos.length) toast.error('Sin trazas para ese documento');
    } catch (e) { toast.error('Error al consultar'); }
  };

  const tabs = [
    { id: 'tripulacion', label: 'Tripulación', icon: FiUsers },
    { id: 'clases', label: 'Clases Tarifarias', icon: FiTag },
    { id: 'infra', label: 'Infraestructura', icon: FiMap },
    { id: 'config', label: 'Configuración', icon: FiSettings },
    { id: 'traza', label: 'Trazabilidad DTE', icon: FiActivity }
  ];

  // Máximo 40 filas por vista; el resto se pagina.
  const itemsPorPagina = 40;
  const [paginaCrew, setPaginaCrew] = useState(1);
  const [paginaFac, setPaginaFac] = useState(1);
  const [paginaConfig, setPaginaConfig] = useState(1);
  const crewPaginado = crew.slice((paginaCrew - 1) * itemsPorPagina, paginaCrew * itemsPorPagina);
  const facilitiesPaginadas = facilities.slice((paginaFac - 1) * itemsPorPagina, paginaFac * itemsPorPagina);
  const configPaginada = config.slice((paginaConfig - 1) * itemsPorPagina, paginaConfig * itemsPorPagina);
  const totalPaginas = (n) => Math.ceil(n / itemsPorPagina);
  const PiePagina = ({ pagina, total, setPagina }) => (
    total > 1 ? (
      <div className="px-4 py-3 border-t flex items-center justify-between bg-gray-50">
        <button disabled={pagina === 1} onClick={() => setPagina(pagina - 1)} className="px-3 py-1 bg-white border rounded text-sm disabled:opacity-50">Anterior</button>
        <span className="text-sm text-gray-600">Página {pagina} de {total}</span>
        <button disabled={pagina === total} onClick={() => setPagina(pagina + 1)} className="px-3 py-1 bg-white border rounded text-sm disabled:opacity-50">Siguiente</button>
      </div>
    ) : null
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Operaciones</h1>
        <p className="text-gray-500 mt-1">Tripulación, clases tarifarias, infraestructura, configuración y trazabilidad</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button key={t.id} className={tab === t.id ? 'btn-primary flex items-center space-x-2' : 'btn-secondary flex items-center space-x-2'} onClick={() => setTab(t.id)}>
            <t.icon /><span>{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'tripulacion' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <KPICard title="Total Tripulantes" value={crew.length} icon={FiUsers} colorClass="text-blue-600 bg-blue-50" />
            <KPICard title="Pilotos" value={crew.filter(c => c.role_operativo === 'pilot').length} icon={FiAward} colorClass="text-indigo-600 bg-indigo-50" />
            <KPICard title="Activos" value={crew.filter(c => c.active !== 0 && c.active !== false).length} icon={FiCheckCircle} colorClass="text-green-600 bg-green-50" />
            <KPICard title="Inactivos" value={crew.filter(c => c.active === 0 || c.active === false).length} icon={FiAlertTriangle} colorClass="text-red-600 bg-red-50" />
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">Gestión de Tripulación</h2>
              <p className="text-sm text-gray-500">Administra el personal, sus roles, licencias y estado operativo.</p>
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary flex items-center gap-2" onClick={() => setModalAsignarTripulacion(true)}>
                <FiPlus /> Asignar a Vuelo
              </button>
              <button className="btn-primary flex items-center gap-2" onClick={() => setModalNuevoTripulante(true)}>
                <FiPlus /> Nuevo Tripulante
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {crewPaginado.length === 0 ? (
              <div className="col-span-full card p-10 text-center text-gray-500">No hay tripulantes para mostrar.</div>
            ) : (
              crewPaginado.map((c) => (
                <div key={c.id} className={`card p-5 cursor-pointer hover:shadow-lg transition-all relative flex flex-col items-center text-center ${!c.active ? 'opacity-60' : ''}`} onClick={() => setDrawerTripulacion(c)}>
                  <div className="absolute top-4 right-4">
                    <button type="button" className={c.active ? 'text-green-700' : 'text-red-700'} onClick={(e) => { 
                      e.stopPropagation(); 
                      api.put('/operaciones/tripulacion/' + c.id, { ...c, license_expiry: c.license_expiry ? String(c.license_expiry).slice(0, 10) : '', active: !c.active }).then(cargarBase).catch(() => toast.error('Error al cambiar estado')); 
                    }}>
                      {c.active ? <FiToggleRight size={22}/> : <FiToggleLeft size={22}/>}
                    </button>
                  </div>
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-500 mb-3">
                    <FiUser size={32} />
                  </div>
                  <h3 className="font-bold text-gray-800 text-lg">{c.full_name}</h3>
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold mt-1 mb-2">
                    {rolLabel(c.role_operativo)}
                  </span>
                  <hr className="w-full my-3" />
                  <div className="text-xs text-gray-500 flex flex-col gap-1 w-full text-left">
                    <div className="flex justify-between">
                      <span className="font-semibold">Licencia:</span>
                      <span>{c.license_type} {c.license_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">Vence:</span>
                      <span>{c.license_expiry ? String(c.license_expiry).slice(0, 10) : '-'}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-4">
            <PiePagina pagina={paginaCrew} total={totalPaginas(crew.length)} setPagina={setPaginaCrew} />
          </div>
          {modalCrew && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-800">Editar tripulante</h2>
                  <button onClick={() => setModalCrew(false)} className="text-gray-500 hover:text-gray-700"><FiX size={22} /></button>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo *</label>
                    <input className="input-field" value={fCrewEdit.full_name} onChange={(e) => setFCrewEdit(Object.assign({}, fCrewEdit, { full_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rol operativo *</label>
                    <select className="input-field" value={fCrewEdit.role_operativo} onChange={(e) => setFCrewEdit(Object.assign({}, fCrewEdit, { role_operativo: e.target.value }))}>
                      <option value="pilot">Piloto</option><option value="copilot">Copiloto</option>
                      <option value="cabin">Auxiliar de vuelo</option><option value="maintenance">Mantenimiento</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo licencia</label>
                      <input className="input-field" value={fCrewEdit.license_type} onChange={(e) => setFCrewEdit(Object.assign({}, fCrewEdit, { license_type: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">N° licencia</label>
                      <input className="input-field" value={fCrewEdit.license_number} onChange={(e) => setFCrewEdit(Object.assign({}, fCrewEdit, { license_number: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vencimiento licencia</label>
                    <input type="date" className="input-field" value={fCrewEdit.license_expiry} onChange={(e) => setFCrewEdit(Object.assign({}, fCrewEdit, { license_expiry: e.target.value }))} />
                  </div>
                  <label className="flex items-center space-x-2 text-sm text-gray-700">
                    <input type="checkbox" checked={fCrewEdit.active} onChange={(e) => setFCrewEdit(Object.assign({}, fCrewEdit, { active: e.target.checked }))} />
                    <span>Activo</span>
                  </label>
                </div>
                <div className="flex justify-end space-x-2 mt-6">
                  <button className="btn-secondary" onClick={() => setModalCrew(false)}>Cancelar</button>
                  <button className="btn-primary" onClick={guardarTripulante} disabled={guardandoCrew}>{guardandoCrew ? 'Guardando...' : 'Guardar cambios'}</button>
                </div>
              </div>
            </div>
          )}
          {fAsig.flight_id && (
            <div className="card overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b text-sm font-semibold">Tripulación del vuelo seleccionado</div>
              <table className="w-full">
                <tbody className="divide-y">
                  {crewVuelo.length === 0 ? <tr><td className="px-4 py-3 text-sm text-gray-500">Sin tripulación asignada</td></tr> :
                    crewVuelo.map((c) => (
                      <tr key={c.id}>
                        <td className="px-4 py-2 text-sm">{c.full_name}</td>
                        <td className="px-4 py-2 text-sm">{c.role}</td>
                        <td className="px-4 py-2 text-sm">{c.duty_start || '-'} → {c.duty_end || '-'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'clases' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <KPICard title="Total Clases" value={clases.length} icon={FiTag} colorClass="text-purple-600 bg-purple-50" />
            <KPICard title="Clases Premium (>1x)" value={clases.filter(c => parseFloat(c.multiplier) > 1).length} icon={FiTrendingUp} colorClass="text-emerald-600 bg-emerald-50" />
            <KPICard title="Clases Económicas" value={clases.filter(c => parseFloat(c.multiplier) <= 1).length} icon={FiBriefcase} colorClass="text-orange-600 bg-orange-50" />
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">Clases Tarifarias</h2>
              <p className="text-sm text-gray-500">Gestiona los multiplicadores y asignación de tarifas a vuelos.</p>
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary flex items-center gap-2" onClick={() => setModalAsignarTarifa(true)}>
                <FiPlus /> Asignar Tarifa
              </button>
              <button className="btn-primary flex items-center gap-2" onClick={() => setModalNuevaClase(true)}>
                <FiPlus /> Nueva Clase
              </button>
            </div>
          </div>
          {fFare.flight_id && (
            <div className="card overflow-hidden">
              <table className="w-full">
                <tbody className="divide-y">
                  {faresVuelo.length === 0 ? <tr><td className="px-4 py-3 text-sm text-gray-500">Sin tarifas asignadas</td></tr> :
                    faresVuelo.map((f) => (
                      <tr key={f.id}>
                        <td className="px-4 py-2 text-sm">{f.code} - {f.name}</td>
                        <td className="px-4 py-2 text-sm font-semibold">${Number(f.price).toFixed(2)} {f.active ? 'vigente' : 'histórica'}</td>
                        <td className="px-4 py-2 text-sm">{f.seats_allocated} asientos · {f.seats_sold} vendidos · {f.changed_by || 'Sistema'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'infra' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <KPICard title="Total Instalaciones" value={facilities.length} icon={FiMap} colorClass="text-teal-600 bg-teal-50" />
            <KPICard title="Puertas (Gates)" value={facilities.filter(f => f.type === 'gate').length} icon={FiMonitor} colorClass="text-blue-600 bg-blue-50" />
            <KPICard title="Instalaciones Activas" value={facilities.filter(f => f.active).length} icon={FiCheckCircle} colorClass="text-green-600 bg-green-50" />
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">Infraestructura</h2>
              <p className="text-sm text-gray-500">Controla puertas de embarque, terminales y puntos de atención.</p>
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-primary flex items-center gap-2" onClick={() => setModalNuevaInstalacion(true)}>
                <FiPlus /> Nueva Instalación
              </button>
            </div>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b"><tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Aeropuerto</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Tipo</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Código</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Activa</th>
              </tr></thead>
              <tbody className="divide-y">
                {facilitiesPaginadas.map((f) => (
                  <tr key={f.id} onClick={() => setDrawerFacilidad(f)} className="cursor-pointer hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm">{f.iata_code}</td>
                    <td className="px-4 py-2 text-sm">{f.type}</td>
                    <td className="px-4 py-2 text-sm font-mono">{f.code}</td>
                    <td className="px-4 py-2 text-sm">
                      <button type="button" className={f.active ? 'text-green-700' : 'text-red-700'} onClick={(e) => { 
                        e.stopPropagation(); 
                        api.put('/operaciones/infraestructura/' + f.id, { active: !f.active }).then(cargarBase).catch(() => toast.error('Error al cambiar estado')); 
                      }}>
                        {f.active ? <FiToggleRight size={22}/> : <FiToggleLeft size={22}/>}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <PiePagina pagina={paginaFac} total={totalPaginas(facilities.length)} setPagina={setPaginaFac} />
          </div>
        </div>
      )}

      {tab === 'config' && (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Parámetro</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Valor</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Descripción</th>
            </tr></thead>
            <tbody className="divide-y">
              {configPaginada.map((c) => (
                <tr key={c.param_key} onClick={() => setDrawerConfig(c)} className="cursor-pointer hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm font-mono">{c.param_key}</td>
                  <td className="px-4 py-2 text-sm">{c.param_value}</td>
                  <td className="px-4 py-2 text-sm text-gray-500">{c.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <PiePagina pagina={paginaConfig} total={totalPaginas(config.length)} setPagina={setPaginaConfig} />
        </div>
      )}

      {tab === 'traza' && (
        <div className="space-y-4">
          <div className="card p-4 flex gap-3">
            <input className="input-field" placeholder="Código de generación (UUID)" value={uuidTraza} onChange={(e) => setUuidTraza(e.target.value)} />
            <button className="btn-primary whitespace-nowrap" onClick={verTraza}>Ver trazabilidad</button>
          </div>
          {traza.length > 0 && (
            <div className="card p-4">
              <ol className="space-y-2">
                {traza.map((t, i) => (
                  <li key={i} className="flex items-start space-x-3 text-sm">
                    <span className="mt-1 w-2 h-2 rounded-full bg-primary-600"></span>
                    <div>
                      <span className="font-semibold capitalize">{t.stage}</span>
                      <span className="text-gray-500 ml-2">{new Date(t.created_at).toLocaleString('es-SV')}</span>
                      {t.detail && <pre className="text-xs text-gray-500 mt-1">{JSON.stringify(t.detail)}</pre>}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
                {modalNuevoTripulante && (
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
        {modalNuevaClase && (
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
        {modalNuevaInstalacion && (
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
      {/* Drawers */}
      {drawerTripulacion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-in">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800">Detalles de Tripulante</h2>
              <button onClick={() => setDrawerTripulacion(null)} className="text-gray-500 hover:text-gray-700"><FiX size={24} /></button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              <InfoFila label="Tripulante" valor={drawerTripulacion.full_name} />
              <InfoFila label="Rol" valor={rolLabel(drawerTripulacion.role_operativo)} />
              <InfoFila label="Licencia" valor={`${drawerTripulacion.license_type || ''} ${drawerTripulacion.license_number || ''}`} />
              <InfoFila label="Vence" valor={drawerTripulacion.license_expiry ? String(drawerTripulacion.license_expiry).slice(0, 10) : '-'} />
              <InfoFila label="Estado" valor={drawerTripulacion.active ? 'Activo' : 'Inactivo'} />
            </div>
            <div className="p-6 border-t bg-gray-50 flex gap-3">
              <button className="btn-primary flex-1 flex items-center justify-center space-x-2" onClick={() => { setDrawerTripulacion(null); editarTripulante(drawerTripulacion); }}>
                <FiEdit2 /><span>Editar</span>
              </button>
              <button className="btn-secondary flex-1" onClick={() => setDrawerTripulacion(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {drawerFacilidad && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-in">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800">Detalles de Infraestructura</h2>
              <button onClick={() => setDrawerFacilidad(null)} className="text-gray-500 hover:text-gray-700"><FiX size={24} /></button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              <InfoFila label="Aeropuerto" valor={drawerFacilidad.iata_code} />
              <InfoFila label="Tipo" valor={drawerFacilidad.type} />
              <InfoFila label="Código" valor={drawerFacilidad.code} />
              <InfoFila label="Activa" valor={drawerFacilidad.active ? 'Sí' : 'No'} />
            </div>
            <div className="p-6 border-t bg-gray-50 flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => setDrawerFacilidad(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {drawerConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-in">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800">Detalles de Parámetro</h2>
              <button onClick={() => setDrawerConfig(null)} className="text-gray-500 hover:text-gray-700"><FiX size={24} /></button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              <InfoFila label="Parámetro" valor={drawerConfig.param_key} />
              <InfoFila label="Descripción" valor={drawerConfig.description} />
              <div className="mb-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Valor</div>
                <div className="mt-1">
                  <input className="input-field py-1" value={drawerConfig.param_value} onChange={(e) => setDrawerConfig({...drawerConfig, param_value: e.target.value})} />
                </div>
              </div>
            </div>
            <div className="p-6 border-t bg-gray-50 flex gap-3">
              <button className="btn-primary flex-1" onClick={() => { guardarConfig(drawerConfig.param_key, drawerConfig.param_value); setDrawerConfig(null); }}>Guardar Cambios</button>
              <button className="btn-secondary flex-1" onClick={() => setDrawerConfig(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Operaciones;
