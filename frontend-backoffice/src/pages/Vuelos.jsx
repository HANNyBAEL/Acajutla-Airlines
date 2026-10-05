import { useEffect, useState } from 'react';
import api from '../services/api';
import SearchableSelect from '../components/SearchableSelect';
import { FiPlus, FiSearch, FiX, FiXCircle, FiRefreshCw, FiMapPin, FiClock, FiCpu, FiDollarSign, FiCalendar } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Vuelos = () => {
  const [vuelos, setVuelos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [fechaFiltro, setFechaFiltro] = useState('');
  const [modal, setModal] = useState(false);
  const [aeropuertos, setAeropuertos] = useState([]);
  const [aeronaves, setAeronaves] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({ flight_number: '', origen_iata: '', destino_iata: '', aircraft_id: '', departure_datetime: '', arrival_datetime: '', base_price: '', gate: '' });
  const [errorValidacion, setErrorValidacion] = useState('');
  const [modalReprog, setModalReprog] = useState(null);
  const [formReprog, setFormReprog] = useState({ departure_datetime: '', arrival_datetime: '', aircraft_id: '', gate: '' });
  const [guardandoReprog, setGuardandoReprog] = useState(false);
  // Estado del drawer
  const [drawerVuelo, setDrawerVuelo] = useState(null);

  const cargar = (fecha = fechaFiltro) => {
    api.get('/vuelos', { params: fecha ? { fecha: fecha } : {} })
      .then((r) => setVuelos(r.data.datos || []))
      .catch(() => toast.error('No se pudo conectar con el backend'))
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargar(); }, []);

  const cambiarFecha = (valor) => {
    setFechaFiltro(valor);
    cargar(valor);
  };

  const toLocalInput = (valor) => {
    if (!valor) return '';
    const d = new Date(valor);
    const pad = (n) => (n < 10 ? '0' + n : '' + n);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  };

  const abrirModal = async () => {
    setForm({ flight_number: '', origen_iata: '', destino_iata: '', aircraft_id: '', departure_datetime: '', arrival_datetime: '', base_price: '', gate: '' });
    setErrorValidacion('');
    setModal(true);
    try {
      const res = await Promise.all([api.get('/aeropuertos?activos=1'), api.get('/vuelos/aeronaves')]);
      setAeropuertos(res[0].data.datos || []);
      setAeronaves(res[1].data.datos || []);
    } catch (e) {
      toast.error('Error al cargar catálogos');
    }
  };

  const mensajeErrorForm = (f) => {
    if (f.origen_iata && f.destino_iata && f.origen_iata === f.destino_iata) {
      return 'El aeropuerto de destino no puede ser igual al de origen.';
    }
    if (f.base_price !== '' && Number(f.base_price) <= 0) {
      return 'El precio base debe ser mayor a 0 USD.';
    }
    return '';
  };

  const setCampo = (campo, valor) => {
    const nuevoForm = Object.assign({}, form, { [campo]: valor });
    setForm(nuevoForm);
    if (campo === 'origen_iata' || campo === 'destino_iata' || campo === 'base_price') {
      setErrorValidacion(mensajeErrorForm(nuevoForm));
    }
  };

  const guardar = async () => {
    if (!form.flight_number || !form.aircraft_id || !form.origen_iata || !form.destino_iata || !form.departure_datetime || !form.arrival_datetime || !form.base_price) {
      return toast.error('Completa todos los campos obligatorios (*)');
    }
    if (form.origen_iata === form.destino_iata) {
      return toast.error('El aeropuerto de destino no puede ser igual al de origen.');
    }
    if (Number(form.base_price) <= 0) {
      return toast.error('El precio base debe ser mayor a 0 USD.');
    }
    setGuardando(true);
    try {
      await api.post('/vuelos', form);
      toast.success('Vuelo programado correctamente');
      setModal(false);
      cargar();
    } catch (e) {
      const data = e.response ? e.response.data : null;
      if (e.response && e.response.status === 409 && data && data.conflicto) {
        const salida = new Date(data.conflicto.departure_datetime).toLocaleString('es-SV');
        toast.error('Ya existe ' + data.conflicto.flight_number + ' con salida el ' + salida + ' (vuelo #' + data.conflicto.id + '). Cambia la hora o el número de vuelo.', { duration: 7000 });
      } else {
        toast.error(data && data.error ? data.error : 'Error al crear el vuelo');
      }
    } finally { setGuardando(false); }
  };

  const cancelarVuelo = async (v) => {
    const motivo = window.prompt('Motivo de la cancelación del vuelo ' + v.flight_number + ':', 'Cancelado por operaciones');
    if (motivo === null) return;
    try {
      await api.patch('/vuelos/' + v.id + '/cancelar', { motivo: motivo, confirmar: false });
      toast.success('Vuelo ' + v.flight_number + ' cancelado');
      setDrawerVuelo(null);
      cargar();
    } catch (e) {
      const data = e.response ? e.response.data : null;
      if (e.response && e.response.status === 409 && data && data.requiereConfirmacion) {
        const ok = window.confirm('El vuelo ' + v.flight_number + ' tiene ' + data.afectados + ' reserva(s) activa(s). ¿Cancelar de todos modos?');
        if (!ok) return;
        try {
          await api.patch('/vuelos/' + v.id + '/cancelar', { motivo: motivo, confirmar: true });
          toast.success('Vuelo ' + v.flight_number + ' cancelado');
          setDrawerVuelo(null);
          cargar();
        } catch (e2) {
          toast.error(e2.response && e2.response.data && e2.response.data.error ? e2.response.data.error : 'Error al cancelar');
        }
      } else {
        toast.error(data && data.error ? data.error : 'Error al cancelar');
      }
    }
  };

  const abrirReprog = async (v) => {
    setDrawerVuelo(null);
    setModalReprog(v);
    setFormReprog({
      departure_datetime: toLocalInput(v.departure_datetime),
      arrival_datetime: toLocalInput(v.arrival_datetime),
      aircraft_id: v.aircraft_id || '',
      gate: v.gate || '',
    });
    if (aeronaves.length === 0) {
      try {
        const r = await api.get('/vuelos/aeronaves');
        setAeronaves(r.data.datos || []);
      } catch (e) { /* sin catálogo */ }
    }
  };

  const guardarReprog = async () => {
    if (!formReprog.departure_datetime || !formReprog.arrival_datetime) {
      return toast.error('Indique la nueva fecha de salida y de llegada');
    }
    setGuardandoReprog(true);
    try {
      const payload = { departure_datetime: formReprog.departure_datetime, arrival_datetime: formReprog.arrival_datetime };
      if (formReprog.aircraft_id) payload.aircraft_id = formReprog.aircraft_id;
      if (formReprog.gate) payload.gate = formReprog.gate;
      const r = await api.patch('/vuelos/' + modalReprog.id + '/reprogramar', payload);
      toast.success(r.data.mensaje || 'Vuelo reprogramado');
      setModalReprog(null);
      cargar();
    } catch (e) {
      toast.error(e.response && e.response.data && e.response.data.error ? e.response.data.error : 'Error al reprogramar');
    } finally { setGuardandoReprog(false); }
  };

  const lista = vuelos.filter((v) => JSON.stringify(v).toLowerCase().includes(filtro.toLowerCase()));

  const [pagina, setPagina] = useState(1);
  const itemsPorPagina = 40;
  useEffect(() => { setPagina(1); }, [filtro, fechaFiltro]);
  const vuelosPaginados = lista.slice((pagina - 1) * itemsPorPagina, pagina * itemsPorPagina);
  const totalPaginas = Math.ceil(lista.length / itemsPorPagina);

  const estadoBadge = (e) => ({
    scheduled: 'bg-blue-100 text-blue-700', confirmed: 'bg-green-100 text-green-700',
    delayed: 'bg-orange-100 text-orange-700', cancelled: 'bg-red-100 text-red-700',
    completed: 'bg-gray-100 text-gray-700', in_progress: 'bg-yellow-100 text-yellow-700', deployed: 'bg-slate-200 text-slate-700',
  }[e] || 'bg-gray-100 text-gray-700');

  const estadoLabel = (e) => ({
    scheduled: 'Programado', confirmed: 'Confirmado', in_progress: 'En curso',
    delayed: 'Retrasado', completed: 'Finalizado', cancelled: 'Cancelado', deployed: 'En vuelo',
  }[e] || e);

  const estadoDe = (vuelo) => vuelo?.display_status || vuelo?.status;

  const sePuedeCancelar = (e) => ['scheduled', 'confirmed', 'delayed'].includes(e);
  const sePuedeReprogramar = (e) => ['cancelled', 'delayed'].includes(e);

  const InfoFila = ({ icon: Icon, label, value }) => (
    <div className="flex items-center py-2.5 text-sm border-b border-gray-100 last:border-b-0">
      <Icon className="text-primary-600 mr-3 shrink-0" size={16} />
      <span className="font-medium text-gray-600 w-36 shrink-0">{label}:</span>
      <span className="text-gray-800 font-medium truncate">{value || '—'}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Gestión de Vuelos</h1>
          <p className="text-gray-500 mt-1">Programación, cancelación y reprogramación</p>
        </div>
        <button className="btn-primary flex items-center space-x-2" onClick={abrirModal}>
          <FiPlus /><span>Nuevo Vuelo</span>
        </button>
      </div>

      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Buscar vuelo, origen, destino..." className="input-field pl-10" />
          </div>
          <div className="flex items-center gap-2 md:w-80">
            <FiCalendar className="text-gray-400 shrink-0" />
            <input type="date" className="input-field" value={fechaFiltro} onChange={(e) => cambiarFecha(e.target.value)} title="Filtrar por fecha de salida" />
            {fechaFiltro && (
              <button onClick={() => cambiarFecha('')} className="text-gray-400 hover:text-gray-600 shrink-0" title="Quitar filtro de fecha">
                <FiX size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-[12%] px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Vuelo</th>
                <th className="w-[16%] px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ruta</th>
                <th className="w-[22%] px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Salida</th>
                <th className="w-[22%] px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Aeronave</th>
                <th className="w-[14%] px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cargando ? (
                <tr><td colSpan="5" className="text-center py-8 text-gray-500">Cargando vuelos...</td></tr>
              ) : lista.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-8 text-gray-500">No hay vuelos registrados</td></tr>
              ) : vuelosPaginados.map((v) => (
                <tr
                  key={v.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setDrawerVuelo(v)}
                >
                  <td className="px-6 py-4 font-bold text-primary-700" title={v.flight_number}>{v.flight_number}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-800" title={(v.origin || '') + ' a ' + (v.destination || '')}>{v.origin} → {v.destination}</td>
                  <td className="px-6 py-4 text-sm text-gray-600" title={new Date(v.departure_datetime).toLocaleString('es-SV')}>{new Date(v.departure_datetime).toLocaleString('es-SV')}</td>
                  <td className="px-6 py-4 text-sm text-gray-600" title={v.aircraft || ''}>{v.aircraft || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={'px-3 py-1 rounded-full text-xs font-medium ' + estadoBadge(estadoDe(v))}>{estadoLabel(estadoDe(v))}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPaginas > 1 && (
          <div className="px-6 py-3 border-t flex items-center justify-between bg-gray-50">
            <button disabled={pagina === 1} onClick={() => setPagina(pagina - 1)} className="px-3 py-1 bg-white border rounded text-sm disabled:opacity-50">Anterior</button>
            <span className="text-sm text-gray-600">Página {pagina} de {totalPaginas}</span>
            <button disabled={pagina === totalPaginas} onClick={() => setPagina(pagina + 1)} className="px-3 py-1 bg-white border rounded text-sm disabled:opacity-50">Siguiente</button>
          </div>
        )}
        <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-500">Haz clic en cualquier fila para ver el detalle completo del vuelo</p>
        </div>
      </div>

      {/* Drawer lateral para detalle del vuelo */}
      {drawerVuelo && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-40 z-40" onClick={() => setDrawerVuelo(null)}></div>
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
            {/* Header del drawer */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center space-x-3">
                <div className="bg-primary-600 text-white rounded-xl w-11 h-11 flex items-center justify-center font-bold text-lg shadow-sm">
                  {drawerVuelo.flight_number?.slice(0, 2) || 'FL'}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-xl font-bold text-gray-800">{drawerVuelo.flight_number}</h3>
                    <span className={'px-2.5 py-0.5 rounded-full text-xs font-medium ' + estadoBadge(estadoDe(drawerVuelo))}>
                      {estadoLabel(estadoDe(drawerVuelo))}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{drawerVuelo.origin} → {drawerVuelo.destination}</p>
                </div>
              </div>
              <button onClick={() => setDrawerVuelo(null)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <FiX size={22} />
              </button>
            </div>

            {/* Contenido del drawer */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-1">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Información del Vuelo</h4>
                <InfoFila icon={FiMapPin} label="Ruta" value={`${drawerVuelo.origin} → ${drawerVuelo.destination}`} />
                <InfoFila icon={FiClock} label="Salida programada" value={drawerVuelo.departure_datetime ? new Date(drawerVuelo.departure_datetime).toLocaleString('es-SV') : '—'} />
                <InfoFila icon={FiClock} label="Llegada programada" value={drawerVuelo.arrival_datetime ? new Date(drawerVuelo.arrival_datetime).toLocaleString('es-SV') : '—'} />
                <InfoFila icon={FiCpu} label="Aeronave" value={drawerVuelo.aircraft || '—'} />
                <InfoFila icon={FiMapPin} label="Puerta de embarque" value={drawerVuelo.gate || 'Sin asignar'} />
                <InfoFila icon={FiDollarSign} label="Precio base" value={drawerVuelo.base_price ? `$${Number(drawerVuelo.base_price).toFixed(2)} USD` : '—'} />
              </div>
            </div>

            {/* Footer del drawer con acciones */}
            <div className="px-6 pt-5 pb-10 border-t border-gray-200 bg-gray-50 flex items-center justify-between space-x-3">
              <div className="flex items-center space-x-2">
                {sePuedeCancelar(estadoDe(drawerVuelo)) && (
                  <button
                    onClick={() => cancelarVuelo(drawerVuelo)}
                    className="btn-danger flex items-center space-x-1.5 text-sm py-2 px-3"
                  >
                    <FiXCircle size={16} />
                    <span>Cancelar</span>
                  </button>
                )}
                {sePuedeReprogramar(estadoDe(drawerVuelo)) && (
                  <button
                    onClick={() => abrirReprog(drawerVuelo)}
                    className="btn-primary flex items-center space-x-1.5 text-sm py-2 px-3"
                  >
                    <FiRefreshCw size={16} />
                    <span>Reprogramar</span>
                  </button>
                )}
              </div>
              <button className="btn-secondary" onClick={() => setDrawerVuelo(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal nuevo vuelo */}
      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Programar Nuevo Vuelo</h2>
              <button onClick={() => setModal(false)} className="text-gray-500 hover:text-gray-700"><FiX size={22} /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Número de vuelo *</label>
                <input className="input-field" value={form.flight_number} onChange={(e) => setCampo('flight_number', e.target.value)} placeholder="AA-210" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Aeronave *</label>
                <SearchableSelect options={aeronaves.map((a) => ({ value: a.id, label: a.registration + ' · ' + a.model, searchText: a.registration + ' ' + a.model }))} value={form.aircraft_id} onChange={(valor) => setCampo('aircraft_id', valor)} placeholder="Matrícula o modelo..." /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Origen *</label>
                <SearchableSelect options={aeropuertos.map((a) => ({ value: a.code, label: a.code + ' - ' + a.name, searchText: a.code + ' ' + a.name }))} value={form.origen_iata} onChange={(valor) => setCampo('origen_iata', valor)} placeholder="Código o ciudad..." /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Destino *</label>
                <SearchableSelect options={aeropuertos.map((a) => ({ value: a.code, label: a.code + ' - ' + a.name, searchText: a.code + ' ' + a.name }))} value={form.destino_iata} onChange={(valor) => setCampo('destino_iata', valor)} placeholder="Código o ciudad..." /></div>
              {errorValidacion && (
                <div className="col-span-1 md:col-span-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 flex items-center">
                  <FiXCircle className="mr-2 shrink-0" size={18} />
                  {errorValidacion}
                </div>
              )}
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Fecha y hora de salida *</label>
                <input type="datetime-local" className="input-field" value={form.departure_datetime} onChange={(e) => setCampo('departure_datetime', e.target.value)} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Fecha y hora de llegada *</label>
                <input type="datetime-local" className="input-field" value={form.arrival_datetime} onChange={(e) => setCampo('arrival_datetime', e.target.value)} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Precio base (USD) *</label>
                <input type="number" min="0.01" step="0.01" className="input-field" value={form.base_price} onChange={(e) => setCampo('base_price', e.target.value)} placeholder="250" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Puerta de embarque</label>
                <input className="input-field" value={form.gate} onChange={(e) => setCampo('gate', e.target.value)} placeholder="A12" /></div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={guardar} disabled={guardando || errorValidacion}>{guardando ? 'Guardando...' : 'Crear Vuelo'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal reprogramar vuelo */}
      {modalReprog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Reprogramar Vuelo {modalReprog.flight_number}</h2>
              <button onClick={() => setModalReprog(null)} className="text-gray-500 hover:text-gray-700"><FiX size={22} /></button>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-lg p-3 mb-4">
              Estado actual: <strong>{estadoLabel(modalReprog.status)}</strong>. Al guardar, el vuelo quedará en estado <strong>Programado</strong> con el nuevo horario.
            </div>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nueva fecha y hora de salida *</label>
                <input type="datetime-local" className="input-field" value={formReprog.departure_datetime} onChange={(e) => setFormReprog(Object.assign({}, formReprog, { departure_datetime: e.target.value }))} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nueva fecha y hora de llegada *</label>
                <input type="datetime-local" className="input-field" value={formReprog.arrival_datetime} onChange={(e) => setFormReprog(Object.assign({}, formReprog, { arrival_datetime: e.target.value }))} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Aeronave</label>
                <SearchableSelect options={aeronaves.map((a) => ({ value: a.id, label: a.registration + ' · ' + a.model, searchText: a.registration + ' ' + a.model }))} value={formReprog.aircraft_id} onChange={(valor) => setFormReprog(Object.assign({}, formReprog, { aircraft_id: valor }))} placeholder="Mantener actual o buscar..." /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Puerta de embarque</label>
                <input className="input-field" value={formReprog.gate} onChange={(e) => setFormReprog(Object.assign({}, formReprog, { gate: e.target.value }))} placeholder="A12" /></div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button className="btn-secondary" onClick={() => setModalReprog(null)}>Cancelar</button>
              <button className="btn-primary" onClick={guardarReprog} disabled={guardandoReprog}>{guardandoReprog ? 'Guardando...' : 'Reprogramar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vuelos;
