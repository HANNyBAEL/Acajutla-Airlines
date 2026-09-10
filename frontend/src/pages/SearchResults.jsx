import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCornerDownRight, FiClock } from 'react-icons/fi';
import SearchForm from '../components/search/SearchForm';
import Loading from '../components/common/Loading';
import Alert from '../components/common/Alert';
import { useBooking } from '../context/BookingContext';
import api from '../services/api';
import { formatearFecha, formatearHora, formatearMoneda } from '../utils/formatters';

const fmtDur = (min) => `${Math.floor((min || 0) / 60)}h ${(min || 0) % 60}m`;

const ItinerarioCard = ({ itin, onSelect }) => {
  const legs = itin.vuelos || [];
  return (
    <div className="card p-4 hover:shadow-md transition">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1 space-y-2">
          {legs.map((v, i) => (
            <div key={v.id}>
              <div className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-bold text-gray-900">{v.flight_number}</span>
                  <span className="text-gray-600 ml-2">{v.origin_iata} → {v.destination_iata}</span>
                  <span className="text-xs text-gray-400 ml-2">{v.aircraft_model}</span>
                </div>
                <span className="text-gray-600">{formatearHora(v.departure_datetime)} – {formatearHora(v.arrival_datetime)}</span>
              </div>
              {i < legs.length - 1 && (
                <div className="flex items-center space-x-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 mt-1 w-fit">
                  <FiCornerDownRight size={12} />
                  <span>Escala en {itin.escala_en} · espera {fmtDur(itin.layover_min)}</span>
                </div>
              )}
            </div>
          ))}
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <FiClock size={12} />
            <span>{itin.tipo === 'directo' ? 'Vuelo directo' : 'Vuelo con 1 escala'} · Duración total {fmtDur(itin.duracion_min)} · {itin.available_seats} asientos disponibles</span>
          </div>
        </div>
        <div className="flex items-center justify-between md:flex-col md:items-end gap-2">
          <span className="text-2xl font-bold text-primary-700">{formatearMoneda(itin.base_price)}</span>
          <button className="btn-primary" onClick={() => onSelect(itin)}>Seleccionar</button>
        </div>
      </div>
    </div>
  );
};

const SearchResults = () => {
  const navigate = useNavigate();
  const { busqueda, setVueloSeleccionado, setVuelosSeleccionados } = useBooking();
  const [etapa, setEtapa] = useState('ida');
  const [datosIda, setDatosIda] = useState(null);
  const [datosVuelta, setDatosVuelta] = useState(null);
  const [idaSel, setIdaSel] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const esRedondo = !!busqueda && !busqueda.soloIda && !!busqueda.fechaRegreso;
  const cargarTramo = (origen, destino, fecha) =>
    api.get('/vuelos/itinerarios', { params: { origen, destino, fecha } }).then((r) => r.data.datos);

  useEffect(() => {
    if (!busqueda) { navigate('/'); return; }
    setCargando(true); setError(null);
    cargarTramo(busqueda.origen, busqueda.destino, busqueda.fecha)
      .then(setDatosIda)
      .catch(() => setError('No se pudieron cargar los vuelos de ida.'))
      .finally(() => setCargando(false));
  }, [busqueda]);

  const continuar = (itinerarios) => {
    setVuelosSeleccionados(itinerarios);
    setVueloSeleccionado(itinerarios[0].vuelos ? itinerarios[0].vuelos[0] : itinerarios[0]);
    navigate('/checkout');
  };

  const seleccionarIda = (itin) => {
    setIdaSel(itin);
    if (!esRedondo) { continuar([itin]); return; }
    setEtapa('vuelta');
    setCargando(true); setError(null);
    cargarTramo(busqueda.destino, busqueda.origen, busqueda.fechaRegreso)
      .then(setDatosVuelta)
      .catch(() => setError('No se pudieron cargar los vuelos de regreso.'))
      .finally(() => setCargando(false));
  };

  const seleccionarVuelta = (itin) => continuar([idaSel, itin]);

  if (!busqueda) return null;
  const datos = etapa === 'ida' ? datosIda : datosVuelta;
  const directos = datos ? datos.directos || [] : [];
  const conexiones = datos ? datos.conexiones || [] : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-primary-700 to-sky-600 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => { if (etapa === 'vuelta') { setEtapa('ida'); setDatosVuelta(null); } else navigate('/'); }}
            className="text-white hover:text-primary-100 mb-4 flex items-center text-sm">
            <FiArrowLeft className="mr-1" /> {etapa === 'vuelta' ? 'Volver a vuelos de ida' : 'Volver al inicio'}
          </button>
          <SearchForm variant="compact" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {etapa === 'ida' ? '① Vuelos de ida' : '② Vuelos de regreso'} · {etapa === 'ida' ? `${busqueda.origen} → ${busqueda.destino}` : `${busqueda.destino} → ${busqueda.origen}`}
            </h1>
            <p className="text-gray-600 text-sm">
              {formatearFecha(etapa === 'ida' ? busqueda.fecha : busqueda.fechaRegreso, "EEEE dd 'de' MMMM, yyyy")} · {busqueda.pasajeros} pasajero(s)
              {esRedondo && <span className="ml-2 text-primary-700 font-medium">· Ida y vuelta</span>}
            </p>
          </div>
          {etapa === 'vuelta' && idaSel && (
            <div className="text-sm bg-white border rounded-lg px-3 py-2">
              <span className="text-gray-500">Ida seleccionada:</span>{' '}
              <span className="font-medium">{(idaSel.vuelos || []).map((v) => v.flight_number).join(' + ')}</span>
            </div>
          )}
        </div>

        {error && <Alert type="error" title="Error" message={error} />}
        {cargando && <Loading text="Buscando vuelos..." />}

        {!cargando && !error && directos.length === 0 && conexiones.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">No encontramos vuelos</h3>
            <p className="text-gray-600">Intenta con otras fechas o destinos.</p>
          </div>
        )}

        {!cargando && directos.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Vuelos directos</h2>
            {directos.map((it) => (
              <ItinerarioCard key={it.vuelos[0].id} itin={it} onSelect={etapa === 'ida' ? seleccionarIda : seleccionarVuelta} />
            ))}
          </div>
        )}

        {!cargando && conexiones.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center space-x-2">
              <FiCornerDownRight className="text-amber-600" />
              <span>Vuelos con escala</span>
            </h2>
            {conexiones.map((it, i) => (
              <ItinerarioCard key={`cx-${i}`} itin={it} onSelect={etapa === 'ida' ? seleccionarIda : seleccionarVuelta} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default SearchResults;