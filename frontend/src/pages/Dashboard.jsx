import { useEffect, useState } from 'react';
import { FiPlane, FiUsers, FiDollarSign, FiAlertCircle } from 'react-icons/fi';

const Dashboard = () => {
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    // Aquí podrías cargar datos del backend
    setUsuario({ nombre: 'Administrador', rol: 'admin' });
  }, []);

  const kpis = [
    { titulo: 'Vuelos Hoy', valor: '24', icono: FiPlane, color: 'bg-blue-500' },
    { titulo: 'Pasajeros', valor: '1,847', icono: FiUsers, color: 'bg-green-500' },
    { titulo: 'Ventas del Día', valor: '$48,520', icono: FiDollarSign, color: 'bg-purple-500' },
    { titulo: 'DTE Pendientes', valor: '3', icono: FiAlertCircle, color: 'bg-orange-500' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 mt-1">Bienvenido, {usuario?.nombre || 'Usuario'}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpis.map((kpi, index) => (
          <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">{kpi.titulo}</p>
                <p className="text-3xl font-bold text-gray-800">{kpi.valor}</p>
              </div>
              <div className={`${kpi.color} p-3 rounded-lg text-white`}>
                <kpi.icono size={24} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Contenido adicional */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Actividad Reciente</h2>
        <p className="text-gray-500">Aquí se mostrarán las últimas acciones del sistema.</p>
      </div>
    </div>
  );
};

export default Dashboard;