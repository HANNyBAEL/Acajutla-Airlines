import { useEffect, useState } from 'react';
import api from '../services/api';
import { FiDollarSign, FiCheckCircle, FiRefreshCw, FiX, FiFileText, FiSearch, FiCreditCard, FiCalendar, FiHash } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { confirmarAccion } from '../utils/confirm';

const Pagos = () => {
  const [pendientes, setPendientes] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ method: 'card', amount: '', numero: '', expiracion: '', cvv: '', referencia: '', tipo_dte: '01', receptor_nit: '', receptor_nrc: '' });
  const [procesando, setProcesando] = useState(false);
  const [buscarPendientes, setBuscarPendientes] = useState('');
  const [buscarPagos, setBuscarPagos] = useState('');
  // Drawer state
  const [drawerPago, setDrawerPago] = useState(null);

  const cargar = () => {
    Promise.all([api.get('/pagos/reservas-pendientes'), api.get('/pagos')])
      .then((res) => {
        setPendientes(res[0].data.datos || []);
        setPagos(res[1].data.datos || []);
      })
      .catch(() => toast.error('Error al cargar pagos'))
      .finally(() => setCargando(false));
  };
  useEffect(() => { cargar(); }, []);

  const abrirCobro = (r) => {
    setModal(r);
    setForm({ method: 'card', amount: r.balance, numero: '', expiracion: '', cvv: '', referencia: '', tipo_dte: '01', receptor_nit: '', receptor_nrc: '' });
  };

  const procesar = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) return toast.error('Indique un monto válido');
    if (form.tipo_dte === '03' && !form.receptor_nit) return toast.error('Para CCFE el NIT del receptor es obligatorio (RN-FIS-02)');
    setProcesando(true);
    try {
      const payload = { reservation_id: modal.id, method: form.method, amount: parseFloat(form.amount), tipo_dte: form.tipo_dte };
      if (form.method === 'card') payload.card = { numero: form.numero, expiracion: form.expiracion, cvv: form.cvv };
      if (form.method === 'transfer') payload.referencia = form.referencia;
      if (form.tipo_dte === '03') payload.receptor = { nit: form.receptor_nit, nrc: form.receptor_nrc || null };
      const r = await api.post('/pagos/procesar', payload);
      const st = r.data.datos.status;
      if (st === 'approved') {
        toast.success('Pago aprobado y reserva pagada');
        if (r.data.dte && r.data.dte.envio && r.data.dte.envio.enviado) {
          toast.success('DTE ' + r.data.dte.numeroControl + ' emitido. Correo enviado con PDF y ZIP que contiene el JSON' + (r.data.dte.envio.simulado ? ' (simulado, ver storage/correos)' : ''));
        } else if (r.data.dte && r.data.dte.error) {
          toast.error('Pago OK, pero el DTE falló: ' + r.data.dte.error);
        } else if (r.data.dte) {
          toast.error('DTE emitido pero el correo no se envió: ' + (r.data.dte.envio ? r.data.dte.envio.motivo : 'sin correo'));
        }
      } else if (st === 'pending_confirmation') {
        toast.success('Pago registrado. Al confirmar la transferencia se emitirá y enviará el DTE.');
      } else {
        toast.error('Pago rechazado por la pasarela');
      }
      setModal(null);
      cargar();
    } catch (e) {
      toast.error(e.response && e.response.data && e.response.data.error ? e.response.data.error : 'Error al procesar el pago');
    } finally { setProcesando(false); }
  };

  const confirmar = async (p) => {
    const confirmado = await confirmarAccion({
      title: '¿Confirmar transferencia?',
      text: '¿Confirmar la transferencia del pago #' + p.id + ' (PNR ' + p.pnr + ')? Se emitirá y enviará el DTE.',
      confirmText: 'Sí, confirmar',
      isDanger: false
    });
    if (!confirmado) return;
    try {
      const r = await api.post('/pagos/' + p.id + '/confirmar', {});
      toast.success('Transferencia confirmada');
      if (r.data.dte && r.data.dte.envio && r.data.dte.envio.enviado) {
        toast.success('DTE ' + r.data.dte.numeroControl + ' emitido y enviado con PDF y ZIP que contiene el JSON');
      } else if (r.data.dte && r.data.dte.error) {
        toast.error('Confirmado, pero el DTE falló: ' + r.data.dte.error);
      }
      setDrawerPago(null);
      cargar();
    } catch (e) { toast.error(e.response && e.response.data ? e.response.data.error : 'Error al confirmar'); }
  };

  const reembolsar = async (p) => {
    const reason = window.prompt('Motivo del reembolso del pago #' + p.id + ' (PNR ' + p.pnr + '):');
    if (!reason) return;
    try {
      await api.post('/pagos/' + p.id + '/reembolsar', { amount: p.amount, reason: reason });
      toast.success('Reembolso procesado');
      setDrawerPago(null);
      cargar();
    } catch (e) { toast.error(e.response && e.response.data ? e.response.data.error : 'Error al reembolsar'); }
  };

  const badge = (s) => ({
    approved: ['Pagado', 'bg-green-100 text-green-700'],
    pending_confirmation: ['Pend. confirmación', 'bg-yellow-100 text-yellow-700'],
    rejected: ['Rechazado', 'bg-red-100 text-red-700'],
    refunded: ['Reembolsado', 'bg-gray-100 text-gray-700'],
    cancelled: ['Cancelado', 'bg-red-100 text-red-700'],
  }[s] || [s, 'bg-gray-100 text-gray-700']);

  const metodoLabel = (m) => ({ card: 'Tarjeta', transfer: 'Transferencia', cash: 'Efectivo', paypal: 'PayPal' }[m] || m);
  const coincide = (valor, texto) => !texto || JSON.stringify(valor).toLowerCase().includes(texto.trim().toLowerCase());
  const pendientesFiltrados = pendientes.filter((r) => coincide(r, buscarPendientes));
  const pagosFiltrados = pagos.filter((p) => coincide(p, buscarPagos));

  const [paginaPendientes, setPaginaPendientes] = useState(1);
  const [paginaPagos, setPaginaPagos] = useState(1);
  const itemsPorPagina = 40;

  const pendientesPaginados = pendientesFiltrados.slice((paginaPendientes - 1) * itemsPorPagina, paginaPendientes * itemsPorPagina);
  const pagosPaginados = pagosFiltrados.slice((paginaPagos - 1) * itemsPorPagina, paginaPagos * itemsPorPagina);

  const totalPaginasPendientes = Math.ceil(pendientesFiltrados.length / itemsPorPagina);
  const totalPaginasPagos = Math.ceil(pagosFiltrados.length / itemsPorPagina);

  // Al afinar la búsqueda la página actual puede quedar fuera de rango.
  useEffect(() => { setPaginaPendientes(1); }, [buscarPendientes]);
  useEffect(() => { setPaginaPagos(1); }, [buscarPagos]);

  const InfoFila = ({ icon: Icon, label, value }) => (
    <div className="flex items-center py-2.5 text-sm border-b border-gray-100 last:border-b-0">
      <Icon className="text-primary-600 mr-3 shrink-0" size={16} />
      <span className="font-medium text-gray-600 w-36 shrink-0">{label}:</span>
      <span className="text-gray-800 font-medium truncate">{value || '—'}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Procesamiento de Pagos</h1>
        <p className="text-gray-500 mt-1">Cobro con emisión automática de DTE y envío de correo con PDF y JSON</p>
      </div>

      {/* Tabla de cobros pendientes - sin drawer */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Cobros pendientes</h2>
          <label className="relative block sm:w-80">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input-field pl-9" value={buscarPendientes} onChange={(e) => setBuscarPendientes(e.target.value)} placeholder="Buscar PNR, cliente o correo..." />
          </label>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">PNR</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Cliente</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Total</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Saldo</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cargando ? (
              <tr><td colSpan="5" className="text-center py-8 text-gray-500">Cargando...</td></tr>
            ) : pendientesPaginados.length === 0 ? (
              <tr><td colSpan="5" className="text-center py-8 text-gray-500">{pendientes.length ? 'No hay cobros que coincidan con la búsqueda' : 'No hay cobros pendientes'}</td></tr>
            ) : pendientesPaginados.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-mono font-bold text-primary-700">{r.pnr}</td>
                <td className="px-6 py-4 text-sm">{r.first_names} {r.last_names}</td>
                <td className="px-6 py-4 text-sm">${parseFloat(r.estimated_total).toFixed(2)}</td>
                <td className="px-6 py-4 text-sm font-semibold text-orange-600">${parseFloat(r.balance).toFixed(2)}</td>
                <td className="px-6 py-4"><button className="btn-primary py-1 px-3 text-sm" onClick={() => abrirCobro(r)}>Cobrar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPaginasPendientes > 1 && (
          <div className="px-6 py-3 border-t flex items-center justify-between bg-gray-50">
            <button disabled={paginaPendientes === 1} onClick={() => setPaginaPendientes(paginaPendientes - 1)} className="px-3 py-1 bg-white border rounded text-sm disabled:opacity-50">Anterior</button>
            <span className="text-sm text-gray-600">Página {paginaPendientes} de {totalPaginasPendientes}</span>
            <button disabled={paginaPendientes === totalPaginasPendientes} onClick={() => setPaginaPendientes(paginaPendientes + 1)} className="px-3 py-1 bg-white border rounded text-sm disabled:opacity-50">Siguiente</button>
          </div>
        )}
      </div>

      {/* Tabla de historial de pagos - con drawer */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Historial de pagos</h2>
          <label className="relative block sm:w-80">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input-field pl-9" value={buscarPagos} onChange={(e) => setBuscarPagos(e.target.value)} placeholder="Buscar PNR, método, estado o monto..." />
          </label>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">#</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">PNR</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fecha</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Método</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Monto</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pagosPaginados.length === 0 ? (
              <tr><td colSpan="7" className="text-center py-8 text-gray-500">{pagos.length ? 'No hay pagos que coincidan con la búsqueda' : 'Sin pagos registrados'}</td></tr>
            ) : pagosPaginados.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => setDrawerPago(p)}>
                <td className="px-6 py-4 text-sm text-gray-600">{p.id}</td>
                <td className="px-6 py-4 font-mono text-sm text-primary-700">{p.pnr}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{p.payment_date ? new Date(p.payment_date).toLocaleString('es-SV') : '-'}</td>
                <td className="px-6 py-4 text-sm">{metodoLabel(p.method)}{p.card_last_digits ? ' ····' + p.card_last_digits : ''}</td>
                <td className="px-6 py-4 text-sm font-semibold">{p.type === 'refund' ? '-' : ''}${parseFloat(p.amount).toFixed(2)}</td>
                <td className="px-6 py-4"><span className={'px-3 py-1 rounded-full text-xs font-medium ' + badge(p.status)[1]}>{badge(p.status)[0]}</span></td>
                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center space-x-3">
                    {p.status === 'pending_confirmation' && (
                      <button onClick={() => confirmar(p)} className="text-green-600 hover:text-green-800 flex items-center space-x-1">
                        <FiCheckCircle size={16} /><span className="text-sm">Confirmar</span>
                      </button>
                    )}
                    {p.status === 'approved' && p.type === 'payment' && (
                      <button onClick={() => reembolsar(p)} className="text-red-600 hover:text-red-800 flex items-center space-x-1">
                        <FiRefreshCw size={16} /><span className="text-sm">Reembolsar</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPaginasPagos > 1 && (
          <div className="px-6 py-3 border-t flex items-center justify-between bg-gray-50">
            <button disabled={paginaPagos === 1} onClick={() => setPaginaPagos(paginaPagos - 1)} className="px-3 py-1 bg-white border rounded text-sm disabled:opacity-50">Anterior</button>
            <span className="text-sm text-gray-600">Página {paginaPagos} de {totalPaginasPagos}</span>
            <button disabled={paginaPagos === totalPaginasPagos} onClick={() => setPaginaPagos(paginaPagos + 1)} className="px-3 py-1 bg-white border rounded text-sm disabled:opacity-50">Siguiente</button>
          </div>
        )}
        <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-500">Haz clic en cualquier fila del historial para ver el detalle del pago</p>
        </div>
      </div>

      {/* Drawer lateral para detalle de pago */}
      {drawerPago && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-40 z-40" onClick={() => setDrawerPago(null)}></div>
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center space-x-3">
                <div className="bg-primary-600 text-white rounded-xl w-11 h-11 flex items-center justify-center font-bold text-lg shadow-sm">
                  <FiDollarSign size={22} />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-xl font-bold text-gray-800">Pago #{drawerPago.id}</h3>
                    <span className={'px-2.5 py-0.5 rounded-full text-xs font-medium ' + badge(drawerPago.status)[1]}>
                      {badge(drawerPago.status)[0]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">PNR: {drawerPago.pnr}</p>
                </div>
              </div>
              <button onClick={() => setDrawerPago(null)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <FiX size={22} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-1">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Información del Pago</h4>
                <InfoFila icon={FiHash} label="ID" value={drawerPago.id} />
                <InfoFila icon={FiFileText} label="PNR" value={drawerPago.pnr} />
                <InfoFila icon={FiCreditCard} label="Método" value={metodoLabel(drawerPago.method) + (drawerPago.card_last_digits ? ' ····' + drawerPago.card_last_digits : '')} />
                <InfoFila icon={FiDollarSign} label="Monto" value={(drawerPago.type === 'refund' ? '-' : '') + '$' + parseFloat(drawerPago.amount).toFixed(2) + ' USD'} />
                <InfoFila icon={FiFileText} label="Tipo" value={drawerPago.type === 'refund' ? 'Reembolso' : 'Pago'} />
                <InfoFila icon={FiFileText} label="DTE" value={drawerPago.tipo_dte ? (drawerPago.tipo_dte === '01' ? 'Factura Electrónica (FE)' : drawerPago.tipo_dte === '03' ? 'Crédito Fiscal (CCFE)' : drawerPago.tipo_dte) : '—'} />
                <InfoFila icon={FiCalendar} label="Fecha" value={drawerPago.payment_date ? new Date(drawerPago.payment_date).toLocaleString('es-SV') : '—'} />
                {drawerPago.referencia && (
                  <InfoFila icon={FiHash} label="Referencia" value={drawerPago.referencia} />
                )}
              </div>
            </div>

            <div className="px-6 pt-5 pb-10 border-t border-gray-200 bg-gray-50 flex items-center justify-between space-x-3">
              <div className="flex items-center space-x-2">
                {drawerPago.status === 'pending_confirmation' && (
                  <button onClick={() => confirmar(drawerPago)} className="btn-primary flex items-center space-x-1.5 text-sm py-2 px-3">
                    <FiCheckCircle size={16} /><span>Confirmar</span>
                  </button>
                )}
                {drawerPago.status === 'approved' && drawerPago.type === 'payment' && (
                  <button onClick={() => reembolsar(drawerPago)} className="btn-danger flex items-center space-x-1.5 text-sm py-2 px-3">
                    <FiRefreshCw size={16} /><span>Reembolsar</span>
                  </button>
                )}
              </div>
              <button className="btn-secondary" onClick={() => setDrawerPago(null)}>Cerrar</button>
            </div>
          </div>
        </>
      )}

      {/* Modal de cobro - se mantiene exactamente igual */}
      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Cobrar reserva {modal.pnr}</h2>
              <button onClick={() => setModal(null)} className="text-gray-500"><FiX size={22} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago *</label>
                <select className="input-field" value={form.method} onChange={(e) => setForm(Object.assign({}, form, { method: e.target.value }))}>
                  <option value="card">Tarjeta (crédito/débito)</option>
                  <option value="transfer">Transferencia bancaria</option>
                  <option value="cash">Efectivo</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto (USD) *</label>
                <input type="number" step="0.01" className="input-field" value={form.amount} onChange={(e) => setForm(Object.assign({}, form, { amount: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de DTE a emitir *</label>
                <select className="input-field" value={form.tipo_dte} onChange={(e) => setForm(Object.assign({}, form, { tipo_dte: e.target.value }))}>
                  <option value="01">01 - Factura Electrónica (FE)</option>
                  <option value="03">03 - Comprobante de Crédito Fiscal (CCFE)</option>
                </select>
              </div>
              {form.tipo_dte === '03' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">NIT receptor *</label>
                    <input className="input-field" value={form.receptor_nit} onChange={(e) => setForm(Object.assign({}, form, { receptor_nit: e.target.value }))} placeholder="06149999999999" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">NRC receptor</label>
                    <input className="input-field" value={form.receptor_nrc} onChange={(e) => setForm(Object.assign({}, form, { receptor_nrc: e.target.value }))} placeholder="9000000" />
                  </div>
                </div>
              )}
              {form.method === 'card' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Número de tarjeta</label>
                    <input className="input-field" placeholder="4111111111111111" value={form.numero} onChange={(e) => setForm(Object.assign({}, form, { numero: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expiración (MM/AA)</label>
                    <input className="input-field" placeholder="12/29" value={form.expiracion} onChange={(e) => setForm(Object.assign({}, form, { expiracion: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
                    <input className="input-field" placeholder="123" value={form.cvv} onChange={(e) => setForm(Object.assign({}, form, { cvv: e.target.value }))} />
                  </div>
                </div>
              )}
              {form.method === 'transfer' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Referencia de transferencia</label>
                  <input className="input-field" placeholder="TRF-000123" value={form.referencia} onChange={(e) => setForm(Object.assign({}, form, { referencia: e.target.value }))} />
                </div>
              )}
              <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-lg p-3">
                Al aprobarse el pago se emitirá el DTE seleccionado y se enviará correo al cliente con el PDF y un ZIP que contiene el JSON adjuntos.
                Tarjeta de prueba aprobada: 4111111111111111.
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn-primary" onClick={procesar} disabled={procesando}>{procesando ? 'Procesando...' : 'Procesar pago'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pagos;

