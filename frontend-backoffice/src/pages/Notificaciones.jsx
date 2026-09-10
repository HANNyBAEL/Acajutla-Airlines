import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { FiBell, FiCheck, FiArrowRight } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Notificaciones = () => {
  const [items, setItems] = useState([]);
  const navigate = useNavigate();
  const cargar = () => api.get('/notificaciones').then((r) => setItems(r.data.datos || [])).catch(() => toast.error('Error al cargar notificaciones'));
  useEffect(() => { cargar(); }, []);

  const leer = async (n) => { await api.post('/notificaciones/leer', { key: n.key }).catch(() => {}); cargar(); };
  const ir = (n) => { api.post('/notificaciones/leer', { key: n.key }).catch(() => {}); navigate(n.link); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Notificaciones</h1>
          <p className="text-gray-500 mt-1">Pendientes operativos, fiscales y comerciales</p>
        </div>
        <FiBell size={26} className="text-gray-400" />
      </div>
      <div className="card overflow-hidden">
        {items.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-500">No hay notificaciones pendientes</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map((n) => (
              <li key={n.key} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-800">{n.titulo}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{n.detalle}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <button className="text-gray-500 hover:text-gray-700 flex items-center space-x-1" onClick={() => leer(n)} title="Marcar como leída">
                    <FiCheck size={16} /><span className="text-xs">Leída</span>
                  </button>
                  <button className="text-primary-600 hover:text-primary-800 flex items-center space-x-1" onClick={() => ir(n)}>
                    <FiArrowRight size={16} /><span className="text-xs">Ir</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
export default Notificaciones;