import { Link } from 'react-router-dom';
import { FiPlane, FiShield, FiClock, FiAward, FiArrowRight } from 'react-icons/fi';
import SearchForm from '../components/search/SearchForm';

const Home = () => {
  const destinos = [
    { codigo: 'MIA', nombre: 'Miami', pais: 'Estados Unidos', precio: 389, imagen: '🌴' },
    { codigo: 'GUA', nombre: 'Guatemala', pais: 'Guatemala', precio: 149, imagen: '🏛️' },
    { codigo: 'MEX', nombre: 'Ciudad de México', pais: 'México', precio: 259, imagen: '🌮' },
    { codigo: 'SJO', nombre: 'San José', pais: 'Costa Rica', precio: 179, imagen: '🌿' },
  ];

  const caracteristicas = [
    {
      icono: <FiPlane className="text-3xl" />,
      titulo: 'Vuelos directos',
      descripcion: 'Conectamos El Salvador con los principales destinos de la región.',
    },
    {
      icono: <FiShield className="text-3xl" />,
      titulo: 'Reserva segura',
      descripcion: 'Tus datos y pagos están protegidos con encriptación de nivel bancario.',
    },
    {
      icono: <FiClock className="text-3xl" />,
      titulo: 'Check-in online',
      descripcion: 'Haz check-in desde 24 horas antes y evita filas en el aeropuerto.',
    },
    {
      icono: <FiAward className="text-3xl" />,
      titulo: 'Mejor precio',
      descripcion: 'Garantizamos las mejores tarifas para tus viajes nacionales e internacionales.',
    },
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-700 via-primary-800 to-sky-700 text-white overflow-hidden">
        {/* Patrón decorativo */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-sky-300 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-6xl font-bold mb-4 animate-fade-in">
              Vuela sin límites
            </h1>
            <p className="text-xl md:text-2xl text-primary-100 max-w-2xl mx-auto">
              Descubre el mundo con Acajutla Airlines. Tu próxima aventura comienza aquí.
            </p>
          </div>

          {/* Search Form */}
          <div className="max-w-5xl mx-auto animate-slide-up">
            <SearchForm variant="hero" />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 max-w-4xl mx-auto">
            {[
              { numero: '50+', label: 'Destinos' },
              { numero: '1M+', label: 'Pasajeros felices' },
              { numero: '99.9%', label: 'Puntualidad' },
              { numero: '24/7', label: 'Soporte' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-3xl md:text-4xl font-bold">{stat.numero}</p>
                <p className="text-sm text-primary-200">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Destinos populares */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Destinos populares
            </h2>
            <p className="text-gray-600">Explora nuestros destinos más solicitados</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {destinos.map((destino) => (
              <Link
                key={destino.codigo}
                to={`/vuelos?destino=${destino.codigo}`}
                className="group card overflow-hidden"
              >
                <div className="h-48 bg-gradient-to-br from-primary-400 to-sky-500 flex items-center justify-center text-7xl group-hover:scale-110 transition-transform duration-300">
                  {destino.imagen}
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-lg text-gray-900">{destino.nombre}</h3>
                  <p className="text-sm text-gray-500 mb-3">{destino.pais}</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Desde</p>
                      <p className="text-2xl font-bold text-primary-700">
                        ${destino.precio}
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-primary-50 group-hover:bg-primary-600 rounded-full flex items-center justify-center transition-colors">
                      <FiArrowRight className="text-primary-600 group-hover:text-white" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Características */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              ¿Por qué elegirnos?
            </h2>
            <p className="text-gray-600">La mejor experiencia de viaje te espera</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {caracteristicas.map((item, i) => (
              <div key={i} className="card p-6 text-center hover:-translate-y-1 transition-transform">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4 text-primary-600">
                  {item.icono}
                </div>
                <h3 className="font-bold text-lg text-gray-900 mb-2">{item.titulo}</h3>
                <p className="text-sm text-gray-600">{item.descripcion}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-primary-700 to-sky-600 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            ¿Ya tienes una reserva?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Gestiona tu reserva, haz check-in o descarga tu boleto
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/mi-reserva" className="btn-secondary bg-white text-primary-700 border-white hover:bg-gray-100">
              Consultar mi reserva
            </Link>
            <Link to="/checkin" className="btn-primary bg-sky-500 hover:bg-sky-600 border-sky-500">
              Check-in online
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;