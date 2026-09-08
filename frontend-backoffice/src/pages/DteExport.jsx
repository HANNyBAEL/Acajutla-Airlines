import { useEffect, useState } from 'react';
import api, { reservasAPI } from '../services/api';
import { FiGlobe, FiPlus } from 'react-icons/fi';
import toast from 'react-hot-toast';

const INCOTERMS = [
  { c: '1', d: 'EXW-En fábrica' }, { c: '2', d: 'FCA-Libre transportista' }, { c: '3', d: 'CPT-Transporte pagado hasta' },
  { c: '4', d: 'CIP-Transporte y seguro pagado hasta' }, { c: '5', d: 'DAP-Entrega en el lugar' }, { c: '6', d: 'DPU-Entregado en lugar descargado' },
  { c: '7', d: 'DDP-Entrega con impuestos pagados' }, { c: '8', d: 'FAS-Libre al costado del buque' }, { c: '9', d: 'FOB-Libre a bordo' },
  { c: '10', d: 'CFR-Costo y flete' }, { c: '11', d: 'CIF-Costo, seguro y flete' }
];
const RECINTOS = [
  { c: '1', d: 'Terrestre San Bartolo' }, { c: '2', d: 'Marítima de Acajutla' }, { c: '3', d: 'Aérea De Comalapa' },
  { c: '4', d: 'Terrestre Las Chinamas' }, { c: '5', d: 'Terrestre La Hachadura' }
];
const REGIMENES = [
  { c: 'EX-1', d: 'Exportación Definitiva' }, { c: 'EX-2', d: 'Exportación Temporal' }, { c: 'EX-3', d: 'Reexportación' }, { c: 'TA-1', d: 'Tránsito Aduanero' }
];

const DteExport = () => {
  const [docs, setDocs] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [modal, setModal] = useState(false);
  const [emitiendo, setEmitiendo] = useState(false);
  const [form, setForm] = useState({
    tipoDte: '11', reservation_id: '', monto: '', codPais: '', nombrePais: '', tipoPersona: '1',
    tipoItemExpor: '1', recintoFiscal: '', tipoRegimen: '', regimen: '', codIncoterms: '', descIncoterms: '',
    seguro: '', flete: '', reteRenta: '', descripcion: '', nombre: '', numDocumento: '', correo: ''
  });

  const cargar = () => {
    api.get('/dte-export').then((r) => setDocs(r.data.datos || [])).catch(() => {});
    reservasAPI.listar({ status: 'paid' }).then((r) => setReservas(r.data.datos || [])).catch(() => {});
  };
  useEffect(() => { cargar(); }, []);

  const set = (k, v) => setForm(Object.assign({}, form, { [k]: v }));

  const emitir = async () => {
    if (!form.reservation_id) return toast.error('Selecciona una reserva pagada');
    if (form.tipoDte === '11' && (!form.codPais || !form.nombrePais)) return toast.error('FEXE requiere país y nombre de país del receptor');
    setEmitiendo(true);
    try {
      const payload = Object.assign({}, form, { reservation_id: Number(form.reservation_id) });
      const r = await api.post('/dte-export/emitir', payload);
      toast.success(r.data.mensaje + ': ' + r.data.datos.numeroControl);
      setModal(false);
      cargar();
    } catch (e) {
      toast.error(e.response && e.response.data ? e.response.data.error : 'Error al emitir');
    } finally { setEmitiendo(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Exportación y Sujetos Excluidos</h1>
          <p className="text-gray-500 mt-1">FEXE V3 (tipo 11) y FSEE V2 (tipo 14) según Anexo II</p>
        </div>
        <button className="btn-primary flex items-center space-x-2" onClick={() => setModal(true)}>
          <FiPlus /><span>Emitir FEXE / FSEE</span>
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tipo</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">N° Control</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fecha</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Total</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Sello</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {docs.length === 0 ? (
              <tr><td colSpan="5" className="text-center py-8 text-gray-500">Aún no hay FEXE/FSEE emitidas</td></tr>
            ) : docs.map((d) => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-6 py-4"><span className={'px-3 py-1 rounded-full text-xs font-medium ' + (d.dte_type === '11' ? 'bg-indigo-100 text-indigo-700' : 'bg-teal-100 text-teal-700')}>{d.dte_type === '11' ? 'FEXE' : 'FSEE'}</span></td>
                <td className="px-6 py-4 font-mono text-xs">{d.control_number}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{d.emission_date}</td>
                <td className="px-6 py-4 text-sm font-semibold">${Number(d.total_to_pay).toFixed(2)}</td>
                <td className="px-6 py-4 text-xs text-gray-500">{d.reception_seal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center space-x-2"><FiGlobe /><span>Emitir FEXE / FSEE</span></h2>
              <button onClick={() => setModal(false)} className="text-gray-500">✕</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de documento *</label>
                <select className="input-field" value={form.tipoDte} onChange={(e) => set('tipoDte', e.target.value)}>
                  <option value="11">11 - FEXE (Exportación)</option>
                  <option value="14">14 - FSEE (Sujeto Excluido)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reserva pagada *</label>
                <select className="input-field" value={form.reservation_id} onChange={(e) => set('reservation_id', e.target.value)}>
                  <option value="">-- Selecciona --</option>
                  {reservas.map((r) => <option key={r.id} value={r.id}>{r.pnr} · ${Number(r.estimated_total).toFixed(2)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto (default: total reserva)</label>
                <input type="number" step="0.01" className="input-field" value={form.monto} onChange={(e) => set('monto', e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre receptor</label>
                <input className="input-field" value={form.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Nombre / razón social" />
              </div>
              {form.tipoDte === '11' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Código país (CAT-020) * ≠ SV</label>
                    <input className="input-field" maxLength={2} value={form.codPais} onChange={(e) => set('codPais', e.target.value.toUpperCase())} placeholder="US" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre país *</label>
                    <input className="input-field" value={form.nombrePais} onChange={(e) => set('nombrePais', e.target.value)} placeholder="Estados Unidos" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de persona (CAT-029)</label>
                    <select className="input-field" value={form.tipoPersona} onChange={(e) => set('tipoPersona', e.target.value)}>
                      <option value="1">Persona Natural</option>
                      <option value="2">Persona Jurídica</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo exportación (CAT-011)</label>
                    <select className="input-field" value={form.tipoItemExpor} onChange={(e) => set('tipoItemExpor', e.target.value)}>
                      <option value="1">1 - Bienes</option>
                      <option value="2">2 - Servicios</option>
                    </select>
                  </div>
                  {form.tipoItemExpor === '1' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Recinto fiscal (CAT-027)</label>
                        <select className="input-field" value={form.recintoFiscal} onChange={(e) => set('recintoFiscal', e.target.value)}>
                          <option value="">-- Selecciona --</option>
                          {RECINTOS.map((r) => <option key={r.c} value={r.c}>{r.d}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de régimen (CAT-033)</label>
                        <select className="input-field" value={form.tipoRegimen} onChange={(e) => set('tipoRegimen', e.target.value)}>
                          <option value="">-- Selecciona --</option>
                          {REGIMENES.map((r) => <option key={r.c} value={r.c}>{r.d}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Régimen (CAT-028)</label>
                        <input className="input-field" value={form.regimen} onChange={(e) => set('regimen', e.target.value)} placeholder="1000000" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">INCOTERMS (CAT-031)</label>
                        <select className="input-field" value={form.codIncoterms} onChange={(e) => { const i = INCOTERMS.find((x) => x.c === e.target.value); set('codIncoterms', e.target.value); set('descIncoterms', i ? i.d : ''); }}>
                          <option value="">-- Selecciona --</option>
                          {INCOTERMS.map((i) => <option key={i.c} value={i.c}>{i.d}</option>)}
                        </select>
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Seguro</label>
                    <input type="number" step="0.01" className="input-field" value={form.seguro} onChange={(e) => set('seguro', e.target.value)} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Flete</label>
                    <input type="number" step="0.01" className="input-field" value={form.flete} onChange={(e) => set('flete', e.target.value)} placeholder="0.00" />
                  </div>
                </>
              )}
              {form.tipoDte === '14' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Retención renta</label>
                  <input type="number" step="0.01" className="input-field" value={form.reteRenta} onChange={(e) => set('reteRenta', e.target.value)} placeholder="0.00" />
                </div>
              )}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción del ítem</label>
                <input className="input-field" value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} placeholder="Boleto aéreo internacional / venta a sujeto excluido" />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={emitir} disabled={emitiendo}>{emitiendo ? 'Emitiendo...' : 'Emitir documento'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default DteExport;