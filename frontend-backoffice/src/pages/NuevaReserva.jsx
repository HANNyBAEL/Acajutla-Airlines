import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import Autocomplete from '../components/Autocomplete';
import SearchableSelect from '../components/SearchableSelect';
import { FiSearch, FiUserPlus, FiTrash2, FiCheckCircle, FiX, FiShoppingBag } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { fechaActualSV } from '../utils/fechaServidor';
const nacionalidades = ['SV', 'US', 'GT', 'HN', 'NI', 'CR', 'PA', 'MX'];
const MAP_DOC = { DUI: '13', NIT: '36', Passport: '3', '13': '13', '36': '36', '3': '3' };
const pasajeroVacio = () => ({
  passenger_type: 'adult', first_names: '', last_names: '',
  document_type: '13', document_number: '', birth_date: '', nationality: 'SV', asientos: {},
});
const tipoPorEdad = (birth) => {
  const text = String(birth || '').slice(0, 10);
  const hoy = fechaActualSV();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || text > hoy) return null;
  const [y, m, d] = text.split('-').map(Number);
  const validacion = new Date(Date.UTC(y, m - 1, d));
  if (validacion.getUTCFullYear() !== y || validacion.getUTCMonth() !== m - 1 || validacion.getUTCDate() !== d) return null;
  const [hy, hm, hd] = hoy.split('-').map(Number);
  const e = hy - y - (hm < m || (hm === m && hd < d) ? 1 : 0);
  if (e < 2) return 'infant';
  if (e < 12) return 'child';
  return 'adult';
};
const puedeOcuparSalida = (pasajero) => {
  const nacimiento = String(pasajero.birth_date || '').slice(0, 10);
  const hoy = fechaActualSV();
  if (pasajero.passenger_type !== 'adult' || !/^\d{4}-\d{2}-\d{2}$/.test(nacimiento) || nacimiento > hoy) return false;
  const [y, m, d] = nacimiento.split('-').map(Number);
  const [hy, hm, hd] = hoy.split('-').map(Number);
  return hy - y - (hm < m || (hm === m && hd < d) ? 1 : 0) >= 15;
};
const fechaMinima = () => {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return ahora.getFullYear() + '-' + mes + '-' + dia;
};

const NuevaReserva = () => {
  const [aeropuertos, setAeropuertos] = useState([]);
  const opcionesAeropuerto = useMemo(
    () => aeropuertos.map((a) => ({
      value: a.code,
      label: a.code + ' - ' + (a.city || a.name),
      searchText: [a.code, a.city, a.name, a.country].filter(Boolean).join(' '),
    })),
    [aeropuertos]
  );
  const [clienteId, setClienteId] = useState('');
  const [clienteSel, setClienteSel] = useState(null);
  const [modalNuevoCliente, setModalNuevoCliente] = useState(false);
  const [guardandoCliente, setGuardandoCliente] = useState(false);
  const [clienteForm, setClienteForm] = useState({ first_names: '', last_names: '', document_type: 'DUI', document_number: '', birth_date: '', email: '', phone: '' });
  const [autoRellenar, setAutoRellenar] = useState(true);
  const [tipoViaje, setTipoViaje] = useState('ida');
  const [trayectos, setTrayectos] = useState([{ origen: 'SAL', destino: 'MIA', fecha: '', vuelos: [], vueloId: null, buscando: false }]);
  const [pasajeros, setPasajeros] = useState([pasajeroVacio()]);
  const [clase, setClase] = useState('economy');
  const [guardando, setGuardando] = useState(false);
  const [pnrCreado, setPnrCreado] = useState(null);
  const [asientosCreados, setAsientosCreados] = useState([]);
  const [ancillariesPorVuelo, setAncillariesPorVuelo] = useState({});
  const [ancillariesCargando, setAncillariesCargando] = useState(false);
  const [ancillariesSeleccionados, setAncillariesSeleccionados] = useState([]);
  const [mapasAsientos, setMapasAsientos] = useState({});
  const [asientosCargando, setAsientosCargando] = useState(false);
  const [asientosError, setAsientosError] = useState(false);
  const [revisionAsientos, setRevisionAsientos] = useState(0);
  const [estadoCorreo, setEstadoCorreo] = useState(null);

  useEffect(() => {
    api.get('/aeropuertos?activos=1')
      .then((r) => setAeropuertos(r.data.datos || []))
      .catch(() => toast.error('Error al cargar aeropuertos'));
  }, []);

  const claveVuelosSeleccionados = [...new Set(trayectos.map((t) => t.vueloId).filter(Boolean).map(String))].sort().join(',');
  useEffect(() => {
    let vigente = true;
    const ids = claveVuelosSeleccionados ? claveVuelosSeleccionados.split(',') : [];
    if (!ids.length) {
      setAncillariesPorVuelo({});
      setAncillariesSeleccionados([]);
      setAncillariesCargando(false);
      return () => { vigente = false; };
    }

    setAncillariesCargando(true);
    Promise.all(ids.map((id) => api.get('/comercial/ancillaries/vuelo/' + id)
      .then((response) => [id, response.data.datos || []])
      .catch((error) => {
        console.error('Error al cargar servicios del vuelo:', error);
        return [id, []];
      })))
      .then((resultados) => {
        if (!vigente) return;
        const porVuelo = Object.fromEntries(resultados);
        setAncillariesPorVuelo(porVuelo);
        setAncillariesSeleccionados((actuales) => actuales.flatMap((linea) => {
          const servicio = (porVuelo[String(linea.flight_id)] || []).find((item) => String(item.ancillary_id) === String(linea.ancillary_id));
          if (!servicio || Number(servicio.stock) <= 0) return [];
          return [Object.assign({}, linea, { quantity: Math.min(linea.quantity, Number(servicio.stock)) })];
        }));
      })
      .finally(() => { if (vigente) setAncillariesCargando(false); });

    return () => { vigente = false; };
  }, [claveVuelosSeleccionados]);

  useEffect(() => {
    let vigente = true;
    const ids = claveVuelosSeleccionados ? claveVuelosSeleccionados.split(',') : [];
    if (!ids.length) {
      setMapasAsientos({});
      setAsientosError(false);
      setAsientosCargando(false);
      return () => { vigente = false; };
    }
    setAsientosCargando(true);
    setAsientosError(false);
    Promise.all(ids.map((id) => api.get('/reservas/asientos/' + encodeURIComponent(id))
      .then((r) => [id, r.data.datos])))
      .then((mapas) => { if (vigente) setMapasAsientos(Object.fromEntries(mapas)); })
      .catch(() => { if (vigente) { setMapasAsientos({}); setAsientosError(true); } })
      .finally(() => { if (vigente) setAsientosCargando(false); });
    return () => { vigente = false; };
  }, [claveVuelosSeleccionados, revisionAsientos]);

  const seleccionarAsiento = (indice, flightId, asiento) => {
    setPasajeros((actuales) => actuales.map((pasajero, i) => i === indice
      ? { ...pasajero, asientos: { ...pasajero.asientos, [String(flightId)]: asiento } }
      : pasajero));
  };

  const actualizarTrayecto = (indice, campo, valor) => {
    const vueloAnterior = trayectos[indice]?.vueloId;
    if (vueloAnterior && campo !== 'vueloId') {
      setAncillariesSeleccionados((actuales) => actuales.filter((linea) => String(linea.flight_id) !== String(vueloAnterior)));
    }
    if (vueloAnterior && campo === 'vueloId' && String(valor) !== String(vueloAnterior)) {
      setAncillariesSeleccionados((actuales) => actuales.filter((linea) => String(linea.flight_id) !== String(vueloAnterior)));
    }
    setTrayectos((actuales) => actuales.map((t, i) => i === indice
      ? Object.assign({}, t, { [campo]: valor, vuelos: campo === 'vueloId' ? t.vuelos : [], vueloId: campo === 'vueloId' ? valor : null })
      : t));
  };

  const cambiarAncillarySeleccionado = (flightId, servicio, incluido) => {
    setAncillariesSeleccionados((actuales) => {
      const restantes = actuales.filter((linea) => !(String(linea.flight_id) === String(flightId) && String(linea.ancillary_id) === String(servicio.ancillary_id)));
      return incluido ? restantes.concat([{ flight_id: Number(flightId), ancillary_id: Number(servicio.ancillary_id), quantity: 1 }]) : restantes;
    });
  };

  const cambiarCantidadAncillary = (flightId, ancillaryId, quantity) => {
    setAncillariesSeleccionados((actuales) => actuales.map((linea) =>
      String(linea.flight_id) === String(flightId) && String(linea.ancillary_id) === String(ancillaryId)
        ? Object.assign({}, linea, { quantity: Number(quantity) })
        : linea
    ));
  };

  const cambiarTipoViaje = (tipo) => {
    setTipoViaje(tipo);
    setTrayectos((actuales) => {
      const ida = actuales[0] || { origen: 'SAL', destino: 'MIA', fecha: '', vuelos: [], vueloId: null, buscando: false };
      if (tipo === 'ida') return [ida];
      if (tipo === 'regreso') return [ida, { origen: ida.destino, destino: ida.origen, fecha: '', vuelos: [], vueloId: null, buscando: false }];
      return actuales.length > 1 ? actuales : [ida, { origen: ida.destino, destino: 'GUA', fecha: '', vuelos: [], vueloId: null, buscando: false }];
    });
  };

  const agregarTrayecto = () => setTrayectos((actuales) => {
    const anterior = actuales[actuales.length - 1];
    return actuales.concat([{ origen: anterior.destino, destino: 'MIA', fecha: '', vuelos: [], vueloId: null, buscando: false }]);
  });

  const buscarVuelos = async (indice, mantenerSeleccion = false) => {
    const trayecto = trayectos[indice];
    if (!trayecto.fecha) return toast.error('Selecciona la fecha del trayecto ' + (indice + 1));
    setTrayectos((actuales) => actuales.map((t, i) => i === indice ? Object.assign({}, t, { buscando: true, vueloId: mantenerSeleccion ? t.vueloId : null }) : t));
    try {
      const r = await api.get('/vuelos/buscar', { params: { origen: trayecto.origen, destino: trayecto.destino, fecha: trayecto.fecha, clase } });
      const resultados = r.data.datos || [];
      setTrayectos((actuales) => actuales.map((t, i) => {
        if (i !== indice) return t;
        const seleccion = t.vueloId && resultados.some((v) => v.id === t.vueloId) ? t.vueloId : null;
        return Object.assign({}, t, { vuelos: resultados, buscando: false, vueloId: seleccion });
      }));
      if (!resultados.length) toast.error('No hay vuelos para ese trayecto y fecha');
    } catch (e) { toast.error(e.response && e.response.data && e.response.data.error ? e.response.data.error : 'Error al buscar vuelos'); }
    finally { setTrayectos((actuales) => actuales.map((t, i) => i === indice ? Object.assign({}, t, { buscando: false }) : t)); }
  };

  const setPax = (i, campo, valor) => {
    setPasajeros((prev) => prev.map((p, idx) => {
      if (idx !== i) return p;
      const np = Object.assign({}, p, { [campo]: valor });
      if (campo === 'birth_date') {
        const t = tipoPorEdad(valor);
        if (t) np.passenger_type = t;
      }
      return np;
    }));
  };

  const seleccionarCliente = (c) => {
    setClienteSel(c);
    setClienteId(c ? c.id : '');
    if (c && autoRellenar) {
      setPasajeros((prev) => prev.map((p, idx) => idx === 0 ? Object.assign({}, p, {
        first_names: c.first_names || '',
        last_names: c.last_names || '',
        document_type: MAP_DOC[c.document_type] || '13',
        document_number: c.document_number || '',
        birth_date: c.birth_date ? String(c.birth_date).slice(0, 10) : '',
        passenger_type: c.birth_date ? (tipoPorEdad(c.birth_date) || 'adult') : 'adult',
      }) : p));
    }
  };

  const toggleAuto = (checked) => {
    setAutoRellenar(checked);
    if (checked && clienteSel) seleccionarCliente(clienteSel);
  };

  // Al cambiar la clase se repite la búsqueda conservando el vuelo elegido
  // para que el resumen muestre de inmediato el precio de la nueva clase.
  useEffect(() => {
    trayectos.forEach((t, i) => {
      if (t.fecha && t.vuelos.length > 0) {
        buscarVuelos(i, true);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clase]);

  const setCampoCliente = (campo, valor) => setClienteForm((f) => Object.assign({}, f, { [campo]: valor }));

  const abrirModalNuevoCliente = () => {
    setClienteForm({ first_names: '', last_names: '', document_type: 'DUI', document_number: '', birth_date: '', email: '', phone: '' });
    setModalNuevoCliente(true);
  };

  const registrarCliente = async () => {
    if (!clienteForm.first_names || !clienteForm.last_names || !clienteForm.document_number || !clienteForm.birth_date)
      return toast.error('Nombres, apellidos, documento y fecha de nacimiento son obligatorios');
    setGuardandoCliente(true);
    try {
      const rc = await api.post('/clientes', clienteForm);
      const creado = Object.assign({}, clienteForm, { id: rc.data.datos.id });
      setModalNuevoCliente(false);
      seleccionarCliente(creado);
      toast.success('Cliente registrado y seleccionado');
    } catch (e) {
      if (e.response && e.response.status === 409) toast.error('Ya existe un cliente con ese documento o email. Búscalo y selecciónalo.');
      else toast.error(e.response?.data?.error || 'Error al registrar el cliente');
    } finally { setGuardandoCliente(false); }
  };

  const vuelosSeleccionados = trayectos.map((t) => t.vuelos.find((v) => v.id === t.vueloId)).filter(Boolean);
  const vuelosSinCupo = vuelosSeleccionados.filter((vuelo) => pasajeros.length > Number(vuelo.available_seats || 0));
  const totalEstimado = pasajeros.reduce((sum, pax) => {
    const porcentaje = pax.passenger_type === 'child' ? 75 : pax.passenger_type === 'infant' ? 10 : 100;
    return sum + vuelosSeleccionados.reduce((total, vuelo) => {
      const lineas = vuelo.fare_price != null ? [vuelo.fare_price, ...(vuelo.taxes || []).map(t => t.amount)] : [vuelo.total_price || 0];
      return total + lineas.reduce((subtotal, monto) => subtotal + Math.round(Math.round(Number(monto) * 100) * porcentaje / 100), 0);
    }, 0);
  }, 0) / 100;
  const totalAncillariesCentavos = ancillariesSeleccionados.reduce((total, linea) => {
    const servicio = (ancillariesPorVuelo[String(linea.flight_id)] || []).find((item) => String(item.ancillary_id) === String(linea.ancillary_id));
    return total + Math.round(Number(servicio?.precio_con_impuestos ?? servicio?.precio_final ?? 0) * 100) * Number(linea.quantity || 0);
  }, 0);
  const totalEstimadoConAncillaries = totalEstimado + totalAncillariesCentavos / 100;

  const guardar = async () => {
    if (!clienteId || !clienteSel || Number(clienteSel.id) !== Number(clienteId)) return toast.error('Selecciona un cliente o agrega uno nuevo');
    if (trayectos.some((t) => !t.vueloId)) return toast.error('Selecciona un vuelo para cada trayecto');
    if (ancillariesCargando) return toast.error('Espera a que termine de cargar la disponibilidad de servicios');
    if (asientosCargando) return toast.error('Espera a que termine de cargar la disponibilidad de asientos');
    if (asientosError) return toast.error('No se pudo consultar la disponibilidad de asientos. Intenta de nuevo.');
    for (const vuelo of vuelosSeleccionados) {
      const mapa = mapasAsientos[String(vuelo.id)];
      if (!mapa) return toast.error('No se pudo consultar la disponibilidad de asientos del vuelo ' + vuelo.flight_number);
      const elegidos = pasajeros.map((p) => p.asientos?.[String(vuelo.id)]).filter(Boolean);
      if (new Set(elegidos).size !== elegidos.length || elegidos.some((asiento) => mapa.ocupados.includes(asiento)))
        return toast.error('Hay asientos ocupados o repetidos en el vuelo ' + vuelo.flight_number + '. Selecciona otros.');
      if (pasajeros.some((p) => p.asientos?.[String(vuelo.id)] && (mapa.filasSalida || []).includes(parseInt(p.asientos[String(vuelo.id)], 10)) && !puedeOcuparSalida(p)))
        return toast.error('Las filas de salida requieren un adulto de al menos 15 años.');
    }
    const vueloSinCupo = vuelosSeleccionados.find((vuelo) => pasajeros.length > Number(vuelo.available_seats || 0));
    if (vueloSinCupo) {
      return toast.error(`No se puede completar la compra: el vuelo ${vueloSinCupo.flight_number} tiene ${Number(vueloSinCupo.available_seats || 0)} asientos disponibles y se solicitaron ${pasajeros.length} boletos.`, { duration: 8000 });
    }
    for (const linea of ancillariesSeleccionados) {
      const servicio = (ancillariesPorVuelo[String(linea.flight_id)] || []).find((item) => String(item.ancillary_id) === String(linea.ancillary_id));
      if (!Number.isInteger(Number(linea.quantity)) || Number(linea.quantity) < 1) return toast.error('La cantidad de cada servicio debe ser al menos 1');
      if (!servicio || Number(linea.quantity) > Number(servicio.stock)) return toast.error(`Ya no hay suficiente inventario para ${servicio?.name || 'el servicio seleccionado'}`);
    }
    for (let i = 0; i < pasajeros.length; i++) {
      const p = pasajeros[i];
      if (!p.first_names || !p.last_names || !p.document_number || !p.birth_date)
        return toast.error('Completa todos los datos del pasajero ' + (i + 1));
    }
    setGuardando(true);
    try {
      const cid = clienteId;
      const r = await api.post('/reservas', {
        customer_id: Number(cid),
        vuelos: trayectos.map((t) => ({ flight_id: t.vueloId, fare_class: clase, asientos: pasajeros.map((p) => p.asientos?.[String(t.vueloId)] || null) })),
        pasajeros: pasajeros.map(({ asientos, ...p }) => p),
        ancillaries: ancillariesSeleccionados,
        time_limit_minutes: 30,
      });
      setEstadoCorreo({ tipo: 'enviando' });
      setPnrCreado(r.data.datos.pnr);
      setAsientosCreados(r.data.datos.asientos_asignados || []);
      toast.success('Reserva creada');
      try {
        const respuestaCorreo = await api.post('/correos/confirmacion-reserva', { reservation_id: r.data.datos.reservation_id });
        const correo = respuestaCorreo.data.datos || {};
        setEstadoCorreo({ tipo: !correo.enviado ? 'error' : correo.simulado ? 'simulado' : 'enviado', motivo: correo.motivo });
      } catch {
        setEstadoCorreo({ tipo: 'error' });
      }
    } catch (e) {
      const mensaje = e.response && e.response.data && e.response.data.error ? e.response.data.error : 'Error al crear la reserva';
      toast.error(mensaje + (e.response && e.response.data && e.response.data.detalle ? ' → ' + e.response.data.detalle : ''));
      if (e.response?.status === 409) setRevisionAsientos((actual) => actual + 1);
    } finally { setGuardando(false); }
  };

  if (pnrCreado) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="card p-10 text-center">
          <FiCheckCircle className="text-green-500 mx-auto" size={64} />
          <h1 className="text-2xl font-bold text-gray-800 mt-4">Reserva creada con éxito</h1>
          <p className="text-gray-500 mt-2">Código PNR (RF-002):</p>
          <p className="text-5xl font-mono font-bold text-primary-700 tracking-widest mt-4">{pnrCreado}</p>
          <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-6">
            Reserva en estado PENDIENTE con time limit de 30 minutos (RN-COM-01). Sigue al módulo de Pagos.
          </p>
          {asientosCreados.length > 0 && <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-4 text-left">
            <h2 className="font-semibold text-blue-900">Asientos asignados</h2>
            <div className="mt-2 space-y-1 text-sm text-blue-800">
              {asientosCreados.map((item, indice) => <p key={`${item.vuelo}-${indice}`}>{item.pasajero} · {item.vuelo} · asiento {item.asiento}</p>)}
            </div>
          </div>}
          {estadoCorreo && <p role="status" className={'mt-4 rounded-lg border p-3 text-sm ' + (estadoCorreo.tipo === 'enviado' ? 'border-green-200 bg-green-50 text-green-800' : estadoCorreo.tipo === 'enviando' ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-amber-200 bg-amber-50 text-amber-800')}>
            {estadoCorreo.tipo === 'enviando' ? 'Enviando confirmación por correo...' : estadoCorreo.tipo === 'enviado' ? 'Confirmación enviada por correo.' : estadoCorreo.tipo === 'simulado' ? 'La confirmación quedó en modo simulado; no se envió un correo real.' : `La reserva se creó, pero no se pudo enviar la confirmación${estadoCorreo.motivo ? ': ' + estadoCorreo.motivo : '.'}`}
          </p>}
          {ancillariesSeleccionados.length > 0 && (
            <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-4 text-left">
              <h2 className="font-semibold text-blue-900">Servicios incluidos en la reserva</h2>
              <div className="mt-2 space-y-1 text-sm text-blue-800">
                {ancillariesSeleccionados.map((linea) => {
                  const servicio = (ancillariesPorVuelo[String(linea.flight_id)] || []).find((item) => String(item.ancillary_id) === String(linea.ancillary_id));
                  const vuelo = vuelosSeleccionados.find((item) => String(item.id) === String(linea.flight_id));
                  return <p key={`${linea.flight_id}-${linea.ancillary_id}`}>{linea.quantity} × {servicio?.name || 'Servicio adicional'} · {vuelo?.flight_number || 'Vuelo'} · ${((Math.round(Number(servicio?.precio_final || 0) * 100) * Number(linea.quantity)) / 100).toFixed(2)}</p>;
                })}
              </div>
              <p className="mt-2 text-xs text-blue-700">Se cobrarán junto con la reserva y se incluirán en el DTE emitido al completar el pago.</p>
            </div>
          )}
          <button className="btn-primary mt-6" disabled={guardando} onClick={() => { setPnrCreado(null); setAsientosCreados([]); setEstadoCorreo(null); setPasajeros([pasajeroVacio()]); setTrayectos([{ origen: 'SAL', destino: 'MIA', fecha: '', vuelos: [], vueloId: null, buscando: false }]); setAncillariesSeleccionados([]); setClienteId(''); setClienteSel(null); setTipoViaje('ida'); setClase('economy'); }}>
            Crear otra reserva
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">1. Cliente</h2>
          <div className="space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <Autocomplete
                  placeholder="Escribe nombre, apellido, documento o email (mínimo 2 letras)..."
                  fetcher={(q) => api.get('/clientes/buscar', { params: { q: q } }).then((r) => r.data.datos)}
                  renderLabel={(c) => c.first_names + ' ' + c.last_names}
                  renderSub={(c) => (c.document_number ? c.document_type + ' ' + c.document_number : 'Sin documento') + (c.email ? ' · ' + c.email : '')}
                  onSelect={seleccionarCliente}
                />
              </div>
              <button type="button" className="btn-secondary flex items-center justify-center space-x-2 shrink-0" onClick={abrirModalNuevoCliente}>
                <FiUserPlus /><span>Agregar nuevo cliente</span>
              </button>
            </div>
            <label className="flex items-center space-x-2 text-sm text-gray-700">
              <input type="checkbox" checked={autoRellenar} onChange={(e) => toggleAuto(e.target.checked)} />
              <span>Rellenar automáticamente el Pasajero 1 con los datos del cliente</span>
            </label>
            {clienteSel && (
              <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg p-2">
                Cliente seleccionado: {clienteSel.first_names} {clienteSel.last_names}{clienteSel.document_number ? ' (' + clienteSel.document_number + ')' : ''}
              </p>
            )}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">2. Vuelo</h2>
          <div className="flex flex-wrap gap-2 mb-5">
            {[['ida', 'Solo ida'], ['regreso', 'Ida y regreso'], ['multiple', 'Múltiples trayectos']].map(([valor, etiqueta]) => (
              <button key={valor} type="button" onClick={() => cambiarTipoViaje(valor)} className={'px-4 py-2 rounded-lg text-sm font-medium border ' + (tipoViaje === valor ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-300')}>
                {etiqueta}
              </button>
            ))}
          </div>
          <div className="space-y-5">
            {trayectos.map((t, indice) => (
              <div key={indice} className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                <div className="flex justify-between items-center mb-3">
                  <p className="font-semibold text-gray-700">Trayecto {indice + 1}{tipoViaje === 'regreso' && indice === 1 ? ' · Regreso' : ''}</p>
                  {tipoViaje === 'multiple' && trayectos.length > 2 && <button type="button" className="text-sm text-red-600" onClick={() => setTrayectos((actuales) => actuales.filter((_, i) => i !== indice))}>Eliminar</button>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <SearchableSelect options={opcionesAeropuerto} value={t.origen} onChange={(valor) => actualizarTrayecto(indice, 'origen', valor)} placeholder="Desde: código o ciudad..." />
                  <SearchableSelect options={opcionesAeropuerto} value={t.destino} onChange={(valor) => actualizarTrayecto(indice, 'destino', valor)} placeholder="Hasta: código o ciudad..." />
                  <input type="date" className="input-field" value={t.fecha} onChange={(e) => actualizarTrayecto(indice, 'fecha', e.target.value)} />
                  <button className="btn-primary flex items-center justify-center space-x-2" onClick={() => buscarVuelos(indice)} disabled={t.buscando || t.origen === t.destino}>
                    <FiSearch /><span>{t.buscando ? 'Buscando...' : 'Buscar'}</span>
                  </button>
                </div>
                {t.origen === t.destino && <p className="text-xs text-red-600 mt-2">El origen y el destino deben ser diferentes.</p>}
                {t.vuelos.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {t.vuelos.map((v) => (
                      <label key={v.id} className={'flex items-center justify-between p-3 rounded-lg border cursor-pointer ' + (t.vueloId === v.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-white hover:bg-gray-50')}>
                        <div className="flex items-center space-x-3">
                          <input type="radio" name={'vuelo-' + indice} checked={t.vueloId === v.id} onChange={() => actualizarTrayecto(indice, 'vueloId', v.id)} />
                          <div><p className="font-semibold text-gray-800">{v.flight_number}</p><p className="text-xs text-gray-500">{v.origin_iata} → {v.destination_iata} · {new Date(v.departure_datetime).toLocaleString('es-SV')}</p></div>
                        </div>
                        <div className="text-right"><p className="font-bold text-primary-700">${Number(v.total_price || 0).toFixed(2)}</p><p className="text-xs text-gray-500">Incluye ${Number(v.total_taxes || 0).toFixed(2)} impuestos · {v.available_seats} asientos</p></div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          {tipoViaje === 'multiple' && <button type="button" className="btn-secondary mt-4 flex items-center space-x-2" onClick={agregarTrayecto}><FiUserPlus /><span>Agregar trayecto</span></button>}
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">3. Pasajeros</h2>
            <div className="flex items-center space-x-2">
              <select className="input-field" value={clase} onChange={(e) => setClase(e.target.value)}>
                <option value="economy">Económica</option><option value="premium">Premium</option>
                <option value="business">Ejecutiva</option><option value="first">Primera</option>
              </select>
              <button className="btn-secondary flex items-center space-x-2" onClick={() => setPasajeros(pasajeros.concat([pasajeroVacio()]))}>
                <FiUserPlus /><span>Agregar</span>
              </button>
            </div>
          </div>
          {vuelosSinCupo.length > 0 && (
            <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              No se puede completar la compra: {vuelosSinCupo.map((vuelo) => `${vuelo.flight_number} tiene ${Number(vuelo.available_seats || 0)} asientos disponibles`).join('; ')} y se solicitaron {pasajeros.length} boletos. Reduce los pasajeros o elige otro vuelo.
            </div>
          )}
          <div className="space-y-4">
            {pasajeros.map((p, i) => (
              <div key={i} className="p-4 bg-gray-50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-700">Pasajero {i + 1}</p>
                  {pasajeros.length > 1 && (
                    <button className="text-red-500" onClick={() => setPasajeros(pasajeros.filter(function (_, idx) { return idx !== i; }))}><FiTrash2 /></button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <select className="input-field disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed" disabled={true} value={p.passenger_type} onChange={(e) => setPax(i, 'passenger_type', e.target.value)} title={'Calculado automáticamente según la fecha de nacimiento'}>
                    <option value="adult">Adulto</option><option value="child">Niño</option><option value="infant">Bebé</option>
                  </select>
                  <input className="input-field" placeholder="Nombres" value={p.first_names} onChange={(e) => setPax(i, 'first_names', e.target.value)} />
                  <input className="input-field" placeholder="Apellidos" value={p.last_names} onChange={(e) => setPax(i, 'last_names', e.target.value)} />
                  <select className="input-field" value={p.document_type} onChange={(e) => setPax(i, 'document_type', e.target.value)}>
                    <option value="13">DUI (CAT-022: 13)</option><option value="36">NIT (CAT-022: 36)</option><option value="3">Pasaporte (CAT-022: 3)</option>
                  </select>
                  <input className="input-field" placeholder="N° documento" value={p.document_number} onChange={(e) => setPax(i, 'document_number', e.target.value)} />
                  <div>
                    <input type="date" className="input-field" value={p.birth_date} onChange={(e) => setPax(i, 'birth_date', e.target.value)} />
                    <p className="text-[11px] text-gray-500 mt-1">Fecha de nacimiento: define tipo de pasajero y valida filas de salida de emergencia (RN-OP-03).</p>
                  </div>
                  <select className="input-field" value={p.nationality} onChange={(e) => setPax(i, 'nationality', e.target.value)}>
                    {nacionalidades.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">4. Asientos (opcional)</h2>
          <p className="text-sm text-gray-500 mb-4">Puedes elegir un asiento para cada pasajero. Los que dejes vacíos se asignarán automáticamente al crear la reserva.</p>
          {asientosCargando ? <p className="text-sm text-gray-500">Consultando disponibilidad...</p> : asientosError ? (
            <div role="alert" className="text-sm text-red-700">No se pudo consultar la disponibilidad. <button type="button" className="underline font-medium" onClick={() => setRevisionAsientos((actual) => actual + 1)}>Reintentar</button></div>
          ) : vuelosSeleccionados.length === 0 ? <p className="text-sm text-gray-500">Selecciona primero los vuelos.</p> : (
            <div className="space-y-4">
              {vuelosSeleccionados.map((vuelo) => {
                const mapa = mapasAsientos[String(vuelo.id)];
                if (!mapa) return <p key={vuelo.id} className="text-sm text-gray-500">Cargando asientos para {vuelo.flight_number}...</p>;
                return <div key={vuelo.id} className="rounded-lg border border-gray-200 p-4">
                  <h3 className="font-semibold text-gray-800">{vuelo.flight_number} · {vuelo.origin_iata} → {vuelo.destination_iata}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    {pasajeros.map((p, i) => {
                      const elegido = p.asientos?.[String(vuelo.id)] || '';
                      const repetidos = pasajeros.some((otro, j) => j !== i && otro.asientos?.[String(vuelo.id)] === elegido && elegido);
                      const ocupado = elegido && (mapa.ocupados || []).includes(elegido);
                      const salidaNoPermitida = elegido && (mapa.filasSalida || []).includes(parseInt(elegido, 10)) && !puedeOcuparSalida(p);
                      return <label key={i} className="block text-sm font-medium text-gray-700">
                        {p.first_names || p.last_names ? `${p.first_names} ${p.last_names}`.trim() : `Pasajero ${i + 1}`}
                        <select className="input-field mt-1" value={elegido} onChange={(e) => seleccionarAsiento(i, vuelo.id, e.target.value)}>
                          <option value="">Sin asignar</option>
                          {(mapa.asientos || []).map((asiento) => {
                            const ocupadoOtro = (mapa.ocupados || []).includes(asiento) || pasajeros.some((otro, j) => j !== i && otro.asientos?.[String(vuelo.id)] === asiento);
                            const salidaRestringida = (mapa.filasSalida || []).includes(parseInt(asiento, 10)) && !puedeOcuparSalida(p);
                            return <option key={asiento} value={asiento} disabled={(ocupadoOtro || salidaRestringida) && asiento !== elegido}>{asiento}{ocupadoOtro ? ' · ocupado' : salidaRestringida ? ' · salida restringida' : ''}</option>;
                          })}
                        </select>
                        {(ocupado || repetidos) && <span role="alert" className="block text-xs text-red-600 mt-1">Este asiento ya no está disponible. Elige otro.</span>}
                        {salidaNoPermitida && <span role="alert" className="block text-xs text-red-600 mt-1">Este pasajero no puede ocupar una fila de salida. Elige otro asiento.</span>}
                      </label>;
                    })}
                  </div>
                  <p className="text-xs text-gray-500 mt-3">Las filas de salida de emergencia requieren un adulto de al menos 15 años.</p>
                </div>;
              })}
            </div>
          )}
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-2">
            <FiShoppingBag className="text-primary-600" size={21} />
            <h2 className="text-lg font-semibold text-gray-800">5. Servicios adicionales (opcional)</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">Elige los servicios disponibles para cada vuelo. Se sumarán al total de la reserva y aparecerán como conceptos en la misma factura.</p>
          {ancillariesCargando ? (
            <p className="text-sm text-gray-500">Cargando servicios disponibles...</p>
          ) : vuelosSeleccionados.length === 0 ? (
            <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500">Selecciona primero los vuelos para consultar sus servicios adicionales.</p>
          ) : (
            <div className="space-y-4">
              {vuelosSeleccionados.map((vuelo) => {
                const servicios = ancillariesPorVuelo[String(vuelo.id)] || [];
                return (
                  <div key={vuelo.id} className="rounded-lg border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <p className="font-semibold text-gray-800">{vuelo.flight_number}</p>
                      <p className="text-xs text-gray-500">{vuelo.origin_iata} → {vuelo.destination_iata}</p>
                    </div>
                    {servicios.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-gray-500">Este vuelo no tiene servicios adicionales disponibles.</p>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {servicios.map((servicio) => {
                          const linea = ancillariesSeleccionados.find((item) => String(item.flight_id) === String(vuelo.id) && String(item.ancillary_id) === String(servicio.ancillary_id));
                          const agotado = Number(servicio.stock) <= 0;
                          return (
                            <div key={servicio.ancillary_id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                              <label className={'flex min-w-0 flex-1 items-start gap-3 ' + (agotado ? 'cursor-not-allowed opacity-50' : 'cursor-pointer')}>
                                <input type="checkbox" className="mt-1" checked={Boolean(linea)} disabled={agotado} onChange={(e) => cambiarAncillarySeleccionado(vuelo.id, servicio, e.target.checked)} />
                                <span className="min-w-0">
                                  <span className="block font-medium text-gray-800">{servicio.code} · {servicio.name}</span>
                                  <span className="block text-xs text-gray-500">${Number(servicio.precio_con_impuestos ?? servicio.precio_final).toFixed(2)} cada uno, impuestos incluidos · {agotado ? 'Agotado' : `${servicio.stock} disponibles`}</span>
                                </span>
                              </label>
                              {linea && (
                                <label className="flex items-center gap-2 text-sm text-gray-600">
                                  Cantidad
                                  <input type="number" className="input-field w-24" min="1" max={Number(servicio.stock)} step="1" value={linea.quantity} onChange={(e) => cambiarCantidadAncillary(vuelo.id, servicio.ancillary_id, e.target.value)} />
                                </label>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="card p-6 sticky top-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Resumen</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Modalidad</span><span className="font-medium">{tipoViaje === 'ida' ? 'Solo ida' : tipoViaje === 'regreso' ? 'Ida y regreso' : 'Múltiples trayectos'}</span></div>
            <div className="border-b pb-2 space-y-1">{vuelosSeleccionados.length ? vuelosSeleccionados.map((v, i) => <div key={v.id} className="flex justify-between gap-2"><span className="text-gray-500">T{i + 1}: {v.origin_iata} → {v.destination_iata}</span><span className="font-medium">{v.flight_number}</span></div>) : <span className="text-gray-500">Aún no hay vuelos seleccionados</span>}</div>
            <div className="flex justify-between"><span className="text-gray-500">Pasajeros</span><span className="font-medium">{pasajeros.length}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Clase</span><span className="font-medium capitalize">{clase}</span></div>
            {ancillariesSeleccionados.length > 0 && (
              <div className="border-t pt-2 space-y-1">
                <div className="flex justify-between"><span className="text-gray-500">Servicios adicionales</span><span className="font-medium">{ancillariesSeleccionados.reduce((total, linea) => total + Number(linea.quantity || 0), 0)} unidad(es)</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Servicios con impuestos</span><span className="font-medium">${(totalAncillariesCentavos / 100).toFixed(2)}</span></div>
              </div>
            )}
            <div className="border-t pt-2 mt-2 flex justify-between text-base">
              <span className="font-semibold">Total estimado</span>
              <span className="font-bold text-primary-700">${totalEstimadoConAncillaries.toFixed(2)}</span>
            </div>
          </div>
          <button className="btn-primary w-full mt-6" onClick={guardar} disabled={guardando}>
            {guardando ? 'Creando...' : 'Crear Reserva (PNR)'}
          </button>
          <p className="text-xs text-gray-500 mt-3">La reserva queda PENDIENTE con time limit de 30 min (RN-COM-01). El precio se congela al crear (RN-COM-02).</p>
        </div>
      </div>
      {modalNuevoCliente && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Agregar Nuevo Cliente</h2>
              <button onClick={() => setModalNuevoCliente(false)} className="text-gray-500 hover:text-gray-700"><FiX size={22} /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombres *</label>
                <input className="input-field" value={clienteForm.first_names} onChange={(e) => setCampoCliente('first_names', e.target.value)} placeholder="Juan Carlos" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Apellidos *</label>
                <input className="input-field" value={clienteForm.last_names} onChange={(e) => setCampoCliente('last_names', e.target.value)} placeholder="Menjívar López" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Documento *</label>
                <select className="input-field" value={clienteForm.document_type} onChange={(e) => setCampoCliente('document_type', e.target.value)}>
                  <option value="DUI">DUI</option><option value="NIT">NIT</option><option value="Passport">Pasaporte</option>
                </select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Número de Documento *</label>
                <input className="input-field" value={clienteForm.document_number} onChange={(e) => setCampoCliente('document_number', e.target.value)} placeholder="12345678-9" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Fecha de nacimiento *</label>
                <input type="date" className="input-field" value={clienteForm.birth_date} max={fechaActualSV()} onChange={(e) => setCampoCliente('birth_date', e.target.value)} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" className="input-field" value={clienteForm.email} onChange={(e) => setCampoCliente('email', e.target.value)} placeholder="cliente@email.com" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input className="input-field" value={clienteForm.phone} onChange={(e) => setCampoCliente('phone', e.target.value)} placeholder="+503 7000-0000" /></div>
            </div>
            <p className="text-xs text-gray-500 mt-3">Para crear una reserva es obligatorio proporcionar DUI, NIT o pasaporte.</p>
            <div className="flex justify-end space-x-2 mt-6">
              <button className="btn-secondary" onClick={() => setModalNuevoCliente(false)}>Cancelar</button>
              <button className="btn-primary" onClick={registrarCliente} disabled={guardandoCliente}>{guardandoCliente ? 'Registrando...' : 'Aceptar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default NuevaReserva;
