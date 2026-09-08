import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import NuevaReserva from './pages/NuevaReserva';
import Vuelos from './pages/Vuelos';
import Aeropuertos from './pages/Aeropuertos';
import Reservas from './pages/Reservas';
import Pagos from './pages/Pagos';
import DTE from './pages/DTE';
import NotasCredito from './pages/NotasCredito';
import ContingenciaDTE from './pages/ContingenciaDTE';
import Aeronaves from './pages/Aeronaves';
import Empleados from './pages/Empleados';
import Reportes from './pages/Reportes';
import Auditoria from './pages/Auditoria';
import CierreQA from './pages/CierreQA';
import Operaciones from './pages/Operaciones';
import CumplimientoFiscal from './pages/CumplimientoFiscal';
import DteExport from './pages/DteExport';
import Comercial from './pages/Comercial';
import Correos from './pages/Correos';
import Checkin from './pages/Checkin';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="nueva-reserva" element={<NuevaReserva />} />
            <Route path="vuelos" element={<Vuelos />} />
            <Route path="aeropuertos" element={<Aeropuertos />} />
            <Route path="reservas" element={<Reservas />} />
            <Route path="pagos" element={<Pagos />} />
            <Route path="dte" element={<DTE />} />`n            <Route path="notas" element={<NotasCredito />} />
            <Route path="contingencia" element={<ContingenciaDTE />} />
            <Route path="aeronaves" element={<Aeronaves />} />
            <Route path="empleados" element={<Empleados />} />
            <Route path="reportes" element={<Reportes />} />
            <Route path="comercial" element={<Comercial />} />`n            <Route path="auditoria" element={<Auditoria />} />`n            <Route path="cierre-qa" element={<CierreQA />} />`n            <Route path="operaciones" element={<Operaciones />} />`n            <Route path="cumplimiento" element={<CumplimientoFiscal />} />`n            <Route path="dte-export" element={<DteExport />} />`n            <Route path="correos" element={<Correos />} />
            <Route path="checkin" element={<Checkin />} />
          </Route>
        </Routes>
        <Toaster position="top-right" />
      </BrowserRouter>
    </AuthProvider>
  );
}
export default App;