import { useEffect, useState } from 'react';
import api, { reservasAPI } from '../services/api';
import SearchableSelect from '../components/SearchableSelect';
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
const TIPOS_DTE = { '01': 'FE', '03': 'CCFE', '04': 'NRE', '05': 'NCE', '06': 'NDE', '07': 'CRE', '08': 'CLE', '09': 'DCLE', '11': 'FEXE', '14': 'FSEE', '15': 'CDE' };
const leerJsonDte = (dte) => {
  try { return typeof dte?.full_json === 'string' ? JSON.parse(dte.full_json) : (dte?.full_json || {}); }
  catch (_) { return {}; }
};
const mostrarValor = (valor) => valor === null || valor === undefined || valor === '' ? '—' : typeof valor === 'object' ? JSON.stringify(valor) : String(valor);
const montoDte = (valor) => Number.isFinite(Number(valor)) ? '$' + Number(valor).toFixed(2) : '—';

const DatoDetalleDte = ({ etiqueta, valor, mono = false }) => (
  <div className="min-w-0 rounded-lg bg-gray-50 px-3 py-2">
    <dt className="text-xs text-gray-500">{etiqueta}</dt>
    <dd className={'mt-0.5 text-sm text-gray-800 break-words ' + (mono ? 'font-mono text-xs' : '')}>{mostrarValor(valor)}</dd>
  </div>
);

const ContingenciaDTE = () => {
  const [pendientes, setPendientes] = useState([]);
  const [eventos, setEventos] = useState({ contingencia: [], invalidacion: [] });
  const [aceptados, setAceptados] = useState([]);
  const [facturables, setFacturables] = useState([]);
  const [mh, setMh] = useState(null);
  const [modalEvento, setModalEvento] = useState(false);
  const [modalInvalidar, setModalInvalidar] = useState(null);
  const [detalleDte, setDetalleDte] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [modalEmitir, setModalEmitir] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [formEvento, setFormEvento] = useState({ fInicio: '', hInicio: '', fFin: '', hFin: '', tipoContingencia: 1, motivoContingencia: '', responsable: { nombre: '', tipoDoc: '13', numDoc: '' } });
  const [formInv, setFormInv] = useState({ tipoAnulacion: 1, motivo: '', codigoReemplazo: '', responsable: { nombre: '', tipoDoc: '13', numDoc: '' }, solicitante: { nombre: '', tipoDoc: '13', numDoc: '' } });
  const [formEmitir, setFormEmitir] = useState({ reservation_id: '', tipo_dte: '01', tipoContingencia: 1, motivoContin: '' });

  const cargar = () => {
    // Cada petición es independiente: si una falla no borra el resto de la pantalla
    api.get('/dte-eventos/pendientes')
      .then((r) => setPendientes(r.data.datos || []))
      .catch(() => toast.error('Error al cargar DTEs en contingencia'));

    api.get('/dte-eventos/eventos')
      .then((r) => setEventos(r.data.datos || { contingencia: [], invalidacion: [] }))
      .catch(() => {});

    api.get('/dte', { params: { estado: 'accepted' } })
      .then((r) => setAceptados(r.data.datos || []))
      .catch(() => {});

    reservasAPI.listar({ status: 'paid', sin_dte: true })
      .then((r) => setFacturables(r.data.datos || []))
      .catch(() => {});

    api.get('/dte-eventos/mh/estado')
      .then((r) => setMh(r.data.datos || null))
      .catch(() => {});
  };

  useEffect(() => { cargar(); }, []);

  const abrirDetalle = async (dte) => {
    setDetalleDte(dte);
    setCargandoDetalle(true);
    try {
      const r = await api.get('/dte/' + encodeURIComponent(dte.uuid_generation));
      setDetalleDte(r.data.datos || dte);
    } catch (_) {
      toast.error('No se pudo cargar el detalle completo del DTE');
    } finally { setCargandoDetalle(false); }
  };

  const abrirInvalidacion = (event, dte) => {
    event.stopPropagation();
    setModalInvalidar(dte);
    setFormInv({ tipoAnulacion: 1, motivo: '', codigoReemplazo: '', responsable: { nombre: '', tipoDoc: '13', numDoc: '' }, solicitante: { nombre: '', tipoDoc: '13', numDoc: '' } });
  };

  const cambiarEstadoMH = async (operativo) => {
    setProcesando(true);
    try {
      await api.put('/dte-eventos/mh/estado', { operativo });
      toast.success(operativo ? 'MH simulado restablecido. Ya puede transmitir el lote.' : 'MH simulado caído. Los nuevos pagos emitirán DTE en contingencia.');
      cargar();
    } catch (e) { toast.error(e.response?.data?.error || 'No se pudo cambiar el estado de MH'); }
    finally { setProcesando(false); }
  };

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
    const requiereReemplazo = [1, 3].includes(Number(formInv.tipoAnulacion)) && !['05', '08'].includes(String(modalInvalidar?.dte_type));
    if (requiereReemplazo && !formInv.codigoReemplazo) return toast.error('Seleccione el DTE aceptado que reemplaza al documento');
    setProcesando(true);
    try {
      const r = await api.post('/dte-eventos/invalidar/' + modalInvalidar.uuid_generation, formInv);
      const correo = r.data.datos.correo;
      if (correo?.enviado && correo?.simulado) {
        toast.success('DTE invalidado. PDF y JSON guardados en modo simulado. Sello: ' + r.data.datos.sello);
      } else if (correo?.enviado) {
        toast.success('DTE invalidado; correo enviado con PDF y JSON. Sello: ' + r.data.datos.sello);
      } else {
        toast('DTE invalidado, pero no se pudieron enviar los archivos: ' + (correo?.motivo || 'sin correo'), { icon: '⚠️' });
      }
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
          <button className="btn-primary flex items-center space-x-2" onClick={() => setModalEvento(true)} disabled={pendientes.length === 0 || !mh?.operativo}>
            <FiRefreshCw /><span>Transmitir lote ({pendientes.length})</span>
          </button>
        </div>
      </div>

      <div className={'rounded-lg border p-4 flex flex-wrap items-center justify-between gap-3 ' + (mh?.operativo ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200')}>
        <div>
          <p className="font-semibold text-gray-800">Servicio fiscal local (simulado): {mh?.operativo ? 'OPERATIVO' : 'CAÍDO'}</p>
          <p className="text-sm text-gray-600">El pago nunca se bloquea. Si MH falla tras {mh?.reintentosConfigurados || 3} intentos, el DTE y el correo se generan automáticamente en contingencia, sin sello.</p>
        </div>
        <button className={mh?.operativo ? 'btn-secondary' : 'btn-primary'} disabled={procesando || !mh} onClick={() => cambiarEstadoMH(!mh.operativo)}>
          {mh?.operativo ? 'Simular caída de MH' : 'Restablecer MH'}
        </button>
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
                <td className="px-6 py-4 text-sm">{TIPOS_DTE[d.dte_type] || `DTE ${d.dte_type}`}</td>
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
              <tr key={d.id} className="hover:bg-primary-50 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500" onClick={() => abrirDetalle(d)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirDetalle(d); } }} tabIndex={0} aria-label={'Ver detalle del DTE ' + d.control_number}>
                <td className="px-6 py-4"><code className="text-xs font-mono">{d.control_number}</code></td>
                <td className="px-6 py-4 text-sm">{TIPOS_DTE[d.dte_type] || `DTE ${d.dte_type}`}</td>
                <td className="px-6 py-4 text-sm">{d.receiver_name}</td>
                <td className="px-6 py-4 text-xs text-gray-500">{d.reception_seal || '-'}</td>
                <td className="px-6 py-4">
                  <button onClick={(e) => abrirInvalidacion(e, d)} className="text-red-600 hover:text-red-800 flex items-center space-x-1">
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

      {detalleDte && (() => {
        const json = leerJsonDte(detalleDte);
        const identificacion = json.identificacion || {};
        const emisor = json.emisor || {};
        const receptor = json.receptor || {};
        const resumen = json.resumen || {};
        const items = Array.isArray(json.cuerpoDocumento) ? json.cuerpoDocumento : (detalleDte.items || []);
        const pagos = Array.isArray(resumen.pagos) ? resumen.pagos : [];
        const fechaEmision = [detalleDte.emission_date || identificacion.fecEmi, detalleDte.emission_time || identificacion.horEmi].filter(Boolean).join(' ');
        const tipo = String(detalleDte.dte_type || identificacion.tipoDte || '').padStart(2, '0');
        const valoresResumen = [
          ['No sujetas', resumen.totalNoSuj], ['Exentas', resumen.totalExenta], ['Gravadas', resumen.totalGravada],
          ['Subtotal', resumen.subTotal], ['IVA', resumen.totalIva ?? resumen.totalIVA ?? resumen.totaliva],
          ['Operación', resumen.montoTotalOperacion], ['Retenciones', resumen.ivaRete ?? resumen.reteRenta],
          ['Total a pagar', resumen.totalPagar ?? detalleDte.total_to_pay],
        ].filter(([, valor]) => valor !== null && valor !== undefined);
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4" onClick={() => setDetalleDte(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-gray-200 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-gray-800">Detalle del DTE</h2>
                  <p className="text-sm text-gray-500 mt-1">{TIPOS_DTE[tipo] || 'DTE ' + tipo} · {detalleDte.control_number || identificacion.numeroControl || 'Sin número de control'}</p>
                </div>
                <button type="button" onClick={() => setDetalleDte(null)} className="text-gray-500 hover:text-gray-800" aria-label="Cerrar detalle"><FiX size={22} /></button>
              </div>
              <div className="overflow-y-auto p-6 space-y-5">
                {cargandoDetalle ? <p className="text-sm text-gray-500">Cargando información completa...</p> : <>
                  <section>
                    <h3 className="font-semibold text-gray-800 mb-2">Estado y emisión</h3>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      <DatoDetalleDte etiqueta="Estado" valor={detalleDte.transmission_status} />
                      <DatoDetalleDte etiqueta="Fecha y hora" valor={fechaEmision} />
                      <DatoDetalleDte etiqueta="PNR / reserva" valor={detalleDte.pnr || detalleDte.reservation_id} />
                      <DatoDetalleDte etiqueta="Total" valor={montoDte(detalleDte.total_to_pay ?? resumen.totalPagar)} />
                      <DatoDetalleDte etiqueta="UUID de generación" valor={detalleDte.uuid_generation || identificacion.codigoGeneracion} mono />
                      <DatoDetalleDte etiqueta="Sello de recepción" valor={detalleDte.reception_seal} mono />
                      <DatoDetalleDte etiqueta="Ambiente" valor={identificacion.ambiente} />
                      <DatoDetalleDte etiqueta="Moneda" valor={identificacion.tipoMoneda} />
                    </dl>
                  </section>

                  <section>
                    <h3 className="font-semibold text-gray-800 mb-2">Emisor</h3>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      <DatoDetalleDte etiqueta="Nombre" valor={emisor.nombre || detalleDte.issuer_name} />
                      <DatoDetalleDte etiqueta="NIT" valor={emisor.nit || detalleDte.issuer_nit} />
                      <DatoDetalleDte etiqueta="NRC" valor={emisor.nrc} />
                      <DatoDetalleDte etiqueta="Actividad económica" valor={[emisor.codActividad, emisor.descActividad].filter(Boolean).join(' · ')} />
                      <DatoDetalleDte etiqueta="Correo" valor={emisor.correo} />
                      <DatoDetalleDte etiqueta="Teléfono" valor={emisor.telefono} />
                      <DatoDetalleDte etiqueta="Dirección" valor={emisor.direccion} />
                    </dl>
                  </section>

                  <section>
                    <h3 className="font-semibold text-gray-800 mb-2">Receptor</h3>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      <DatoDetalleDte etiqueta="Nombre" valor={receptor.nombre || detalleDte.receiver_name} />
                      <DatoDetalleDte etiqueta="Documento" valor={[receptor.tipoDocumento || detalleDte.receiver_doc_type, receptor.numDocumento || detalleDte.receiver_doc_number].filter(Boolean).join(' · ')} />
                      <DatoDetalleDte etiqueta="NIT / NRC" valor={[receptor.nit, receptor.nrc].filter(Boolean).join(' · ')} />
                      <DatoDetalleDte etiqueta="Correo" valor={receptor.correo} />
                      <DatoDetalleDte etiqueta="Teléfono" valor={receptor.telefono} />
                      <DatoDetalleDte etiqueta="Dirección" valor={receptor.direccion} />
                    </dl>
                  </section>

                  <section>
                    <h3 className="font-semibold text-gray-800 mb-2">Conceptos</h3>
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="w-full min-w-[650px]">
                        <thead className="bg-gray-50"><tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Descripción</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Cantidad</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Precio unitario</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Gravado / compra</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Exento</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">IVA</th>
                        </tr></thead>
                        <tbody className="divide-y divide-gray-100">
                          {items.length === 0 ? <tr><td colSpan="6" className="px-3 py-4 text-center text-sm text-gray-500">Sin conceptos detallados</td></tr> : items.map((item, i) => (
                            <tr key={item.numItem || item.id || i}>
                              <td className="px-3 py-2 text-sm text-gray-800">{item.descripcion || item.name || '—'}</td>
                              <td className="px-3 py-2 text-sm text-right">{mostrarValor(item.cantidad)}</td>
                              <td className="px-3 py-2 text-sm text-right">{montoDte(item.precioUni ?? item.unit_price)}</td>
                              <td className="px-3 py-2 text-sm text-right">{montoDte(item.ventaGravada ?? item.compra ?? item.taxable_amount)}</td>
                              <td className="px-3 py-2 text-sm text-right">{montoDte(item.ventaExenta ?? item.exempt_amount)}</td>
                              <td className="px-3 py-2 text-sm text-right">{montoDte(item.ivaItem ?? item.vat_amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-2">Resumen fiscal</h3>
                      <dl className="grid grid-cols-2 gap-2">
                        {valoresResumen.map(([etiqueta, valor]) => <DatoDetalleDte key={etiqueta} etiqueta={etiqueta} valor={montoDte(valor)} />)}
                      </dl>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-2">Forma(s) de pago</h3>
                      {pagos.length ? <div className="space-y-2">{pagos.map((pago, i) => (
                        <div key={i} className="rounded-lg bg-gray-50 px-3 py-2 text-sm flex justify-between gap-3">
                          <span>{pago.codigo || 'Pago'}{pago.referencia ? ' · ' + pago.referencia : ''}</span><strong>{montoDte(pago.montoPago)}</strong>
                        </div>
                      ))}</div> : <p className="text-sm text-gray-500">Sin pagos detallados.</p>}
                    </div>
                  </section>

                  <details className="rounded-lg border border-gray-200">
                    <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-primary-700">Ver JSON completo del DTE</summary>
                    <pre className="max-h-80 overflow-auto bg-gray-900 text-green-300 p-4 text-xs whitespace-pre-wrap break-all">{JSON.stringify(json, null, 2)}</pre>
                  </details>
                </>}
              </div>
            </div>
          </div>
        );
      })()}

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
              <div className="col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">Descripción del error *</label><input className="input-field" maxLength={200} value={formInv.motivo} onChange={(e) => setFormInv(Object.assign({}, formInv, { motivo: e.target.value }))} /></div>
              {(() => {
                const requiereReemplazo = [1, 3].includes(Number(formInv.tipoAnulacion)) && !['05', '08'].includes(String(modalInvalidar.dte_type));
                const opcionesReemplazo = aceptados.filter((d) => String(d.dte_type) === String(modalInvalidar.dte_type) && d.uuid_generation !== modalInvalidar.uuid_generation);
                return <div className="col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">DTE de reemplazo {requiereReemplazo ? '*' : '(no requerido)'}</label>
                  {requiereReemplazo ? <select className="input-field" value={formInv.codigoReemplazo} onChange={(e) => setFormInv(Object.assign({}, formInv, { codigoReemplazo: e.target.value }))}>
                    <option value="">-- Seleccione un DTE aceptado del mismo tipo --</option>
                    {opcionesReemplazo.map((d) => <option key={d.uuid_generation} value={d.uuid_generation}>{d.control_number} · {d.uuid_generation}</option>)}
                  </select> : <p className="text-sm text-gray-500">No se requiere reemplazo para este tipo de invalidación o documento.</p>}
                  {requiereReemplazo && opcionesReemplazo.length === 0 && <p className="mt-1 text-xs text-amber-700">No hay DTEs aceptados de este tipo para reemplazarlo.</p>}
                </div>;
              })()}
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
                {facturables.length === 0 ? (
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-lg p-3">
                    No hay reservas pagadas sin DTE pendientes. Primero registre un pago en el módulo <strong>Pagos</strong>.
                  </div>
                ) : (
                  <SearchableSelect value={formEmitir.reservation_id} onChange={(valor) => setFormEmitir(Object.assign({}, formEmitir, { reservation_id: valor }))} placeholder="Escribe PNR o nombre..."
                    options={facturables.map((r) => ({ value: r.id, label: r.pnr + ' - ' + (r.customer_first || '') + ' ' + (r.customer_last || ''), searchText: r.pnr + ' ' + (r.customer_first || '') + ' ' + (r.customer_last || '') }))} />
                )}
              </div>
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
              <button className="btn-primary" onClick={emitirContingencia} disabled={procesando || facturables.length === 0}>{procesando ? 'Emitiendo...' : 'Emitir en contingencia'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ContingenciaDTE;
