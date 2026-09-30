import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FiPlus, FiToggleLeft, FiToggleRight, FiX } from 'react-icons/fi';

const FiscalidadTasas = () => {
  const [paises, setPaises] = useState([]); const [aeropuertos, setAeropuertos] = useState([]); const [reglas, setReglas] = useState([]);
  const [pais, setPais] = useState({ code: '', name: '' });
  const [regla, setRegla] = useState({ country_id: '', airport_id: '', code: '', name: '', calculation_type: 'percentage', value: '', applies_to: 'all' });
  const [drawerRegla, setDrawerRegla] = useState(null);
  const [modal, setModal] = useState(false);
  const [reglaEditando, setReglaEditando] = useState(null);

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
  const editarReglaAction = (r) => {
    setReglaEditando(r);
    setRegla({
      country_id: r.country_id || '',
      airport_id: r.airport_id || '',
      code: r.code || '',
      name: r.name || '',
      calculation_type: r.calculation_type || 'percentage',
      value: r.value || '',
      applies_to: r.applies_to || 'all'
    });
    setModal(true);
  };
  const actualizarRegla = async () => {
    try { 
      await api.put('/fiscalidad/reglas/' + reglaEditando.id, regla); 
      setModal(false); 
      setReglaEditando(null); 
      setRegla({ country_id: '', airport_id: '', code: '', name: '', calculation_type: 'percentage', value: '', applies_to: 'all' }); 
      toast.success('Regla fiscal actualizada'); 
      cargar(); 
    }
    catch (e) { toast.error(e.response?.data?.error || 'Error al actualizar regla'); }
  };
  const toggle = async (r) => { try { await api.patch('/fiscalidad/reglas/' + r.id, { active: !r.active }); cargar(); } catch { toast.error('No se pudo actualizar la regla'); } };
  const set = (key, value) => setRegla((prev) => ({ ...prev, [key]: value, ...(key === 'country_id' ? { airport_id: '' } : {}) }));

  const InfoFila = ({ label, value }) => (
    <div className="flex items-center py-2 border-b border-gray-100 last:border-0">
      <span className="font-medium w-36 text-gray-700">{label}:</span>
      <span className="text-gray-600">{value}</span>
    </div>
  );

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
          <select className="input-field" value={regla.applies_to} onChange={(e) => set('applies_to', e.target.value)}><option value="all">Todos los vuelos</option><option value="domestic">Solo nacionales</option><option value="international">Solo internacionales</option></select><button className="btn-primary" onClick={() => { setReglaEditando(null); crearRegla(); }}>Crear regla</button></div>
      </div>
    </div>
    <div className="card overflow-hidden"><table className="w-full"><thead className="bg-gray-50"><tr><th className="p-3 text-left text-xs uppercase text-gray-600 font-semibold">Ámbito</th><th className="p-3 text-left text-xs uppercase text-gray-600 font-semibold">Impuesto/tasa</th><th className="p-3 text-left text-xs uppercase text-gray-600 font-semibold">Cálculo</th><th className="p-3 text-left text-xs uppercase text-gray-600 font-semibold">Aplica a</th><th className="p-3 text-left text-xs uppercase text-gray-600 font-semibold">Estado</th></tr></thead><tbody className="divide-y">{reglas.map((r) => <tr key={r.id} onClick={() => setDrawerRegla(r)} className="cursor-pointer hover:bg-gray-50"><td className="p-3 text-sm">{r.country_name}{r.airport_code ? ' · ' + r.airport_code : ' · Nacional'}</td><td className="p-3 text-sm font-medium">{r.code} · {r.name}</td><td className="p-3 text-sm">{r.calculation_type === 'percentage' ? r.value + '%' : '$' + Number(r.value).toFixed(2)}</td><td className="p-3 text-sm">{r.applies_to === 'all' ? 'Todos' : r.applies_to === 'domestic' ? 'Nacional' : 'Internacional'}</td><td className="p-3"><button className={r.active ? 'text-green-700' : 'text-red-700'} onClick={(e) => { e.stopPropagation(); toggle(r); }}>{r.active ? <FiToggleRight size={22}/> : <FiToggleLeft size={22}/>}</button></td></tr>)}{!reglas.length && <tr><td colSpan="5" className="p-6 text-center text-gray-500">No hay reglas configuradas.</td></tr>}</tbody></table></div>

    {/* Drawer */}
    {drawerRegla && (
      <>
        <div className="fixed inset-0 bg-black bg-opacity-40 z-40" onClick={() => setDrawerRegla(null)}></div>
        <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center space-x-3">
              <div className="bg-primary-600 text-white rounded-full w-10 h-10 flex items-center justify-center text-lg font-bold">
                {drawerRegla.code?.charAt(0) || 'R'}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">{drawerRegla.code}</h3>
                <p className="text-sm text-gray-500">{drawerRegla.name}</p>
              </div>
            </div>
            <button onClick={() => setDrawerRegla(null)} className="text-gray-500 hover:text-gray-700">
              <FiX size={22} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <InfoFila label="País" value={drawerRegla.country_name || '-'} />
            <InfoFila label="Aeropuerto" value={drawerRegla.airport_code ? drawerRegla.airport_code + ' - ' + drawerRegla.airport_name : 'Nacional'} />
            <InfoFila label="Código" value={drawerRegla.code} />
            <InfoFila label="Nombre" value={drawerRegla.name} />
            <InfoFila label="Cálculo" value={drawerRegla.calculation_type === 'percentage' ? 'Porcentaje' : 'Monto fijo'} />
            <InfoFila label="Valor" value={drawerRegla.calculation_type === 'percentage' ? drawerRegla.value + '%' : '$' + Number(drawerRegla.value).toFixed(2)} />
            <InfoFila label="Aplica a" value={drawerRegla.applies_to === 'all' ? 'Todos' : drawerRegla.applies_to === 'domestic' ? 'Nacional' : 'Internacional'} />
            <InfoFila label="Estado" value={drawerRegla.active ? 'Activo' : 'Inactivo'} />
          </div>
          <div className="px-6 pt-5 pb-10 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
            <button onClick={() => { const r = drawerRegla; setDrawerRegla(null); toggle(r); }} className="btn-secondary">
              {drawerRegla.active ? 'Desactivar' : 'Activar'}
            </button>
            <button onClick={() => { const r = drawerRegla; setDrawerRegla(null); editarReglaAction(r); }} className="btn-primary">
              Editar regla
            </button>
            <button onClick={() => setDrawerRegla(null)} className="btn-secondary">Cerrar</button>
          </div>
        </div>
      </>
    )}

    {/* Modal */}
    {modal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Editar Regla Fiscal</h2>
            <button onClick={() => { setModal(false); setRegla({ country_id: '', airport_id: '', code: '', name: '', calculation_type: 'percentage', value: '', applies_to: 'all' }); }} className="text-gray-500 hover:text-gray-700">
              <FiX size={22} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">País *</label>
              <select className="input-field" value={regla.country_id} onChange={(e) => set('country_id', e.target.value)}>
                <option value="">Seleccionar país</option>
                {paises.filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Aeropuerto (Opcional)</label>
              <select className="input-field" value={regla.airport_id} onChange={(e) => set('airport_id', e.target.value)} disabled={!regla.country_id}>
                <option value="">Todo el país</option>
                {aeropuertos.filter((a) => String(a.country_id) === String(regla.country_id)).map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código *</label>
              <input className="input-field" placeholder="IVA" value={regla.code} onChange={(e) => set('code', e.target.value.toUpperCase())}/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input className="input-field" placeholder="Impuesto al Valor Agregado" value={regla.name} onChange={(e) => set('name', e.target.value)}/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de cálculo *</label>
              <select className="input-field" value={regla.calculation_type} onChange={(e) => set('calculation_type', e.target.value)}>
                <option value="percentage">Porcentaje</option>
                <option value="fixed">Monto fijo por pasajero</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor *</label>
              <input type="number" min="0" step="0.01" className="input-field" placeholder={regla.calculation_type === 'percentage' ? 'Porcentaje' : 'USD'} value={regla.value} onChange={(e) => set('value', e.target.value)}/>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Aplica a *</label>
              <select className="input-field" value={regla.applies_to} onChange={(e) => set('applies_to', e.target.value)}>
                <option value="all">Todos los vuelos</option>
                <option value="domestic">Solo nacionales</option>
                <option value="international">Solo internacionales</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-6">
            <button className="btn-secondary" onClick={() => { setModal(false); setRegla({ country_id: '', airport_id: '', code: '', name: '', calculation_type: 'percentage', value: '', applies_to: 'all' }); }}>Cancelar</button>
            <button className="btn-primary" onClick={actualizarRegla}>Guardar cambios</button>
          </div>
        </div>
      </div>
    )}
  </div>;
};
export default FiscalidadTasas;

