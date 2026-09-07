import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiSend } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Login = () => {
  const [form, setForm] = useState({ usuario: '', password: '' });
  const [mfa, setMfa] = useState({ codigo: '' });
  const [requiereMFA, setRequiereMFA] = useState(false);
  const [usuarioId, setUsuarioId] = useState(null);
  const [cargando, setCargando] = useState(false);
  const { iniciarSesion, verificarMFA } = useAuth();
  const navigate = useNavigate();

  const enviar = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {
      const r = await iniciarSesion(form);
      if (r.requiereMFA) { setRequiereMFA(true); setUsuarioId(r.usuarioId); toast.success('Código MFA enviado'); }
      else { toast.success('Bienvenido'); navigate('/dashboard'); }
    } catch (err) { toast.error(err.response?.data?.error || 'Error al iniciar sesión'); }
    finally { setCargando(false); }
  };

  const enviarMFA = async (e) => {
    e.preventDefault();
    setCargando(true);
    try { await verificarMFA(usuarioId, mfa.codigo); toast.success('Verificado'); navigate('/dashboard'); }
    catch (err) { toast.error(err.response?.data?.error || 'Código inválido'); }
    finally { setCargando(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FiSend className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">SkyManager</h1>
          <p className="text-gray-500 text-sm mt-1">Panel Administrativo - Acajutla Airlines</p>
        </div>
        {!requiereMFA ? (
          <form onSubmit={enviar} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
              <input type="text" value={form.usuario} onChange={(e) => setForm({ ...form, usuario: e.target.value })} className="input-field" placeholder="admin" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input-field" placeholder="••••••••" required />
            </div>
            <button type="submit" disabled={cargando} className="btn-primary w-full py-3">{cargando ? 'Ingresando...' : 'Iniciar Sesión'}</button>
          </form>
        ) : (
          <form onSubmit={enviarMFA} className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4"><p className="text-sm text-blue-800">Ingresa el código de 6 dígitos enviado a tu correo</p></div>
            <input type="text" value={mfa.codigo} onChange={(e) => setMfa({ ...mfa, codigo: e.target.value })} className="input-field text-center text-2xl tracking-widest" placeholder="000000" maxLength={6} required />
            <button type="submit" disabled={cargando} className="btn-primary w-full py-3">{cargando ? 'Verificando...' : 'Verificar Código'}</button>
          </form>
        )}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 font-semibold mb-2">Credenciales de prueba:</p>
          <p className="text-xs text-gray-500">Usuario: <code className="bg-white px-1 rounded">admin</code> | Contraseña: <code className="bg-white px-1 rounded">Admin123</code></p>
        </div>
      </div>
    </div>
  );
};
export default Login;