import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { FiSearch, FiX, FiXCircle, FiUser, FiCalendar, FiDollarSign, FiFileText, FiSend } from 'react-icons/fi';
import toast from 'react-hot-toast';

const ESTADOS = {
  pending: ['Pendiente', 'bg-yellow-100 text-yellow-700'],
  confirmed: ['Confirmada', 'bg-blue-100 text-blue-700'],
  paid: ['Pagada', 'bg-green-100 text-green-700'],
  cancelled: ['Cancelada', 'bg-red-100 text-red-700'],
  completed: ['Finalizada', 'bg-gray-100 text-gray-700']
};

const Reservas = () => {
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [detalle, setDetalle] = useState(null);
  const [reservaSeleccionada, setReservaSeleccionada] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [cancelando, setCancelando] = useState(false);

  const cargar = () => {
    setCargando(true);
    api.get('/reservas')
      .then((r) => setReservas(r.data.datos || []))
      .catch(() => toast.error('Error al cargar reservas'))
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargar(); }, []);

  const nombreDe = (r) =>
    ((r?.first_names || r?.customer_first || r?.nombres || '') + ' ' + (r?.last_names || r?.customer_last || r?.apellidos || '')).trim();
  const docDe = (r) => r?.document_number || r?.customer_doc || r?.documento || '';

  const filtradas = useMemo(() => {
    const q = texto.trim().toLowerCase();
    return reservas.filter((r) => {
      if (estado && r.status !== estado) return false;
      if (desde && new Date(r.created_at) < new Date(desde + 'T00:00:00')) return false;
      if (hasta && new Date(r.created_at) > new Date(hasta + 'T23:59:59')) return false;
      if (!q) return true;
      return JSON.stringify(r).toLowerCase().includes(q);
    });
  }, [reservas, texto, estado, desde, hasta]);

  const limpiar = () => { setTexto(''); setEstado(''); setDesde(''); setHasta(''); };

  const verDetalle = async (r) => {
    setReservaSeleccionada(r);
    setDetalle(null);
    setCargandoDetalle(true);
    try {
      const res = await api.get('/reservas/' + r.pnr);
      setDetalle(res.data.datos || res.data);
    } catch (e) {
      toast.error('Error al consultar la reserva');
    } finally {
      setCargandoDetalle(false);
    }
  };

  const cerrarDrawer = () => {
    setReservaSeleccionada(null);
    setDetalle(null);
  };

  const reservaDetalle = detalle ? (detalle.reserva || detalle) : reservaSeleccionada;
  const pnrDetalle = reservaDetalle ? reservaDetalle.pnr : '';
  const statusDetalle = reservaDetalle ? reservaDetalle.status : '';
  const pasajeros = detalle ? (detalle.pasajeros || detalle.passengers || []) : [];
  const segmentos = detalle ? (detalle.segmentos || detalle.segments || detalle.flight_segments || []) : [];

  const cancelar = async () => {
    const motivo = window.prompt('Motivo de cancelación de la reserva ' + pnrDetalle + ':');
    if (!motivo) return;
    setCancelando(true);
    try {
      await api.post('/reservas/' + pnrDetalle + '/cancelar', { motivo: motivo });
      toast.success('Reserva cancelada');
      cerrarDrawer();
      cargar();
    } catch (e) {
      toast.error(e.response && e.response.data ? e.response.data.error : 'Error al cancelar');
    } finally { setCancelando(false); }
  };

  const badge = (s) => (ESTADOS[s] || [s || 'Desconocido', 'bg-gray-100 text-gray-700']);

  const InfoFila = ({ icon: Icon, label, value }) => (
    <div className="flex items-center py-2 text-sm border-b border-gray-100 last:border-b-0">
      <Icon className="text-primary-600 mr-3 shrink-0" size={16} />
      <span className="font-medium text-gray-600 w-32 shrink-0">{label}:</span>
      <span className="text-gray-800 font-medium truncate">{value || '—'}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Reservas</h1>
        <p className="text-gray-500 mt-1">Búsqueda escrita por PNR, nombre, documento, correo o cualquier dato</p>
      </div>

      <div className="card p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input-field pl-10"
              placeholder="Escribe PNR, nombre, apellido, documento o correo..."
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
          </div>
          <select className="input-field" value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="pending">Pendiente</option>
            <option value="confirmed">Confirmada</option>
            <option value="paid">Pagada</option>
            <option value="cancelled">Cancelada</option>
            <option value="completed">Finalizada</option>
          </select>
          <div className="flex space-x-2">
            <input type="date" className="input-field" value={desde} onChange={(e) => setDesde(e.target.value)} />
            <input type="date" className="input-field" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Mostrando {filtradas.length} de {reservas.length} reservas</p>
          <button className="btn-secondary flex items-center space-x-2" onClick={limpiar}>
            <FiX /><span>Limpiar filtros</span>
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">PNR</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Cliente</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Documento</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Creada</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Total</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cargando ? (
              <tr><td colSpan="6" className="text-center py-8 text-gray-500">Cargando...</td></tr>
            ) : filtradas.length === 0 ? (
              <tr><td colSpan="6" className="text-center py-8 text-gray-500">No se encontraron reservas con esos criterios</td></tr>
            ) : filtradas.map((r) => (
              <tr
                key={r.id}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => verDetalle(r)}
              >
                <td className="px-6 py-4 font-mono font-bold text-primary-700">{r.pnr}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-800">{nombreDe(r) || '—'}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{docDe(r) || '—'}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{r.created_at ? new Date(r.created_at).toLocaleDateString('es-SV') : '—'}</td>
                <td className="px-6 py-4 text-sm font-semibold text-gray-800">${Number(r.estimated_total || 0).toFixed(2)}</td>
                <td className="px-6 py-4">
                  <span className={'px-3 py-1 rounded-full text-xs font-medium ' + badge(r.status)[1]}>{badge(r.status)[0]}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-500">Haz clic en cualquier fila para ver el detalle completo de la reserva</p>
        </div>
      </div>

      {/* Drawer lateral para detalle de reserva */}
      {reservaSeleccionada && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-40 z-40" onClick={cerrarDrawer}></div>
          <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col">
            {/* Header del drawer */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center space-x-3">
                <div className="bg-primary-600 text-white rounded-xl w-11 h-11 flex items-center justify-center font-mono font-bold text-lg shadow-sm">
                  {pnrDetalle ? pnrDetalle.slice(0, 2) : 'RS'}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-xl font-bold font-mono text-gray-800">{pnrDetalle}</h3>
                    <span className={'px-2.5 py-0.5 rounded-full text-xs font-medium ' + badge(statusDetalle)[1]}>
                      {badge(statusDetalle)[0]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">Detalle de la reservación</p>
                </div>
              </div>
              <button onClick={cerrarDrawer} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <FiX size={22} />
              </button>
            </div>

            {/* Contenido del drawer */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {cargandoDetalle ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  <p className="text-sm text-gray-500">Cargando información de la reserva...</p>
                </div>
              ) : (
                <>
                  {/* Información General */}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-1">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Información General</h4>
                    <InfoFila icon={FiUser} label="Cliente" value={nombreDe(reservaDetalle)} />
                    <InfoFila icon={FiFileText} label="Documento" value={docDe(reservaDetalle)} />
                    <InfoFila
                      icon={FiDollarSign}
                      label="Total"
                      value={reservaDetalle?.estimated_total ? `$${Number(reservaDetalle.estimated_total).toFixed(2)} USD` : '—'}
                    />
                    <InfoFila
                      icon={FiCalendar}
                      label="Fecha de creación"
                      value={reservaDetalle?.created_at ? new Date(reservaDetalle.created_at).toLocaleString('es-SV') : '—'}
                    />
                  </div>

                  {/* Pasajeros */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Pasajeros ({pasajeros.length})
                    </h4>
                    {pasajeros.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">No hay pasajeros registrados</p>
                    ) : (
                      <div className="space-y-2">
                        {pasajeros.map((p, i) => (
                          <div key={i} className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-sm text-gray-800">{p.first_names} {p.last_names}</p>
                              <p className="text-xs text-gray-500">{p.document_type || 'Doc'}: {p.document_number}</p>
                            </div>
                            <span className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 text-xs font-medium uppercase">
                              {p.passenger_type || 'Adulto'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Segmentos de Vuelo */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Vuelos / Segmentos ({segmentos.length})
                    </h4>
                    {segmentos.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">No hay segmentos registrados</p>
                    ) : (
                      <div className="space-y-2">
                        {segmentos.map((s, i) => (
                          <div key={i} className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-primary-700 text-sm">
                                {s.flight_number || ('Vuelo #' + (s.flight_id || ''))}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-medium">
                                Clase: {s.fare_class || 'General'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-600">
                              <span>Asiento: <strong className="text-gray-800">{s.seat || 'Sin asignar'}</strong></span>
                              {s.departure_datetime && (
                                <span>{new Date(s.departure_datetime).toLocaleDateString('es-SV')}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer del drawer */}
            <div className="px-6 pt-5 pb-10 border-t border-gray-200 bg-gray-50 flex items-center justify-between space-x-3">
              <div>
                {statusDetalle !== 'cancelled' && (
                  <button
                    className="btn-danger flex items-center space-x-2"
                    onClick={cancelar}
                    disabled={cancelando}
                  >
                    <FiXCircle />
                    <span>{cancelando ? 'Cancelando...' : 'Cancelar reserva'}</span>
                  </button>
                )}
              </div>
              <button className="btn-secondary" onClick={cerrarDrawer}>
                Cerrar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Reservas;
