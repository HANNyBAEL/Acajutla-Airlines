import { useEffect, useState } from 'react';
import api from '../services/api';
import { FiDollarSign, FiCheckCircle, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Pagos = () => {
  const [pendientes, setPendientes] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ method: 'card', amount: '', numero: '', expiracion: '', cvv: '', referencia: '' });
  const [procesando, setProcesando] = useState(false);

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
    setForm({ method: 'card', amount: r.balance, numero: '', expiracion: '', cvv: '', referencia: '' });
  };

  const procesar = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) return toast.error('Indique un monto válido');
    setProcesando(true);
    try {
      const payload = { reservation_id: modal.id, method: form.method, amount: parseFloat(form.amount) };
      if (form.method === 'card') payload.card = { numero: form.numero, expiracion: form.expiracion, cvv: form.cvv };
      if (form.method === 'transfer') payload.referencia = form.referencia;
      const r = await api.post('/pagos/procesar', payload);
      const st = r.data.datos.status;
      if (st === 'approved') toast.success('Pago aprobado. Reserva actualizada.');
      else if (st === 'pending_confirmation') toast.success('Pago registrado. Pendiente confirmar transferencia.');
      else toast.error('Pago rechazado por la pasarela');
      setModal(null);
      cargar();
    } catch (e) {
      toast.error(e.response && e.response.data && e.response.data.error ? e.response.data.error : 'Error al procesar el pago');
    } finally { setProcesando(false); }
  };

  const confirmar = async (p) => {
    if (!window.confirm('¿Confirmar la transferencia del pago #' + p.id + ' (PNR ' + p.pnr + ')?')) return;
    try {
      await api.post('/pagos/' + p.id + '/confirmar', {});
      toast.success('Transferencia confirmada');
      cargar();
    } catch (e) {
      toast.error(e.response && e.response.data && e.response.data.error ? e.response.data.error : 'Error al confirmar');
    }
  };

  const reembolsar = async (p) => {
    const reason = window.prompt('Motivo del reembolso del pago #' + p.id + ' (PNR ' + p.pnr + '):');
    if (!reason) return;
    try {
      await api.post('/pagos/' + p.id + '/reembolsar', { amount: p.amount, reason: reason });
      toast.success('Reembolso procesado');
      cargar();
    } catch (e) {
      toast.error(e.response && e.response.data && e.response.data.error ? e.response.data.error : 'Error al reembolsar');
    }
  };

  const badge = (s) => ({
    approved: ['Pagado', 'bg-green-100 text-green-700'],
    pending_confirmation: ['Pend. confirmación', 'bg-yellow-100 text-yellow-700'],
    rejected: ['Rechazado', 'bg-red-100 text-red-700'],
    refunded: ['Reembolsado', 'bg-gray-100 text-gray-700'],
    cancelled: ['Cancelado', 'bg-red-100 text-red-700'],
  }[s] || [s, 'bg-gray-100 text-gray-700']);

  const metodoLabel = (m) => ({ card: 'Tarjeta', transfer: 'Transferencia', cash: 'Efectivo', paypal: 'PayPal' }[m] || m);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Procesamiento de Pagos</h1>
        <p className="text-gray-500 mt-1">Cobro de reservas, confirmaciones y reembolsos</p>
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center space-x-2">
          <FiDollarSign className="text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-800">Cobros pendientes</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">PNR</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Cliente</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Total</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Saldo</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Time limit</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cargando ? (
              <tr><td colSpan="6" className="text-center py-8 text-gray-500">Cargando...</td></tr>
            ) : pendientes.length === 0 ? (
              <tr><td colSpan="6" className="text-center py-8 text-gray-500">No hay cobros pendientes</td></tr>
            ) : pendientes.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-mono font-bold text-primary-700">{r.pnr}</td>
                <td className="px-6 py-4 text-sm">{r.first_names} {r.last_names}</td>
                <td className="px-6 py-4 text-sm">${parseFloat(r.estimated_total).toFixed(2)}</td>
                <td className="px-6 py-4 text-sm font-semibold text-orange-600">${parseFloat(r.balance).toFixed(2)}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{r.time_limit ? new Date(r.time_limit).toLocaleString('es-SV') : '-'}</td>
                <td className="px-6 py-4">
                  <button onClick={() => abrirCobro(r)} className="btn-primary py-1 px-3 text-sm">Cobrar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center space-x-2">
          <FiCheckCircle className="text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-800">Historial de pagos</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">#</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">PNR</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Método</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Monto</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fecha</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pagos.length === 0 ? (
              <tr><td colSpan="7" className="text-center py-8 text-gray-500">Sin pagos registrados</td></tr>
            ) : pagos.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-600">{p.id}</td>
                <td className="px-6 py-4 font-mono text-sm text-primary-700">{p.pnr}</td>
                <td className="px-6 py-4 text-sm">{metodoLabel(p.method)}{p.card_last_digits ? ' ••••' + p.card_last_digits : ''}</td>
                <td className="px-6 py-4 text-sm font-semibold">{p.type === 'refund' ? '-' : ''}${parseFloat(p.amount).toFixed(2)}</td>
                <td className="px-6 py-4"><span className={'px-3 py-1 rounded-full text-xs font-medium ' + badge(p.status)[1]}>{badge(p.status)[0]}</span></td>
                <td className="px-6 py-4 text-sm text-gray-600">{new Date(p.payment_date).toLocaleString('es-SV')}</td>
                <td className="px-6 py-4">
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
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Cobrar reserva {modal.pnr}</h2>
              <button onClick={() => setModal(null)} className="text-gray-500 hover:text-gray-700"><FiX size={22} /></button>
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
                Pruebas: tarjeta aprobada 4111111111111111 · rechazada 4000000000000002 · CVV y expiración cualesquiera (futura).
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