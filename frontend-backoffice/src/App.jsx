import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { BACKOFFICE_ROLES, DEFAULT_PAGE_BY_ROLE, roleOf, rolesForPage } from './utils/roles';
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
import Notificaciones from './pages/Notificaciones';
import CierreQA from './pages/CierreQA';
import Operaciones from './pages/Operaciones';
import CumplimientoFiscal from './pages/CumplimientoFiscal';
import DteExport from './pages/DteExport';
import Comercial from './pages/Comercial';
import Correos from './pages/Correos';
import Checkin from './pages/Checkin';
import FiscalidadTasas from './pages/FiscalidadTasas';

const RutaProtegida = ({ pagina, children }) => (
  <ProtectedRoute roles={rolesForPage(pagina)}>{children}</ProtectedRoute>
);

const PaginaInicial = () => {
  const { usuario } = useAuth();
  return <Navigate to={DEFAULT_PAGE_BY_ROLE[roleOf(usuario)] || '/dashboard'} replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute roles={BACKOFFICE_ROLES}><Layout /></ProtectedRoute>}>
            <Route index element={<PaginaInicial />} />
            <Route path="dashboard" element={<RutaProtegida pagina="dashboard"><Dashboard /></RutaProtegida>} />
            <Route path="clientes" element={<RutaProtegida pagina="clientes"><Clientes /></RutaProtegida>} />
            <Route path="nueva-reserva" element={<RutaProtegida pagina="nueva-reserva"><NuevaReserva /></RutaProtegida>} />
            <Route path="vuelos" element={<RutaProtegida pagina="vuelos"><Vuelos /></RutaProtegida>} />
            <Route path="aeropuertos" element={<RutaProtegida pagina="aeropuertos"><Aeropuertos /></RutaProtegida>} />
            <Route path="reservas" element={<RutaProtegida pagina="reservas"><Reservas /></RutaProtegida>} />
            <Route path="pagos" element={<RutaProtegida pagina="pagos"><Pagos /></RutaProtegida>} />
            <Route path="dte" element={<RutaProtegida pagina="dte"><DTE /></RutaProtegida>} />
            <Route path="notas" element={<RutaProtegida pagina="notas"><NotasCredito /></RutaProtegida>} />
            <Route path="contingencia" element={<RutaProtegida pagina="contingencia"><ContingenciaDTE /></RutaProtegida>} />
            <Route path="aeronaves" element={<RutaProtegida pagina="aeronaves"><Aeronaves /></RutaProtegida>} />
            <Route path="empleados" element={<RutaProtegida pagina="empleados"><Empleados /></RutaProtegida>} />
            <Route path="reportes" element={<RutaProtegida pagina="reportes"><Reportes /></RutaProtegida>} />
            <Route path="comercial" element={<RutaProtegida pagina="comercial"><Comercial /></RutaProtegida>} />
            <Route path="auditoria" element={<RutaProtegida pagina="auditoria"><Auditoria /></RutaProtegida>} />
            <Route path="notificaciones" element={<RutaProtegida pagina="notificaciones"><Notificaciones /></RutaProtegida>} />
            <Route path="cierre-qa" element={<RutaProtegida pagina="cierre-qa"><CierreQA /></RutaProtegida>} />
            <Route path="operaciones" element={<RutaProtegida pagina="operaciones"><Operaciones /></RutaProtegida>} />
            <Route path="cumplimiento" element={<RutaProtegida pagina="cumplimiento"><CumplimientoFiscal /></RutaProtegida>} />
            <Route path="fiscalidad" element={<RutaProtegida pagina="fiscalidad"><FiscalidadTasas /></RutaProtegida>} />
            <Route path="dte-export" element={<RutaProtegida pagina="dte-export"><DteExport /></RutaProtegida>} />
            <Route path="correos" element={<RutaProtegida pagina="correos"><Correos /></RutaProtegida>} />
            <Route path="checkin" element={<RutaProtegida pagina="checkin"><Checkin /></RutaProtegida>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="top-right" />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
