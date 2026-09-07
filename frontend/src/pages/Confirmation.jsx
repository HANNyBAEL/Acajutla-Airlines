import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiCheckCircle, FiDownload, FiMail, FiCalendar, FiCopy } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useBooking } from '../context/BookingContext';
import { reservasAPI } from '../services/api';
import { formatearFecha, formatearHora, calcularDuracion, formatearMoneda } from '../utils/formatters';

const Confirmation = () => {
  const { pnr } = useParams();
  const { reservaCreada, limpiarReserva } = useBooking();
  const [reserva, setReserva] = useState(reservaCreada || null);
  const [cargando, setCargando] = useState(!reservaCreada);

  useEffect(() => {
    if (!reserva) {
      cargarReserva();
    }
    // Limpiar contexto al salir
    return () => {
      setTimeout(() => limpiarReserva(), 5000);
    };
  }, []);

  const cargarReserva = async () => {
    try {
      const response = await reservasAPI.consultar(pnr);
      setReserva(response.data.datos);
    } catch (error) {
      console.error('Error al cargar reserva:', error);
    } finally {
      setCargando(false);
    }
  };

  const copiarPNR = () => {
    navigator.clipboard.writeText(pnr);
    toast.success('Código PNR copiado al portapapeles');
  };

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-200 rounded-full animate-spin border-t-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando confirmación...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-primary-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header de éxito */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-slide-up">
            <FiCheckCircle className="text-white" size={48} />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            ¡Reserva confirmada!
          </h1>
          <p className="text-lg text-gray-600">
            Tu reserva ha sido creada exitosamente
          </p>
        </div>

        {/* Tarjeta PNR */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-primary-600 to-sky-500 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary-100 mb-1">Código de reserva (PNR)</p>
                <div className="flex items-center space-x-3">
                  <p className="text-4xl font-bold tracking-wider">{pnr}</p>
                  <button
                    onClick={copiarPNR}
                    className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
                    title="Copiar PNR"
                  >
                    <FiCopy />
                  </button>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-primary-100">Acajutla Airlines</p>
                <p className="text-xs text-primary-200">E-ticket electrónico</p>
              </div>
            </div>
          </div>

          {/* Info de reserva */}
          {reserva && (
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Estado</p>
                  <p className="font-semibold text-green-600 capitalize">
                    {reserva.estado}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Pasajeros</p>
                  <p className="font-semibold">
                    {reserva.pasajeros?.length || reserva.total_pasajeros || 1}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Total pagado</p>
                  <p className="font-semibold text-primary-700">
                    {formatearMoneda(reserva.total_estimado || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Fecha de creación</p>
                  <p className="font-semibold">
                    {formatearFecha(reserva.fecha_creacion, 'dd MMM yyyy')}
                  </p>
                </div>
              </div>

              {/* Pasajeros */}
              {reserva.pasajeros && reserva.pasajeros.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="font-bold text-gray-900 mb-3">Pasajeros</h3>
                  <div className="space-y-2">
                    {reserva.pasajeros.map((p, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                        <div>
                          <p className="font-medium text-gray-900">
                            {p.nombres} {p.apellidos}
                          </p>
                          <p className="text-xs text-gray-500">
                            {p.doc_tipo === '13' ? 'DUI' : p.doc_tipo === '36' ? 'NIT' : 'Pasaporte'}: {p.doc_numero}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-primary-600">
                            {p.asiento || 'Por asignar'}
                          </p>
                          <p className="text-xs text-gray-500">Asiento</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button className="card p-5 text-left hover:shadow-lg transition-shadow">
            <FiDownload className="text-primary-600 mb-2" size={24} />
            <h3 className="font-bold text-gray-900 mb-1">Descargar boleto</h3>
            <p className="text-sm text-gray-600">PDF con tu e-ticket</p>
          </button>
          <button className="card p-5 text-left hover:shadow-lg transition-shadow">
            <FiMail className="text-primary-600 mb-2" size={24} />
            <h3 className="font-bold text-gray-900 mb-1">Enviar por correo</h3>
            <p className="text-sm text-gray-600">Recibir confirmación en tu email</p>
          </button>
          <Link to={`/mi-reserva/${pnr}`} className="card p-5 text-left hover:shadow-lg transition-shadow">
            <FiCalendar className="text-primary-600 mb-2" size={24} />
            <h3 className="font-bold text-gray-900 mb-1">Gestionar reserva</h3>
            <p className="text-sm text-gray-600">Check-in, cambios, etc.</p>
          </Link>
        </div>

        {/* Info importante */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <h3 className="font-bold text-yellow-900 mb-3">📋 Información importante</h3>
          <ul className="space-y-2 text-sm text-yellow-800">
            <li>• Guarda tu código PNR: lo necesitarás para check-in y cualquier gestión.</li>
            <li>• El check-in online estará disponible 24 horas antes del vuelo.</li>
            <li>• Llega al aeropuerto al menos 2 horas antes de tu vuelo internacional.</li>
            <li>• Revisa tu correo electrónico para recibir la confirmación y el DTE.</li>
          </ul>
        </div>

        {/* Botón final */}
        <div className="text-center mt-8">
          <Link to="/" className="btn-primary">
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Confirmation;