import { useEffect, useState } from 'react';
import api from '../services/api';
import { FiMail, FiRefreshCw, FiSend, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { formatearFechaHoraDb } from '../utils/fechaServidor';
import { confirmarAccion } from '../utils/confirm';

const Correos = () => {
  const [correos, setCorreos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [detalleCorreo, setDetalleCorreo] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const cargar = () => {
    api.get('/correos')
      .then((r) => setCorreos(r.data.datos || []))
      .catch(() => toast.error('Error al cargar bandeja'))
      .finally(() => setCargando(false));
  };
  useEffect(() => { cargar(); }, []);

  const abrirDetalle = async (correo) => {
    setDetalleCorreo(correo);
    setCargandoDetalle(true);
    try {
      const r = await api.get('/correos/' + correo.id);
      setDetalleCorreo((actual) => actual && Number(actual.id) === Number(correo.id) ? r.data.datos : actual);
    } catch { toast.error('No se pudo cargar el detalle del correo'); }
    finally { setCargandoDetalle(false); }
  };

  const reenviar = async (correo) => {
    const confirmado = await confirmarAccion({
      title: '¿Confirmar reenvío?',
      text: '¿Deseas reenviar este correo a ' + correo.to_email + '?',
      confirmText: 'Sí, reenviar',
      isDanger: false
    });
    if (!confirmado) return;

    try {
      const r = await api.post('/correos/' + correo.id + '/reenviar', {});
      if (r.data.datos.enviado) toast.success(r.data.datos.simulado ? 'Reenvío simulado (sin BREVO_API_KEY)' : 'Correo reenviado');
      else toast.error(r.data.datos.motivo || 'No se pudo reenviar');
      cargar();
      if (detalleCorreo && Number(detalleCorreo.id) === Number(correo.id)) {
        api.get('/correos/' + correo.id).then((detalle) => setDetalleCorreo(detalle.data.datos)).catch(() => {});
      }
    } catch (e) { toast.error('Error al reenviar'); }
  };

  const badge = (s) => ({
    sent: ['Enviado', 'bg-green-100 text-green-700'],
    simulado: ['Simulado', 'bg-blue-100 text-blue-700'],
    pending: ['Pendiente', 'bg-yellow-100 text-yellow-700'],
    failed: ['Fallido', 'bg-red-100 text-red-700'],
  }[s] || [s, 'bg-gray-100 text-gray-700']);

  const lista = correos.filter((c) => JSON.stringify(c).toLowerCase().includes(filtro.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Correos Transaccionales</h1>
          <p className="text-gray-500 mt-1">Bandeja de salida (Brevo). Sin API key opera en modo simulado.</p>
        </div>
        <button className="btn-secondary flex items-center space-x-2" onClick={cargar}>
          <FiRefreshCw /><span>Actualizar</span>
        </button>
      </div>

      <div className="card p-4">
        <input className="input-field" placeholder="Filtrar por destinatario, asunto, plantilla, estado..." value={filtro} onChange={(e) => setFiltro(e.target.value)} />
        <p className="mt-2 text-xs text-gray-500">Haz clic en una fila para ver el contenido y el detalle completo del envío.</p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fecha</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Plantilla</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Para</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Asunto</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ref</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cargando ? (
              <tr><td colSpan="7" className="text-center py-8 text-gray-500">Cargando...</td></tr>
            ) : lista.length === 0 ? (
              <tr><td colSpan="7" className="text-center py-8 text-gray-500">Sin correos en bandeja</td></tr>
            ) : lista.map((c) => (
              <tr key={c.id} onClick={() => abrirDetalle(c)} className="cursor-pointer hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-600">{formatearFechaHoraDb(c.created_at)}</td>
                <td className="px-6 py-4 text-sm">{c.template}</td>
                <td className="px-6 py-4 text-sm">{c.to_email}</td>
                <td className="px-6 py-4 text-sm">{c.subject}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{c.ref_type || '-'} {c.ref_id || ''}</td>
                <td className="px-6 py-4"><span className={'px-3 py-1 rounded-full text-xs font-medium ' + badge(c.status)[1]}>{badge(c.status)[0]}</span></td>
                <td className="px-6 py-4">
                  <button onClick={(e) => { e.stopPropagation(); reenviar(c); }} className="text-primary-600 hover:text-primary-800 flex items-center space-x-1">
                    <FiSend size={15} /><span className="text-sm">Reenviar</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card p-4 flex items-start space-x-3 bg-blue-50 border-blue-200">
        <FiMail className="text-blue-600 mt-1" />
        <p className="text-sm text-blue-800">
          Para envío real configura en <code>backend/.env</code>: <code>BREVO_API_KEY=tu_llave</code> (y opcional <code>BREVO_SENDER_EMAIL</code>).
          Sin clave, los correos se marcan como <strong>Simulado</strong> y quedan visibles aquí para demo y auditoría.
        </p>
      </div>

      {detalleCorreo && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-40 z-40" onClick={() => setDetalleCorreo(null)}></div>
          <div className="fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-3 min-w-0">
                <div className="bg-primary-600 text-white rounded-xl w-11 h-11 shrink-0 flex items-center justify-center shadow-sm"><FiMail size={21} /></div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl font-bold text-gray-800">Correo #{detalleCorreo.id}</h3>
                    <span className={'px-2.5 py-0.5 rounded-full text-xs font-medium ' + badge(detalleCorreo.status)[1]}>{badge(detalleCorreo.status)[0]}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{detalleCorreo.subject || 'Sin asunto'}</p>
                </div>
              </div>
              <button onClick={() => setDetalleCorreo(null)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Cerrar detalle"><FiX size={22} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {cargandoDetalle ? <p className="text-sm text-gray-500">Cargando información completa...</p> : (
                <>
                  <section className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Información del correo</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div><p className="text-xs text-gray-500">Destinatario</p><p className="font-medium break-all">{detalleCorreo.to_email || '—'}</p></div>
                      <div><p className="text-xs text-gray-500">Plantilla</p><p className="font-medium break-all">{detalleCorreo.template || '—'}</p></div>
                      <div className="sm:col-span-2"><p className="text-xs text-gray-500">Asunto</p><p className="font-medium break-words">{detalleCorreo.subject || '—'}</p></div>
                      <div><p className="text-xs text-gray-500">Referencia</p><p>{detalleCorreo.ref_type || '—'}{detalleCorreo.ref_id ? ' · ' + detalleCorreo.ref_id : ''}</p></div>
                      <div><p className="text-xs text-gray-500">Creado</p><p>{detalleCorreo.created_at ? formatearFechaHoraDb(detalleCorreo.created_at) : '—'}</p></div>
                      <div><p className="text-xs text-gray-500">Enviado</p><p>{detalleCorreo.sent_at ? formatearFechaHoraDb(detalleCorreo.sent_at) : '—'}</p></div>
                      <div><p className="text-xs text-gray-500">ID de mensaje Brevo</p><p className="break-all">{detalleCorreo.brevo_message_id || '—'}</p></div>
                    </div>
                    {detalleCorreo.error_msg && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><p className="font-semibold mb-1">Detalle del error</p><p className="break-words">{detalleCorreo.error_msg}</p></div>}
                  </section>

                  <section className="space-y-2">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Contenido enviado</h4>
                    {detalleCorreo.html ? (
                      <>
                        <iframe title="Vista previa del correo" sandbox="" srcDoc={detalleCorreo.html} className="w-full h-80 rounded-lg border border-gray-200 bg-white" />
                        <details className="rounded-lg border border-gray-200 p-3">
                          <summary className="cursor-pointer text-sm font-medium text-gray-700">Ver código HTML</summary>
                          <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-all text-xs text-gray-600">{detalleCorreo.html}</pre>
                        </details>
                      </>
                    ) : <p className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500">Este correo no tiene contenido HTML guardado.</p>}
                  </section>
                </>
              )}
            </div>

            <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setDetalleCorreo(null)}>Cerrar</button>
              {!cargandoDetalle && <button onClick={() => reenviar(detalleCorreo)} className="btn-primary flex items-center gap-2"><FiSend size={15} /><span>Reenviar</span></button>}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
export default Correos;
