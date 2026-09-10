import { createContext, useContext, useState, useEffect } from 'react';
const BookingContext = createContext();
export const useBooking = () => {
  const context = useContext(BookingContext);
  if (!context) throw new Error('useBooking debe usarse dentro de BookingProvider');
  return context;
};
export const BookingProvider = ({ children }) => {
  const [busqueda, setBusqueda] = useState(() => {
    const saved = localStorage.getItem('booking_search');
    return saved ? JSON.parse(saved) : null;
  });
  const [vueloSeleccionado, setVueloSeleccionado] = useState(null);
  const [vuelosSeleccionados, setVuelosSeleccionados] = useState([]);
  const [pasajeros, setPasajeros] = useState([]);
  const [serviciosAdicionales, setServiciosAdicionales] = useState([]);
  const [reservaCreada, setReservaCreada] = useState(null);

  useEffect(() => {
    if (busqueda) localStorage.setItem('booking_search', JSON.stringify(busqueda));
    else localStorage.removeItem('booking_search');
  }, [busqueda]);

  const agregarPasajero = (pasajero) => setPasajeros((prev) => [...prev, { ...pasajero, id: Date.now() }]);
  const actualizarPasajero = (id, datos) => setPasajeros((prev) => prev.map((p) => (p.id === id ? { ...p, ...datos } : p)));
  const eliminarPasajero = (id) => setPasajeros((prev) => prev.filter((p) => p.id !== id));

  const precioPorPasajero = () => {
    if (vuelosSeleccionados && vuelosSeleccionados.length) {
      return vuelosSeleccionados.reduce((s, it) => s + (it.vuelos || [it]).reduce((s2, v) => s2 + Number(v.base_price || v.precio_base || 250), 0), 0);
    }
    return vueloSeleccionado ? Number(vueloSeleccionado.precio_base || vueloSeleccionado.base_price || 250) : 250;
  };

  const calcularTotal = () => {
    const base = precioPorPasajero();
    const totalPasajeros = pasajeros.reduce((sum, p) => {
      let precio = base;
      if (p.tipo_pasajero === 'nino') precio *= 0.75;
      if (p.tipo_pasajero === 'bebe') precio *= 0.10;
      return sum + precio;
    }, 0);
    const totalServicios = serviciosAdicionales.reduce((sum, s) => sum + (s.precio * (s.cantidad || 1)), 0);
    const impuestos = totalPasajeros * 0.13 + (pasajeros.length * 25);
    return { subtotal: totalPasajeros + totalServicios, impuestos, total: totalPasajeros + totalServicios + impuestos };
  };

  const limpiarReserva = () => {
    setVueloSeleccionado(null);
    setVuelosSeleccionados([]);
    setPasajeros([]);
    setServiciosAdicionales([]);
    setReservaCreada(null);
  };

  const value = {
    busqueda, setBusqueda,
    vueloSeleccionado, setVueloSeleccionado,
    vuelosSeleccionados, setVuelosSeleccionados,
    pasajeros, agregarPasajero, actualizarPasajero, eliminarPasajero,
    serviciosAdicionales, setServiciosAdicionales,
    reservaCreada, setReservaCreada,
    calcularTotal, limpiarReserva,
  };
  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
};