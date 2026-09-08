import { useEffect, useState } from 'react';
import api from '../services/api';
import { FiFileMinus, FiPlus, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';

const NotasCredito = () => {
  const [notas, setNotas] = useState([]);
  const [origenes, setOrigenes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState(false);
  const [emitiendo, setEmitiendo] = useState(false);
  const [form, setForm] = useState({ origenUuid: '', tipoDte: '05', motivo: '', monto: '', noGravado: '' });

  const cargar = () => {
    Promise.all([api.get('/notas'), api.get('/notas/origenes')])
      .then((res) => {
        setNotas(res[0].data.datos || []);
        setOrigenes(res[1].data.datos || []);
      })
      .catch(() => toast.error('Error al cargar notas'))
      .finally(() => setCargando(false));
  };
  useEffect(() => { cargar(); }, []);

  const emitir = async () => {
    if (!form.origenUuid) return toast.error('Selecciona el DTE origen');
    if (!form.motivo) return toast.error('Indica el motivo del ajuste');
    if (!form.monto || Number(form.monto) <= 0) return toast.error('Monto de ajuste inválido');
    setEmitiendo(true);
    try {
      const r = await api.post('/notas', {
        origenUuid: form.origenUuid,
        tipoDte: form.tipoDte,
        motivo: form.motivo,
        monto: Number(form.monto),
        noGravado: Number(form.noGravado || 0)
      });
      toast.success(r.data.datos.tipoDte === '05' ? 'NCE emitida: ' + r.data.datos.numeroControl : 'NDE emitida: ' + r.data.datos.numeroControl);
      setModal(false);
      setForm({ origenUuid: '', tipoDte: '05', motivo: '', monto: '', noGravado: '' });
      cargar();
    } catch (e) {
      toast.error(e.response && e.response.data ? e.response.data.error : 'Error al emitir la nota');
    } finally { setEmitiendo(false); }
  };

  const nombreOrigen = (uuid) => {
    const o = origenes.find((x) => x.uuid_generation === uuid);
    if (!o) return uuid;
    return (o.dte_type === '01' ? 'FE ' : 'CCFE ') + o.control_number;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Notas de Crédito / Débito</h1>
          <p className="text-gray-500 mt-1">NCE (05) y NDE (06) V4 · ajustan FE/CCFE sellados (RN-FIS-04)</p>
        </div>
        <button className="btn-primary flex items-center space-x-2" onClick={() => setModal(true)}>
          <FiPlus /><span>Nueva NCE/NDE</span>
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tipo</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">N° Control</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ajusta a</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fecha</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Total</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Sello</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cargando ? (
              <tr><td colSpan="6" className="text-center py-8 text-gray-500">Cargando...</td></tr>
            ) : notas.length === 0 ? (
              <tr><td colSpan="6" className="text-center py-8 text-gray-500">Aún no hay notas emitidas</td></tr>
            ) : notas.map((n) => {
              let rel = '-';
              try {
                const j = typeof n.full_json === 'string' ? JSON.parse(n.full_json) : n.full_json;
                rel = (j.documentoRelacionado && j.documentoRelacionado[0]) ? (j.documentoRelacionado[0].tipoDocumento === '01' ? 'FE ' : 'CCFE ') + j.documentoRelacionado[0].numeroControl : '-';
              } catch (e) { /* sin json */ }
              return (
                <tr key={n.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4"><span className={'px-3 py-1 rounded-full text-xs font-medium ' + (n.dte_type === '05' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700')}>{n.dte_type === '05' ? 'NCE' : 'NDE'}</span></td>
                  <td className="px-6 py-4 font-mono text-xs">{n.control_number}</td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-500">{rel}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{n.emission_date}</td>
                  <td className="px-6 py-4 text-sm font-semibold">${Number(n.total_to_pay).toFixed(2)}</td>
                  <td className="px-6 py-4 text-xs text-gray-500">{n.reception_seal || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Emitir NCE / NDE</h2>
              <button onClick={() => setModal(false)} className="text-gray-500"><FiX size={22} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">DTE origen (FE/CCFE sellado) *</label>
                <select className="input-field" value={form.origenUuid} onChange={(e) => setForm(Object.assign({}, form, { origenUuid: e.target.value }))}>
                  <option value="">-- Selecciona --</option>
                  {origenes.map((o) => (
                    <option key={o.uuid_generation} value={o.uuid_generation}>
                      {o.dte_type === '01' ? 'FE' : 'CCFE'} · {o.control_number} · ${Number(o.total_to_pay).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de nota *</label>
                <select className="input-field" value={form.tipoDte} onChange={(e) => setForm(Object.assign({}, form, { tipoDte: e.target.value }))}>
                  <option value="05">05 - Nota de Crédito (disminuye)</option>
                  <option value="06">06 - Nota de Débito (aumenta)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo del ajuste *</label>
                <input className="input-field" value={form.motivo} onChange={(e) => setForm(Object.assign({}, form, { motivo: e.target.value }))} placeholder="Devolución de boleto, corrección de precio..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto del ajuste *</label>
                <input type="number" step="0.01" className="input-field" value={form.monto} onChange={(e) => setForm(Object.assign({}, form, { monto: e.target.value }))} placeholder="0.00" />
                <p className="text-xs text-gray-500 mt-1">Si el origen es CCFE ingresa el valor SIN IVA; si es FE, con IVA incluido.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cargo/abono no afecto (opcional)</label>
                <input type="number" step="0.01" className="input-field" value={form.noGravado} onChange={(e) => setForm(Object.assign({}, form, { noGravado: e.target.value }))} placeholder="0.00 (negativo = abono)" />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={emitir} disabled={emitiendo}>{emitiendo ? 'Emitiendo...' : 'Emitir nota'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default NotasCredito;