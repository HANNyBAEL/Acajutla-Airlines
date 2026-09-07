import { FiPlane, FiCalendar, FiUser, FiCheckCircle } from 'react-icons/fi';
import { formatearFecha, formatearHora, calcularDuracion, formatearMoneda } from '../../utils/formatters';

const BookingSummary = ({ vuelo, pasajeros, servicios, totales }) => {
  return (
    <div className="card p-6 border border-gray-200 sticky top-20">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
        <FiCheckCircle className="mr-2 text-green-500" />
        Resumen de tu reserva
      </h3>

      {/* Info del vuelo */}
      {vuelo && (
        <div className="bg-gradient-to-br from-primary-50 to-sky-50 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <FiPlane className="text-primary-600" />
              <span className="font-bold text-gray-900">{vuelo.numero_vuelo}</span>
            </div>
            <span className="text-xs bg-white px-2 py-1 rounded-full text-primary-700 font-medium">
              Directo
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {formatearHora(vuelo.fecha_hora_salida)}
              </p>
              <p className="text-sm font-semibold text-primary-600">{vuelo.origen_iata}</p>
              <p className="text-xs text-gray-600">
                {formatearFecha(vuelo.fecha_hora_salida, 'dd MMM')}
              </p>
            </div>

            <div className="flex-1 px-4 text-center">
              <p className="text-xs text-gray-500 mb-1">
                {calcularDuracion(vuelo.fecha_hora_salida, vuelo.fecha_hora_llegada)}
              </p>
              <div className="flex items-center">
                <div className="h-0.5 flex-1 bg-primary-300"></div>
                <div className="w-2 h-2 bg-primary-600 rounded-full mx-1"></div>
                <div className="h-0.5 flex-1 bg-primary-300"></div>
              </div>
            </div>

            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {formatearHora(vuelo.fecha_hora_llegada)}
              </p>
              <p className="text-sm font-semibold text-primary-600">{vuelo.destino_iata}</p>
              <p className="text-xs text-gray-600">
                {formatearFecha(vuelo.fecha_hora_llegada, 'dd MMM')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pasajeros */}
      {pasajeros.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
            <FiUser className="mr-2" />
            Pasajeros ({pasajeros.length})
          </h4>
          <div className="space-y-2">
            {pasajeros.map((p, i) => (
              <div key={p.id || i} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                <div>
                  <p className="font-medium text-gray-900">
                    {p.nombres} {p.apellidos}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{p.tipo_pasajero}</p>
                </div>
                <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full">
                  {p.doc_numero?.slice(-4) || '---'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Servicios adicionales */}
      {servicios && servicios.length > 0 && (
        <div className="mb-4 pt-4 border-t">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Servicios adicionales</h4>
          <div className="space-y-1">
            {servicios.map((s, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-600">{s.nombre}</span>
                <span className="font-medium">{formatearMoneda(s.precio * (s.cantidad || 1))}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Totales */}
      {totales && (
        <div className="pt-4 border-t space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium">{formatearMoneda(totales.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Impuestos y tasas</span>
            <span className="font-medium">{formatearMoneda(totales.impuestos)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-2 border-t">
            <span className="text-gray-900">Total a pagar</span>
            <span className="text-primary-700">{formatearMoneda(totales.total)}</span>
          </div>
        </div>
      )}

      {/* Nota de time limit */}
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-xs text-yellow-800">
          ⏱️ Una vez creada la reserva, tendrás <strong>30 minutos</strong> para completar el pago antes de que se liberen los asientos.
        </p>
      </div>
    </div>
  );
};

export default BookingSummary;