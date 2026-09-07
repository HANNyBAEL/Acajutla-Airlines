import { useState, useEffect } from 'react';
import { FiUser, FiTrash2 } from 'react-icons/fi';
import { validarPasajero } from '../../utils/validators';

const PassengerForm = ({ index, pasajero, onChange, onRemove, puedeEliminar }) => {
  const [errores, setErrores] = useState({});
  const [tocado, setTocado] = useState({});

  useEffect(() => {
    if (Object.keys(tocado).length > 0) {
      const validacion = validarPasajero(pasajero);
      setErrores(validacion.errores);
    }
  }, [pasajero, tocado]);

  const handleChange = (campo, valor) => {
    onChange({ ...pasajero, [campo]: valor });
    setTocado((prev) => ({ ...prev, [campo]: true }));
  };

  const handleBlur = (campo) => {
    setTocado((prev) => ({ ...prev, [campo]: true }));
  };

  return (
    <div className="card p-5 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
            <FiUser className="text-primary-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Pasajero {index + 1}</h3>
            <p className="text-xs text-gray-500">
              {pasajero.tipo_pasajero === 'adulto' && 'Adulto (12+ años)'}
              {pasajero.tipo_pasajero === 'nino' && 'Niño (2-11 años)'}
              {pasajero.tipo_pasajero === 'bebe' && 'Bebé (0-23 meses)'}
            </p>
          </div>
        </div>
        {puedeEliminar && (
          <button
            onClick={onRemove}
            className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
            title="Eliminar pasajero"
          >
            <FiTrash2 />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tipo de pasajero */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de pasajero *
          </label>
          <select
            value={pasajero.tipo_pasajero || 'adulto'}
            onChange={(e) => handleChange('tipo_pasajero', e.target.value)}
            className="input-field"
          >
            <option value="adulto">Adulto</option>
            <option value="nino">Niño</option>
            <option value="bebe">Bebé</option>
          </select>
        </div>

        {/* Nacionalidad */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nacionalidad *
          </label>
          <select
            value={pasajero.nacionalidad || ''}
            onChange={(e) => handleChange('nacionalidad', e.target.value)}
            onBlur={() => handleBlur('nacionalidad')}
            className="input-field"
          >
            <option value="">Seleccionar</option>
            <option value="SV">Salvadoreña</option>
            <option value="US">Estadounidense</option>
            <option value="GT">Guatemalteca</option>
            <option value="HN">Hondureña</option>
            <option value="NI">Nicaragüense</option>
            <option value="CR">Costarricense</option>
            <option value="MX">Mexicana</option>
            <option value="OT">Otra</option>
          </select>
          {errores.nacionalidad && tocado.nacionalidad && (
            <p className="text-red-500 text-xs mt-1">{errores.nacionalidad}</p>
          )}
        </div>

        {/* Nombres */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombres *
          </label>
          <input
            type="text"
            value={pasajero.nombres || ''}
            onChange={(e) => handleChange('nombres', e.target.value.toUpperCase())}
            onBlur={() => handleBlur('nombres')}
            placeholder="Ej: JUAN CARLOS"
            className="input-field"
          />
          {errores.nombres && tocado.nombres && (
            <p className="text-red-500 text-xs mt-1">{errores.nombres}</p>
          )}
        </div>

        {/* Apellidos */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Apellidos *
          </label>
          <input
            type="text"
            value={pasajero.apellidos || ''}
            onChange={(e) => handleChange('apellidos', e.target.value.toUpperCase())}
            onBlur={() => handleBlur('apellidos')}
            placeholder="Ej: MENJIVAR LOPEZ"
            className="input-field"
          />
          {errores.apellidos && tocado.apellidos && (
            <p className="text-red-500 text-xs mt-1">{errores.apellidos}</p>
          )}
        </div>

        {/* Tipo de documento */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de documento *
          </label>
          <select
            value={pasajero.doc_tipo || ''}
            onChange={(e) => handleChange('doc_tipo', e.target.value)}
            onBlur={() => handleBlur('doc_tipo')}
            className="input-field"
          >
            <option value="">Seleccionar</option>
            <option value="13">DUI</option>
            <option value="36">NIT</option>
            <option value="3">Pasaporte</option>
          </select>
          {errores.doc_tipo && tocado.doc_tipo && (
            <p className="text-red-500 text-xs mt-1">{errores.doc_tipo}</p>
          )}
        </div>

        {/* Número de documento */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Número de documento *
          </label>
          <input
            type="text"
            value={pasajero.doc_numero || ''}
            onChange={(e) => handleChange('doc_numero', e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
            onBlur={() => handleBlur('doc_numero')}
            placeholder={
              pasajero.doc_tipo === '13' ? '00000000-0' :
              pasajero.doc_tipo === '36' ? '0000-000000-000-0' :
              'Número de pasaporte'
            }
            className="input-field"
          />
          {errores.doc_numero && tocado.doc_numero && (
            <p className="text-red-500 text-xs mt-1">{errores.doc_numero}</p>
          )}
        </div>

        {/* Fecha de nacimiento */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fecha de nacimiento *
          </label>
          <input
            type="date"
            value={pasajero.fecha_nacimiento || ''}
            onChange={(e) => handleChange('fecha_nacimiento', e.target.value)}
            onBlur={() => handleBlur('fecha_nacimiento')}
            max={new Date().toISOString().split('T')[0]}
            className="input-field"
          />
          {errores.fecha_nacimiento && tocado.fecha_nacimiento && (
            <p className="text-red-500 text-xs mt-1">{errores.fecha_nacimiento}</p>
          )}
        </div>

        {/* Correo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Correo electrónico
          </label>
          <input
            type="email"
            value={pasajero.correo || ''}
            onChange={(e) => handleChange('correo', e.target.value)}
            onBlur={() => handleBlur('correo')}
            placeholder="correo@ejemplo.com"
            className="input-field"
          />
          {errores.correo && tocado.correo && (
            <p className="text-red-500 text-xs mt-1">{errores.correo}</p>
          )}
        </div>

        {/* Teléfono */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Teléfono
          </label>
          <input
            type="tel"
            value={pasajero.telefono || ''}
            onChange={(e) => handleChange('telefono', e.target.value.replace(/[^0-9]/g, ''))}
            onBlur={() => handleBlur('telefono')}
            placeholder="78901234"
            maxLength={8}
            className="input-field"
          />
          {errores.telefono && tocado.telefono && (
            <p className="text-red-500 text-xs mt-1">{errores.telefono}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PassengerForm;