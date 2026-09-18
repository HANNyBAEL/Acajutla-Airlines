import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FiPlus, FiToggleLeft, FiToggleRight } from 'react-icons/fi';

const FiscalidadTasas = () => {
  const [paises, setPaises] = useState([]); const [aeropuertos, setAeropuertos] = useState([]); const [reglas, setReglas] = useState([]);
  const [pais, setPais] = useState({ code: '', name: '' });
  const [regla, setRegla] = useState({ country_id: '', airport_id: '', code: '', name: '', calculation_type: 'percentage', value: '', applies_to: 'all' });
  const cargar = async () => {
    try {
      const [p, a, r] = await Promise.all([api.get('/fiscalidad/paises'), api.get('/aeropuertos'), api.get('/fiscalidad/reglas')]);
      setPaises(p.data.datos || []); setAeropuertos(a.data.datos || []); setReglas(r.data.datos || []);
    } catch { toast.error('No se pudo cargar la configuración fiscal'); }
  };
  useEffect(() => { cargar(); }, []);
  const crearPais = async () => {
    try { await api.post('/fiscalidad/paises', pais); setPais({ code: '', name: '' }); toast.success('País creado'); cargar(); }
    catch (e) { toast.error(e.response?.data?.error || 'Error al crear país'); }
  };
  const crearRegla = async () => {
    try { await api.post('/fiscalidad/reglas', regla); setRegla({ country_id: '', airport_id: '', code: '', name: '', calculation_type: 'percentage', value: '', applies_to: 'all' }); toast.success('Regla fiscal creada'); cargar(); }
    catch (e) { toast.error(e.response?.data?.error || 'Error al crear regla'); }
  };
  const toggle = async (r) => { try { await api.patch('/fiscalidad/reglas/' + r.id, { active: !r.active }); cargar(); } catch { toast.error('No se pudo actualizar la regla'); } };
  const set = (key, value) => setRegla((prev) => ({ ...prev, [key]: value, ...(key === 'country_id' ? { airport_id: '' } : {}) }));
  return <div className="space-y-6">
    <div><h1 className="text-3xl font-bold text-gray-800">Fiscalidad y tasas</h1><p className="text-gray-500 mt-1">Impuestos por país y cargos específicos de aeropuerto. Se aplican al aeropuerto de salida.</p></div>
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="card p-5 space-y-3"><h2 className="font-semibold text-gray-800">Nuevo país</h2>
        <div className="flex gap-3"><input className="input-field w-28" maxLength="2" placeholder="MX" value={pais.code} onChange={(e) => setPais({ ...pais, code: e.target.value.toUpperCase() })}/><input className="input-field" placeholder="México" value={pais.name} onChange={(e) => setPais({ ...pais, name: e.target.value })}/><button className="btn-primary" onClick={crearPais}><FiPlus /></button></div>
        <div className="flex flex-wrap gap-2">{paises.map((p) => <span key={p.id} className="px-2 py-1 rounded bg-gray-100 text-sm">{p.code} · {p.name}</span>)}</div>
      </div>
      <div className="card p-5 space-y-3"><h2 className="font-semibold text-gray-800">Nueva regla fiscal</h2>
        <div className="grid grid-cols-2 gap-3"><select className="input-field" value={regla.country_id} onChange={(e) => set('country_id', e.target.value)}><option value="">País *</option>{paises.filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <select className="input-field" value={regla.airport_id} onChange={(e) => set('airport_id', e.target.value)} disabled={!regla.country_id}><option value="">Todo el país</option>{aeropuertos.filter((a) => String(a.country_id) === String(regla.country_id)).map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}</select>
          <input className="input-field" placeholder="Código: IVA" value={regla.code} onChange={(e) => set('code', e.target.value.toUpperCase())}/><input className="input-field" placeholder="Nombre: IVA" value={regla.name} onChange={(e) => set('name', e.target.value)}/>
          <select className="input-field" value={regla.calculation_type} onChange={(e) => set('calculation_type', e.target.value)}><option value="percentage">Porcentaje</option><option value="fixed">Monto fijo por pasajero</option></select><input type="number" min="0" step="0.01" className="input-field" placeholder={regla.calculation_type === 'percentage' ? 'Porcentaje' : 'USD'} value={regla.value} onChange={(e) => set('value', e.target.value)}/>
          <select className="input-field" value={regla.applies_to} onChange={(e) => set('applies_to', e.target.value)}><option value="all">Todos los vuelos</option><option value="domestic">Solo nacionales</option><option value="international">Solo internacionales</option></select><button className="btn-primary" onClick={crearRegla}>Crear regla</button></div>
      </div>
    </div>
    <div className="card overflow-hidden"><table className="w-full"><thead className="bg-gray-50"><tr><th className="p-3 text-left text-xs uppercase">Ámbito</th><th className="p-3 text-left text-xs uppercase">Impuesto/tasa</th><th className="p-3 text-left text-xs uppercase">Cálculo</th><th className="p-3 text-left text-xs uppercase">Aplica a</th><th className="p-3 text-left text-xs uppercase">Estado</th></tr></thead><tbody className="divide-y">{reglas.map((r) => <tr key={r.id}><td className="p-3 text-sm">{r.country_name}{r.airport_code ? ' · ' + r.airport_code : ' · Nacional'}</td><td className="p-3 text-sm font-medium">{r.code} · {r.name}</td><td className="p-3 text-sm">{r.calculation_type === 'percentage' ? r.value + '%' : '$' + Number(r.value).toFixed(2)}</td><td className="p-3 text-sm">{r.applies_to === 'all' ? 'Todos' : r.applies_to === 'domestic' ? 'Nacional' : 'Internacional'}</td><td className="p-3"><button className={r.active ? 'text-green-700' : 'text-red-700'} onClick={() => toggle(r)}>{r.active ? <FiToggleRight size={22}/> : <FiToggleLeft size={22}/>}</button></td></tr>)}{!reglas.length && <tr><td colSpan="5" className="p-6 text-center text-gray-500">No hay reglas configuradas.</td></tr>}</tbody></table></div>
  </div>;
};
export default FiscalidadTasas;
