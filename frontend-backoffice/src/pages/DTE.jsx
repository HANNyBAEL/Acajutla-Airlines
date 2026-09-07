import { useEffect, useState } from 'react';
import { dteAPI } from '../services/api';
import { FiCheckCircle, FiXCircle, FiClock, FiFileText } from 'react-icons/fi';
import toast from 'react-hot-toast';

const DTE = () => {
  const [dtes, setDtes] = useState([]);

  useEffect(() => {
    dteAPI.listar()
      .then((r) => setDtes(r.data.datos || []))
      .catch(() => toast.error('No se pudo conectar con el backend'));
  }, []);

  const badge = (e) => ({
    accepted: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700',
    transmitted: 'bg-blue-100 text-blue-700', contingency: 'bg-yellow-100 text-yellow-700',
    invalidated: 'bg-gray-500 text-white', draft: 'bg-gray-100 text-gray-700',
  }[e] || 'bg-gray-100 text-gray-700');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Facturación Electrónica (DTE)</h1>
        <p className="text-gray-500 mt-1">Documentos tributarios según normativa MH</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4 border-l-4 border-green-500 flex items-center space-x-3">
          <FiCheckCircle className="text-green-500" size={24} />
          <div><p className="text-sm text-gray-500">Aceptados</p><p className="text-2xl font-bold text-green-700">{dtes.filter((d) => d.transmission_status === 'accepted').length}</p></div>
        </div>
        <div className="card p-4 border-l-4 border-red-500 flex items-center space-x-3">
          <FiXCircle className="text-red-500" size={24} />
          <div><p className="text-sm text-gray-500">Rechazados</p><p className="text-2xl font-bold text-red-700">{dtes.filter((d) => d.transmission_status === 'rejected').length}</p></div>
        </div>
        <div className="card p-4 border-l-4 border-yellow-500 flex items-center space-x-3">
          <FiClock className="text-yellow-500" size={24} />
          <div><p className="text-sm text-gray-500">Total</p><p className="text-2xl font-bold text-gray-800">{dtes.length}</p></div>
        </div>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">N° Control</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tipo</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Receptor</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Total</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {dtes.length === 0 ? (
              <tr><td colSpan="5" className="text-center py-8 text-gray-500"><FiFileText className="inline mr-2" />Aún no hay DTEs emitidos</td></tr>
            ) : dtes.map((d) => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-6 py-4"><code className="text-xs font-mono text-gray-700">{d.control_number}</code></td>
                <td className="px-6 py-4"><span className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-xs font-medium">{d.dte_type}</span></td>
                <td className="px-6 py-4 text-sm">{d.receiver_name}</td>
                <td className="px-6 py-4 text-sm font-semibold">${d.total_to_pay}</td>
                <td className="px-6 py-4"><span className={'px-3 py-1 rounded-full text-xs font-medium ' + badge(d.transmission_status)}>{d.transmission_status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default DTE;