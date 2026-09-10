import { useEffect, useState } from 'react';
import api from '../services/api';
import { FiShoppingBag, FiUsers, FiBarChart2, FiActivity } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Comercial = () => {
  const [tab, setTab] = useState('kpi');
  const [kpi, setKpi] = useState(null);
  const [waitlist, setWaitlist] = useState([]);
  const [ancillaries, setAncillaries] = useState([]);
  const [vuelos, setVuelos] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [faVuelo, setFaVuelo] = useState([]);
  const [raReserva, setRaReserva] = useState([]);
  const [repOcp, setRepOcp] = useState([]);
  const [repAnc, setRepAnc] = useState([]);
  const [repCan, setRepCan] = useState([]);
  const [repConc, setRepConc] = useState([]);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [fWl, setFWl] = useState({ flight_id: '', passenger_name: '', passenger_email: '', passenger_doc: '', doc_type: 'DUI', requested_class: '' });
  const [fAnc, setFAnc] = useState({ code: '', name: '', type: 'baggage', description: '', base_price: '' });
  const [fFa, setFFa] = useState({ flight_id: '', ancillary_id: '', stock: '', price_override: '' });
  const [fRa, setFRa] = useState({ reservation_id: '', flight_id: '', ancillary_id: '', quantity: 1 });

  const cargarBase = () => {
    api.get('/comercial/kpi').then((r) => setKpi(r.data.datos)).catch(() => {});
    api.get('/comercial/waitlist').then((r) => setWaitlist(r.data.datos || [])).catch(() => {});
    api.get('/comercial/ancillaries').then((r) => setAncillaries(r.data.datos || [])).catch(() => {});
    api.get('/vuelos').then((r) => setVuelos(r.data.datos || [])).catch(() => {});
    api.get('/reservas').then((r) => setReservas(r.data.datos || [])).catch(() => {});
  };
  useEffect(() => { cargarBase(); }, []);

  const cargarReportes = () => {
    const q = (desde || hasta) ? ('?desde=' + (desde || '') + '&hasta=' + (hasta || '')) : '';
    api.get('/comercial/reportes/ocupacion' + q).then((r) => setRepOcp(r.data.datos || [])).catch(() => {});
    api.get('/comercial/reportes/ancillaries').then((r) => setRepAnc(r.data.datos || [])).catch(() => {});
    api.get('/comercial/reportes/canales').then((r) => setRepCan(r.data.datos || [])).catch(() => {});
    api.get('/comercial/reportes/conciliacion' + q).then((r) => setRepConc(r.data.datos || [])).catch(() => {});
  };

  const addWl = async () => {
    if (!fWl.flight_id || !fWl.passenger_name) return toast.error('Vuelo y nombre obligatorios');
    try {
      const r = await api.post('/comercial/waitlist', fWl);
      toast.success(r.data.mensaje);
      setFWl({ flight_id: '', passenger_name: '', passenger_email: '', passenger_doc: '', doc_type: 'DUI', requested_class: '' });
      cargarBase();
    } catch (e) { toast.error(e.response && e.response.data ? e.response.data.error : 'Error'); }
  };
  const setWl = async (id, status) => {
    try { await api.put('/comercial/waitlist/' + id, { status: status }); toast.success('Estado actualizado'); cargarBase(); }
    catch (e) { toast.error('Error'); }
  };
  const crearAnc = async () => {
    if (!fAnc.code || !fAnc.name || !fAnc.base_price) return toast.error('Código, nombre y precio obligatorios');
    try {
      await api.post('/comercial/ancillaries', fAnc);
      toast.success('Ancillary creado');
      setFAnc({ code: '', name: '', type: 'baggage', description: '', base_price: '' });
      cargarBase();
    } catch (e) { toast.error(e.response && e.response.data ? e.response.data.error : 'Error'); }
  };
  const asignarFa = async () => {
    if (!fFa.flight_id || !fFa.ancillary_id || fFa.stock === '') return toast.error('Completa vuelo, ancillary y stock');
    try {
      await api.post('/comercial/ancillaries/vuelo', fFa);
      toast.success('Stock asignado al vuelo');
      const r = await api.get('/comercial/ancillaries/vuelo/' + fFa.flight_id);
      setFaVuelo(r.data.datos || []);
    } catch (e) { toast.error('Error'); }
  };
  const verFaVuelo = async (fid) => {
    setFFa(Object.assign({}, fFa, { flight_id: fid }));
    const r = await api.get('/comercial/ancillaries/vuelo/' + fid);
    setFaVuelo(r.data.datos || []);
  };
  const addRa = async () => {
    if (!fRa.reservation_id || !fRa.flight_id || !fRa.ancillary_id) return toast.error('Selecciona reserva, vuelo y servicio');
    try {
      const r = await api.post('/comercial/ancillaries/reserva', fRa);
      toast.success(r.data.mensaje + ': $' + Number(r.data.datos.total).toFixed(2));
      const rr = await api.get('/comercial/ancillaries/reserva/' + fRa.reservation_id);
      setRaReserva(rr.data.datos || []);
      cargarBase();
    } catch (e) { toast.error(e.response && e.response.data ? e.response.data.error : 'Error'); }
  };
  const verRaReserva = async (rid) => {
    setFRa(Object.assign({}, fRa, { reservation_id: rid }));
    const r = await api.get('/comercial/ancillaries/reserva/' + rid);
    setRaReserva(r.data.datos || []);
  };

  const tabs = [
    { id: 'kpi', label: 'KPIs', icon: FiActivity },
    { id: 'waitlist', label: 'Lista de Espera', icon: FiUsers },
    { id: 'ancillaries', label: 'Servicios Adicionales', icon: FiShoppingBag },
    { id: 'reportes', label: 'Reportes', icon: FiBarChart2 }
  ];
  const Bar = ({ value, max, color }) => (
    <div className="w-full bg-gray-100 rounded h-4 overflow-hidden">
      <div className={color} style={{ width: Math.min(100, (value / (max || 1)) * 100) + '%' }}></div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Gestión Comercial</h1>
        <p className="text-gray-500 mt-1">Lista de espera, servicios adicionales y reportes (Q15, Q32–Q36)</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button key={t.id} className={tab === t.id ? 'btn-primary flex items-center space-x-2' : 'btn-secondary flex items-center space-x-2'} onClick={() => { setTab(t.id); if (t.id === 'reportes') cargarReportes(); }}>
            <t.icon /><span>{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'kpi' && kpi && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-4"><div className="text-xs text-gray-500 uppercase">Vuelos hoy</div><div className="text-2xl font-bold mt-1">{kpi.vuelosHoy.programados + kpi.vuelosHoy.en_curso + kpi.vuelosHoy.completados}</div><div className="text-xs mt-2 text-gray-600">Prog {kpi.vuelosHoy.programados} · Curso {kpi.vuelosHoy.en_curso} · Compl {kpi.vuelosHoy.completados} · Canc {kpi.vuelosHoy.cancelados}</div></div>
          <div className="card p-4"><div className="text-xs text-gray-500 uppercase">Pax 24 h</div><div className="text-2xl font-bold mt-1">{kpi.pax24h}</div><div className="text-xs mt-2 text-gray-600">Ocupación hoy: {kpi.ocupacionHoy}%</div></div>
          <div className="card p-4"><div className="text-xs text-gray-500 uppercase">Ventas hoy</div><div className="text-2xl font-bold mt-1 text-green-700">${Number(kpi.ventasHoy).toFixed(2)}</div><div className="text-xs mt-2 text-gray-600">Waitlist activas: {kpi.waitlistActivas}</div></div>
          <div className="card p-4"><div className="text-xs text-gray-500 uppercase">Salud fiscal hoy</div><div className="text-2xl font-bold mt-1">{kpi.dtesHoy.emitidos}</div><div className="text-xs mt-2 text-gray-600">Rechazados {kpi.dtesHoy.rechazados} · Contingencia {kpi.dtesHoy.contingencia_pendiente}</div></div>
        </div>
      )}

      {tab === 'waitlist' && (
        <div className="space-y-4">
          <div className="card p-4 grid grid-cols-1 md:grid-cols-6 gap-3">
            <select className="input-field" value={fWl.flight_id} onChange={(e) => setFWl(Object.assign({}, fWl, { flight_id: e.target.value }))}>
              <option value="">-- Vuelo --</option>
              {vuelos.map((v) => <option key={v.id} value={v.id}>{v.flight_number}</option>)}
            </select>
            <input className="input-field" placeholder="Nombre pasajero" value={fWl.passenger_name} onChange={(e) => setFWl(Object.assign({}, fWl, { passenger_name: e.target.value }))} />
            <input className="input-field" placeholder="Email" value={fWl.passenger_email} onChange={(e) => setFWl(Object.assign({}, fWl, { passenger_email: e.target.value }))} />
            <input className="input-field" placeholder="Documento" value={fWl.passenger_doc} onChange={(e) => setFWl(Object.assign({}, fWl, { passenger_doc: e.target.value }))} />
            <select className="input-field" value={fWl.doc_type} onChange={(e) => setFWl(Object.assign({}, fWl, { doc_type: e.target.value }))}>
              <option value="DUI">DUI</option><option value="PASS">Pasaporte</option><option value="NIT">NIT</option>
            </select>
            <button className="btn-primary" onClick={addWl}>Agregar a waitlist</button>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b"><tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">#</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Vuelo</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Pasajero</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Documento</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Acciones</th>
              </tr></thead>
              <tbody className="divide-y">
                {waitlist.length === 0 ? <tr><td colSpan="6" className="px-4 py-3 text-sm text-gray-500">Sin pasajeros en lista de espera</td></tr> :
                waitlist.map((w) => (
                  <tr key={w.id}>
                    <td className="px-4 py-2 text-sm font-mono">{w.position}</td>
                    <td className="px-4 py-2 text-sm">{w.flight_number}</td>
                    <td className="px-4 py-2 text-sm">{w.passenger_name}</td>
                    <td className="px-4 py-2 text-sm">{w.doc_type} {w.passenger_doc}</td>
                    <td className="px-4 py-2 text-sm"><span className={'px-2 py-1 rounded text-xs ' + (w.status === 'waiting' ? 'bg-yellow-100 text-yellow-800' : w.status === 'notified' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600')}>{w.status}</span></td>
                    <td className="px-4 py-2 text-sm space-x-2">
                      {w.status === 'waiting' && <><button className="text-blue-600 hover:underline text-xs" onClick={() => setWl(w.id, 'notified')}>Notificar</button><button className="text-red-600 hover:underline text-xs" onClick={() => setWl(w.id, 'cancelled')}>Cancelar</button></>}
                      {w.status === 'notified' && <button className="text-green-600 hover:underline text-xs" onClick={() => setWl(w.id, 'confirmed')}>Confirmar</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'ancillaries' && (
        <div className="space-y-4">
          <div className="card p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
            <input className="input-field" placeholder="Código (BAG23)" value={fAnc.code} onChange={(e) => setFAnc(Object.assign({}, fAnc, { code: e.target.value }))} />
            <input className="input-field" placeholder="Nombre" value={fAnc.name} onChange={(e) => setFAnc(Object.assign({}, fAnc, { name: e.target.value }))} />
            <select className="input-field" value={fAnc.type} onChange={(e) => setFAnc(Object.assign({}, fAnc, { type: e.target.value }))}>
              <option value="baggage">Equipaje</option><option value="seat">Asiento</option><option value="meal">Comida</option><option value="priority">Prioridad</option><option value="other">Otro</option>
            </select>
            <input type="number" step="0.01" className="input-field" placeholder="Precio" value={fAnc.base_price} onChange={(e) => setFAnc(Object.assign({}, fAnc, { base_price: e.target.value }))} />
            <button className="btn-primary" onClick={crearAnc}>Crear ancillary</button>
          </div>
          <div className="card overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b text-sm font-semibold">Catálogo de servicios adicionales</div>
            <table className="w-full"><tbody className="divide-y">
              {ancillaries.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-2 text-sm font-mono">{a.code}</td>
                  <td className="px-4 py-2 text-sm">{a.name}</td>
                  <td className="px-4 py-2 text-sm"><span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">{a.type}</span></td>
                  <td className="px-4 py-2 text-sm font-semibold">${Number(a.base_price).toFixed(2)}</td>
                  <td className="px-4 py-2 text-xs text-gray-500">{a.description}</td>
                </tr>
              ))}
            </tbody></table>
          </div>
          <div className="card p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
            <select className="input-field" value={fFa.flight_id} onChange={(e) => verFaVuelo(e.target.value)}>
              <option value="">-- Vuelo --</option>
              {vuelos.map((v) => <option key={v.id} value={v.id}>{v.flight_number}</option>)}
            </select>
            <select className="input-field" value={fFa.ancillary_id} onChange={(e) => setFFa(Object.assign({}, fFa, { ancillary_id: e.target.value }))}>
              <option value="">-- Ancillary --</option>
              {ancillaries.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
            </select>
            <input type="number" className="input-field" placeholder="Stock" value={fFa.stock} onChange={(e) => setFFa(Object.assign({}, fFa, { stock: e.target.value }))} />
            <input type="number" step="0.01" className="input-field" placeholder="Precio override (opcional)" value={fFa.price_override} onChange={(e) => setFFa(Object.assign({}, fFa, { price_override: e.target.value }))} />
            <button className="btn-primary" onClick={asignarFa}>Asignar stock</button>
          </div>
          {fFa.flight_id && (
            <div className="card overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b text-sm font-semibold">Servicios disponibles en el vuelo</div>
              <table className="w-full"><tbody className="divide-y">
                {faVuelo.length === 0 ? <tr><td className="px-4 py-3 text-sm text-gray-500">Sin servicios configurados</td></tr> :
                faVuelo.map((f) => (
                  <tr key={f.id}>
                    <td className="px-4 py-2 text-sm">{f.code} - {f.name}</td>
                    <td className="px-4 py-2 text-sm font-semibold">${Number(f.precio_final).toFixed(2)}</td>
                    <td className="px-4 py-2 text-sm">Stock: {f.stock}</td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          )}
          <div className="card p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
            <select className="input-field" value={fRa.reservation_id} onChange={(e) => verRaReserva(e.target.value)}>
              <option value="">-- Reserva --</option>
              {reservas.map((r) => <option key={r.id} value={r.id}>PNR {r.pnr || r.id}</option>)}
            </select>
            <select className="input-field" value={fRa.flight_id} onChange={(e) => setFRa(Object.assign({}, fRa, { flight_id: e.target.value }))}>
              <option value="">-- Vuelo --</option>
              {vuelos.map((v) => <option key={v.id} value={v.id}>{v.flight_number}</option>)}
            </select>
            <select className="input-field md:col-span-2" value={fRa.ancillary_id} onChange={(e) => setFRa(Object.assign({}, fRa, { ancillary_id: e.target.value }))}>
              <option value="">-- Ancillary --</option>
              {ancillaries.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name} (${Number(a.base_price).toFixed(2)})</option>)}
            </select>
            <button className="btn-primary" onClick={addRa}>Agregar a reserva</button>
          </div>
          {fRa.reservation_id && raReserva.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b text-sm font-semibold">Servicios de la reserva</div>
              <table className="w-full"><tbody className="divide-y">
                {raReserva.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2 text-sm">{r.code} - {r.name}</td>
                    <td className="px-4 py-2 text-sm font-semibold">${Number(r.price).toFixed(2)}</td>
                    <td className="px-4 py-2 text-sm">{r.status}</td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          )}
        </div>
      )}

      {tab === 'reportes' && (
        <div className="space-y-4">
          <div className="card p-4 flex flex-wrap gap-3 items-end">
            <div><label className="text-xs text-gray-500">Desde</label><input type="date" className="input-field" value={desde} onChange={(e) => setDesde(e.target.value)} /></div>
            <div><label className="text-xs text-gray-500">Hasta</label><input type="date" className="input-field" value={hasta} onChange={(e) => setHasta(e.target.value)} /></div>
            <button className="btn-primary" onClick={cargarReportes}>Generar reportes</button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-4"><h3 className="font-semibold mb-3">Ocupación por ruta</h3>
              {repOcp.length === 0 ? <p className="text-sm text-gray-500">Sin datos</p> :
              <div className="space-y-2">{repOcp.map((r, i) => (
                <div key={i}><div className="flex justify-between text-xs mb-1"><span>{r.route_code}</span><span>{r.ocupacion_pct}% ({r.ocupados}/{r.capacidad_total})</span></div><Bar value={r.ocupacion_pct} max={100} color="bg-primary-500" /></div>
              ))}</div>}
            </div>
            <div className="card p-4"><h3 className="font-semibold mb-3">Ingresos por ancillary</h3>
              {repAnc.length === 0 ? <p className="text-sm text-gray-500">Sin datos</p> :
              <div className="space-y-2">{repAnc.map((r, i) => { const max = Math.max.apply(null, repAnc.map((x) => x.ingresos)); return (
                <div key={i}><div className="flex justify-between text-xs mb-1"><span>{r.name}</span><span>${Number(r.ingresos).toFixed(2)} ({r.vendidos})</span></div><Bar value={r.ingresos} max={max} color="bg-green-500" /></div>
              ); })}</div>}
            </div>
            <div className="card p-4"><h3 className="font-semibold mb-3">Rendimiento por canal</h3>
              {repCan.length === 0 ? <p className="text-sm text-gray-500">Sin datos</p> :
              <table className="w-full text-sm"><tbody className="divide-y">
                {repCan.map((r, i) => (<tr key={i}><td className="py-2 capitalize">{r.canal}</td><td className="py-2">{r.reservas} reservas</td><td className="py-2 font-semibold">${Number(r.ingresos).toFixed(2)}</td></tr>))}
              </tbody></table>}
            </div>
            <div className="card p-4"><h3 className="font-semibold mb-3">Conciliación fiscal (pagos vs DTE)</h3>
              {repConc.length === 0 ? <p className="text-sm text-gray-500">Sin datos</p> :
              <table className="w-full text-sm"><thead><tr className="text-xs text-gray-500 border-b"><th className="py-1 text-left">Fecha</th><th className="text-right">Pagos</th><th className="text-right">DTEs</th><th className="text-right">Dif.</th></tr></thead><tbody className="divide-y">
                {repConc.slice(0, 10).map((r, i) => (<tr key={i}><td className="py-1">{r.fecha}</td><td className="py-1 text-right">${Number(r.pagos).toFixed(2)}</td><td className="py-1 text-right">${Number(r.facturado).toFixed(2)}</td><td className={'py-1 text-right font-semibold ' + (Math.abs(r.diferencia) > 0.01 ? 'text-red-600' : 'text-green-600')}>${Number(r.diferencia).toFixed(2)}</td></tr>))}
              </tbody></table>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Comercial;