import { FiBarChart2, FiDownload } from 'react-icons/fi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { mes: 'Ene', ingresos: 45000 }, { mes: 'Feb', ingresos: 52000 }, { mes: 'Mar', ingresos: 48000 },
  { mes: 'Abr', ingresos: 61000 }, { mes: 'May', ingresos: 58000 }, { mes: 'Jun', ingresos: 72000 },
  { mes: 'Jul', ingresos: 85000 }, { mes: 'Ago', ingresos: 92000 },
];

const Reportes = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Reportes</h1>
        <p className="text-gray-500 mt-1">Análisis e ingresos 2026</p>
      </div>
      <button className="btn-secondary flex items-center space-x-2"><FiDownload /><span>Exportar</span></button>
    </div>
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Ingresos Mensuales</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="mes" />
          <YAxis />
          <Tooltip formatter={(v) => '$' + v.toLocaleString()} />
          <Line type="monotone" dataKey="ingresos" stroke="#3b82f6" strokeWidth={3} dot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
);
export default Reportes;