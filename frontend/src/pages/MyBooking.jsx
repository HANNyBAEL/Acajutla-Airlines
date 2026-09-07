import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiSearch, FiPlane, FiUser, FiCalendar } from 'react-icons/fi';
import Loading from '../components/common/Loading';
import Alert from '../components/common/Alert';
import { reservasAPI } from '../services/api';
import { formatearFecha, formatearHora, calcularDuracion, formatearMoneda } from '../utils/formatters';

const MyBooking = () => {
  const { pnr: pnrParam } = useParams();
  const [pnr, setPnr] = useState(pnrParam || '');
  const [apellido, setApellido] = useState('');
  const [reserva, setReserva] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [buscado, setBuscado] = useState(false);

  useEffect(() => {
    if (pnrParam) {
      buscarReserva(pnrParam);
    }
  }, [pnrParam]);

  const buscarReserva = async (codigo = pnr) => {
    if (!codigo.trim()) {
      setError('Ingresa el código PNR');
      return;
    }

    setCargando(true);
    setError(null);
    setBuscado(true);

    try {
      const response = await reservasAPI.consultar(codigo.toUpperCase());
      setReserva(response.data.datos);
    } catch (err) {
      setError('No se encontró una reserva con ese código. Verifica e intenta de nuevo.');
      setReserva(null);
    } finally {
      setCargando(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    buscarReserva();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Mi reserva
          </h1>
          <p className="text-gray-600">
            Consulta los detalles de tu reserva con tu código PNR
          </p>
        </div>

        {/* Formulario de búsqueda */}
        <form onSubmit={handleSubmit} className="card p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código de reserva (PNR) *
              </label>
              <input
                type="text"
                value={pnr}
                onChange={(e) => setPnr(e.target.value.toUpperCase())}
                placeholder="Ej: ABC123"
                maxLength={6}
                className="input-field text-lg font-mono tracking-wider"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Apellido del pasajero
              </label>
              <input
                type="text"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                placeholder="MENJIVAR"
                className="input-field"
              />
            </div>
          </div>
          <button type="submit" className="btn-primary w-full mt-4">
            <FiSearch className="inline mr-2" />
            Buscar reserva
          </button>
        </form>

        {/* Estados */}
        {cargando && <Loading text="Buscando tu reserva..." />}

        {error && buscado && (
          <Alert type="error" title="Reserva no encontrada" message={error} />
        )}

        {/* Detalles de la reserva */}
        {reserva && !cargando && (
          <div className="space-y-6 animate-fade-in">
            {/* Estado de la reserva */}
            <div className={`card p-6 ${
              reserva.estado === 'pagada' || reserva.estado === 'confirmada'
                ? 'bg-green-50 border-green-200'
                : reserva.estado === 'pendiente'
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-red-50 border-red-200'
            } border-2`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Estado de la reserva</p>
                  <p className="text-2xl font-bold capitalize text-gray-900">
                    {reserva.estado}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 mb-1">Código PNR</p>
                  <p className="text-3xl font-bold font-mono text-primary-700">
                    {reserva.pnr}
                  </p>
                </div>
              </div>
            </div>

            {/* Info del vuelo */}
            {reserva.pasajeros && reserva.pasajeros.length > 0 && (
              <div className="card p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <FiPlane className="mr-2" /> Detalles del vuelo
                </h2>
                <div className="space-y-3">
                  {reserva.pasajeros.slice(0, 1).map((p, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-bold text-gray-900">
                            Vuelo {p.numero_vuelo}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatearFecha(p.fecha_hora_salida, "EEEE dd 'de' MMMM, yyyy")}
                          </p>
                        </div>
                        <span className="text-xs bg-primary-100 text-primary-700 px-3 py-1 rounded-full font-medium">
                          {p.clase_tarifaria}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold text-gray-900">
                            {formatearHora(p.fecha_hora_salida)}
                          </p>
                          <p className="text-sm font-semibold text-primary-600">
                            {p.origen}
                          </p>
                        </div>
                        <div className="flex-1 text-center">
                          <p className="text-xs text-gray-500">
                            {calcularDuracion(p.fecha_hora_salida, p.fecha_hora_llegada)}
                          </p>
                          <div className="flex items-center my-2">
                            <div className="h-0.5 flex-1 bg-gray-300"></div>
                            <FiPlane className="text-primary-600 mx-2" />
                            <div className="h-0.5 flex-1 bg-gray-300"></div>
                          </div>
                          <p className="text-xs text-gray-500">Directo</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">
                            {formatearHora(p.fecha_hora_llegada)}
                          </p>
                          <p className="text-sm font-semibold text-primary-600">
                            {p.destino}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pasajeros */}
            <div className="card p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <FiUser className="mr-2" /> Pasajeros
              </h2>
              <div className="space-y-3">
                {reserva.pasajeros?.map((p, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {p.nombres} {p.apellidos}
                      </p>
                      <p className="text-sm text-gray-500 capitalize">
                        {p.tipo_pasajero} • {p.nacionalidad}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-primary-600">
                        Asiento {p.asiento || 'Por asignar'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Doc: {p.doc_numero}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Acciones */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button className="btn-primary">
                <FiCalendar className="inline mr-2" />
                Hacer check-in
              </button>
              <button className="btn-secondary">
                Descargar boleto (PDF)
              </button>
            </div>
          </div>
        )}

        {/* Estado inicial */}
        {!buscado && !cargando && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">✈️</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Ingresa tu código PNR
            </h3>
            <p className="text-gray-600">
              Lo encontrarás en el correo de confirmación de tu reserva
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBooking;