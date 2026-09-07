import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Vuelos from './pages/Vuelos';
import Reservas from './pages/Reservas';
import NuevaReserva from './pages/NuevaReserva';
import Clientes from './pages/Clientes';
import Aeropuertos from './pages/Aeropuertos';
import DTE from './pages/DTE';
import Aeronaves from './pages/Aeronaves';
import Empleados from './pages/Empleados';
import Reportes from './pages/Reportes';
import Auditoria from './pages/Auditoria';

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
            <Route path="dte" element={<DTE />} />
            <Route path="aeronaves" element={<Aeronaves />} />
            <Route path="empleados" element={<Empleados />} />
            <Route path="reportes" element={<Reportes />} />
            <Route path="auditoria" element={<Auditoria />} />
          </Route>
        </Routes>
        <Toaster position="top-right" />
      </BrowserRouter>
    </AuthProvider>
  );
}
export default App;