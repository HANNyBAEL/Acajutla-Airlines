import { useEffect, useState } from 'react';
import api, { dteAPI, reservasAPI } from '../services/api';
import { FiFileText, FiCheckCircle, FiXCircle, FiClock, FiPlus, FiEye, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';

const DTE = () => {
  const [dtes, setDtes] = useState([]);
  const [facturables, setFacturables] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState(false);
  const [emitiendo, setEmitiendo] = useState(false);
  const [form, setForm] = useState({ reservation_id: '', tipo_dte: '01', nit: '', nrc: '' });
  const [filtroRes, setFiltroRes] = useState('');
  const [visor, setVisor] = useState(null);

  const cargar = () => {
    Promise.all([dteAPI.listar(), reservasAPI.listar({ status: 'paid' })])
      .then((res) => {
        setDtes(res[0].data.datos || []);
        setFacturables(res[1].data.datos || []);
      })
      .catch(() => toast.error('Error al cargar DTEs'))
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargar(); }, []);

  const emitir = async () => {
    if (!form.reservation_id) return toast.error('Seleccione una reserva pagada');
    setEmitiendo(true);
    try {
      const payload = { reservation_id: Number(form.reservation_id), tipo_dte: form.tipo_dte };
      if (form.tipo_dte === '03') payload.receptor = { nit: form.nit, nrc: form.nrc || null };
      const r = await dteAPI.emitir(payload);
      if (r.data.datos.estado === 'accepted') { toast.success('DTE emitido. Sello: ' + r.data.datos.sello); api.post('/correos/dte', { uuid: r.data.datos.uuid }).catch(() => {}); } else { toast.error('MH rechazó el DTE: ' + (r.data.datos.errores || []).join(', ')); }
      setModal(false);
      cargar();
    } catch (e) {
      toast.error(e.response && e.response.data && e.response.data.error ? e.response.data.error : 'Error al emitir');
    } finally { setEmitiendo(false); }
  };

  const verPdf = async (uuid) => {
    try {
      const r = await api.get('/dte/' + uuid + '/pdf', { responseType: 'blob' });
      const url = URL.createObjectURL(r.data);
      window.open(url, '_blank');
    } catch (e) { toast.error('Error al generar el PDF'); }
  };
  const verJson = async (uuid) => {
    try {
      const r = await api.get('/dte/' + uuid + '/json');
      setVisor(r.data.datos);
    } catch (e) { toast.error('Error al cargar el JSON'); }
  };

  const badge = (s) => ({
    accepted: ['Aceptado', 'bg-green-100 text-green-700'],
    rejected: ['Rechazado', 'bg-red-100 text-red-700'],
    transmitted: ['Transmitido', 'bg-blue-100 text-blue-700'],
    contingency: ['Contingencia', 'bg-orange-100 text-orange-700'],
    invalidated: ['Invalidado', 'bg-gray-100 text-gray-700'],
  }[s] || [s, 'bg-gray-100 text-gray-700']);

  const aceptados = dtes.filter((d) => d.transmission_status === 'accepted').length;
  const rechazados = dtes.filter((d) => d.transmission_status === 'rejected').length;
  const pendientes = dtes.filter((d) => d.transmission_status === 'transmitted').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Facturación Electrónica (DTE)</h1>
          <p className="text-gray-500 mt-1">FE y CCFE conforme al Anexo II de la normativa MH</p>
        </div>
        <button className="btn-primary flex items-center space-x-2" onClick={() => setModal(true)}>
          <FiPlus /><span>Emitir DTE</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center space-x-3">
          <FiCheckCircle className="text-green-600" size={24} />
          <div><p className="text-sm text-gray-500">Aceptados</p><p className="text-2xl font-bold text-green-700">{aceptados}</p></div>
        </div>
        <div className="card p-4 flex items-center space-x-3">
          <FiXCircle className="text-red-600" size={24} />
          <div><p className="text-sm text-gray-500">Rechazados</p><p className="text-2xl font-bold text-red-700">{rechazados}</p></div>
        </div>
        <div className="card p-4 flex items-center space-x-3">
          <FiClock className="text-blue-600" size={24} />
          <div><p className="text-sm text-gray-500">Pendientes</p><p className="text-2xl font-bold text-blue-700">{pendientes}</p></div>
        </div>
        <div className="card p-4 flex items-center space-x-3">
          <FiFileText className="text-primary-600" size={24} />
          <div><p className="text-sm text-gray-500">Total emitidos</p><p className="text-2xl font-bold">{dtes.length}</p></div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">N° Control</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tipo</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">PNR</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Receptor</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Total</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cargando ? (
              <tr><td colSpan="7" className="text-center py-8 text-gray-500">Cargando...</td></tr>
            ) : dtes.length === 0 ? (
              <tr><td colSpan="7" className="text-center py-8 text-gray-500">Aún no hay DTEs emitidos</td></tr>
            ) : dtes.map((d) => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-6 py-4"><code className="text-xs font-mono text-gray-700">{d.control_number}</code></td>
                <td className="px-6 py-4"><span className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-xs font-medium">{d.dte_type === '01' ? 'FE' : 'CCFE'}</span></td>
                <td className="px-6 py-4 font-mono text-sm text-primary-700">{d.pnr || '-'}</td>
                <td className="px-6 py-4 text-sm">{d.receiver_name}</td>
                <td className="px-6 py-4 text-sm font-semibold">${parseFloat(d.total_to_pay).toFixed(2)}</td>
                <td className="px-6 py-4"><span className={'px-3 py-1 rounded-full text-xs font-medium ' + badge(d.transmission_status)[1]}>{badge(d.transmission_status)[0]}</span></td>
                <td className="px-6 py-4">
                  <button onClick={() => verPdf(d.uuid_generation)} className="text-red-600 hover:text-red-800 flex items-center space-x-1 mr-3"><FiFileText size={16} /><span className="text-sm">PDF</span></button><button onClick={() => verJson(d.uuid_generation)} className="text-primary-600 hover:text-primary-800 flex items-center space-x-1">
                    <FiEye size={16} /><span className="text-sm">Ver JSON</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Emitir DTE</h2>
              <button onClick={() => setModal(false)} className="text-gray-500 hover:text-gray-700"><FiX size={22} /></button>
            </div>
            {facturables.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-lg p-4">
                No hay reservas pagadas pendientes de facturar. Primero cobre una reserva en el módulo <strong>Pagos</strong>.
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reserva pagada *</label>`n                <input className="input-field mb-2" placeholder="Filtrar: PNR o nombre..." value={filtroRes} onChange={(e) => setFiltroRes(e.target.value)} />
                  <select className="input-field" value={form.reservation_id} onChange={(e) => setForm(Object.assign({}, form, { reservation_id: e.target.value }))}>
                    <option value="">-- Selecciona --</option>
                    {facturables.filter((r) => ((r.pnr || '') + ' ' + (r.customer_first_names || '') + ' ' + (r.customer_last_names || '')).toLowerCase().includes(filtroRes.toLowerCase())).map((r) => (
                      <option key={r.id} value={r.id}>{r.pnr} - {r.customer_first_names} {r.customer_last_names} (${parseFloat(r.estimated_total).toFixed(2)})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de documento *</label>
                  <select className="input-field" value={form.tipo_dte} onChange={(e) => setForm(Object.assign({}, form, { tipo_dte: e.target.value }))}>
                    <option value="01">01 - Factura Electrónica (FE)</option>
                    <option value="03">03 - Comprobante de Crédito Fiscal (CCFE)</option>
                  </select>
                </div>
                {form.tipo_dte === '03' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">NIT receptor *</label>
                      <input className="input-field" value={form.nit} onChange={(e) => setForm(Object.assign({}, form, { nit: e.target.value }))} placeholder="06149999999999" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">NRC</label>
                      <input className="input-field" value={form.nrc} onChange={(e) => setForm(Object.assign({}, form, { nrc: e.target.value }))} placeholder="12345678" />
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-end space-x-2 mt-6">
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={emitir} disabled={emitiendo || facturables.length === 0}>
                {emitiendo ? 'Emitiendo...' : 'Emitir y transmitir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {visor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">JSON DTE (Anexo II)</h2>
              <button onClick={() => setVisor(null)} className="text-gray-500 hover:text-gray-700"><FiX size={22} /></button>
            </div>
            <div className="bg-gray-900 rounded-lg p-4 overflow-auto flex-1">
              <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">{JSON.stringify(visor.full_json ? (typeof visor.full_json === 'string' ? JSON.parse(visor.full_json) : visor.full_json) : visor, null, 2)}</pre>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <p><strong>Sello de recepción:</strong> {visor.reception_seal || 'Sin sello (contingencia/rechazo)'}</p>
              <p><strong>Estado:</strong> {visor.transmission_status}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default DTE;