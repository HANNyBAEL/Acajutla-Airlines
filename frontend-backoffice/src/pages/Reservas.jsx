import { useEffect, useState } from 'react';
import { reservasAPI } from '../services/api';
import { FiSearch, FiEye } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Reservas = () => {
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    reservasAPI.listar()
      .then((r) => setReservas(r.data.datos || []))
      .catch(() => toast.error('No se pudo conectar con el backend'))
      .finally(() => setCargando(false));
  }, []);

  const badge = (e) => ({
    pending: 'bg-yellow-100 text-yellow-700', confirmed: 'bg-blue-100 text-blue-700',
    paid: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700',
    completed: 'bg-gray-100 text-gray-700',
  }[e] || 'bg-gray-100 text-gray-700');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Gestión de Reservas</h1>
        <p className="text-gray-500 mt-1">Reservas y PNRs</p>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">PNR</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Pasajero</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Total</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cargando ? (
              <tr><td colSpan="5" className="text-center py-8 text-gray-500">Cargando reservas...</td></tr>
            ) : reservas.length === 0 ? (
              <tr><td colSpan="5" className="text-center py-8 text-gray-500">No hay reservas</td></tr>
            ) : reservas.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-mono font-bold text-primary-700">{r.pnr}</td>
                <td className="px-6 py-4 text-sm">{r.customer_first_names} {r.customer_last_names}</td>
                <td className="px-6 py-4 text-sm font-semibold">${r.estimated_total}</td>
                <td className="px-6 py-4"><span className={'px-3 py-1 rounded-full text-xs font-medium ' + badge(r.status)}>{r.status}</span></td>
                <td className="px-6 py-4"><button className="text-primary-600 hover:text-primary-800"><FiEye size={18} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default Reservas;