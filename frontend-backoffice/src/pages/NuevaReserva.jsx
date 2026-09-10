import { useEffect, useState } from 'react';
import api from '../services/api';
import Autocomplete from '../components/Autocomplete';
import { FiSearch, FiUserPlus, FiTrash2, FiCheckCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';

const aeropuertos = [
  { code: 'SAL', name: 'San Salvador' }, { code: 'MIA', name: 'Miami' },
  { code: 'GUA', name: 'Guatemala' }, { code: 'SJO', name: 'San José' },
  { code: 'MEX', name: 'Cd. de México' }, { code: 'PTY', name: 'Panamá' },
  { code: 'TGU', name: 'Tegucigalpa' }, { code: 'MGA', name: 'Managua' },
];
const nacionalidades = ['SV', 'US', 'GT', 'HN', 'NI', 'CR', 'PA', 'MX'];
const MAP_DOC = { DUI: '13', NIT: '36', Passport: '3', '13': '13', '36': '36', '3': '3' };
const pasajeroVacio = () => ({
  passenger_type: 'adult', first_names: '', last_names: '',
  document_type: '13', document_number: '', birth_date: '', nationality: 'SV',
});
const tipoPorEdad = (birth) => {
  if (!birth) return null;
  const b = new Date(birth); const hoy = new Date();
  let e = hoy.getFullYear() - b.getFullYear();
  const m = hoy.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < b.getDate())) e--;
  if (e < 2) return 'infant';
  if (e < 12) return 'child';
  return 'adult';
};

const NuevaReserva = () => {
  const [clienteId, setClienteId] = useState('');
  const [clienteSel, setClienteSel] = useState(null);
  const [nuevoCliente, setNuevoCliente] = useState(false);
  const [clienteForm, setClienteForm] = useState({ first_names: '', last_names: '', document_type: 'DUI', document_number: '', email: '', phone: '' });
  const [autoRellenar, setAutoRellenar] = useState(true);
  const [origen, setOrigen] = useState('SAL');
  const [destino, setDestino] = useState('MIA');
  const [fecha, setFecha] = useState('');
  const [vuelos, setVuelos] = useState([]);
  const [vueloId, setVueloId] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [pasajeros, setPasajeros] = useState([pasajeroVacio()]);
  const [clase, setClase] = useState('economy');
  const [guardando, setGuardando] = useState(false);
  const [pnrCreado, setPnrCreado] = useState(null);

  const buscarVuelos = async () => {
    if (!fecha) return toast.error('Selecciona una fecha');
    setBuscando(true);
    setVueloId(null);
    try {
      const r = await api.get('/vuelos/buscar', { params: { origen: origen, destino: destino, fecha: fecha } });
      setVuelos(r.data.datos || []);
      if ((r.data.datos || []).length === 0) toast.error('No hay vuelos para esa fecha');
    } catch (e) { toast.error('Error al buscar vuelos'); }
    finally { setBuscando(false); }
  };

  const setPax = (i, campo, valor) => {
    setPasajeros((prev) => prev.map((p, idx) => {
      if (idx !== i) return p;
      const np = Object.assign({}, p, { [campo]: valor });
      if (campo === 'birth_date') {
        const t = tipoPorEdad(valor);
        if (t) np.passenger_type = t;
      }
      return np;
    }));
  };

  const seleccionarCliente = (c) => {
    setClienteSel(c);
    setClienteId(c ? c.id : '');
    if (c && autoRellenar) {
      setPasajeros((prev) => prev.map((p, idx) => idx === 0 ? Object.assign({}, p, {
        first_names: c.first_names || '',
        last_names: c.last_names || '',
        document_type: MAP_DOC[c.document_type] || '13',
        document_number: c.document_number || '',
      }) : p));
    }
  };

  const toggleAuto = (checked) => {
    setAutoRellenar(checked);
    if (checked && clienteSel) seleccionarCliente(clienteSel);
  };

  const vueloSel = vuelos.find((v) => v.id === vueloId);
  const totalEstimado = vueloSel ? vueloSel.base_price * pasajeros.length : 0;

  const guardar = async () => {
    if (nuevoCliente) {
      if (!clienteForm.first_names || !clienteForm.last_names || !clienteForm.document_number)
        return toast.error('Completa los datos del nuevo cliente');
    } else if (!clienteId) return toast.error('Selecciona un cliente');
    if (!vueloSel) return toast.error('Selecciona un vuelo');
    for (let i = 0; i < pasajeros.length; i++) {
      const p = pasajeros[i];
      if (!p.first_names || !p.last_names || !p.document_number || !p.birth_date)
        return toast.error('Completa todos los datos del pasajero ' + (i + 1));
    }
    setGuardando(true);
    try {
      let cid = clienteId;
      if (nuevoCliente) {
        try {
          const rc = await api.post('/clientes', clienteForm);
          cid = rc.data.datos.id;
          toast.success('Cliente creado');
        } catch (clientError) {
          if (clientError.response && clientError.response.status === 409) {
            toast.error('Ya existe un cliente con ese documento o email. Busca el cliente o usa uno existente.');
            setGuardando(false);
            return;
          }
          throw clientError;
        }
      }
      const r = await api.post('/reservas', {
        customer_id: Number(cid),
        vuelos: [{ flight_id: vueloSel.id, fare_class: clase }],
        pasajeros: pasajeros,
        time_limit_minutes: 30,
      });
      setPnrCreado(r.data.datos.pnr);
      api.post('/correos/confirmacion-reserva', { reservation_id: r.data.datos.reservation_id }).catch(() => {});
      toast.success('Reserva creada');
    } catch (e) {
      const mensaje = e.response && e.response.data && e.response.data.error ? e.response.data.error : 'Error al crear la reserva';
      toast.error(mensaje + (e.response && e.response.data && e.response.data.detalle ? ' → ' + e.response.data.detalle : ''));
    } finally { setGuardando(false); }
  };

  if (pnrCreado) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="card p-10 text-center">
          <FiCheckCircle className="text-green-500 mx-auto" size={64} />
          <h1 className="text-2xl font-bold text-gray-800 mt-4">Reserva creada con éxito</h1>
          <p className="text-gray-500 mt-2">Código PNR (RF-002):</p>
          <p className="text-5xl font-mono font-bold text-primary-700 tracking-widest mt-4">{pnrCreado}</p>
          <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-6">
            Reserva en estado PENDIENTE con time limit de 30 minutos (RN-COM-01). Sigue al módulo de Pagos.
          </p>
          <button className="btn-primary mt-6" onClick={() => { setPnrCreado(null); setPasajeros([pasajeroVacio()]); setVueloId(null); setClienteSel(null); }}>
            Crear otra reserva
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">1. Cliente</h2>
          <label className="flex items-center space-x-2 text-sm text-gray-700 mb-3">
            <input type="checkbox" checked={nuevoCliente} onChange={(e) => setNuevoCliente(e.target.checked)} />
            <span>Registrar cliente nuevo</span>
          </label>
          {nuevoCliente ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input className="input-field" placeholder="Nombres" value={clienteForm.first_names} onChange={(e) => setClienteForm(Object.assign({}, clienteForm, { first_names: e.target.value }))} />
              <input className="input-field" placeholder="Apellidos" value={clienteForm.last_names} onChange={(e) => setClienteForm(Object.assign({}, clienteForm, { last_names: e.target.value }))} />
              <select className="input-field" value={clienteForm.document_type} onChange={(e) => setClienteForm(Object.assign({}, clienteForm, { document_type: e.target.value }))}>
                <option value="DUI">DUI</option><option value="NIT">NIT</option><option value="Passport">Pasaporte</option>
              </select>
              <input className="input-field" placeholder="Número de documento" value={clienteForm.document_number} onChange={(e) => setClienteForm(Object.assign({}, clienteForm, { document_number: e.target.value }))} />
              <input className="input-field" placeholder="Email" value={clienteForm.email} onChange={(e) => setClienteForm(Object.assign({}, clienteForm, { email: e.target.value }))} />
              <input className="input-field" placeholder="Teléfono" value={clienteForm.phone} onChange={(e) => setClienteForm(Object.assign({}, clienteForm, { phone: e.target.value }))} />
            </div>
          ) : (
            <div className="space-y-3">
              <Autocomplete
                placeholder="Escribe nombre, apellido, documento o email (mínimo 2 letras)..."
                fetcher={(q) => api.get('/clientes/buscar', { params: { q: q } }).then((r) => r.data.datos)}
                renderLabel={(c) => c.first_names + ' ' + c.last_names}
                renderSub={(c) => c.document_type + ' ' + c.document_number + (c.email ? ' · ' + c.email : '')}
                onSelect={seleccionarCliente}
              />
              <label className="flex items-center space-x-2 text-sm text-gray-700">
                <input type="checkbox" checked={autoRellenar} onChange={(e) => toggleAuto(e.target.checked)} />
                <span>Rellenar automáticamente el Pasajero 1 con los datos del cliente</span>
              </label>
              {clienteSel && (
                <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg p-2">
                  Cliente seleccionado: {clienteSel.first_names} {clienteSel.last_names} ({clienteSel.document_number})
                </p>
              )}
            </div>
          )}
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">2. Vuelo</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <select className="input-field" value={origen} onChange={(e) => setOrigen(e.target.value)}>
              {aeropuertos.map((a) => <option key={a.code} value={a.code}>{a.code} - {a.name}</option>)}
            </select>
            <select className="input-field" value={destino} onChange={(e) => setDestino(e.target.value)}>
              {aeropuertos.map((a) => <option key={a.code} value={a.code}>{a.code} - {a.name}</option>)}
            </select>
            <input type="date" className="input-field" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            <button className="btn-primary flex items-center justify-center space-x-2" onClick={buscarVuelos} disabled={buscando}>
              <FiSearch /><span>{buscando ? 'Buscando...' : 'Buscar'}</span>
            </button>
          </div>
          {vuelos.length > 0 && (
            <div className="space-y-2">
              {vuelos.map((v) => (
                <label key={v.id} className={'flex items-center justify-between p-3 rounded-lg border cursor-pointer ' + (vueloId === v.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:bg-gray-50')}>
                  <div className="flex items-center space-x-3">
                    <input type="radio" name="vuelo" checked={vueloId === v.id} onChange={() => setVueloId(v.id)} />
                    <div>
                      <p className="font-semibold text-gray-800">{v.flight_number}</p>
                      <p className="text-xs text-gray-500">{v.origin_iata} → {v.destination_iata} · {new Date(v.departure_datetime).toLocaleString('es-SV')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary-700">${v.base_price}</p>
                    <p className="text-xs text-gray-500">{v.available_seats} asientos</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">3. Pasajeros</h2>
            <div className="flex items-center space-x-2">
              <select className="input-field" value={clase} onChange={(e) => setClase(e.target.value)}>
                <option value="economy">Económica</option><option value="premium">Premium</option>
                <option value="business">Ejecutiva</option><option value="first">Primera</option>
              </select>
              <button className="btn-secondary flex items-center space-x-2" onClick={() => setPasajeros(pasajeros.concat([pasajeroVacio()]))}>
                <FiUserPlus /><span>Agregar</span>
              </button>
            </div>
          </div>
          <div className="space-y-4">
            {pasajeros.map((p, i) => (
              <div key={i} className="p-4 bg-gray-50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-700">Pasajero {i + 1}</p>
                  {pasajeros.length > 1 && (
                    <button className="text-red-500" onClick={() => setPasajeros(pasajeros.filter(function (_, idx) { return idx !== i; }))}><FiTrash2 /></button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <select className="input-field" value={p.passenger_type} onChange={(e) => setPax(i, 'passenger_type', e.target.value)}>
                    <option value="adult">Adulto</option><option value="child">Niño</option><option value="infant">Bebé</option>
                  </select>
                  <input className="input-field" placeholder="Nombres" value={p.first_names} onChange={(e) => setPax(i, 'first_names', e.target.value)} />
                  <input className="input-field" placeholder="Apellidos" value={p.last_names} onChange={(e) => setPax(i, 'last_names', e.target.value)} />
                  <select className="input-field" value={p.document_type} onChange={(e) => setPax(i, 'document_type', e.target.value)}>
                    <option value="13">DUI (CAT-022: 13)</option><option value="36">NIT (CAT-022: 36)</option><option value="3">Pasaporte (CAT-022: 3)</option>
                  </select>
                  <input className="input-field" placeholder="N° documento" value={p.document_number} onChange={(e) => setPax(i, 'document_number', e.target.value)} />
                  <div>
                    <input type="date" className="input-field" value={p.birth_date} onChange={(e) => setPax(i, 'birth_date', e.target.value)} />
                    <p className="text-[11px] text-gray-500 mt-1">Fecha de nacimiento: define tipo de pasajero y valida filas de salida de emergencia (RN-OP-03).</p>
                  </div>
                  <select className="input-field" value={p.nationality} onChange={(e) => setPax(i, 'nationality', e.target.value)}>
                    {nacionalidades.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="card p-6 sticky top-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Resumen</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Vuelo</span><span className="font-medium">{vueloSel ? vueloSel.flight_number : '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Ruta</span><span className="font-medium">{vueloSel ? vueloSel.origin_iata + ' → ' + vueloSel.destination_iata : '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Pasajeros</span><span className="font-medium">{pasajeros.length}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Clase</span><span className="font-medium capitalize">{clase}</span></div>
            <div className="border-t pt-2 mt-2 flex justify-between text-base">
              <span className="font-semibold">Total estimado</span>
              <span className="font-bold text-primary-700">${totalEstimado.toFixed(2)}</span>
            </div>
          </div>
          <button className="btn-primary w-full mt-6" onClick={guardar} disabled={guardando}>
            {guardando ? 'Creando...' : 'Crear Reserva (PNR)'}
          </button>
          <p className="text-xs text-gray-500 mt-3">La reserva queda PENDIENTE con time limit de 30 min (RN-COM-01). El precio se congela al crear (RN-COM-02).</p>
        </div>
      </div>
    </div>
  );
};
export default NuevaReserva;