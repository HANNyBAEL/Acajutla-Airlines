import { useEffect, useState } from 'react';
import api from '../services/api';
import { FiFileMinus, FiPlus, FiX } from 'react-icons/fi';
import SearchableSelect from '../components/SearchableSelect';
import toast from 'react-hot-toast';

const ETIQUETAS_ORIGEN = { '01': 'FE', '03': 'CCFE', '11': 'FEXE' };
const redondearMonto = (valor) => Math.round((Number(valor) + Number.EPSILON) * 100) / 100;

const NotasCredito = () => {
  const [notas, setNotas] = useState([]);
  const [origenes, setOrigenes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState(false);
  const [emitiendo, setEmitiendo] = useState(false);
  const [form, setForm] = useState({ origenUuid: '', tipoDte: '05', motivo: '', monto: '', noGravado: '', montoIncluyeIva: false });

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
        noGravado: Number(form.noGravado || 0),
        montoIncluyeIva: form.montoIncluyeIva
      });
      toast.success(r.data.datos.tipoDte === '05' ? 'NCE emitida: ' + r.data.datos.numeroControl : 'NDE emitida: ' + r.data.datos.numeroControl);
      const correo = r.data.datos.correo;
      if (correo && correo.enviado && correo.simulado) toast('Correo registrado como simulado; no llegó al destinatario.', { icon: 'ℹ️' });
      else if (correo && correo.enviado) toast.success('Copia enviada al correo del cliente');
      else if (correo) toast.error('Nota emitida, pero no se envió el correo: ' + (correo.motivo || 'Error desconocido'));
      setModal(false);
      setForm({ origenUuid: '', tipoDte: '05', motivo: '', monto: '', noGravado: '', montoIncluyeIva: false });
      cargar();
    } catch (e) {
      toast.error(e.response && e.response.data ? e.response.data.error : 'Error al emitir la nota');
    } finally { setEmitiendo(false); }
  };

  const opcionesOrigen = origenes.map((o) => {
    const tipo = ETIQUETAS_ORIGEN[String(o.dte_type).padStart(2, '0')] || 'DTE';
    const monto = Number(o.total_to_pay).toFixed(2);
    return {
      value: o.uuid_generation,
      label: `${tipo} · ${o.control_number} · $${monto}`,
      searchText: `${tipo} ${o.control_number} ${monto} ${o.uuid_generation} ${o.emission_date || ''}`
    };
  });
  const origenSeleccionado = origenes.find((o) => o.uuid_generation === form.origenUuid);
  let jsonOrigen = {};
  try {
    jsonOrigen = origenSeleccionado
      ? (typeof origenSeleccionado.full_json === 'string' ? JSON.parse(origenSeleccionado.full_json) : origenSeleccionado.full_json || {})
      : {};
  } catch (e) { jsonOrigen = {}; }
  const tipoOrigen = String(jsonOrigen.identificacion?.tipoDte || (origenSeleccionado && origenSeleccionado.dte_type) || '');
  const resumenOrigen = jsonOrigen.resumen || {};
  const tributoIvaOrigen = (Array.isArray(resumenOrigen.tributos) ? resumenOrigen.tributos : []).find((tributo) => String(tributo.codigo) === '20');
  const ivaOrigen = Number(tipoOrigen === '03' ? (tributoIvaOrigen ? tributoIvaOrigen.valor : 0) : (resumenOrigen.totalIva || 0)) || 0;
  const gravadaOrigen = Number(resumenOrigen.totalGravada) || 0;
  const tasaIvaOrigen = gravadaOrigen > 0 ? ivaOrigen / gravadaOrigen : 0;
  const montoIngresado = Number(form.monto) || 0;
  const baseAjuste = redondearMonto(form.montoIncluyeIva && tipoOrigen === '03' && tasaIvaOrigen > 0
    ? montoIngresado / (1 + tasaIvaOrigen)
    : montoIngresado);
  const ivaAjuste = tipoOrigen === '11' ? 0 : redondearMonto(
    form.montoIncluyeIva && tipoOrigen === '03' ? montoIngresado - baseAjuste : baseAjuste * tasaIvaOrigen
  );
  const totalAjuste = redondearMonto((tipoOrigen === '03' ? baseAjuste + ivaAjuste : montoIngresado) + Number(form.noGravado || 0));

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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Emitir NCE / NDE</h2>
              <button onClick={() => setModal(false)} className="text-gray-500"><FiX size={22} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">DTE origen (FE/CCFE/FEXE sellado) *</label>
                <SearchableSelect
                  options={opcionesOrigen}
                  value={form.origenUuid}
                  onChange={(origenUuid) => setForm((prev) => Object.assign({}, prev, { origenUuid }))}
                  placeholder="Busca por número de control, tipo o UUID..."
                  emptyText="No hay DTE que coincidan con esa búsqueda"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {origenes.length} DTE disponibles. Escribe una parte del número de control para filtrar.
                </p>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {tipoOrigen === '03' && form.montoIncluyeIva ? 'Monto total del ajuste (IVA incluido) *' : tipoOrigen === '03' ? 'Monto base gravada (sin IVA) *' : tipoOrigen === '01' ? 'Monto total del ajuste (IVA incluido) *' : 'Monto del ajuste *'}
                </label>
                <input type="number" step="0.01" className="input-field" value={form.monto} onChange={(e) => setForm(Object.assign({}, form, { monto: e.target.value }))} placeholder="0.00" />
                {tipoOrigen === '03' ? (
                  <label className="mt-2 flex items-start gap-2 text-sm text-gray-700">
                    <input type="checkbox" className="mt-1" checked={form.montoIncluyeIva} onChange={(e) => setForm(Object.assign({}, form, { montoIncluyeIva: e.target.checked }))} />
                    <span>El monto que ingresé ya incluye IVA. Se desglosará para evitar sumarlo dos veces.</span>
                  </label>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">{tipoOrigen === '01' ? 'Ingresa el total con IVA incluido; no se añadirá IVA encima.' : tipoOrigen === '11' ? 'El origen es FEXE; no se calcula IVA.' : 'Selecciona un DTE origen para ver cómo se tratará el IVA.'}</p>
                )}
                {tipoOrigen === '03' && <p className="text-xs text-gray-500 mt-1">{form.montoIncluyeIva ? 'Se calculará la base y el IVA incluido según la tasa del DTE origen.' : `Ingresa la base sin IVA; se añadirá el IVA según el origen (${(tasaIvaOrigen * 100).toFixed(2)}%).`}</p>}
                {origenSeleccionado && montoIngresado > 0 && (
                  <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm space-y-1">
                    {tipoOrigen === '03' ? <div className="flex justify-between"><span>Base gravada</span><span>${baseAjuste.toFixed(2)}</span></div> : tipoOrigen === '01' && <div className="flex justify-between"><span>Base antes de IVA (incluida en el monto)</span><span>${Math.max(0, baseAjuste - ivaAjuste).toFixed(2)}</span></div>}
                    {tipoOrigen !== '11' && <div className="flex justify-between"><span>IVA {tipoOrigen === '03' && !form.montoIncluyeIva ? 'a agregar' : 'incluido'}</span><span>${ivaAjuste.toFixed(2)}</span></div>}
                    {Number(form.noGravado || 0) !== 0 && <div className="flex justify-between"><span>Cargo/abono no afecto</span><span>${Number(form.noGravado).toFixed(2)}</span></div>}
                    <div className="flex justify-between border-t border-gray-200 pt-1 font-semibold"><span>Total estimado de la nota</span><span>${totalAjuste.toFixed(2)}</span></div>
                  </div>
                )}
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
