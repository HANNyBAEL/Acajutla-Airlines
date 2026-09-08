import { useEffect, useState } from 'react';
import api from '../services/api';
import { FiCheck, FiAlertTriangle, FiPlay } from 'react-icons/fi';
import toast from 'react-hot-toast';

const CierreQA = () => {
  const [pruebas, setPruebas] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [counts, setCounts] = useState({});

  const cargar = () => {
    api.get('/qa/pruebas').then((r) => setPruebas(r.data.datos || [])).catch(() => {});
    api.get('/qa/checklist').then((r) => setChecklist(r.data.datos || [])).catch(() => {});
  };
  useEffect(() => { cargar(); }, []);

  const run = async (doc) => {
    const n = counts[doc.doc_type] || 1;
    try {
      await api.post('/qa/pruebas/run', { doc_type: doc.doc_type, count: n });
      toast.success('Pruebas registradas para ' + doc.nombre);
      cargar();
    } catch (e) { toast.error('Error al registrar pruebas'); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Cierre QA y Seguridad</h1>
        <p className="text-gray-500 mt-1">Pruebas de transmisión mínimas (Manual XXIV) y checklist de seguridad (RNF)</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Pruebas de transmisión por tipo</h2>
          <div className="space-y-3">
            {pruebas.map((p) => (
              <div key={p.doc_type}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{p.nombre}</span>
                  <span className="text-gray-600">{p.passed}/{p.target} ({p.pct}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded h-2">
                  <div className={'h-2 rounded ' + (p.pct >= 100 ? 'bg-green-500' : 'bg-primary-500')} style={{ width: p.pct + '%' }}></div>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <input type="number" min="1" className="input-field py-1 w-20" value={counts[p.doc_type] ?? 1} onChange={(e) => setCounts(Object.assign({}, counts, { [p.doc_type]: e.target.value }))} />
                  <button className="btn-secondary py-1 px-2 text-xs flex items-center space-x-1" onClick={() => run(p)} disabled={p.pct >= 100}>
                    <FiPlay size={12} /><span>Simular lote</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Checklist de seguridad y cierre</h2>
          <div className="space-y-3">
            {checklist.map((c) => (
              <div key={c.id} className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200">
                {c.estado === 'ok' ? <FiCheck className="text-green-600 mt-1" /> : <FiAlertTriangle className="text-yellow-600 mt-1" />}
                <div>
                  <p className="text-sm font-medium text-gray-800">{c.nombre}</p>
                  <p className="text-xs text-gray-500">{c.detalle}</p>
                </div>
                <span className={'ml-auto px-2 py-1 rounded text-xs ' + (c.estado === 'ok' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')}>{c.estado}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
export default CierreQA;