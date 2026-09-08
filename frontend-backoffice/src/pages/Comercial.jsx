import { useEffect, useState } from 'react';
import api from '../services/api';
import { FiShoppingBag, FiPlus, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Comercial = () => {
  const [tab, setTab] = useState('reserva');
  const [reservas, setReservas] = useState([]);
  const [reservaSel, setReservaSel] = useState('');
  const [serviciosRes, setServiciosRes] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [formServ, setFormServ] = useState({ service_id: '', quantity: 1 });
  const [nuevoServ, setNuevoServ] = useState({ code: '', name: '', description: '', price: '', tipo: 'baggage' });
  const [vuelos, setVuelos] = useState([]);
  const [vueloSel, setVueloSel] = useState('');
  const [waitlist, setWaitlist] = useState([]);
  const [nuevoWl, setNuevoWl] = useState({ passenger_name: '', contact: '', notes: '' });

  const cargarBase = () => {
    api.get('/reservas').then((r) => setReservas(r.data.datos || [])).catch(() => {});
    api.get('/comercial/servicios').then((r) => setCatalogo(r.data.datos || [])).catch(() => {});
    api.get('/vuelos').then((r) => setVuelos(r.data.datos || [])).catch(() => {});
  };
  useEffect(() => { cargarBase(); }, []);

  const cargarServiciosReserva = (id) => {
    setReservaSel(id);
    if (!id) { setServiciosRes([]); return; }
    api.get('/comercial/reservas/' + id + '/servicios').then((r) => setServiciosRes(r.data.datos || [])).catch(() => toast.error('Error al cargar servicios'));
  };

  const agregarServicio = async () => {
    if (!reservaSel || !formServ.service_id) return toast.error('Selecciona reserva y servicio');
    try {
      await api.post('/comercial/reservas/' + reservaSel + '/servicios', { service_id: Number(formServ.service_id), quantity: Number(formServ.quantity || 1) });
      toast.success('Servicio agregado y sumado al total');
      cargarServiciosReserva(reservaSel);
    } catch (e) { toast.error(e.response && e.response.data ? e.response.data.error : 'Error'); }
  };

  const crearServicioCat = async () => {
    if (!nuevoServ.code || !nuevoServ.name || !nuevoServ.price) return toast.error('Código, nombre y precio obligatorios');
    try {
      await api.post('/comercial/servicios', { code: nuevoServ.code, name: nuevoServ.name, description: nuevoServ.description, price: Number(nuevoServ.price), tipo: nuevoServ.tipo });
      toast.success('Servicio creado');
      setNuevoServ({ code: '', name: '', description: '', price: '', tipo: 'baggage' });
      cargarBase();
    } catch (e) { toast.error(e.response && e.response.data ? e.response.data.error : 'Error'); }
  };

  const cargarWaitlist = (fid) => {
    setVueloSel(fid);
    const params = fid ? { flight_id: fid } : {};
    api.get('/comercial/waitlist', { params }).then((r) => setWaitlist(r.data.datos || [])).catch(() => {});
  };

  const agregarWl = async () => {
    if (!vueloSel) return toast.error('Selecciona un vuelo');
    try {
      await api.post('/comercial/waitlist', { flight_id: Number(vueloSel), passenger_name: nuevoWl.passenger_name, contact: nuevoWl.contact, notes: nuevoWl.notes });
      toast.success('Agregado a lista de espera');
      setNuevoWl({ passenger_name: '', contact: '', notes: '' });
      cargarWaitlist(vueloSel);
    } catch (e) { toast.error('Error'); }
  };

  const cambiarWl = async (id, status) => {
    try {
      await api.patch('/comercial/waitlist/' + id, { status });
      toast.success('Estado actualizado');
      cargarWaitlist(vueloSel);
    } catch (e) { toast.error('Error'); }
  };

  const reservaAct = reservas.find((r) => String(r.id) === String(reservaSel));
  const badgeWl = (s) => ({ waiting: ['En espera', 'bg-yellow-100 text-yellow-700'], offered: ['Ofrecido', 'bg-blue-100 text-blue-700'], confirmed: ['Confirmado', 'bg-green-100 text-green-700'], expired: ['Expirado', 'bg-gray-100 text-gray-600'] }[s] || [s, 'bg-gray-100 text-gray-600']);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Comercial: Ancillaries y Lista de Espera</h1>
          <p className="text-gray-500 mt-1">Servicios adicionales con costo y waitlist por vuelo (Encuesta Q15, Q32-Q36)</p>
        </div>
        <FiShoppingBag className="text-primary-600" size={28} />
      </div>

      <div className="flex space-x-2">
        <button className={tab === 'reserva' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('reserva')}>Servicios por reserva</button>
        <button className={tab === 'catalogo' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('catalogo')}>Catálogo</button>
        <button className={tab === 'waitlist' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('waitlist')}>Lista de espera</button>
      </div>

      {tab === 'reserva' && (
        <div className="card p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select className="input-field" value={reservaSel} onChange={(e) => cargarServiciosReserva(e.target.value)}>
              <option value="">-- Selecciona reserva --</option>
              {reservas.map((r) => <option key={r.id} value={r.id}>{r.pnr} · {r.status} · ${Number(r.estimated_total).toFixed(2)}</option>)}
            </select>
            <select className="input-field" value={formServ.service_id} onChange={(e) => setFormServ(Object.assign({}, formServ, { service_id: e.target.value }))}>
              <option value="">-- Servicio --</option>
              {catalogo.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name} (${Number(s.price).toFixed(2)})</option>)}
            </select>
            <div className="flex space-x-2">
              <input type="number" min="1" className="input-field" value={formServ.quantity} onChange={(e) => setFormServ(Object.assign({}, formServ, { quantity: e.target.value }))} />
              <button className="btn-primary whitespace-nowrap" onClick={agregarServicio}><FiPlus /> Agregar</button>
            </div>
          </div>
          {reservaAct && (
            <p className="text-sm text-gray-600">Total actual de la reserva: <strong>${Number(reservaAct.estimated_total).toFixed(2)}</strong> (incluye ancillaries agregados)</p>
          )}
          <table className="w-full">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Servicio</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Tipo</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Cant.</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">P. Unit.</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Total</th>
            </tr></thead>
            <tbody className="divide-y">
              {serviciosRes.length === 0 ? <tr><td colSpan="5" className="text-center py-6 text-gray-500">Sin servicios agregados</td></tr> :
                serviciosRes.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2 text-sm">{s.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{s.tipo}</td>
                    <td className="px-4 py-2 text-sm">{s.quantity}</td>
                    <td className="px-4 py-2 text-sm">${Number(s.unit_price).toFixed(2)}</td>
                    <td className="px-4 py-2 text-sm font-semibold">${Number(s.total).toFixed(2)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'catalogo' && (
        <div className="card p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input className="input-field" placeholder="Código" value={nuevoServ.code} onChange={(e) => setNuevoServ(Object.assign({}, nuevoServ, { code: e.target.value }))} />
            <input className="input-field" placeholder="Nombre" value={nuevoServ.name} onChange={(e) => setNuevoServ(Object.assign({}, nuevoServ, { name: e.target.value }))} />
            <input type="number" step="0.01" className="input-field" placeholder="Precio" value={nuevoServ.price} onChange={(e) => setNuevoServ(Object.assign({}, nuevoServ, { price: e.target.value }))} />
            <select className="input-field" value={nuevoServ.tipo} onChange={(e) => setNuevoServ(Object.assign({}, nuevoServ, { tipo: e.target.value }))}>
              <option value="baggage">Equipaje</option><option value="priority">Abordaje prioritario</option>
              <option value="seat">Asiento</option><option value="meal">Comida</option><option value="other">Otro</option>
            </select>
            <button className="btn-primary" onClick={crearServicioCat}><FiPlus /> Crear</button>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Código</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Nombre</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Tipo</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Precio</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Activo</th>
            </tr></thead>
            <tbody className="divide-y">
              {catalogo.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-2 text-sm font-mono">{s.code}</td>
                  <td className="px-4 py-2 text-sm">{s.name}</td>
                  <td className="px-4 py-2 text-sm text-gray-500">{s.tipo}</td>
                  <td className="px-4 py-2 text-sm">${Number(s.price).toFixed(2)}</td>
                  <td className="px-4 py-2 text-sm">{s.active ? 'Sí' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'waitlist' && (
        <div className="card p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select className="input-field" value={vueloSel} onChange={(e) => cargarWaitlist(e.target.value)}>
              <option value="">-- Todos los vuelos --</option>
              {vuelos.map((v) => <option key={v.id} value={v.id}>{v.flight_number} · {v.origin}→{v.destination}</option>)}
            </select>
            <input className="input-field" placeholder="Nombre pasajero" value={nuevoWl.passenger_name} onChange={(e) => setNuevoWl(Object.assign({}, nuevoWl, { passenger_name: e.target.value }))} />
            <input className="input-field" placeholder="Contacto (tel/correo)" value={nuevoWl.contact} onChange={(e) => setNuevoWl(Object.assign({}, nuevoWl, { contact: e.target.value }))} />
            <button className="btn-primary" onClick={agregarWl}><FiPlus /> Agregar a waitlist</button>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Vuelo</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Pasajero</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Contacto</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Acciones</th>
            </tr></thead>
            <tbody className="divide-y">
              {waitlist.length === 0 ? <tr><td colSpan="5" className="text-center py-6 text-gray-500">Sin registros</td></tr> :
                waitlist.map((w) => (
                  <tr key={w.id}>
                    <td className="px-4 py-2 text-sm">{w.flight_number}</td>
                    <td className="px-4 py-2 text-sm">{w.passenger_name || '-'}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{w.contact || '-'}</td>
                    <td className="px-4 py-2"><span className={'px-2 py-1 rounded-full text-xs font-medium ' + badgeWl(w.status)[1]}>{badgeWl(w.status)[0]}</span></td>
                    <td className="px-4 py-2">
                      <div className="flex space-x-2">
                        {w.status === 'waiting' && <button className="text-blue-600 text-sm" onClick={() => cambiarWl(w.id, 'offered')}>Ofrecer</button>}
                        {w.status === 'offered' && <button className="text-green-600 text-sm" onClick={() => cambiarWl(w.id, 'confirmed')}>Confirmar</button>}
                        {(w.status === 'waiting' || w.status === 'offered') && <button className="text-gray-500 text-sm" onClick={() => cambiarWl(w.id, 'expired')}>Expirar</button>}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
export default Comercial;