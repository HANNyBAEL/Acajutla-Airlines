import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiCreditCard } from 'react-icons/fi';
import toast from 'react-hot-toast';
import PassengerForm from '../components/booking/PassengerForm';
import BookingSummary from '../components/booking/BookingSummary';
import Loading from '../components/common/Loading';
import Alert from '../components/common/Alert';
import { useBooking } from '../context/BookingContext';
import { useAuth } from '../context/AuthContext';
import { reservasAPI } from '../services/api';
import { validarPasajero } from '../utils/validators';

const Checkout = () => {
  const navigate = useNavigate();
  const {
    vueloSeleccionado,
    pasajeros,
    agregarPasajero,
    actualizarPasajero,
    eliminarPasajero,
    busqueda,
    calcularTotal,
    setReservaCreada,
  } = useBooking();
  const { usuario, estaAutenticado } = useAuth();

  const [cargando, setCargando] = useState(false);
  const [errorGlobal, setErrorGlobal] = useState(null);
  const [metodoPago, setMetodoPago] = useState('tarjeta');

  // Si no hay vuelo seleccionado, redirigir
  if (!vueloSeleccionado) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <Alert
          type="warning"
          title="No hay vuelo seleccionado"
          message="Debes seleccionar un vuelo antes de continuar con la reserva."
        />
        <button onClick={() => navigate('/')} className="btn-primary mt-6">
          Buscar vuelos
        </button>
      </div>
    );
  }

  const handleAgregarPasajero = () => {
    agregarPasajero({
      tipo_pasajero: 'adulto',
      nombres: '',
      apellidos: '',
      doc_tipo: '13',
      doc_numero: '',
      fecha_nacimiento: '',
      nacionalidad: 'SV',
      correo: '',
      telefono: '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorGlobal(null);

    // Validar todos los pasajeros
    for (let i = 0; i < pasajeros.length; i++) {
      const validacion = validarPasajero(pasajeros[i]);
      if (!validacion.valido) {
        toast.error(`Revisa los datos del pasajero ${i + 1}`);
        return;
      }
    }

    if (pasajeros.length !== busqueda.pasajeros) {
      toast.error(`Debes registrar ${busqueda.pasajeros} pasajero(s)`);
      return;
    }

    setCargando(true);
    try {
      const data = {
        cliente_id: usuario?.id || 1, // temporal
        vuelos: [{
          flight_id: vueloSeleccionado.id,
          clase_tarifaria: busqueda.clase || 'economica',
        }],
        pasajeros: pasajeros.map((p) => ({
          tipo_pasajero: p.tipo_pasajero,
          nombres: p.nombres,
          apellidos: p.apellidos,
          doc_tipo: p.doc_tipo,
          doc_numero: p.doc_numero,
          fecha_nacimiento: p.fecha_nacimiento,
          nacionalidad: p.nacionalidad,
          correo: p.correo,
          telefono: p.telefono,
        })),
        tiempo_limite_minutos: 30,
      };

      const response = await reservasAPI.crear(data);
      setReservaCreada(response.data.datos);
      toast.success('¡Reserva creada exitosamente!');
      navigate(`/confirmacion/${response.data.datos.pnr}`);
    } catch (err) {
      const mensaje = err.response?.data?.error || 'Error al crear la reserva';
      setErrorGlobal(mensaje);
      toast.error(mensaje);
    } finally {
      setCargando(false);
    }
  };

  const totales = calcularTotal();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-600 hover:text-gray-900 flex items-center text-sm mb-2"
          >
            <FiArrowLeft className="mr-1" /> Volver
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Completa tu reserva</h1>
          <p className="text-gray-600">Paso 2 de 3: Datos de pasajeros y pago</p>
        </div>

        {/* Progreso */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-2xl">
            {['Búsqueda', 'Pasajeros', 'Confirmación'].map((paso, i) => (
              <div key={i} className="flex items-center flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  i <= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {i + 1}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  i <= 1 ? 'text-gray-900' : 'text-gray-500'
                }`}>
                  {paso}
                </span>
                {i < 2 && (
                  <div className={`flex-1 h-0.5 mx-4 ${
                    i < 1 ? 'bg-primary-600' : 'bg-gray-200'
                  }`}></div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulario principal */}
          <div className="lg:col-span-2 space-y-6">
            {errorGlobal && (
              <Alert type="error" title="Error" message={errorGlobal} />
            )}

            <form onSubmit={handleSubmit}>
              {/* Pasajeros */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">
                    Datos de los pasajeros
                  </h2>
                  <button
                    type="button"
                    onClick={handleAgregarPasajero}
                    className="btn-ghost text-sm flex items-center"
                  >
                    <FiPlus className="mr-1" /> Agregar pasajero
                  </button>
                </div>

                {pasajeros.map((pasajero, index) => (
                  <PassengerForm
                    key={pasajero.id || index}
                    index={index}
                    pasajero={pasajero}
                    onChange={(datos) => actualizarPasajero(pasajero.id, datos)}
                    onRemove={() => eliminarPasajero(pasajero.id)}
                    puedeEliminar={pasajeros.length > 1}
                  />
                ))}

                {pasajeros.length === 0 && (
                  <button
                    type="button"
                    onClick={handleAgregarPasajero}
                    className="w-full card p-8 border-2 border-dashed border-gray-300 hover:border-primary-500 text-gray-600 hover:text-primary-600 transition-colors"
                  >
                    <FiPlus className="mx-auto mb-2" size={24} />
                    <p className="font-medium">Agregar primer pasajero</p>
                  </button>
                )}
              </div>

              {/* Método de pago */}
              <div className="mt-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <FiCreditCard className="mr-2" /> Método de pago
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { id: 'tarjeta', label: 'Tarjeta', icon: '💳' },
                    { id: 'transferencia', label: 'Transferencia', icon: '🏦' },
                    { id: 'efectivo', label: 'Efectivo', icon: '💵' },
                    { id: 'paypal', label: 'PayPal', icon: '🅿️' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMetodoPago(m.id)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        metodoPago === m.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-3xl mb-2">{m.icon}</div>
                      <p className="text-sm font-medium">{m.label}</p>
                    </button>
                  ))}
                </div>

                {metodoPago === 'tarjeta' && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Número de tarjeta
                      </label>
                      <input
                        type="text"
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha de expiración
                      </label>
                      <input
                        type="text"
                        placeholder="MM/AA"
                        maxLength={5}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        CVV
                      </label>
                      <input
                        type="text"
                        placeholder="123"
                        maxLength={4}
                        className="input-field"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Términos */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    className="mt-1 w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">
                    He leído y acepto los{' '}
                    <a href="/terminos" className="text-primary-600 hover:underline">
                      términos y condiciones
                    </a>
                    , la{' '}
                    <a href="/privacidad" className="text-primary-600 hover:underline">
                      política de privacidad
                    </a>
                    {' '}y la{' '}
                    <a href="/equipaje" className="text-primary-600 hover:underline">
                      política de equipaje
                    </a>
                    .
                  </span>
                </label>
              </div>

              {/* Botón submit */}
              <button
                type="submit"
                disabled={cargando || pasajeros.length !== busqueda.pasajeros}
                className="btn-primary w-full mt-6 text-lg py-4"
              >
                {cargando ? 'Procesando...' : `Confirmar y pagar ${totales ? `$${totales.total.toFixed(2)}` : ''}`}
              </button>
            </form>
          </div>

          {/* Resumen lateral */}
          <div className="lg:col-span-1">
            <BookingSummary
              vuelo={vueloSeleccionado}
              pasajeros={pasajeros}
              servicios={[]}
              totales={totales}
            />
          </div>
        </div>
      </div>

      {cargando && <Loading fullScreen text="Creando tu reserva..." />}
    </div>
  );
};

export default Checkout;