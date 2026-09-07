import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Layout from './components/Layout';

// Componente para proteger rutas
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('bo_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta pública: Login */}
        <Route path="/login" element={<Login />} />

        {/* Rutas protegidas con Layout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          {/* Aquí agregaremos más rutas después */}
          <Route path="vuelos" element={<div className="p-6">Módulo de Vuelos (Próximamente)</div>} />
          <Route path="reservas" element={<div className="p-6">Módulo de Reservas (Próximamente)</div>} />
          <Route path="dte" element={<div className="p-6">Módulo DTE (Próximamente)</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;