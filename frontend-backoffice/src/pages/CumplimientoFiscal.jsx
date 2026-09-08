import { useEffect, useState } from 'react';
import api from '../services/api';
import { FiShield, FiCheck, FiAlertTriangle } from 'react-icons/fi';
import toast from 'react-hot-toast';

const CumplimientoFiscal = () => {
  const [dtes, setDtes] = useState([]);
  const [sel, setSel] = useState([]);
  const [monto, setMonto] = useState('');
  const [desc, setDesc] = useState('');
  const [uuidInv, setUuidInv] = useState('');
  const [fechaEv, setFechaEv] = useState('');
  const [resultado, setResultado] = useState(null);
  const [aplicando, setAplicando] = useState(false);

  const cargar = () => {
    api.get('/dte').then((r) => setDtes(r.data.datos || [])).catch(() => {});
  };
  useEffect(() => { cargar(); }, []);

  const sellados = dtes.filter((d) => d.reception_seal && ['01','11','14'].includes(String(d.dte_type)));

  const aplicar = async () => {
    setAplicando(true);
    try {
      const r = await api.post('/fiscal/aplicar', {});
      toast.success(r.data.mensaje);
    } catch (e) { toast.error('Error al aplicar cumplimiento'); }
    finally { setAplicando(false); }
  };

  const toggle = (uuid) => setSel((s) => s.includes(uuid) ? s.filter((x) => x !== uuid) : [...s, uuid]);

  const enviarRetorno = async () => {
    if (!sel.length) return toast.error('Seleccione DTE(s)');
    if (!monto || Number(monto) <= 0) return toast.error('Ingrese monto de retorno');
    try {
      const r = await api.post('/fiscal/evento-retorno', { dteUuids: sel, monto: Number(monto), descripcion: desc });
      toast.success('Evento de Retorno sellado: ' + r.data.datos.uuid);
      setSel([]); setMonto(''); setDesc('');
    } catch (e) { toast.error(e.response && e.response.data ? e.response.data.error : 'Error'); }
  };

  const validar = async () => {
    if (!uuidInv || !fechaEv) return toast.error('Seleccione DTE y fecha del evento');
    try {
      const r = await api.post('/fiscal/validar-invalidacion', { dteUuid: uuidInv, fechaEvento: fechaEv });
      setResultado(r.data.datos);
    } catch (e) { toast.error('Error al validar'); }
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
        <h2 className="text-lg font-semibold text-gray-800">Evento de Retorno V1 (reembolsos sobre FE/FEXE/FSEE)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">DTEs sellados (máx 50, mismo tipo/emisor/receptor)</label>
            <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-1">
              {sellados.length === 0 ? <p className="text-sm text-gray-500">Sin DTEs sellados FE/FEXE/FSEE</p> :
                sellados.map((d) => (
                  <label key={d.uuid_generation} className="flex items-center space-x-2 text-sm">
                    <input type="checkbox" checked={sel.includes(d.uuid_generation)} onChange={() => toggle(d.uuid_generation)} />
                    <span className="font-mono text-xs">{d.uuid_generation.slice(0,8)}... ({d.dte_type})</span>
                  </label>
                ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto total a retornar</label>
            <input type="number" step="0.01" className="input-field" value={monto} onChange={(e) => setMonto(e.target.value)} />
            <label className="block text-sm font-medium text-gray-700 mb-1 mt-2">Descripción</label>
            <input className="input-field" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Reembolso / devolución" />
          </div>
          <div className="flex items-end">
            <button className="btn-primary w-full" onClick={enviarRetorno}>Generar Evento de Retorno</button>
          </div>
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Verificador de plazo de invalidación</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select className="input-field" value={uuidInv} onChange={(e) => setUuidInv(e.target.value)}>
            <option value="">-- DTE --</option>
            {dtes.filter((d) => d.reception_seal).map((d) => <option key={d.uuid_generation} value={d.uuid_generation}>{d.dte_type} · {d.uuid_generation.slice(0,8)}...</option>)}
          </select>
          <input type="date" className="input-field" value={fechaEv} onChange={(e) => setFechaEv(e.target.value)} />
          <button className="btn-secondary" onClick={validar}>Validar plazo</button>
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