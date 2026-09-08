import { useEffect, useState } from 'react';
import api from '../services/api';
import { FiMail, FiRefreshCw, FiSend } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Correos = () => {
  const [correos, setCorreos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('');

  const cargar = () => {
    api.get('/correos')
      .then((r) => setCorreos(r.data.datos || []))
      .catch(() => toast.error('Error al cargar bandeja'))
      .finally(() => setCargando(false));
  };
  useEffect(() => { cargar(); }, []);

  const reenviar = async (id) => {
    try {
      const r = await api.post('/correos/' + id + '/reenviar', {});
      if (r.data.datos.enviado) toast.success(r.data.datos.simulado ? 'Reenvío simulado (sin BREVO_API_KEY)' : 'Correo reenviado');
      else toast.error(r.data.datos.motivo || 'No se pudo reenviar');
      cargar();
    } catch (e) { toast.error('Error al reenviar'); }
  };

  const badge = (s) => ({
    sent: ['Enviado', 'bg-green-100 text-green-700'],
    simulado: ['Simulado', 'bg-blue-100 text-blue-700'],
    pending: ['Pendiente', 'bg-yellow-100 text-yellow-700'],
    failed: ['Fallido', 'bg-red-100 text-red-700'],
  }[s] || [s, 'bg-gray-100 text-gray-700']);

  const lista = correos.filter((c) => JSON.stringify(c).toLowerCase().includes(filtro.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Correos Transaccionales</h1>
          <p className="text-gray-500 mt-1">Bandeja de salida (Brevo). Sin API key opera en modo simulado.</p>
        </div>
        <button className="btn-secondary flex items-center space-x-2" onClick={cargar}>
          <FiRefreshCw /><span>Actualizar</span>
        </button>
      </div>

      <div className="card p-4">
        <input className="input-field" placeholder="Filtrar por destinatario, asunto, plantilla, estado..." value={filtro} onChange={(e) => setFiltro(e.target.value)} />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fecha</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Plantilla</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Para</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Asunto</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ref</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cargando ? (
              <tr><td colSpan="7" className="text-center py-8 text-gray-500">Cargando...</td></tr>
            ) : lista.length === 0 ? (
              <tr><td colSpan="7" className="text-center py-8 text-gray-500">Sin correos en bandeja</td></tr>
            ) : lista.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-600">{new Date(c.created_at).toLocaleString('es-SV')}</td>
                <td className="px-6 py-4 text-sm">{c.template}</td>
                <td className="px-6 py-4 text-sm">{c.to_email}</td>
                <td className="px-6 py-4 text-sm">{c.subject}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{c.ref_type || '-'} {c.ref_id || ''}</td>
                <td className="px-6 py-4"><span className={'px-3 py-1 rounded-full text-xs font-medium ' + badge(c.status)[1]}>{badge(c.status)[0]}</span></td>
                <td className="px-6 py-4">
                  <button onClick={() => reenviar(c.id)} className="text-primary-600 hover:text-primary-800 flex items-center space-x-1">
                    <FiSend size={15} /><span className="text-sm">Reenviar</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card p-4 flex items-start space-x-3 bg-blue-50 border-blue-200">
        <FiMail className="text-blue-600 mt-1" />
        <p className="text-sm text-blue-800">
          Para envío real configura en <code>backend/.env</code>: <code>BREVO_API_KEY=tu_llave</code> (y opcional <code>BREVO_SENDER_EMAIL</code>).
          Sin clave, los correos se marcan como <strong>Simulado</strong> y quedan visibles aquí para demo y auditoría.
        </p>
      </div>
    </div>
  );
};
export default Correos;