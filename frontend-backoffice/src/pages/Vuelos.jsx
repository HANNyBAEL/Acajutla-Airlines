import { useEffect, useState } from 'react';
import api from '../services/api';
import { FiPlus, FiSearch, FiX, FiXCircle, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Vuelos = () => {
  const [vuelos, setVuelos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [modal, setModal] = useState(false);
  const [aeropuertos, setAeropuertos] = useState([]);
  const [aeronaves, setAeronaves] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({ flight_number: '', origen_iata: '', destino_iata: '', aircraft_id: '', departure_datetime: '', arrival_datetime: '', base_price: '', gate: '' });
  const [modalReprog, setModalReprog] = useState(null);
  const [formReprog, setFormReprog] = useState({ departure_datetime: '', arrival_datetime: '', aircraft_id: '', gate: '' });
  const [guardandoReprog, setGuardandoReprog] = useState(false);

  const cargar = () => {
    api.get('/vuelos')
      .then((r) => setVuelos(r.data.datos || []))
      .catch(() => toast.error('No se pudo conectar con el backend'))
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargar(); }, []);

  const toLocalInput = (valor) => {
    if (!valor) return '';
    const d = new Date(valor);
    const pad = (n) => (n < 10 ? '0' + n : '' + n);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  };

  const abrirModal = async () => {
    setForm({ flight_number: '', origen_iata: '', destino_iata: '', aircraft_id: '', departure_datetime: '', arrival_datetime: '', base_price: '', gate: '' });
    setModal(true);
    try {
      const res = await Promise.all([api.get('/aeropuertos?activos=1'), api.get('/vuelos/aeronaves')]);
      setAeropuertos(res[0].data.datos || []);
      setAeronaves(res[1].data.datos || []);
    } catch (e) {
      toast.error('Error al cargar catálogos');
    }
  };

  const setCampo = (campo, valor) => setForm((f) => Object.assign({}, f, { [campo]: valor }));

  const guardar = async () => {
    if (!form.flight_number || !form.aircraft_id || !form.origen_iata || !form.destino_iata || !form.departure_datetime || !form.arrival_datetime || !form.base_price) {
      return toast.error('Completa todos los campos obligatorios (*)');
    }
    setGuardando(true);
    try {
      await api.post('/vuelos', form);
      toast.success('Vuelo programado correctamente');
      setModal(false);
      cargar();
    } catch (e) {
      toast.error(e.response && e.response.data && e.response.data.error ? e.response.data.error : 'Error al crear el vuelo');
    } finally { setGuardando(false); }
  };

  const cancelarVuelo = async (v) => {
    const motivo = window.prompt('Motivo de la cancelación del vuelo ' + v.flight_number + ':', 'Cancelado por operaciones');
    if (motivo === null) return;
    try {
      await api.patch('/vuelos/' + v.id + '/cancelar', { motivo: motivo, confirmar: false });
      toast.success('Vuelo ' + v.flight_number + ' cancelado');
      cargar();
    } catch (e) {
      const data = e.response ? e.response.data : null;
      if (e.response && e.response.status === 409 && data && data.requiereConfirmacion) {
        const ok = window.confirm('El vuelo ' + v.flight_number + ' tiene ' + data.afectados + ' reserva(s) activa(s). ¿Cancelar de todos modos?');
        if (!ok) return;
        try {
          await api.patch('/vuelos/' + v.id + '/cancelar', { motivo: motivo, confirmar: true });
          toast.success('Vuelo ' + v.flight_number + ' cancelado');
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

  const estadoBadge = (e) => ({
    scheduled: 'bg-blue-100 text-blue-700', confirmed: 'bg-green-100 text-green-700',
    delayed: 'bg-orange-100 text-orange-700', cancelled: 'bg-red-100 text-red-700',
    completed: 'bg-gray-100 text-gray-700', in_progress: 'bg-yellow-100 text-yellow-700',
  }[e] || 'bg-gray-100 text-gray-700');

  const estadoLabel = (e) => ({
    scheduled: 'Programado', confirmed: 'Confirmado', in_progress: 'En curso',
    delayed: 'Retrasado', completed: 'Finalizado', cancelled: 'Cancelado',
  }[e] || e);

  const sePuedeCancelar = (e) => ['scheduled', 'confirmed', 'delayed'].includes(e);
  const sePuedeReprogramar = (e) => ['cancelled', 'delayed'].includes(e);

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
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Buscar vuelo, origen, destino..." className="input-field pl-10" />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-[10%] px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Vuelo</th>
                <th className="w-[14%] px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ruta</th>
                <th className="w-[18%] px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Salida</th>
                <th className="w-[16%] px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Aeronave</th>
                <th className="w-[14%] px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
                <th className="w-[28%] px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cargando ? (
                <tr><td colSpan="6" className="text-center py-8 text-gray-500">Cargando vuelos...</td></tr>
              ) : lista.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-8 text-gray-500">No hay vuelos registrados</td></tr>
              ) : lista.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-semibold text-gray-800" title={v.flight_number}>{v.flight_number}</td>
                  <td className="px-6 py-4 text-sm" title={(v.origin || '') + ' a ' + (v.destination || '')}>{v.origin} → {v.destination}</td>
                  <td className="px-6 py-4 text-sm text-gray-600" title={new Date(v.departure_datetime).toLocaleString('es-SV')}>{new Date(v.departure_datetime).toLocaleString('es-SV')}</td>
                  <td className="px-6 py-4 text-sm text-gray-600" title={v.aircraft || ''}>{v.aircraft || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={'px-3 py-1 rounded-full text-xs font-medium ' + estadoBadge(v.status)}>{estadoLabel(v.status)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      {sePuedeCancelar(v.status) && (
                        <button onClick={() => cancelarVuelo(v)} className="text-red-600 hover:text-red-800 flex items-center space-x-1">
                          <FiXCircle size={16} /><span className="text-sm">Cancelar</span>
                        </button>
                      )}
                      {sePuedeReprogramar(v.status) && (
                        <button onClick={() => abrirReprog(v)} className="text-primary-600 hover:text-primary-800 flex items-center space-x-1">
                          <FiRefreshCw size={16} /><span className="text-sm">Reprogramar</span>
                        </button>
                      )}
                      {!sePuedeCancelar(v.status) && !sePuedeReprogramar(v.status) && (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
                <select className="input-field" value={form.aircraft_id} onChange={(e) => setCampo('aircraft_id', e.target.value)}>
                  <option value="">-- Selecciona --</option>
                  {aeronaves.map((a) => <option key={a.id} value={a.id}>{a.registration} · {a.model}</option>)}
                </select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Origen *</label>
                <select className="input-field" value={form.origen_iata} onChange={(e) => setCampo('origen_iata', e.target.value)}>
                  <option value="">-- Selecciona --</option>
                  {aeropuertos.map((a) => <option key={a.id} value={a.code}>{a.code} - {a.name}</option>)}
                </select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Destino *</label>
                <select className="input-field" value={form.destino_iata} onChange={(e) => setCampo('destino_iata', e.target.value)}>
                  <option value="">-- Selecciona --</option>
                  {aeropuertos.map((a) => <option key={a.id} value={a.code}>{a.code} - {a.name}</option>)}
                </select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Fecha y hora de salida *</label>
                <input type="datetime-local" className="input-field" value={form.departure_datetime} onChange={(e) => setCampo('departure_datetime', e.target.value)} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Fecha y hora de llegada *</label>
                <input type="datetime-local" className="input-field" value={form.arrival_datetime} onChange={(e) => setCampo('arrival_datetime', e.target.value)} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Precio base (USD) *</label>
                <input type="number" className="input-field" value={form.base_price} onChange={(e) => setCampo('base_price', e.target.value)} placeholder="250" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Puerta de embarque</label>
                <input className="input-field" value={form.gate} onChange={(e) => setCampo('gate', e.target.value)} placeholder="A12" /></div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={guardar} disabled={guardando}>{guardando ? 'Guardando...' : 'Crear Vuelo'}</button>
            </div>
          </div>
        </div>
      )}

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
                <select className="input-field" value={formReprog.aircraft_id} onChange={(e) => setFormReprog(Object.assign({}, formReprog, { aircraft_id: e.target.value }))}>
                  <option value="">-- Mantener aeronave actual --</option>
                  {aeronaves.map((a) => <option key={a.id} value={a.id}>{a.registration} · {a.model}</option>)}
                </select></div>
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