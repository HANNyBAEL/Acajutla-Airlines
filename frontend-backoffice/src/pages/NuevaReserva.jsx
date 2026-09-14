import { useEffect, useState } from 'react';
import api from '../services/api';
import Autocomplete from '../components/Autocomplete';
import SearchableSelect from '../components/SearchableSelect';
import { FiSearch, FiUserPlus, FiTrash2, FiCheckCircle, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';

const aeropuertos = [
  { code: 'SAL', name: 'San Salvador' }, { code: 'MIA', name: 'Miami' },
  { code: 'GUA', name: 'Guatemala' }, { code: 'SJO', name: 'San José' },
  { code: 'MEX', name: 'Cd. de México' }, { code: 'PTY', name: 'Panamá' },
  { code: 'TGU', name: 'Tegucigalpa' }, { code: 'MGA', name: 'Managua' },
];
const opcionesAeropuerto = aeropuertos.map((a) => ({ value: a.code, label: a.code + ' - ' + a.name, searchText: a.code + ' ' + a.name }));
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
const fechaMinima = () => {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return ahora.getFullYear() + '-' + mes + '-' + dia;
};

const NuevaReserva = () => {
  const [clienteId, setClienteId] = useState('');
  const [clienteSel, setClienteSel] = useState(null);
  const [modalNuevoCliente, setModalNuevoCliente] = useState(false);
  const [guardandoCliente, setGuardandoCliente] = useState(false);
  const [clienteForm, setClienteForm] = useState({ first_names: '', last_names: '', document_type: 'DUI', document_number: '', birth_date: '', email: '', phone: '' });
  const [autoRellenar, setAutoRellenar] = useState(true);
  const [tipoViaje, setTipoViaje] = useState('ida');
  const [trayectos, setTrayectos] = useState([{ origen: 'SAL', destino: 'MIA', fecha: '', vuelos: [], vueloId: null, buscando: false }]);
  const [pasajeros, setPasajeros] = useState([pasajeroVacio()]);
  const [clase, setClase] = useState('economy');
  const [guardando, setGuardando] = useState(false);
  const [pnrCreado, setPnrCreado] = useState(null);

  const actualizarTrayecto = (indice, campo, valor) => {
    setTrayectos((actuales) => actuales.map((t, i) => i === indice
      ? Object.assign({}, t, { [campo]: valor, vuelos: campo === 'vueloId' ? t.vuelos : [], vueloId: campo === 'vueloId' ? valor : null })
      : t));
  };

  const cambiarTipoViaje = (tipo) => {
    setTipoViaje(tipo);
    setTrayectos((actuales) => {
      const ida = actuales[0] || { origen: 'SAL', destino: 'MIA', fecha: '', vuelos: [], vueloId: null, buscando: false };
      if (tipo === 'ida') return [ida];
      if (tipo === 'regreso') return [ida, { origen: ida.destino, destino: ida.origen, fecha: '', vuelos: [], vueloId: null, buscando: false }];
      return actuales.length > 1 ? actuales : [ida, { origen: ida.destino, destino: 'GUA', fecha: '', vuelos: [], vueloId: null, buscando: false }];
    });
  };

  const agregarTrayecto = () => setTrayectos((actuales) => {
    const anterior = actuales[actuales.length - 1];
    return actuales.concat([{ origen: anterior.destino, destino: 'MIA', fecha: '', vuelos: [], vueloId: null, buscando: false }]);
  });

  const buscarVuelos = async (indice) => {
    const trayecto = trayectos[indice];
    if (!trayecto.fecha) return toast.error('Selecciona la fecha del trayecto ' + (indice + 1));
    setTrayectos((actuales) => actuales.map((t, i) => i === indice ? Object.assign({}, t, { buscando: true, vueloId: null }) : t));
    try {
      const r = await api.get('/vuelos/buscar', { params: { origen: trayecto.origen, destino: trayecto.destino, fecha: trayecto.fecha } });
      const resultados = r.data.datos || [];
      setTrayectos((actuales) => actuales.map((t, i) => i === indice ? Object.assign({}, t, { vuelos: resultados, buscando: false }) : t));
      if (!resultados.length) toast.error('No hay vuelos para ese trayecto y fecha');
    } catch (e) { toast.error('Error al buscar vuelos'); }
    finally { setTrayectos((actuales) => actuales.map((t, i) => i === indice ? Object.assign({}, t, { buscando: false }) : t)); }
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
        birth_date: c.birth_date ? String(c.birth_date).slice(0, 10) : '',
      }) : p));
    }
  };

  const toggleAuto = (checked) => {
    setAutoRellenar(checked);
    if (checked && clienteSel) seleccionarCliente(clienteSel);
  };

  const setCampoCliente = (campo, valor) => setClienteForm((f) => Object.assign({}, f, { [campo]: valor }));

  const abrirModalNuevoCliente = () => {
    setClienteForm({ first_names: '', last_names: '', document_type: 'DUI', document_number: '', birth_date: '', email: '', phone: '' });
    setModalNuevoCliente(true);
  };

  const registrarCliente = async () => {
    if (!clienteForm.first_names || !clienteForm.last_names || !clienteForm.document_number || !clienteForm.birth_date)
      return toast.error('Nombres, apellidos, documento y fecha de nacimiento son obligatorios');
    setGuardandoCliente(true);
    try {
      const rc = await api.post('/clientes', clienteForm);
      const creado = Object.assign({}, clienteForm, { id: rc.data.datos.id });
      setModalNuevoCliente(false);
      seleccionarCliente(creado);
      toast.success('Cliente registrado y seleccionado');
    } catch (e) {
      if (e.response && e.response.status === 409) toast.error('Ya existe un cliente con ese documento o email. Búscalo y selecciónalo.');
      else toast.error(e.response?.data?.error || 'Error al registrar el cliente');
    } finally { setGuardandoCliente(false); }
  };

  const vuelosSeleccionados = trayectos.map((t) => t.vuelos.find((v) => v.id === t.vueloId)).filter(Boolean);
  const totalEstimado = vuelosSeleccionados.reduce((total, vuelo) => total + Number(vuelo.base_price || 0), 0) * pasajeros.length;

  const guardar = async () => {
    if (!clienteId) return toast.error('Selecciona un cliente o agrega uno nuevo');
    if (trayectos.some((t) => !t.vueloId)) return toast.error('Selecciona un vuelo para cada trayecto');
    for (let i = 0; i < pasajeros.length; i++) {
      const p = pasajeros[i];
      if (!p.first_names || !p.last_names || !p.document_number || !p.birth_date)
        return toast.error('Completa todos los datos del pasajero ' + (i + 1));
    }
    setGuardando(true);
    try {
      const cid = clienteId;
      const r = await api.post('/reservas', {
        customer_id: Number(cid),
        vuelos: trayectos.map((t) => ({ flight_id: t.vueloId, fare_class: clase })),
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
          <button className="btn-primary mt-6" onClick={() => { setPnrCreado(null); setPasajeros([pasajeroVacio()]); setTrayectos([{ origen: 'SAL', destino: 'MIA', fecha: '', vuelos: [], vueloId: null, buscando: false }]); setClienteSel(null); }}>
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
          <div className="space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <Autocomplete
                  placeholder="Escribe nombre, apellido, documento o email (mínimo 2 letras)..."
                  fetcher={(q) => api.get('/clientes/buscar', { params: { q: q } }).then((r) => r.data.datos)}
                  renderLabel={(c) => c.first_names + ' ' + c.last_names}
                  renderSub={(c) => (c.document_number ? c.document_type + ' ' + c.document_number : 'Sin documento') + (c.email ? ' · ' + c.email : '')}
                  onSelect={seleccionarCliente}
                />
              </div>
              <button type="button" className="btn-secondary flex items-center justify-center space-x-2 shrink-0" onClick={abrirModalNuevoCliente}>
                <FiUserPlus /><span>Agregar nuevo cliente</span>
              </button>
            </div>
            <label className="flex items-center space-x-2 text-sm text-gray-700">
              <input type="checkbox" checked={autoRellenar} onChange={(e) => toggleAuto(e.target.checked)} />
              <span>Rellenar automáticamente el Pasajero 1 con los datos del cliente</span>
            </label>
            {clienteSel && (
              <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg p-2">
                Cliente seleccionado: {clienteSel.first_names} {clienteSel.last_names}{clienteSel.document_number ? ' (' + clienteSel.document_number + ')' : ''}
              </p>
            )}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">2. Vuelo</h2>
          <div className="flex flex-wrap gap-2 mb-5">
            {[['ida', 'Solo ida'], ['regreso', 'Ida y regreso'], ['multiple', 'Múltiples trayectos']].map(([valor, etiqueta]) => (
              <button key={valor} type="button" onClick={() => cambiarTipoViaje(valor)} className={'px-4 py-2 rounded-lg text-sm font-medium border ' + (tipoViaje === valor ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-300')}>
                {etiqueta}
              </button>
            ))}
          </div>
          <div className="space-y-5">
            {trayectos.map((t, indice) => (
              <div key={indice} className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                <div className="flex justify-between items-center mb-3">
                  <p className="font-semibold text-gray-700">Trayecto {indice + 1}{tipoViaje === 'regreso' && indice === 1 ? ' · Regreso' : ''}</p>
                  {tipoViaje === 'multiple' && trayectos.length > 2 && <button type="button" className="text-sm text-red-600" onClick={() => setTrayectos((actuales) => actuales.filter((_, i) => i !== indice))}>Eliminar</button>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <SearchableSelect options={opcionesAeropuerto} value={t.origen} onChange={(valor) => actualizarTrayecto(indice, 'origen', valor)} placeholder="Desde: código o ciudad..." />
                  <SearchableSelect options={opcionesAeropuerto} value={t.destino} onChange={(valor) => actualizarTrayecto(indice, 'destino', valor)} placeholder="Hasta: código o ciudad..." />
                  <input type="date" className="input-field" min={fechaMinima()} value={t.fecha} onChange={(e) => actualizarTrayecto(indice, 'fecha', e.target.value)} />
                  <button className="btn-primary flex items-center justify-center space-x-2" onClick={() => buscarVuelos(indice)} disabled={t.buscando || t.origen === t.destino}>
                    <FiSearch /><span>{t.buscando ? 'Buscando...' : 'Buscar'}</span>
                  </button>
                </div>
                {t.origen === t.destino && <p className="text-xs text-red-600 mt-2">El origen y el destino deben ser diferentes.</p>}
                {t.vuelos.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {t.vuelos.map((v) => (
                      <label key={v.id} className={'flex items-center justify-between p-3 rounded-lg border cursor-pointer ' + (t.vueloId === v.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-white hover:bg-gray-50')}>
                        <div className="flex items-center space-x-3">
                          <input type="radio" name={'vuelo-' + indice} checked={t.vueloId === v.id} onChange={() => actualizarTrayecto(indice, 'vueloId', v.id)} />
                          <div><p className="font-semibold text-gray-800">{v.flight_number}</p><p className="text-xs text-gray-500">{v.origin_iata} → {v.destination_iata} · {new Date(v.departure_datetime).toLocaleString('es-SV')}</p></div>
                        </div>
                        <div className="text-right"><p className="font-bold text-primary-700">${v.base_price}</p><p className="text-xs text-gray-500">{v.available_seats} asientos</p></div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          {tipoViaje === 'multiple' && <button type="button" className="btn-secondary mt-4 flex items-center space-x-2" onClick={agregarTrayecto}><FiUserPlus /><span>Agregar trayecto</span></button>}
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
            <div className="flex justify-between"><span className="text-gray-500">Modalidad</span><span className="font-medium">{tipoViaje === 'ida' ? 'Solo ida' : tipoViaje === 'regreso' ? 'Ida y regreso' : 'Múltiples trayectos'}</span></div>
            <div className="border-b pb-2 space-y-1">{vuelosSeleccionados.length ? vuelosSeleccionados.map((v, i) => <div key={v.id} className="flex justify-between gap-2"><span className="text-gray-500">T{i + 1}: {v.origin_iata} → {v.destination_iata}</span><span className="font-medium">{v.flight_number}</span></div>) : <span className="text-gray-500">Aún no hay vuelos seleccionados</span>}</div>
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
      {modalNuevoCliente && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Agregar Nuevo Cliente</h2>
              <button onClick={() => setModalNuevoCliente(false)} className="text-gray-500 hover:text-gray-700"><FiX size={22} /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombres *</label>
                <input className="input-field" value={clienteForm.first_names} onChange={(e) => setCampoCliente('first_names', e.target.value)} placeholder="Juan Carlos" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Apellidos *</label>
                <input className="input-field" value={clienteForm.last_names} onChange={(e) => setCampoCliente('last_names', e.target.value)} placeholder="Menjívar López" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Documento *</label>
                <select className="input-field" value={clienteForm.document_type} onChange={(e) => setCampoCliente('document_type', e.target.value)}>
                  <option value="DUI">DUI</option><option value="NIT">NIT</option><option value="Passport">Pasaporte</option>
                </select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Número de Documento *</label>
                <input className="input-field" value={clienteForm.document_number} onChange={(e) => setCampoCliente('document_number', e.target.value)} placeholder="12345678-9" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Fecha de nacimiento *</label>
                <input type="date" className="input-field" value={clienteForm.birth_date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setCampoCliente('birth_date', e.target.value)} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" className="input-field" value={clienteForm.email} onChange={(e) => setCampoCliente('email', e.target.value)} placeholder="cliente@email.com" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input className="input-field" value={clienteForm.phone} onChange={(e) => setCampoCliente('phone', e.target.value)} placeholder="+503 7000-0000" /></div>
            </div>
            <p className="text-xs text-gray-500 mt-3">Para crear una reserva es obligatorio proporcionar DUI, NIT o pasaporte.</p>
            <div className="flex justify-end space-x-2 mt-6">
              <button className="btn-secondary" onClick={() => setModalNuevoCliente(false)}>Cancelar</button>
              <button className="btn-primary" onClick={registrarCliente} disabled={guardandoCliente}>{guardandoCliente ? 'Registrando...' : 'Aceptar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default NuevaReserva;
