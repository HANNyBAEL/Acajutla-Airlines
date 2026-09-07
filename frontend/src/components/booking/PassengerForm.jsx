import { useState, useEffect } from 'react';
import { FiUser, FiTrash2, FiCheck } from 'react-icons/fi';
import { validarPasajero } from '../../utils/validators';
import { clientesAPI } from '../../services/api';
import toast from 'react-hot-toast';

const PassengerForm = ({ index, pasajero, onChange, onRemove, puedeEliminar }) => {
  const [errores, setErrores] = useState({});
  const [tocado, setTocado] = useState({});
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [resultadoBusqueda, setResultadoBusqueda] = useState(null);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [sugerencias, setSugerencias] = useState([]);

  useEffect(() => {
    if (Object.keys(tocado).length > 0) {
      const validacion = validarPasajero(pasajero);
      setErrores(validacion.errores);
    }
  }, [pasajero, tocado]);

  // Debounce para búsqueda de cliente por documento
  useEffect(() => {
    const buscarClienteTimeout = setTimeout(async () => {
      if (pasajero.doc_numero && pasajero.doc_numero.length >= 5 && !resultadoBusqueda) {
        setBuscandoCliente(true);
        try {
          const response = await clientesAPI.buscar(pasajero.doc_numero);
          if (response.data.exito && response.data.datos.length > 0) {
            setSugerencias(response.data.datos);
            setMostrarSugerencias(true);
          } else {
            setSugerencias([]);
            setMostrarSugerencias(false);
          }
        } catch (error) {
          console.error('Error buscando cliente:', error);
        } finally {
          setBuscandoCliente(false);
        }
      } else {
        setMostrarSugerencias(false);
        setSugerencias([]);
      }
    }, 500);

    return () => clearTimeout(buscarClienteTimeout);
  }, [pasajero.doc_numero, resultadoBusqueda]);

  const handleChange = (campo, valor) => {
    onChange({ ...pasajero, [campo]: valor });
    setTocado((prev) => ({ ...prev, [campo]: true }));
    // Limpiar resultado si se modifica algún campo manual
    if (resultadoBusqueda && campo !== 'doc_numero') {
      setResultadoBusqueda(null);
    }
  };

  const handleBlur = (campo) => {
    setTocado((prev) => ({ ...prev, [campo]: true }));
  };

  const seleccionarCliente = (cliente) => {
    onChange({
      ...pasajero,
      nombres: cliente.first_names || '',
      apellidos: cliente.last_names || '',
      doc_tipo: cliente.document_type || pasajero.doc_tipo,
      doc_numero: cliente.document_number || pasajero.doc_numero,
      correo: cliente.email || pasajero.correo,
      telefono: cliente.phone || pasajero.telefono,
      nacionalidad: cliente.nationality || pasajero.nacionalidad,
    });
    setResultadoBusqueda(cliente);
    setMostrarSugerencias(false);
    setSugerencias([]);
    toast.success('Cliente encontrado y completado');
  };

  const usarDatosClienteComoPasajero = () => {
    if (!resultadoBusqueda) return;
    
    // Marcar que este pasajero es el mismo que el cliente
    onChange({
      ...pasajero,
      nombres: resultadoBusqueda.first_names || '',
      apellidos: resultadoBusqueda.last_names || '',
      doc_tipo: resultadoBusqueda.document_type || pasajero.doc_tipo,
      doc_numero: resultadoBusqueda.document_number || pasajero.doc_numero,
      correo: resultadoBusqueda.email || pasajero.correo,
      telefono: resultadoBusqueda.phone || pasajero.telefono,
      nacionalidad: resultadoBusqueda.nationality || pasajero.nacionalidad,
      es_cliente: true,
    });
    toast.success('Pasajero establecido como el cliente');
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
        <div className="flex items-center space-x-2">
          {resultadoBusqueda && (
            <button
              type="button"
              onClick={usarDatosClienteComoPasajero}
              className="text-green-600 hover:text-green-700 p-2 hover:bg-green-50 rounded-lg transition-colors flex items-center text-sm"
              title="Usar datos del cliente como pasajero"
            >
              <FiCheck className="mr-1" /> Es el cliente
            </button>
          )}
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
      </div>

      {/* Buscador de cliente por documento */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <label className="block text-sm font-medium text-blue-800 mb-1">
          🔍 Buscar cliente por documento (DUI, Pasaporte, NIT)
        </label>
        <div className="relative">
          <input
            type="text"
            value={pasajero.doc_numero || ''}
            onChange={(e) => handleChange('doc_numero', e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
            placeholder="Escribe el número de documento para buscar..."
            className="input-field pr-10"
            autoComplete="off"
          />
          {buscandoCliente && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>
        
        {/* Sugerencias de clientes */}
        {mostrarSugerencias && sugerencias.length > 0 && (
          <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            <p className="px-3 py-2 text-xs text-gray-500 bg-gray-50 border-b">
              Clientes encontrados - Haz clic para seleccionar:
            </p>
            {sugerencias.map((cliente) => (
              <button
                key={cliente.id}
                type="button"
                onClick={() => seleccionarCliente(cliente)}
                className="w-full px-3 py-2 text-left hover:bg-blue-50 border-b last:border-b-0 transition-colors"
              >
                <div className="font-medium text-gray-900">
                  {cliente.first_names} {cliente.last_names}
                </div>
                <div className="text-sm text-gray-600">
                  Doc: {cliente.document_number} | Email: {cliente.email || 'N/A'}
                </div>
              </button>
            ))}
          </div>
        )}
        
        {resultadoBusqueda && (
          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
            ✓ Cliente encontrado: {resultadoBusqueda.first_names} {resultadoBusqueda.last_names}
          </div>
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