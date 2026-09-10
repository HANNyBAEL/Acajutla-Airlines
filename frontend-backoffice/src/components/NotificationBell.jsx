import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell } from 'react-icons/fi';
import api from '../services/api';

const NotificationBell = () => {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  const cargar = () => {
    api.get('/notificaciones').then((r) => setItems(r.data.datos || [])).catch(() => {});
  };
  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 60000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const abrir = (n) => {
    api.post('/notificaciones/leer', { key: n.key }).catch(() => {});
    setItems((prev) => prev.filter((x) => x.key !== n.key));
    setOpen(false);
    navigate(n.link);
  };
  const leerTodas = () => {
    api.post('/notificaciones/leer-todas', { keys: items.map((i) => i.key) }).catch(() => {});
    setItems([]);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="relative p-2 rounded-full hover:bg-gray-100" aria-label="Notificaciones">
        <FiBell size={20} className="text-gray-600" />
        {items.length > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full"></span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-700">Notificaciones ({items.length})</span>
            {items.length > 0 && <button type="button" className="text-xs text-primary-600 hover:underline" onClick={leerTodas}>Marcar todas leídas</button>}
          </div>
          {items.length === 0 ? (
            <div className="px-4 py-6 text-sm text-gray-500 text-center">Sin notificaciones pendientes</div>
          ) : items.map((n) => (
            <button key={n.key} type="button" className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0" onClick={() => abrir(n)}>
              <div className="text-sm font-medium text-gray-800">{n.titulo}</div>
              <div className="text-xs text-gray-500 mt-0.5">{n.detalle}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
export default NotificationBell;