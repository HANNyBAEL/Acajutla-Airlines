import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiFilter, FiArrowLeft } from 'react-icons/fi';
import SearchForm from '../components/search/SearchForm';
import FlightCard from '../components/search/FlightCard';
import Loading from '../components/common/Loading';
import Alert from '../components/common/Alert';
import { useBooking } from '../context/BookingContext';
import { vuelosAPI } from '../services/api';
import { formatearFecha } from '../utils/formatters';

const SearchResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { busqueda, setVueloSeleccionado } = useBooking();
  const [vuelos, setVuelos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [orden, setOrden] = useState('precio');

  useEffect(() => {
    if (!busqueda) {
      navigate('/');
      return;
    }
    cargarVuelos();
  }, [busqueda]);

  const cargarVuelos = async () => {
    setCargando(true);
    setError(null);
    try {
      const response = await vuelosAPI.buscar({
        origen: busqueda.origen,
        destino: busqueda.destino,
        fecha: busqueda.fecha,
        clase: busqueda.clase,
      });
      setVuelos(response.data.datos || []);
    } catch (err) {
      setError('No se pudieron cargar los vuelos. Intenta de nuevo.');
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  const handleSelect = (vuelo) => {
    setVueloSeleccionado(vuelo);
    navigate('/checkout');
  };

  const vuelosOrdenados = [...vuelos].sort((a, b) => {
    if (orden === 'precio') return a.precio_base - b.precio_base;
    if (orden === 'salida') return new Date(a.fecha_hora_salida) - new Date(b.fecha_hora_salida);
    if (orden === 'duracion') {
      const durA = new Date(a.fecha_hora_llegada) - new Date(a.fecha_hora_salida);
      const durB = new Date(b.fecha_hora_llegada) - new Date(b.fecha_hora_salida);
      return durA - durB;
    }
    return 0;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header con búsqueda */}
      <div className="bg-gradient-to-br from-primary-700 to-sky-600 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate('/')}
            className="text-white hover:text-primary-100 mb-4 flex items-center text-sm"
          >
            <FiArrowLeft className="mr-1" /> Volver al inicio
          </button>
          <SearchForm variant="compact" />
        </div>
      </div>

      {/* Resultados */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info de búsqueda */}
        {busqueda && !cargando && (
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              {busqueda.origen} → {busqueda.destino}
            </h1>
            <p className="text-gray-600">
              {formatearFecha(busqueda.fecha, "EEEE dd 'de' MMMM, yyyy")} • {busqueda.pasajeros} pasajero(s)
            </p>
          </div>
        )}

        {/* Filtros y orden */}
        {!cargando && vuelos.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-4 bg-white rounded-lg shadow-sm">
            <div className="flex items-center space-x-2">
              <FiFilter className="text-gray-500" />
              <span className="text-sm text-gray-600">Ordenar por:</span>
              <select
                value={orden}
                onChange={(e) => setOrden(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="precio">Precio (menor a mayor)</option>
                <option value="salida">Hora de salida</option>
                <option value="duracion">Duración</option>
              </select>
            </div>
            <p className="text-sm text-gray-600">
              <strong className="text-gray-900">{vuelos.length}</strong> vuelos encontrados
            </p>
          </div>
        )}

        {/* Estado de carga */}
        {cargando && <Loading text="Buscando los mejores vuelos para ti..." />}

        {/* Error */}
        {error && (
          <Alert type="error" title="Error al buscar vuelos" message={error} />
        )}

        {/* Sin resultados */}
        {!cargando && !error && vuelos.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">✈️</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              No encontramos vuelos disponibles
            </h3>
            <p className="text-gray-600 mb-6">
              Intenta cambiar las fechas o el destino de tu búsqueda
            </p>
            <button onClick={() => navigate('/')} className="btn-primary">
              Nueva búsqueda
            </button>
          </div>
        )}

        {/* Lista de vuelos */}
        <div className="space-y-4">
          {vuelosOrdenados.map((vuelo) => (
            <FlightCard
              key={vuelo.id}
              vuelo={vuelo}
              onSelect={handleSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SearchResults;