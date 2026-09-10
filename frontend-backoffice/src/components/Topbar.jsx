import { useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { FiBell } from 'react-icons/fi';

const Topbar = () => {
  const [notas, setNotas] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);

  const cargar = () => {
    api.get('/notificaciones').then((r) => setNotas(r.data.datos || [])).catch(() => setNotas([]));
  };

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 60000);
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
    document.addEventListener('mousedown', onClick);
    return () => { clearInterval(t); document.removeEventListener('mousedown', onClick); };
  }, []);

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex items-center space-x-4">
        <div className="relative" ref={ref}>
          <button
            className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            onClick={() => { setAbierto(!abierto); if (!abierto) cargar(); }}
            title="Notificaciones"
          >
            <FiBell size={20} />
            {notas.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>}
          </button>
          {abierto && (
            <div className="absolute left-0 mt-2 w-96 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-2 border-b border-gray-100 text-sm font-semibold text-gray-700">
                Notificaciones ({notas.length})
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                {notas.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-gray-500 text-center">Sin notificaciones pendientes</div>
                ) : notas.map((n) => (
                  <div key={n.id} className="px-4 py-3 hover:bg-gray-50">
                    <p className="text-sm font-medium text-gray-800">{n.titulo}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{n.detalle}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs font-medium text-green-700">Sistema Operativo</span>
        </div>
      </div>
    </header>
  );
};
export default Topbar;