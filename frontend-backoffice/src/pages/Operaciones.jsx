import { useEffect, useState } from 'react';
import api from '../services/api';
import { FiUsers, FiTag, FiMap, FiSettings, FiActivity } from 'react-icons/fi';
import toast from 'react-hot-toast';

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
  const [fAsig, setFAsig] = useState({ flight_id: '', crew_member_id: '', role: '', duty_start: '', duty_end: '' });
  const [crewVuelo, setCrewVuelo] = useState([]);
  const [fClase, setFClase] = useState({ code: '', name: '', multiplier: '1.00', conditions: '' });
  const [fFare, setFFare] = useState({ flight_id: '', fare_class_id: '', price: '', seats_allocated: '' });
  const [faresVuelo, setFaresVuelo] = useState([]);
  const [fFac, setFFac] = useState({ airport_id: '', type: 'gate', code: '' });

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
      toast.success('Tarifa asignada: $' + r.data.datos.price);
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
            <select className="input-field" value={fAsig.flight_id} onChange={(e) => verCrewVuelo(e.target.value)}>
              <option value="">-- Vuelo --</option>
              {vuelos.map((v) => <option key={v.id} value={v.id}>{v.flight_number}</option>)}
            </select>
            <select className="input-field" value={fAsig.crew_member_id} onChange={(e) => setFAsig(Object.assign({}, fAsig, { crew_member_id: e.target.value }))}>
              <option value="">-- Tripulante --</option>
              {crew.map((c) => <option key={c.id} value={c.id}>{c.full_name} ({c.role_operativo})</option>)}
            </select>
            <input type="datetime-local" className="input-field" value={fAsig.duty_start} onChange={(e) => setFAsig(Object.assign({}, fAsig, { duty_start: e.target.value }))} />
            <input type="datetime-local" className="input-field" value={fAsig.duty_end} onChange={(e) => setFAsig(Object.assign({}, fAsig, { duty_end: e.target.value }))} />
            <button className="btn-primary" onClick={asignar}>Asignar</button>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b"><tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Tripulante</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Rol</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Licencia</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Vence</th>
              </tr></thead>
              <tbody className="divide-y">
                {crew.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-2 text-sm">{c.full_name}</td>
                    <td className="px-4 py-2 text-sm">{c.role_operativo}</td>
                    <td className="px-4 py-2 text-sm">{c.license_type} {c.license_number}</td>
                    <td className="px-4 py-2 text-sm">{c.license_expiry || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
        <div className="space-y-4">
          <div className="card p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
            <input className="input-field" placeholder="Código (Y, B, M...)" value={fClase.code} onChange={(e) => setFClase(Object.assign({}, fClase, { code: e.target.value }))} />
            <input className="input-field" placeholder="Nombre" value={fClase.name} onChange={(e) => setFClase(Object.assign({}, fClase, { name: e.target.value }))} />
            <input type="number" step="0.01" className="input-field" value={fClase.multiplier} onChange={(e) => setFClase(Object.assign({}, fClase, { multiplier: e.target.value }))} />
            <input className="input-field" placeholder="Condiciones" value={fClase.conditions} onChange={(e) => setFClase(Object.assign({}, fClase, { conditions: e.target.value }))} />
            <button className="btn-primary" onClick={crearClase}>Crear clase</button>
          </div>
          <div className="card p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
            <select className="input-field" value={fFare.flight_id} onChange={(e) => verFares(e.target.value)}>
              <option value="">-- Vuelo --</option>
              {vuelos.map((v) => <option key={v.id} value={v.id}>{v.flight_number}</option>)}
            </select>
            <select className="input-field" value={fFare.fare_class_id} onChange={(e) => setFFare(Object.assign({}, fFare, { fare_class_id: e.target.value }))}>
              <option value="">-- Clase --</option>
              {clases.map((c) => <option key={c.id} value={c.id}>{c.code} - {c.name} (x{c.multiplier})</option>)}
            </select>
            <input type="number" step="0.01" className="input-field" placeholder="Precio (auto si vacío)" value={fFare.price} onChange={(e) => setFFare(Object.assign({}, fFare, { price: e.target.value }))} />
            <input type="number" className="input-field" placeholder="Asientos" value={fFare.seats_allocated} onChange={(e) => setFFare(Object.assign({}, fFare, { seats_allocated: e.target.value }))} />
            <button className="btn-primary" onClick={asignarFare}>Asignar tarifa</button>
          </div>
          {fFare.flight_id && (
            <div className="card overflow-hidden">
              <table className="w-full">
                <tbody className="divide-y">
                  {faresVuelo.length === 0 ? <tr><td className="px-4 py-3 text-sm text-gray-500">Sin tarifas asignadas</td></tr> :
                    faresVuelo.map((f) => (
                      <tr key={f.id}>
                        <td className="px-4 py-2 text-sm">{f.code} - {f.name}</td>
                        <td className="px-4 py-2 text-sm font-semibold">${Number(f.price).toFixed(2)}</td>
                        <td className="px-4 py-2 text-sm">{f.seats_allocated} asientos · {f.seats_sold} vendidos</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'infra' && (
        <div className="space-y-4">
          <div className="card p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <select className="input-field" value={fFac.airport_id} onChange={(e) => setFFac(Object.assign({}, fFac, { airport_id: e.target.value }))}>
              <option value="">-- Aeropuerto --</option>
              {aeropuertos.map((a) => <option key={a.id} value={a.id}>{a.iata_code} - {a.name}</option>)}
            </select>
            <select className="input-field" value={fFac.type} onChange={(e) => setFFac(Object.assign({}, fFac, { type: e.target.value }))}>
              <option value="terminal">Terminal</option><option value="gate">Puerta de embarque</option><option value="checkin_point">Punto de check-in</option>
            </select>
            <input className="input-field" placeholder="Código (T1, A5, C3...)" value={fFac.code} onChange={(e) => setFFac(Object.assign({}, fFac, { code: e.target.value }))} />
            <button className="btn-primary" onClick={crearFac}>Crear instalación</button>
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
                {facilities.map((f) => (
                  <tr key={f.id}>
                    <td className="px-4 py-2 text-sm">{f.iata_code}</td>
                    <td className="px-4 py-2 text-sm">{f.type}</td>
                    <td className="px-4 py-2 text-sm font-mono">{f.code}</td>
                    <td className="px-4 py-2 text-sm">{f.active ? 'Sí' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Acción</th>
            </tr></thead>
            <tbody className="divide-y">
              {config.map((c) => (
                <tr key={c.param_key}>
                  <td className="px-4 py-2 text-sm font-mono">{c.param_key}</td>
                  <td className="px-4 py-2"><input className="input-field py-1" defaultValue={c.param_value} onBlur={(e) => e.target.value !== c.param_value && guardarConfig(c.param_key, e.target.value)} /></td>
                  <td className="px-4 py-2 text-sm text-gray-500">{c.description}</td>
                  <td className="px-4 py-2 text-xs text-gray-400">Guarda al salir del campo</td>
                </tr>
              ))}
            </tbody>
          </table>
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
    </div>
  );
};
export default Operaciones;