import { FiSend, FiUsers, FiDollarSign, FiAlertCircle } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { hora: '06:00', vuelos: 2 }, { hora: '08:00', vuelos: 3 }, { hora: '10:00', vuelos: 4 },
  { hora: '12:00', vuelos: 3 }, { hora: '14:00', vuelos: 4 }, { hora: '16:00', vuelos: 5 },
  { hora: '18:00', vuelos: 3 }, { hora: '20:00', vuelos: 2 },
];

const kpis = [
  { titulo: 'Vuelos Hoy', valor: '24', icono: FiSend, color: 'bg-blue-500' },
  { titulo: 'Pasajeros', valor: '1,847', icono: FiUsers, color: 'bg-green-500' },
  { titulo: 'Ventas del Día', valor: '$48,520', icono: FiDollarSign, color: 'bg-purple-500' },
  { titulo: 'DTE Pendientes', valor: '3', icono: FiAlertCircle, color: 'bg-orange-500' },
];

const Dashboard = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
      <p className="text-gray-500 mt-1">Resumen operativo del día</p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {kpis.map((k, i) => (
        <div key={i} className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">{k.titulo}</p>
              <p className="text-3xl font-bold text-gray-800">{k.valor}</p>
            </div>
            <div className={k.color + ' p-3 rounded-lg text-white'}><k.icono size={24} /></div>
          </div>
        </div>
      ))}
    </div>
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Vuelos por Hora</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="hora" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="vuelos" fill="#3b82f6" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);
export default Dashboard;