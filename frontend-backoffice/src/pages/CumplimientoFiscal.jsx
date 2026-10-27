import { useEffect, useState } from 'react';
import api from '../services/api';
import SearchableSelect from '../components/SearchableSelect';
import { FiShield, FiCheck, FiAlertTriangle } from 'react-icons/fi';
import toast from 'react-hot-toast';

const TIPOS_RETORNO = { '01': 'FE' };
const normalizarTipo = (tipo) => String(tipo || '').padStart(2, '0');
const leerJson = (dte) => {
  try { return typeof dte.full_json === 'string' ? JSON.parse(dte.full_json) : (dte.full_json || {}); }
  catch (_) { return {}; }
};
const serializarEstable = (valor) => {
  if (Array.isArray(valor)) return '[' + valor.map(serializarEstable).join(',') + ']';
  if (valor && typeof valor === 'object') return '{' + Object.keys(valor).sort().map((k) => JSON.stringify(k) + ':' + serializarEstable(valor[k])).join(',') + '}';
  return JSON.stringify(valor ?? null);
};
const identidadRetorno = (dte) => {
  const json = leerJson(dte);
  return serializarEstable({
    tipo: normalizarTipo(dte.dte_type),
    emisor: json.emisor?.nit || dte.issuer_nit || '',
    receptor: json.receptor || { nombre: dte.receiver_name, tipoDocumento: dte.receiver_doc_type, numDocumento: dte.receiver_doc_number },
    tercero: json.ventaTercero || null,
    pais: json.receptor?.codPais || null,
    regimen: json.emisor?.regimen || json.emisor?.tipoRegimen || null,
    recinto: json.emisor?.recintoFiscal || null,
    tipoExportacion: json.emisor?.tipoItemExpor || null,
  });
};
const fechaLocalIso = () => {
  const hoy = new Date();
  return hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0') + '-' + String(hoy.getDate()).padStart(2, '0');
};
const fechaDteIso = (fecha) => {
  if (!fecha) return '';
  if (fecha instanceof Date) return fecha.getFullYear() + '-' + String(fecha.getMonth() + 1).padStart(2, '0') + '-' + String(fecha.getDate()).padStart(2, '0');
  return String(fecha).slice(0, 10);
};

const CumplimientoFiscal = () => {
  const [dtes, setDtes] = useState([]);
  const [sel, setSel] = useState([]);
  const [monto, setMonto] = useState('');
  const [desc, setDesc] = useState('');
  const [filtroRetorno, setFiltroRetorno] = useState('');
  const [uuidInv, setUuidInv] = useState('');
  const [fechaEv, setFechaEv] = useState('');
  const [resultado, setResultado] = useState(null);
  const [aplicando, setAplicando] = useState(false);
  const [generandoRetorno, setGenerandoRetorno] = useState(false);
  const [validando, setValidando] = useState(false);

  const cargar = () => {
    api.get('/dte').then((r) => setDtes(r.data.datos || [])).catch(() => {});
  };
  useEffect(() => { cargar(); }, []);

  const sellados = dtes.filter((d) => d.reception_seal && d.transmission_status === 'accepted' && TIPOS_RETORNO[normalizarTipo(d.dte_type)]);
  const consultaRetorno = filtroRetorno.trim().toLowerCase();
  const selladosFiltrados = sellados.filter((d) => {
    const tipo = normalizarTipo(d.dte_type);
    const texto = [d.uuid_generation, d.control_number, d.pnr, d.receiver_name, TIPOS_RETORNO[tipo]].filter(Boolean).join(' ').toLowerCase();
    return !consultaRetorno || texto.includes(consultaRetorno);
  });
  const dtesInvalidables = dtes.filter((d) => d.reception_seal && d.transmission_status === 'accepted');
  const seleccionados = sel.map((uuid) => dtes.find((d) => d.uuid_generation === uuid)).filter(Boolean);
  const sumaSeleccionada = seleccionados.reduce((total, d) => total + Number(d.total_to_pay || 0), 0);
  const dteInvalidacion = dtesInvalidables.find((d) => d.uuid_generation === uuidInv);

  const cambiarFechaEvento = (fecha) => { setFechaEv(fecha); setResultado(null); };
  const cambiarDteInvalidacion = (uuid) => { setUuidInv(uuid); setResultado(null); };

  const aplicar = async () => {
    setAplicando(true);
    try {
      const r = await api.post('/fiscal/aplicar', {});
      toast.success(r.data.mensaje);
    } catch (e) { toast.error('Error al aplicar cumplimiento'); }
    finally { setAplicando(false); }
  };

  const toggle = (uuid) => {
    if (sel.includes(uuid)) {
      setSel(sel.filter((x) => x !== uuid));
      return;
    }
    if (sel.length >= 50) return toast.error('El evento admite un máximo de 50 DTE');
    const nuevo = dtes.find((d) => d.uuid_generation === uuid);
    const primero = seleccionados[0];
    if (nuevo && primero && identidadRetorno(primero) !== identidadRetorno(nuevo)) {
      return toast.error('Selecciona DTE del mismo tipo, emisor, receptor y datos de exportación');
    }
    setSel([...sel, uuid]);
  };

  const enviarRetorno = async () => {
    if (!sel.length) return toast.error('Seleccione DTE(s)');
    const montoTexto = String(monto).trim();
    if (!/^\d+(\.\d{1,2})?$/.test(montoTexto) || Number(montoTexto) <= 0) return toast.error('Ingrese un monto mayor a cero con máximo dos decimales');
    if (Number(montoTexto) - sumaSeleccionada > 0.009) return toast.error('El monto supera la suma de los DTE seleccionados');
    const descripcion = desc.trim();
    if (!descripcion) return toast.error('Escriba la descripción del retorno');
    if (descripcion.length > 255) return toast.error('La descripción no puede superar 255 caracteres');
    setGenerandoRetorno(true);
    try {
      const r = await api.post('/fiscal/evento-retorno', { dteUuids: sel, monto: Number(montoTexto), descripcion });
      const correo = r.data.datos.correo;
      if (correo?.enviado && correo?.simulado) {
        toast.success('Evento ' + r.data.datos.uuid + ' sellado. PDF y JSON guardados en modo simulado.');
      } else if (correo?.enviado) {
        toast.success('Evento ' + r.data.datos.uuid + ' sellado; correo enviado con PDF y JSON');
      } else {
        toast('Evento ' + r.data.datos.uuid + ' sellado. No se pudo enviar el correo: ' + (correo?.motivo || 'sin destinatario'), { icon: '⚠️' });
      }
      setSel([]); setMonto(''); setDesc('');
      cargar();
    } catch (e) { toast.error(e.response && e.response.data ? e.response.data.error : 'Error al generar el evento'); }
    finally { setGenerandoRetorno(false); }
  };

  const validar = async () => {
    if (!uuidInv || !fechaEv) return toast.error('Seleccione DTE y fecha del evento');
    if (fechaEv > fechaLocalIso()) return toast.error('La fecha del evento no puede estar en el futuro');
    const fechaEmision = fechaDteIso(dteInvalidacion?.emission_date);
    if (fechaEmision && fechaEv < fechaEmision) return toast.error('La fecha del evento no puede ser anterior a la emisión del DTE');
    setValidando(true);
    setResultado(null);
    try {
      const r = await api.post('/fiscal/validar-invalidacion', { dteUuid: uuidInv, fechaEvento: fechaEv });
      setResultado(r.data.datos);
    } catch (e) { toast.error(e.response && e.response.data ? e.response.data.error : 'Error al validar el plazo'); }
    finally { setValidando(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Cumplimiento Fiscal</h1>
          <p className="text-gray-500 mt-1">Firma, sello, redondeos, pagos, Evento de Retorno y plazos de invalidación</p>
        </div>
        <button className="btn-primary flex items-center space-x-2" onClick={aplicar} disabled={aplicando}>
          <FiShield /><span>{aplicando ? 'Aplicando...' : 'Aplicar cumplimiento a DTEs'}</span>
        </button>
      </div>

      <div className="card p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Evento de Retorno V1 (reembolsos sobre FE)</h2>
            <p className="text-sm text-gray-500 mt-1">Solo FE aceptadas y selladas. Selecciona entre 1 y 50 del mismo emisor y receptor.</p>
          </div>
          <span className="text-sm text-gray-500">{sel.length}/50 seleccionados</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar y seleccionar DTEs</label>
            <input className="input-field mb-2" value={filtroRetorno} onChange={(e) => setFiltroRetorno(e.target.value)} placeholder="PNR, cliente, N° control o UUID..." />
            <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-1">
              {selladosFiltrados.length === 0 ? <p className="text-sm text-gray-500">No hay DTEs que coincidan con la búsqueda.</p> :
                selladosFiltrados.map((d) => (
                  <label key={d.uuid_generation} className="flex items-start space-x-2 text-sm py-1">
                    <input type="checkbox" checked={sel.includes(d.uuid_generation)} onChange={() => toggle(d.uuid_generation)} />
                    <span className="min-w-0">
                      <span className="block font-mono text-xs text-gray-800">{TIPOS_RETORNO[normalizarTipo(d.dte_type)]} · {d.control_number || d.uuid_generation.slice(0, 8) + '…'}</span>
                      <span className="block text-xs text-gray-500 truncate">{d.pnr ? d.pnr + ' · ' : ''}{d.receiver_name || 'Sin receptor'} · ${Number(d.total_to_pay || 0).toFixed(2)}</span>
                    </span>
                  </label>
                ))}
            </div>
            {sel.length > 0 && <p className="text-xs text-gray-500 mt-2">Total original seleccionado: ${sumaSeleccionada.toFixed(2)}. Los retornos anteriores pueden reducir el saldo disponible.</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto total a retornar *</label>
            <input type="number" min="0.01" max={sumaSeleccionada || undefined} step="0.01" inputMode="decimal" className="input-field" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0.00" />
            <label className="block text-sm font-medium text-gray-700 mb-1 mt-2">Descripción * <span className="font-normal text-gray-500">({desc.trim().length}/255)</span></label>
            <input className="input-field" maxLength={255} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Motivo del reembolso o devolución" />
          </div>
          <div className="flex items-end">
            <button className="btn-primary w-full" onClick={enviarRetorno} disabled={generandoRetorno || !sel.length}>
              {generandoRetorno ? 'Generando...' : 'Generar Evento de Retorno'}
            </button>
          </div>
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Verificador de plazo de invalidación</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <SearchableSelect value={uuidInv} onChange={cambiarDteInvalidacion} placeholder="Buscar por UUID, control, PNR o cliente..."
            options={dtesInvalidables.map((d) => ({
              value: d.uuid_generation,
              label: (TIPOS_RETORNO[normalizarTipo(d.dte_type)] || 'DTE ' + d.dte_type) + ' · ' + (d.control_number || d.uuid_generation.slice(0, 8) + '…') + ' · ' + (d.pnr || d.receiver_name || 'Sin receptor'),
              searchText: [d.uuid_generation, d.control_number, d.pnr, d.receiver_name].filter(Boolean).join(' '),
            }))} />
          <input type="date" max={fechaLocalIso()} className="input-field" value={fechaEv} onChange={(e) => cambiarFechaEvento(e.target.value)} />
          <button className="btn-secondary" onClick={validar} disabled={validando || !uuidInv || !fechaEv}>{validando ? 'Validando...' : 'Validar plazo'}</button>
        </div>
        {resultado && (
          <div className={'p-3 rounded flex items-center space-x-2 ' + (resultado.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
            {resultado.ok ? <FiCheck /> : <FiAlertTriangle />}<span className="text-sm">{resultado.mensaje}</span>
          </div>
        )}
      </div>
    </div>
  );
};
export default CumplimientoFiscal;
