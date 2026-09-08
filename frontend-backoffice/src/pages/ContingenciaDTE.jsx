import { useEffect, useState } from 'react';
import api, { reservasAPI } from '../services/api';
import { FiAlertTriangle, FiXCircle, FiRefreshCw, FiPlus, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';

const CAT005 = [
  { c: 1, d: 'No disponibilidad de sistema del MH' },
  { c: 2, d: 'No disponibilidad de sistema del emisor' },
  { c: 3, d: 'Falla en el servicio de Internet' },
  { c: 4, d: 'Falla de energía eléctrica' },
  { c: 5, d: 'Otro' }
];
const CAT024 = [
  { c: 1, d: 'Error en la información del DTE' },
  { c: 2, d: 'Rescindir de la operación realizada' },
  { c: 3, d: 'Otro' }
];
const CAT022 = [ { c: '13', d: 'DUI' }, { c: '36', d: 'NIT' }, { c: '3', d: 'Pasaporte' } ];

const ContingenciaDTE = () => {
  const [pendientes, setPendientes] = useState([]);
  const [eventos, setEventos] = useState({ contingencia: [], invalidacion: [] });
  const [aceptados, setAceptados] = useState([]);
  const [facturables, setFacturables] = useState([]);
  const [modalEvento, setModalEvento] = useState(false);
  const [modalInvalidar, setModalInvalidar] = useState(null);
  const [modalEmitir, setModalEmitir] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [formEvento, setFormEvento] = useState({ fInicio: '', hInicio: '', fFin: '', hFin: '', tipoContingencia: 1, motivoContingencia: '', responsable: { nombre: '', tipoDoc: '13', numDoc: '' } });
  const [formInv, setFormInv] = useState({ tipoAnulacion: 1, motivo: '', codigoReemplazo: '', responsable: { nombre: '', tipoDoc: '13', numDoc: '' }, solicitante: { nombre: '', tipoDoc: '13', numDoc: '' } });
  const [formEmitir, setFormEmitir] = useState({ reservation_id: '', tipo_dte: '01', tipoContingencia: 1, motivoContin: '' });

  const cargar = () => {
    Promise.all([
      api.get('/dte-eventos/pendientes'),
      api.get('/dte-eventos/eventos'),
      api.get('/dte', { params: { estado: 'accepted' } }),
      reservasAPI.listar({ status: 'paid' })
    ]).then((res) => {
      setPendientes(res[0].data.datos || []);
      setEventos(res[1].data.datos || { contingencia: [], invalidacion: [] });
      setAceptados(res[2].data.datos || []);
      setFacturables(res[3].data.datos || []);
    }).catch(() => toast.error('Error al cargar contingencia'));
  };

  useEffect(() => { cargar(); }, []);

  const transmitirEvento = async () => {
    if (!formEvento.fInicio || !formEvento.fFin || !formEvento.hInicio || !formEvento.hFin) return toast.error('Complete el período de contingencia');
    if (!formEvento.responsable.nombre || !formEvento.responsable.numDoc) return toast.error('Complete los datos del responsable');
    if (Number(formEvento.tipoContingencia) === 5 && !formEvento.motivoContingencia) return toast.error('Para el tipo 5 debe indicar el motivo');
    setProcesando(true);
    try {
      const r = await api.post('/dte-eventos/evento-contingencia', formEvento);
      toast.success('Evento aceptado. Sello: ' + r.data.datos.sello);
      setModalEvento(false);
      cargar();
    } catch (e) { toast.error(e.response && e.response.data && e.response.data.error ? e.response.data.error : 'Error al transmitir'); }
    finally { setProcesando(false); }
  };

  const invalidar = async () => {
    if (!formInv.motivo) return toast.error('Indique el motivo de la invalidación');
    if (!formInv.responsable.nombre || !formInv.solicitante.nombre) return toast.error('Complete responsable y solicitante');
    setProcesando(true);
    try {
      const r = await api.post('/dte-eventos/invalidar/' + modalInvalidar.uuid_generation, formInv);
      toast.success('DTE invalidado. Sello: ' + r.data.datos.sello);
      setModalInvalidar(null);
      cargar();
    } catch (e) { toast.error(e.response && e.response.data && e.response.data.error ? e.response.data.error : 'Error al invalidar'); }
    finally { setProcesando(false); }
  };

  const emitirContingencia = async () => {
    if (!formEmitir.reservation_id) return toast.error('Seleccione una reserva pagada');
    setProcesando(true);
    try {
      await api.post('/dte-eventos/emitir-contingencia', formEmitir);
      toast.success('DTE generado en contingencia');
      setModalEmitir(false);
      cargar();
    } catch (e) { toast.error(e.response && e.response.data && e.response.data.error ? e.response.data.error : 'Error al emitir'); }
    finally { setProcesando(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Contingencia e Invalidación DTE</h1>
          <p className="text-gray-500 mt-1">RF-003 / CU-003 / CU-005 — Eventos según Anexo III</p>
        </div>
        <div className="flex space-x-2">
          <button className="btn-secondary flex items-center space-x-2" onClick={() => setModalEmitir(true)}>
            <FiPlus /><span>Emitir en contingencia</span>
          </button>
          <button className="btn-primary flex items-center space-x-2" onClick={() => setModalEvento(true)} disabled={pendientes.length === 0}>
            <FiRefreshCw /><span>Transmitir evento ({pendientes.length})</span>
          </button>
        </div>
      </div>

      {pendientes.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg flex items-center space-x-3">
          <FiAlertTriangle size={22} />
          <p className="text-sm font-medium">CRÍTICO: {pendientes.length} DTE(s) en contingencia pendientes de transmisión. Transmita el evento antes de 24 horas.</p>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100"><h2 className="text-lg font-semibold text-gray-800">DTEs en contingencia (pendientes)</h2></div>
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200"><tr>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">N° Control</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tipo</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">PNR</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Total</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {pendientes.length === 0 ? (
              <tr><td colSpan="5" className="text-center py-8 text-gray-500">Sin DTEs en contingencia</td></tr>
            ) : pendientes.map((d) => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-6 py-4"><code className="text-xs font-mono">{d.control_number}</code></td>
                <td className="px-6 py-4 text-sm">{d.dte_type === '01' ? 'FE' : 'CCFE'}</td>
                <td className="px-6 py-4 font-mono text-sm text-primary-700">{d.pnr || '-'}</td>
                <td className="px-6 py-4 text-sm font-semibold">${parseFloat(d.total_to_pay).toFixed(2)}</td>
                <td className="px-6 py-4"><span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">Contingencia</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100"><h2 className="text-lg font-semibold text-gray-800">DTEs aceptados (invalidables)</h2></div>
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200"><tr>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">N° Control</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tipo</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Receptor</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Sello</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Acción</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {aceptados.length === 0 ? (
              <tr><td colSpan="5" className="text-center py-8 text-gray-500">Sin DTEs aceptados</td></tr>
            ) : aceptados.map((d) => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-6 py-4"><code className="text-xs font-mono">{d.control_number}</code></td>
                <td className="px-6 py-4 text-sm">{d.dte_type === '01' ? 'FE' : 'CCFE'}</td>
                <td className="px-6 py-4 text-sm">{d.receiver_name}</td>
                <td className="px-6 py-4 text-xs text-gray-500">{d.reception_seal || '-'}</td>
                <td className="px-6 py-4">
                  <button onClick={() => { setModalInvalidar(d); setFormInv({ tipoAnulacion: 1, motivo: '', codigoReemplazo: '', responsable: { nombre: '', tipoDoc: '13', numDoc: '' }, solicitante: { nombre: '', tipoDoc: '13', numDoc: '' } }); }} className="text-red-600 hover:text-red-800 flex items-center space-x-1">
                    <FiXCircle size={16} /><span className="text-sm">Invalidar</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100"><h2 className="text-lg font-semibold text-gray-800">Eventos de contingencia</h2></div>
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200"><tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">UUID</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Período</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Docs</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {eventos.contingencia.length === 0 ? (
                <tr><td colSpan="4" className="text-center py-6 text-gray-500">Sin eventos</td></tr>
              ) : eventos.contingencia.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-2 text-xs font-mono">{e.uuid.slice(0, 13)}...</td>
                  <td className="px-4 py-2 text-xs">{e.fecha_inicio} → {e.fecha_fin}</td>
                  <td className="px-4 py-2 text-xs">{e.documentos_count}</td>
                  <td className="px-4 py-2"><span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">{e.estado}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100"><h2 className="text-lg font-semibold text-gray-800">Eventos de invalidación</h2></div>
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200"><tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">DTE</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Motivo</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {eventos.invalidacion.length === 0 ? (
                <tr><td colSpan="3" className="text-center py-6 text-gray-500">Sin eventos</td></tr>
              ) : eventos.invalidacion.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-2 text-xs font-mono">{e.control_number}</td>
                  <td className="px-4 py-2 text-xs">{e.motivo}</td>
                  <td className="px-4 py-2"><span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">{e.estado}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalEvento && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Evento de Contingencia (Anexo III)</h2>
              <button onClick={() => setModalEvento(false)} className="text-gray-500"><FiX size={22} /></button>
            </div>
            <p className="text-sm text-gray-600 mb-4">Se transmitirán {pendientes.length} DTE(s) pendientes generados en contingencia.</p>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Fecha inicio *</label><input type="date" className="input-field" value={formEvento.fInicio} onChange={(e) => setFormEvento(Object.assign({}, formEvento, { fInicio: e.target.value }))} /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Hora inicio *</label><input type="time" className="input-field" value={formEvento.hInicio} onChange={(e) => setFormEvento(Object.assign({}, formEvento, { hInicio: e.target.value }))} /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Fecha fin *</label><input type="date" className="input-field" value={formEvento.fFin} onChange={(e) => setFormEvento(Object.assign({}, formEvento, { fFin: e.target.value }))} /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Hora fin *</label><input type="time" className="input-field" value={formEvento.hFin} onChange={(e) => setFormEvento(Object.assign({}, formEvento, { hFin: e.target.value }))} /></div>
              <div className="col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">Tipo de contingencia (CAT-005) *</label>
                <select className="input-field" value={formEvento.tipoContingencia} onChange={(e) => setFormEvento(Object.assign({}, formEvento, { tipoContingencia: e.target.value }))}>
                  {CAT005.map((t) => <option key={t.c} value={t.c}>{t.c} - {t.d}</option>)}
                </select></div>
              {Number(formEvento.tipoContingencia) === 5 && (
                <div className="col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">Motivo (máx 500) *</label><input className="input-field" value={formEvento.motivoContingencia} onChange={(e) => setFormEvento(Object.assign({}, formEvento, { motivoContingencia: e.target.value }))} /></div>
              )}
              <div className="col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">Nombre del responsable *</label><input className="input-field" value={formEvento.responsable.nombre} onChange={(e) => setFormEvento(Object.assign({}, formEvento, { responsable: Object.assign({}, formEvento.responsable, { nombre: e.target.value }) }))} /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Tipo doc *</label>
                <select className="input-field" value={formEvento.responsable.tipoDoc} onChange={(e) => setFormEvento(Object.assign({}, formEvento, { responsable: Object.assign({}, formEvento.responsable, { tipoDoc: e.target.value }) }))}>
                  {CAT022.map((t) => <option key={t.c} value={t.c}>{t.d}</option>)}
                </select></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">N° doc *</label><input className="input-field" value={formEvento.responsable.numDoc} onChange={(e) => setFormEvento(Object.assign({}, formEvento, { responsable: Object.assign({}, formEvento.responsable, { numDoc: e.target.value }) }))} /></div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button className="btn-secondary" onClick={() => setModalEvento(false)}>Cancelar</button>
              <button className="btn-primary" onClick={transmitirEvento} disabled={procesando}>{procesando ? 'Transmitiendo...' : 'Transmitir evento'}</button>
            </div>
          </div>
        </div>
      )}

      {modalInvalidar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Invalidar DTE {modalInvalidar.control_number}</h2>
              <button onClick={() => setModalInvalidar(null)} className="text-gray-500"><FiX size={22} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">Motivo (CAT-024) *</label>
                <select className="input-field" value={formInv.tipoAnulacion} onChange={(e) => setFormInv(Object.assign({}, formInv, { tipoAnulacion: e.target.value }))}>
                  {CAT024.map((t) => <option key={t.c} value={t.c}>{t.c} - {t.d}</option>)}
                </select></div>
              <div className="col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">Descripción del error *</label><input className="input-field" value={formInv.motivo} onChange={(e) => setFormInv(Object.assign({}, formInv, { motivo: e.target.value }))} /></div>
              <div className="col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">Código de generación que reemplaza (opcional)</label><input className="input-field" value={formInv.codigoReemplazo} onChange={(e) => setFormInv(Object.assign({}, formInv, { codigoReemplazo: e.target.value }))} /></div>
              <div className="col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">Nombre de quien realiza *</label><input className="input-field" value={formInv.responsable.nombre} onChange={(e) => setFormInv(Object.assign({}, formInv, { responsable: Object.assign({}, formInv.responsable, { nombre: e.target.value }) }))} /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Tipo doc *</label>
                <select className="input-field" value={formInv.responsable.tipoDoc} onChange={(e) => setFormInv(Object.assign({}, formInv, { responsable: Object.assign({}, formInv.responsable, { tipoDoc: e.target.value }) }))}>
                  {CAT022.map((t) => <option key={t.c} value={t.c}>{t.d}</option>)}
                </select></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">N° doc *</label><input className="input-field" value={formInv.responsable.numDoc} onChange={(e) => setFormInv(Object.assign({}, formInv, { responsable: Object.assign({}, formInv.responsable, { numDoc: e.target.value }) }))} /></div>
              <div className="col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">Nombre de quien solicita *</label><input className="input-field" value={formInv.solicitante.nombre} onChange={(e) => setFormInv(Object.assign({}, formInv, { solicitante: Object.assign({}, formInv.solicitante, { nombre: e.target.value }) }))} /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Tipo doc *</label>
                <select className="input-field" value={formInv.solicitante.tipoDoc} onChange={(e) => setFormInv(Object.assign({}, formInv, { solicitante: Object.assign({}, formInv.solicitante, { tipoDoc: e.target.value }) }))}>
                  {CAT022.map((t) => <option key={t.c} value={t.c}>{t.d}</option>)}
                </select></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">N° doc *</label><input className="input-field" value={formInv.solicitante.numDoc} onChange={(e) => setFormInv(Object.assign({}, formInv, { solicitante: Object.assign({}, formInv.solicitante, { numDoc: e.target.value }) }))} /></div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button className="btn-secondary" onClick={() => setModalInvalidar(null)}>Cancelar</button>
              <button className="btn-danger" onClick={invalidar} disabled={procesando}>{procesando ? 'Transmitiendo...' : 'Invalidar DTE'}</button>
            </div>
          </div>
        </div>
      )}

      {modalEmitir && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Emitir DTE en contingencia</h2>
              <button onClick={() => setModalEmitir(false)} className="text-gray-500"><FiX size={22} /></button>
            </div>
            <div className="space-y-3">
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Reserva pagada *</label>
                <select className="input-field" value={formEmitir.reservation_id} onChange={(e) => setFormEmitir(Object.assign({}, formEmitir, { reservation_id: e.target.value }))}>
                  <option value="">-- Selecciona --</option>
                  {facturables.map((r) => <option key={r.id} value={r.id}>{r.pnr} - {r.customer_first_names} {r.customer_last_names}</option>)}
                </select></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Tipo *</label>
                <select className="input-field" value={formEmitir.tipo_dte} onChange={(e) => setFormEmitir(Object.assign({}, formEmitir, { tipo_dte: e.target.value }))}>
                  <option value="01">01 - FE</option><option value="03">03 - CCFE</option>
                </select></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Tipo de contingencia (CAT-005) *</label>
                <select className="input-field" value={formEmitir.tipoContingencia} onChange={(e) => setFormEmitir(Object.assign({}, formEmitir, { tipoContingencia: e.target.value }))}>
                  {CAT005.map((t) => <option key={t.c} value={t.c}>{t.c} - {t.d}</option>)}
                </select></div>
              {Number(formEmitir.tipoContingencia) === 5 && (
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Motivo *</label><input className="input-field" value={formEmitir.motivoContin} onChange={(e) => setFormEmitir(Object.assign({}, formEmitir, { motivoContin: e.target.value }))} /></div>
              )}
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button className="btn-secondary" onClick={() => setModalEmitir(false)}>Cancelar</button>
              <button className="btn-primary" onClick={emitirContingencia} disabled={procesando}>{procesando ? 'Emitiendo...' : 'Emitir en contingencia'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ContingenciaDTE;