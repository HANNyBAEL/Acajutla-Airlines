import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Login = () => {
  const [form, setForm] = useState({ usuario: '', password: '' });
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mfa, setMfa] = useState({ codigo: '' });
  const [codigoMfaSimulado, setCodigoMfaSimulado] = useState('');
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
      if (r.requiereMFA) {
        setRequiereMFA(true);
        setUsuarioId(r.usuarioId);
        setCodigoMfaSimulado(r.codigoMfaSimulado || '');
        if (r.codigoMfaSimulado) setMfa({ codigo: r.codigoMfaSimulado });
        toast.success(r.codigoMfaSimulado ? 'Código MFA de simulación listo' : 'Código MFA enviado');
      }
      else { toast.success('Bienvenido'); navigate('/', { replace: true }); }
    } catch (err) { toast.error(err.response?.data?.error || 'Error al iniciar sesión'); }
    finally { setCargando(false); }
  };

  const enviarMFA = async (e) => {
    e.preventDefault();
    setCargando(true);
    try { await verificarMFA(usuarioId, mfa.codigo); toast.success('Verificado'); navigate('/', { replace: true }); }
    catch (err) { toast.error(err.response?.data?.error || 'Código inválido'); }
    finally { setCargando(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo-acajutla-airlines.png" alt="Acajutla Airlines" className="w-64 max-w-full h-auto mx-auto mb-4 rounded-lg" />
          <h1 className="text-xl font-bold text-gray-800">Panel administrativo</h1>
          <p className="text-gray-500 text-sm mt-1">Accede al sistema de gestión de la aerolínea</p>
        </div>
        {!requiereMFA ? (
          <form onSubmit={enviar} className="space-y-4">
            <div>
              <label htmlFor="login-usuario" className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
              <input id="login-usuario" type="text" autoComplete="username" value={form.usuario} onChange={(e) => setForm({ ...form, usuario: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <div className="relative">
                <input id="login-password" type={mostrarPassword ? "text" : "password"} autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input-field pr-10" required />
                <button type="button" onClick={() => setMostrarPassword(!mostrarPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none" aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                  {mostrarPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={cargando} className="btn-primary w-full py-3">{cargando ? 'Ingresando...' : 'Iniciar Sesión'}</button>
          </form>
        ) : (
          <form onSubmit={enviarMFA} className="space-y-4">
            {codigoMfaSimulado ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4" role="status">
                <p className="text-sm font-medium text-amber-900">MFA de simulación local</p>
                <p className="mt-1 text-sm text-amber-800">El entorno escolar bloquea correos externos. Usa este código de prueba:</p>
                <p className="mt-2 text-center font-mono text-2xl font-bold tracking-[0.3em] text-amber-950">{codigoMfaSimulado}</p>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4"><p className="text-sm text-blue-800">Ingresa el código de 6 dígitos enviado a tu correo</p></div>
            )}
            <label htmlFor="login-mfa" className="sr-only">Código MFA</label>
            <input id="login-mfa" inputMode="numeric" autoComplete="one-time-code" type="text" value={mfa.codigo} onChange={(e) => setMfa({ ...mfa, codigo: e.target.value.replace(/\D/g, '').slice(0, 6) })} className="input-field text-center text-2xl tracking-widest" maxLength={6} required />
            <button type="submit" disabled={cargando} className="btn-primary w-full py-3">{cargando ? 'Verificando...' : 'Verificar Código'}</button>
          </form>
        )}
        <p className="mt-6 text-center text-xs text-gray-500">Usa las credenciales de la cuenta de práctica configurada para tu equipo.</p>
      </div>
    </div>
  );
};
export default Login;
