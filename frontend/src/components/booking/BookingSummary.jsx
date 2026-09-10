import { FiPlane, FiCalendar, FiUser, FiCheckCircle, FiCornerDownRight } from 'react-icons/fi';
import { formatearFecha, formatearHora, calcularDuracion, formatearMoneda } from '../../utils/formatters';

const fmtDur = (min) => `${Math.floor((min || 0) / 60)}h ${(min || 0) % 60}m`;

const BookingSummary = ({ vuelo, itinerarios, pasajeros, servicios, totales }) => {
  const itinerariosLista = itinerarios && itinerarios.length ? itinerarios : (vuelo ? [{ tipo: 'directo', vuelos: [vuelo] }] : []);
  return (
    <div className="card p-6 border border-gray-200 sticky top-20">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
        <FiCheckCircle className="mr-2 text-green-500" />
        Resumen de tu reserva
      </h3>

      {itinerariosLista.length > 0 && (
        <div className="mb-4 space-y-3">
          {itinerariosLista.map((it, idx) => (
            <div key={idx} className="bg-gradient-to-br from-primary-50 to-sky-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-primary-700 mb-2">
                {itinerariosLista.length > 1 ? (idx === 0 ? 'IDA' : 'REGRESO') : 'VUELO'}
              </p>
              {(it.vuelos || []).map((v, i) => (
                <div key={v.id} className="text-sm">
                  <div className="flex justify-between">
                    <span className="font-bold text-gray-900">{v.flight_number}</span>
                    <span className="text-gray-600">{formatearHora(v.departure_datetime)} – {formatearHora(v.arrival_datetime)}</span>
                  </div>
                  <p className="text-xs text-gray-600">{v.origin_iata} → {v.destination_iata} · {formatearFecha(v.departure_datetime, 'dd MMM')}</p>
                  {i < (it.vuelos || []).length - 1 && (
                    <p className="text-xs text-amber-700 mt-1 flex items-center space-x-1">
                      <FiCornerDownRight size={11} />
                      <span>Escala en {it.escala_en} · espera {fmtDur(it.layover_min)}</span>
                    </p>
                  )}
                </div>
              ))}
              <p className="text-xs text-gray-500 mt-1">
                {it.tipo === 'directo' ? 'Directo' : '1 escala'} · {fmtDur(it.duracion_min)}
              </p>
            </div>
          ))}
        </div>
      )}

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
                  <p className="font-medium text-gray-900">{p.nombres} {p.apellidos}</p>
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

      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-xs text-yellow-800">
          ⏱️ Una vez creada la reserva, tendrás <strong>30 minutos</strong> para completar el pago antes de que se liberen los asientos.
        </p>
      </div>
    </div>
  );
};
export default BookingSummary;