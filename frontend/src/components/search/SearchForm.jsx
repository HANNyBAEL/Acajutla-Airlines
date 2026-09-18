import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiCalendar, FiUsers, FiMapPin, FiArrowRight } from 'react-icons/fi';
import { useBooking } from '../../context/BookingContext';
import { validarBusqueda } from '../../utils/validators';
import api from '../../services/api';

const SearchForm = ({ variant = 'hero' }) => {
  const navigate = useNavigate();
  const { busqueda, setBusqueda } = useBooking();
  const [form, setForm] = useState({
    origen: busqueda?.origen || '',
    destino: busqueda?.destino || '',
    fecha: busqueda?.fecha || '',
    fechaRegreso: busqueda?.fechaRegreso || '',
    pasajeros: busqueda?.pasajeros || 1,
    clase: busqueda?.clase || 'economy',
    soloIda: busqueda?.soloIda ?? true,
  });
  const [errores, setErrores] = useState({});
  const [aeropuertos, setAeropuertos] = useState([]);

  useEffect(() => {
    api.get('/aeropuertos?activos=1')
      .then((r) => setAeropuertos((r.data.datos || []).map((a) => ({ codigo: a.code, nombre: a.name || a.city, pais: a.country }))))
      .catch(() => setAeropuertos([]));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errores[name]) setErrores((prev) => ({ ...prev, [name]: null }));
  };

  const intercambiar = () => setForm((prev) => ({ ...prev, origen: prev.destino, destino: prev.origen }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const validacion = validarBusqueda(form);
    if (!validacion.valido) { setErrores(validacion.errores); return; }
    setBusqueda(form);
    navigate('/vuelos', { state: { busqueda: form } });
  };

  const isHero = variant === 'hero';
  return (
    <form onSubmit={handleSubmit} className={`${isHero ? 'bg-white rounded-2xl shadow-2xl p-6 md:p-8' : 'bg-white rounded-xl shadow-sm p-4 md:p-6 border'}`}>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        <div className="md:col-span-3">
          <label className="block text-sm font-semibold text-gray-700 mb-2"><FiMapPin className="inline mr-1" /> Origen</label>
          <select name="origen" value={form.origen} onChange={handleChange} className="input-field">
            <option value="">Seleccionar</option>
            {aeropuertos.map((a) => (<option key={a.codigo} value={a.codigo}>{a.codigo} - {a.nombre}</option>))}
          </select>
          {errores.origen && <p className="text-red-500 text-xs mt-1">{errores.origen}</p>}
        </div>
        <div className="md:col-span-1 flex justify-center">
          <button type="button" onClick={intercambiar} className="w-10 h-10 bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-full flex items-center justify-center transition-all hover:rotate-180 duration-300" title="Intercambiar">
            <FiArrowRight className="transform rotate-90" />
          </button>
        </div>
        <div className="md:col-span-3">
          <label className="block text-sm font-semibold text-gray-700 mb-2"><FiMapPin className="inline mr-1" /> Destino</label>
          <select name="destino" value={form.destino} onChange={handleChange} className="input-field">
            <option value="">Seleccionar</option>
            {aeropuertos.map((a) => (<option key={a.codigo} value={a.codigo}>{a.codigo} - {a.nombre}</option>))}
          </select>
          {errores.destino && <p className="text-red-500 text-xs mt-1">{errores.destino}</p>}
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-2"><FiCalendar className="inline mr-1" /> Ida</label>
          <input type="date" name="fecha" value={form.fecha} onChange={handleChange} min={new Date().toISOString().split('T')[0]} className="input-field" />
          {errores.fecha && <p className="text-red-500 text-xs mt-1">{errores.fecha}</p>}
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-2"><FiCalendar className="inline mr-1" /> Regreso</label>
          <input type="date" name="fechaRegreso" value={form.fechaRegreso} onChange={handleChange} min={form.fecha || new Date().toISOString().split('T')[0]} disabled={form.soloIda} className="input-field disabled:bg-gray-100 disabled:text-gray-400" />
          {errores.fechaRegreso && <p className="text-red-500 text-xs mt-1">{errores.fechaRegreso}</p>}
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-2"><FiUsers className="inline mr-1" /> Pasajeros</label>
          <select name="pasajeros" value={form.pasajeros} onChange={handleChange} className="input-field">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (<option key={n} value={n}>{n} {n === 1 ? 'pasajero' : 'pasajeros'}</option>))}
          </select>
        </div>
        <div className="md:col-span-1">
          <button type="submit" className="btn-primary w-full flex items-center justify-center"><FiSearch size={20} /></button>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 items-center">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input type="checkbox" name="soloIda" checked={form.soloIda} onChange={(e) => setForm((prev) => ({ ...prev, soloIda: e.target.checked, fechaRegreso: e.target.checked ? '' : prev.fechaRegreso }))} className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500" />
          <span className="text-sm text-gray-700">Solo ida</span>
        </label>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700">Clase:</span>
          <select name="clase" value={form.clase} onChange={handleChange} className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="economy">Económica</option>
            <option value="premium">Premium Economy</option>
            <option value="business">Ejecutiva</option>
            <option value="first">Primera Clase</option>
          </select>
        </div>
      </div>
    </form>
  );
};
export default SearchForm;
