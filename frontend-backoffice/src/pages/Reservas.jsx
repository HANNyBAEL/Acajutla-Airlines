import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { FiSearch, FiX, FiEye, FiXCircle } from 'react-icons/fi';
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
    ((r.first_names || r.customer_first || r.nombres || '') + ' ' + (r.last_names || r.customer_last || r.apellidos || '')).trim();
  const docDe = (r) => r.document_number || r.customer_doc || r.documento || '';

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
    try {
      const res = await api.get('/reservas/' + r.pnr);
      setDetalle(res.data.datos || res.data);
    } catch (e) {
      toast.error('Error al consultar la reserva');
    }
  };

  const pnrDetalle = detalle ? (detalle.pnr || (detalle.reserva ? detalle.reserva.pnr : '')) : '';
  const pasajeros = detalle ? (detalle.pasajeros || []) : [];
  const segmentos = detalle ? (detalle.segmentos || detalle.flight_segments || []) : [];

  const cancelar = async () => {
    const motivo = window.prompt('Motivo de cancelación de la reserva ' + pnrDetalle + ':');
    if (!motivo) return;
    setCancelando(true);
    try {
      await api.post('/reservas/' + pnrDetalle + '/cancelar', { motivo: motivo });
      toast.success('Reserva cancelada');
      setDetalle(null);
      cargar();
    } catch (e) {
      toast.error(e.response && e.response.data ? e.response.data.error : 'Error al cancelar');
    } finally { setCancelando(false); }
  };

  const badge = (s) => (ESTADOS[s] || [s, 'bg-gray-100 text-gray-700']);

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
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cargando ? (
              <tr><td colSpan="7" className="text-center py-8 text-gray-500">Cargando...</td></tr>
            ) : filtradas.length === 0 ? (
              <tr><td colSpan="7" className="text-center py-8 text-gray-500">No se encontraron reservas con esos criterios</td></tr>
            ) : filtradas.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-mono font-bold text-primary-700">{r.pnr}</td>
                <td className="px-6 py-4 text-sm">{nombreDe(r) || '—'}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{docDe(r) || '—'}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{r.created_at ? new Date(r.created_at).toLocaleDateString('es-SV') : '—'}</td>
                <td className="px-6 py-4 text-sm font-semibold">${Number(r.estimated_total || 0).toFixed(2)}</td>
                <td className="px-6 py-4">
                  <span className={'px-3 py-1 rounded-full text-xs font-medium ' + badge(r.status)[1]}>{badge(r.status)[0]}</span>
                </td>
                <td className="px-6 py-4">
                  <button className="text-primary-600 hover:text-primary-800 flex items-center space-x-1" onClick={() => verDetalle(r)}>
                    <FiEye size={16} /><span className="text-sm">Ver</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detalle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Reserva {pnrDetalle}</h2>
              <button onClick={() => setDetalle(null)} className="text-gray-500"><FiX size={22} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Pasajeros</h3>
                {pasajeros.length === 0 ? (
                  <p className="text-sm text-gray-500">Sin pasajeros</p>
                ) : (
                  <ul className="space-y-1">
                    {pasajeros.map((p, i) => (
                      <li key={i} className="text-sm text-gray-700">
                        {p.first_names} {p.last_names} · {p.document_type} {p.document_number} · {p.passenger_type}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Vuelos</h3>
                {segmentos.length === 0 ? (
                  <p className="text-sm text-gray-500">Sin segmentos</p>
                ) : (
                  <ul className="space-y-1">
                    {segmentos.map((s, i) => (
                      <li key={i} className="text-sm text-gray-700">
                        {s.flight_number || ('Vuelo ' + (s.flight_id || ''))} · Asiento {s.seat || '—'} · {s.fare_class}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button className="btn-secondary" onClick={() => setDetalle(null)}>Cerrar</button>
              <button className="btn-danger flex items-center space-x-2" onClick={cancelar} disabled={cancelando}>
                <FiXCircle /><span>{cancelando ? 'Cancelando...' : 'Cancelar reserva'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reservas;