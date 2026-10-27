import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { roleOf } from '../utils/roles';
import { FiDollarSign, FiCheckCircle, FiRefreshCw, FiX, FiFileText, FiSearch, FiCreditCard, FiCalendar, FiHash } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { confirmarAccion } from '../utils/confirm';
import { formatearFechaHoraDb } from '../utils/fechaServidor';

const Pagos = () => {
  const { usuario } = useAuth();
  const puedeGestionarPagos = ['admin', 'cashier'].includes(roleOf(usuario));
  const [pendientes, setPendientes] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState(null);
  const [modalReembolso, setModalReembolso] = useState(null);
  const [formReembolso, setFormReembolso] = useState({ amount: '', method: 'cash', reason: '' });
  const [form, setForm] = useState({ method: 'card', amount: '', numero: '', expiracion: '', cvv: '', referencia: '', tipo_dte: '01', receptor_nit: '', receptor_nrc: '', requiere_deduccion_fiscal: false });
  const [procesando, setProcesando] = useState(false);
  const [buscarPendientes, setBuscarPendientes] = useState('');
  const [buscarPagos, setBuscarPagos] = useState('');
  // Drawer state
  const [drawerPago, setDrawerPago] = useState(null);

  const extraerDigitos = (valor, maximo) => valor.replace(/\D/g, '').slice(0, maximo);
  const formatearExpiracion = (valor) => {
    const digitos = extraerDigitos(valor, 4);
    return digitos.length > 2 ? digitos.slice(0, 2) + '/' + digitos.slice(2) : digitos;
  };
  const tarjetaPasaLuhn = (numero) => {
    if (!/^\d{13,19}$/.test(numero)) return false;
    let suma = 0;
    let duplicar = false;
    for (let i = numero.length - 1; i >= 0; i--) {
      let digito = Number(numero[i]);
      if (duplicar) {
        digito *= 2;
        if (digito > 9) digito -= 9;
      }
      suma += digito;
      duplicar = !duplicar;
    }
    return suma % 10 === 0;
  };
  const expiracionValida = (valor) => {
    const match = valor.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
    if (!match) return false;
    const anio = 2000 + Number(match[2]);
    const mes = Number(match[1]);
    const ahora = new Date();
    return anio > ahora.getFullYear() || (anio === ahora.getFullYear() && mes >= ahora.getMonth() + 1);
  };
  const cerrarCobro = () => {
    setModal(null);
    setForm((actual) => ({ ...actual, numero: '', expiracion: '', cvv: '' }));
  };

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
    setForm({ method: 'card', amount: r.balance, numero: '', expiracion: '', cvv: '', referencia: '', tipo_dte: '01', receptor_nit: '', receptor_nrc: '', requiere_deduccion_fiscal: false });
  };

  const procesar = async () => {
    const monto = Number(form.amount);
    const saldo = Number(modal.balance);
    if (!Number.isFinite(monto) || monto <= 0) return toast.error('Indique un monto válido');
    if (monto > saldo) return toast.error('El monto no puede superar el saldo pendiente de la reserva');
    if (Math.abs(monto * 100 - Math.round(monto * 100)) > 1e-8) return toast.error('El monto debe tener máximo dos decimales');
    if (form.method === 'card') {
      if (!tarjetaPasaLuhn(form.numero)) return toast.error('Ingrese un número de tarjeta válido de 13 a 19 dígitos');
      if (!expiracionValida(form.expiracion)) return toast.error('Ingrese una expiración válida en formato MM/AA y que no esté vencida');
      if (!/^\d{3,4}$/.test(form.cvv)) return toast.error('El CVV debe tener 3 o 4 dígitos');
    }
    if (form.method === 'transfer' && (!form.referencia.trim() || form.referencia.length > 100)) return toast.error('La referencia debe tener entre 1 y 100 caracteres');
    if (modal.origin_country_code === 'SV' && form.tipo_dte === '03') {
      if (!/^\d{9,14}$/.test(form.receptor_nit)) return toast.error('El NIT del receptor debe contener entre 9 y 14 dígitos');
      if (!/^\d{1,8}$/.test(form.receptor_nrc)) return toast.error('El NRC del receptor debe contener entre 1 y 8 dígitos');
    }
    setProcesando(true);
    try {
      const payload = {
        reservation_id: modal.id, method: form.method, amount: monto,
        tipo_dte: modal.origin_country_code === 'SV' ? form.tipo_dte : null,
        receptor: modal.origin_country_code === 'SV' && form.tipo_dte === '03' ? { nit: form.receptor_nit, nrc: form.receptor_nrc || null } : undefined,
        requiere_deduccion_fiscal: modal.origin_country_code === 'SV' && form.tipo_dte === '01' && form.requiere_deduccion_fiscal
      };
      if (form.method === 'card') payload.card = { numero: form.numero, expiracion: form.expiracion, cvv: form.cvv };
      if (form.method === 'transfer') payload.referencia = form.referencia;
      if (modal.origin_country_code === 'SV' && form.tipo_dte === '03') payload.receptor = { nit: form.receptor_nit, nrc: form.receptor_nrc || null };
      const r = await api.post('/pagos/procesar', payload);
      const st = r.data.datos.status;
      if (st === 'approved') {
        if (r.data.datos.reservation_status === 'paid') {
          toast.success('Pago aprobado y reserva pagada');
        } else {
          toast.success('Pago aprobado. Saldo pendiente: $' + Number(r.data.datos.reservation_balance || 0).toFixed(2));
        }
        if (r.data.facturacion?.tipo === 'recibo_venta') {
          if (r.data.recibo_venta?.enviado) toast.success('DTE salvadoreño omitido. Recibo de venta enviado' + (r.data.recibo_venta.simulado ? ' (simulado)' : ''));
          else if (r.data.datos.reservation_status === 'paid') toast.error('Pago aprobado; no aplica DTE salvadoreño. No se pudo enviar el recibo: ' + (r.data.recibo_venta?.motivo || 'sin correo'));
          else toast.success('Primer vuelo fuera de El Salvador: se enviará recibo de venta al completar el pago, sin DTE salvadoreño.');
        } else if (r.data.facturacion?.tipo === 'revision_manual') {
          toast.error('Pago aprobado; origen sin confirmar. La facturación requiere revisión manual.');
        } else if (r.data.dte && r.data.dte.envio && r.data.dte.envio.enviado) {
          toast.success('DTE ' + r.data.dte.numeroControl + ' emitido. Correo enviado con PDF y ZIP que contiene el JSON' + (r.data.dte.envio.simulado ? ' (simulado, ver storage/correos)' : ''));
        } else if (r.data.dte && r.data.dte.error) {
          toast.error('Pago OK, pero el DTE falló: ' + r.data.dte.error);
        } else if (r.data.dte) {
          toast.error('DTE emitido pero el correo no se envió: ' + (r.data.dte.envio ? r.data.dte.envio.motivo : 'sin correo'));
        }
      } else if (st === 'pending_confirmation') {
        if (r.data.facturacion?.tipo === 'recibo_venta') toast.success('Transferencia registrada. Al completar el pago se enviará recibo de venta, sin DTE salvadoreño.');
        else if (r.data.facturacion?.tipo === 'revision_manual') toast.error('Transferencia registrada; origen sin confirmar. Facturación requiere revisión manual.');
        else toast.success('Transferencia registrada. El DTE se emitirá cuando la reserva quede totalmente pagada.');
      } else {
        toast.error(r.data.datos.gateway_message
          ? 'Pago rechazado: ' + r.data.datos.gateway_message
          : 'Pago rechazado por la pasarela');
      }
      cerrarCobro();
      cargar();
    } catch (e) {
      toast.error(e.response && e.response.data && e.response.data.error ? e.response.data.error : 'Error al procesar el pago');
    } finally { setProcesando(false); }
  };

  const confirmar = async (p) => {
    const confirmado = await confirmarAccion({
      title: '¿Confirmar transferencia?',
      text: '¿Confirmar la transferencia del pago #' + p.id + ' (PNR ' + p.pnr + ')? Se enviará DTE o recibo de venta según el origen del primer vuelo cuando la reserva quede totalmente pagada.',
      confirmText: 'Sí, confirmar',
      isDanger: false
    });
    if (!confirmado) return;
    try {
      const r = await api.post('/pagos/' + p.id + '/confirmar', {});
      if (r.data.datos.reservation_status === 'paid') {
        toast.success('Transferencia confirmada. Reserva pagada.');
      } else {
        toast.success('Transferencia confirmada. Saldo pendiente: $' + Number(r.data.datos.reservation_balance || 0).toFixed(2));
      }
      if (r.data.facturacion?.tipo === 'recibo_venta') {
        if (r.data.recibo_venta?.enviado) toast.success('DTE salvadoreño omitido. Recibo de venta enviado' + (r.data.recibo_venta.simulado ? ' (simulado)' : ''));
        else if (r.data.datos.reservation_status === 'paid') toast.error('No se pudo enviar el recibo de venta: ' + (r.data.recibo_venta?.motivo || 'sin correo'));
        else toast.success('Sin DTE salvadoreño; se enviará el recibo al completar el pago.');
      } else if (r.data.facturacion?.tipo === 'revision_manual') {
        toast.error('Origen sin confirmar; la facturación requiere revisión manual.');
      } else if (r.data.dte && r.data.dte.envio && r.data.dte.envio.enviado) {
        toast.success('DTE ' + r.data.dte.numeroControl + ' emitido y enviado con PDF y ZIP que contiene el JSON');
      } else if (r.data.dte && r.data.dte.error) {
        toast.error('Confirmado, pero el DTE falló: ' + r.data.dte.error);
      }
      setDrawerPago(null);
      cargar();
    } catch (e) { toast.error(e.response && e.response.data ? e.response.data.error : 'Error al confirmar'); }
  };

  const abrirReembolso = (p) => {
    const saldoReembolsable = Number(p.refundable_balance ?? p.amount);
    if (!Number.isFinite(saldoReembolsable) || saldoReembolsable <= 0.009) {
      return toast.error('Este pago ya no tiene saldo reembolsable');
    }
    setFormReembolso({ amount: saldoReembolsable.toFixed(2), method: p.method || 'cash', reason: '' });
    setModalReembolso(p);
    setDrawerPago(null);
  };

  const reembolsar = async () => {
    const p = modalReembolso;
    if (!p) return;
    const saldoReembolsable = Number(p.refundable_balance ?? p.amount);
    const amount = Number(formReembolso.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount - saldoReembolsable > 0.009) {
      return toast.error('Indique un monto entre $0.01 y $' + saldoReembolsable.toFixed(2));
    }
    if (Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-8) return toast.error('El monto debe tener máximo dos decimales');
    const reason = formReembolso.reason.trim();
    if (!reason) return toast.error('Indique el motivo del reembolso');
    if (!['card', 'transfer', 'cash', 'paypal'].includes(formReembolso.method)) return toast.error('Seleccione un método de reembolso válido');
    setProcesando(true);
    try {
      const r = await api.post('/pagos/' + p.id + '/reembolsar', { amount, reason, refund_method: formReembolso.method });
      const avisoReserva = r.data.datos.reservation_status === 'cancelled'
        ? ' La reserva se canceló y salió de Cobros pendientes.'
        : '';
      if (r.data.correo?.enviado && r.data.correo?.simulado) {
        toast.success('Reembolso procesado.' + avisoReserva + ' El correo quedó simulado porque el envío real no está configurado');
      } else if (r.data.correo?.enviado) {
        toast.success('Reembolso procesado y correo enviado al cliente.' + avisoReserva);
      } else {
        toast('Reembolso procesado.' + avisoReserva + ' No se pudo enviar el correo: ' + (r.data.correo?.motivo || 'sin destinatario'), { icon: '⚠️' });
      }
      setModalReembolso(null);
      cargar();
    } catch (e) { toast.error(e.response && e.response.data ? e.response.data.error : 'Error al reembolsar'); }
    finally { setProcesando(false); }
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
  const reembolsos = pagos.filter((p) => p.type === 'refund');

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
      <span className="text-gray-800 font-medium truncate">{value ?? '—'}</span>
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
                <td className="px-6 py-4">{puedeGestionarPagos && <button className="btn-primary py-1 px-3 text-sm" onClick={() => abrirCobro(r)}>Cobrar</button>}</td>
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
                <td className="px-6 py-4 text-sm text-gray-500">{formatearFechaHoraDb(p.payment_date)}</td>
                <td className="px-6 py-4 text-sm">{metodoLabel(p.method)}{p.card_last_digits ? ' ····' + p.card_last_digits : ''}</td>
                <td className="px-6 py-4 text-sm font-semibold">{p.type === 'refund' ? '-' : ''}${parseFloat(p.amount).toFixed(2)}</td>
                <td className="px-6 py-4"><span className={'px-3 py-1 rounded-full text-xs font-medium ' + badge(p.status)[1]}>{badge(p.status)[0]}</span></td>
                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center space-x-3">
                    {puedeGestionarPagos && p.status === 'pending_confirmation' && p.type === 'payment' && p.method === 'transfer' && p.external_reference && (
                      <button onClick={() => confirmar(p)} className="text-green-600 hover:text-green-800 flex items-center space-x-1">
                        <FiCheckCircle size={16} /><span className="text-sm">Confirmar</span>
                      </button>
                    )}
                    {puedeGestionarPagos && p.status === 'approved' && p.type === 'payment' && Number(p.refundable_balance ?? p.amount) > 0.009 && (
                      <button onClick={() => abrirReembolso(p)} className="text-red-600 hover:text-red-800 flex items-center space-x-1">
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

      {/* Reembolsos visibles en una sección propia además del historial general */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Historial de reembolsos</h2>
            <p className="text-sm text-gray-500 mt-1">{reembolsos.length} reembolso{reembolsos.length === 1 ? '' : 's'} registrado{reembolsos.length === 1 ? '' : 's'}</p>
          </div>
          <FiRefreshCw className="text-red-600" size={20} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">PNR</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Monto devuelto</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Pago original</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Motivo</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Referencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reembolsos.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-8 text-gray-500">Todavía no hay reembolsos registrados</td></tr>
              ) : reembolsos.map((p) => (
                <tr key={'refund-' + p.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setDrawerPago(p)}>
                  <td className="px-6 py-4 font-mono text-sm text-primary-700">{p.pnr}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatearFechaHoraDb(p.payment_date)}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-red-700">-${parseFloat(p.amount).toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm">#{p.original_payment_id ?? '—'}</td>
                  <td className="px-6 py-4 text-sm">{p.reason || '—'}</td>
                  <td className="px-6 py-4 text-sm font-mono">{p.external_reference || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-500">Haz clic en un reembolso para ver su detalle</p>
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
                {drawerPago.type === 'payment' && drawerPago.status === 'approved' && (
                  <InfoFila icon={FiDollarSign} label="Reembolsable" value={'$' + Number(drawerPago.refundable_balance ?? drawerPago.amount).toFixed(2) + ' USD'} />
                )}
                <InfoFila icon={FiFileText} label="Tipo" value={drawerPago.type === 'refund' ? 'Reembolso' : 'Pago'} />
                {drawerPago.type === 'refund' && <InfoFila icon={FiHash} label="Pago original" value={'#' + (drawerPago.original_payment_id ?? '—')} />}
                <InfoFila icon={FiFileText} label="Documento" value={drawerPago.tipo_dte ? (drawerPago.tipo_dte === '01' ? 'Factura Electrónica (FE)' : drawerPago.tipo_dte === '03' ? 'Crédito Fiscal (CCFE)' : drawerPago.tipo_dte) : (drawerPago.type === 'payment' && drawerPago.origin_country_code && drawerPago.origin_country_code !== 'SV' ? 'Recibo de venta' : '—')} />
                <InfoFila icon={FiCalendar} label="Fecha" value={formatearFechaHoraDb(drawerPago.payment_date)} />
                {drawerPago.reason && (
                  <InfoFila icon={FiFileText} label="Motivo" value={drawerPago.reason} />
                )}
                {drawerPago.external_reference && (
                  <InfoFila icon={FiHash} label="Referencia" value={drawerPago.external_reference} />
                )}
              </div>
            </div>

            <div className="px-6 pt-5 pb-10 border-t border-gray-200 bg-gray-50 flex items-center justify-between space-x-3">
              <div className="flex items-center space-x-2">
                {puedeGestionarPagos && drawerPago.status === 'pending_confirmation' && drawerPago.type === 'payment' && drawerPago.method === 'transfer' && drawerPago.external_reference && (
                  <button onClick={() => confirmar(drawerPago)} className="btn-primary flex items-center space-x-1.5 text-sm py-2 px-3">
                    <FiCheckCircle size={16} /><span>Confirmar</span>
                  </button>
                )}
                {puedeGestionarPagos && drawerPago.status === 'approved' && drawerPago.type === 'payment' && Number(drawerPago.refundable_balance ?? drawerPago.amount) > 0.009 && (
                  <button onClick={() => abrirReembolso(drawerPago)} className="btn-danger flex items-center space-x-1.5 text-sm py-2 px-3">
                    <FiRefreshCw size={16} /><span>Reembolsar</span>
                  </button>
                )}
              </div>
              <button className="btn-secondary" onClick={() => setDrawerPago(null)}>Cerrar</button>
            </div>
          </div>
        </>
      )}

      {modalReembolso && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4" onMouseDown={(e) => { if (e.target === e.currentTarget && !procesando) setModalReembolso(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="titulo-reembolso">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 id="titulo-reembolso" className="text-xl font-bold text-gray-800">Reembolsar pago</h2>
                <p className="text-sm text-gray-500 mt-1">Reserva {modalReembolso.pnr} · Pago #{modalReembolso.id}</p>
              </div>
              <button type="button" onClick={() => !procesando && setModalReembolso(null)} className="text-gray-500 hover:text-gray-700" aria-label="Cerrar"><FiX size={22} /></button>
            </div>
            <div className="space-y-4">
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-sm text-gray-700">
                <div className="flex justify-between gap-4"><span>Pago original</span><strong>{metodoLabel(modalReembolso.method)}</strong></div>
                <div className="flex justify-between gap-4 mt-1"><span>Saldo reembolsable</span><strong>${Number(modalReembolso.refundable_balance ?? modalReembolso.amount).toFixed(2)} USD</strong></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Método de devolución *</label>
                <select className="input-field" value={formReembolso.method} onChange={(e) => setFormReembolso(Object.assign({}, formReembolso, { method: e.target.value }))}>
                  <option value="card">Tarjeta</option>
                  <option value="transfer">Transferencia bancaria</option>
                  <option value="cash">Efectivo</option>
                  <option value="paypal">PayPal</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto a devolver (USD) *</label>
                <input type="number" min="0.01" max={Number(modalReembolso.refundable_balance ?? modalReembolso.amount)} step="0.01" inputMode="decimal" className="input-field" value={formReembolso.amount} onChange={(e) => setFormReembolso(Object.assign({}, formReembolso, { amount: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo *</label>
                <textarea rows="3" maxLength="500" className="input-field resize-y" value={formReembolso.reason} onChange={(e) => setFormReembolso(Object.assign({}, formReembolso, { reason: e.target.value }))} placeholder="Indique por qué se realiza el reembolso" />
              </div>
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">El reembolso de esta aplicación es simulado. El método elegido se registra en el historial y se informa al cliente; no se ejecuta un movimiento bancario real.</p>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button type="button" className="btn-secondary" onClick={() => setModalReembolso(null)} disabled={procesando}>Cancelar</button>
              <button type="button" className="btn-danger" onClick={reembolsar} disabled={procesando}>{procesando ? 'Procesando...' : 'Confirmar reembolso'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de cobro - se mantiene exactamente igual */}
      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Cobrar reserva {modal.pnr}</h2>
              <button onClick={cerrarCobro} className="text-gray-500"><FiX size={22} /></button>
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
                <input type="number" min="0.01" max={Number(modal.balance)} step="0.01" inputMode="decimal" className="input-field" value={form.amount} onKeyDown={(e) => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }} onChange={(e) => setForm(Object.assign({}, form, { amount: e.target.value }))} />
              </div>
              {modal.origin_country_code === 'SV' ? <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de DTE a emitir *</label>
                <select className="input-field" value={form.tipo_dte} onChange={(e) => setForm(Object.assign({}, form, { tipo_dte: e.target.value }))}>
                  <option value="01">01 - Factura Electrónica (FE)</option>
                  <option value="03">03 - Comprobante de Crédito Fiscal (CCFE)</option>
                </select>
              </div> : <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 col-span-2">
                {modal.origin_country_code
                  ? `Primer vuelo desde ${modal.origin_airport_code || 'el extranjero'}: se enviará recibo de venta y no DTE salvadoreño.`
                  : 'No se pudo confirmar el origen del primer vuelo; la facturación quedará para revisión manual.'}
              </div>}
              {modal.origin_country_code === 'SV' && form.tipo_dte === '03' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">NIT receptor *</label>
                    <input type="text" inputMode="numeric" maxLength={14} pattern="[0-9]{9,14}" className="input-field" value={form.receptor_nit} onChange={(e) => setForm(Object.assign({}, form, { receptor_nit: extraerDigitos(e.target.value, 14) }))} placeholder="06149999999999" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">NRC receptor</label>
                    <input type="text" inputMode="numeric" maxLength={8} pattern="[0-9]{1,8}" className="input-field" value={form.receptor_nrc} onChange={(e) => setForm(Object.assign({}, form, { receptor_nrc: extraerDigitos(e.target.value, 8) }))} placeholder="9000000" />
                  </div>
                </div>
              )}
              {modal.origin_country_code === 'SV' && form.tipo_dte === '01' && (
                <label className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                  <input type="checkbox" className="mt-1" checked={form.requiere_deduccion_fiscal} onChange={(e) => setForm(Object.assign({}, form, { requiere_deduccion_fiscal: e.target.checked }))} />
                  <span>El cliente solicita que la factura documente un costo o gasto deducible. Se requiere que sus datos de identificación estén registrados en el cliente.</span>
                </label>
              )}
              {form.method === 'card' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Número de tarjeta</label>
                    <input type="text" inputMode="numeric" autoComplete="cc-number" maxLength={19} pattern="[0-9]{13,19}" className="input-field" placeholder="4111111111111111" value={form.numero} onChange={(e) => setForm(Object.assign({}, form, { numero: extraerDigitos(e.target.value, 19) }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expiración (MM/AA)</label>
                    <input type="text" inputMode="numeric" autoComplete="cc-exp" maxLength={5} pattern="(0[1-9]|1[0-2])/[0-9]{2}" className="input-field" placeholder="12/29" value={form.expiracion} onChange={(e) => setForm(Object.assign({}, form, { expiracion: formatearExpiracion(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
                    <input type="password" inputMode="numeric" autoComplete="cc-csc" maxLength={4} pattern="[0-9]{3,4}" className="input-field" placeholder="CVV" value={form.cvv} onChange={(e) => setForm(Object.assign({}, form, { cvv: extraerDigitos(e.target.value, 4) }))} />
                  </div>
                </div>
              )}
              {form.method === 'transfer' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Referencia de transferencia</label>
                  <input type="text" maxLength={100} className="input-field" placeholder="TRF-000123" value={form.referencia} onChange={(e) => setForm(Object.assign({}, form, { referencia: e.target.value.slice(0, 100) }))} />
                </div>
              )}
              <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-lg p-3">
                <p>{modal.origin_country_code === 'SV'
                  ? 'Al quedar la reserva totalmente pagada se emitirá el DTE seleccionado.'
                  : modal.origin_country_code
                    ? 'Al quedar la reserva totalmente pagada se enviará un recibo de venta por correo; no se emitirá DTE salvadoreño.'
                    : 'El origen debe confirmarse manualmente antes de determinar el documento fiscal.'}</p>
                {form.method === 'card' && <p className="mt-1">Entorno de demostración: no se conecta a un banco ni realiza cobros reales. Use solo la tarjeta de prueba 4111111111111111, expiración 12/29 y cualquier CVV de 3 dígitos. No ingrese una tarjeta real.</p>}
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button className="btn-secondary" onClick={cerrarCobro}>Cancelar</button>
              <button className="btn-primary" onClick={procesar} disabled={procesando}>{procesando ? 'Procesando...' : 'Procesar pago'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pagos;
