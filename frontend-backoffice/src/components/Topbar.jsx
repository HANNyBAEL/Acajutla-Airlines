import { FiBell, FiSearch } from 'react-icons/fi';

const Topbar = () => (
  <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
    <div className="relative max-w-md flex-1">
      <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input type="text" placeholder="Buscar PNR, vuelo, pasajero..."
        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
    </div>
    <div className="flex items-center space-x-4">
      <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
        <FiBell size={20} />
        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
      </button>
      <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-xs font-medium text-green-700">Sistema Operativo</span>
      </div>
    </div>
  </header>
);
export default Topbar;