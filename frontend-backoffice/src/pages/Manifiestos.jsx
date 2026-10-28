import { useState } from 'react';
import toast from 'react-hot-toast';
import { checkinAPI } from '../services/api';
import { fechaActualSV, formatearFechaHoraDb } from '../utils/fechaServidor';

const ESTADOS = {
  pending: 'Pendiente',
  checked_in: 'Check-in realizado',
  boarded: 'Abordado',
  no_show: 'No se presentó',
};

const Manifiestos = () => {
  const [fecha, setFecha] = useState(fechaActualSV());
  const [vuelos, setVuelos] = useState(null);
  const [vuelo, setVuelo] = useState('');
  const [manifiesto, setManifiesto] = useState(null);
  const [cargando, setCargando] = useState(false);

  const buscarVuelos = async () => {
    if (!fecha) return toast.error('Selecciona una fecha');
    setCargando(true);
    setVuelo('');
    setManifiesto(null);
    try {
      const respuesta = await checkinAPI.vuelos({ fecha });
      setVuelos(respuesta.data.datos || []);
    } catch (error) {
      setVuelos(null);
      toast.error(error.response?.data?.error || 'No se pudieron cargar los vuelos');
    } finally {
      setCargando(false);
    }
  };

  const seleccionarVuelo = async (id) => {
    setVuelo(id);
    setManifiesto(null);
    if (!id) return;
    setCargando(true);
    try {
      const respuesta = await checkinAPI.manifiesto(id);
      setManifiesto(respuesta.data.datos || []);
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudo cargar el manifiesto');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Manifiestos de vuelo</h1>
        <p className="text-gray-500 mt-1">Consulta los pasajeros y su estado para coordinar la operación.</p>
      </div>
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <label className="block text-sm font-medium text-gray-700">Fecha
          <input type="date" className="input-field mt-1" value={fecha} disabled={cargando} onChange={(e) => { setFecha(e.target.value); setVuelos(null); setVuelo(''); setManifiesto(null); }} />
        </label>
        <button className="btn-primary" onClick={buscarVuelos} disabled={cargando}>Buscar vuelos</button>
        {vuelos && vuelos.length > 0 && (
          <label className="block text-sm font-medium text-gray-700 flex-1 min-w-60">Vuelo
            <select className="input-field mt-1" value={vuelo} disabled={cargando} onChange={(e) => seleccionarVuelo(e.target.value)}>
              <option value="">Selecciona un vuelo</option>
              {vuelos.map((v) => <option key={v.id} value={v.id}>{v.flight_number} · {v.origen} → {v.destino} · {formatearFechaHoraDb(v.departure_datetime)}</option>)}
            </select>
          </label>
        )}
      </div>
      {cargando && <p className="text-sm text-gray-500">Cargando...</p>}
      {vuelos && vuelos.length === 0 && <p className="text-sm text-gray-500">No hay vuelos para esta fecha.</p>}
      {manifiesto && (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Pasajero</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">PNR</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Asiento</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {manifiesto.length === 0 ? <tr><td colSpan="4" className="text-center py-6 text-gray-500">No hay pasajeros en este vuelo.</td></tr> : manifiesto.map((p) => (
                <tr key={p.segment_id}>
                  <td className="px-4 py-3 text-sm">{p.first_names} {p.last_names}</td>
                  <td className="px-4 py-3 text-sm font-mono">{p.pnr}</td>
                  <td className="px-4 py-3 text-sm">{p.seat || 'Sin asignar'}</td>
                  <td className="px-4 py-3 text-sm">{ESTADOS[p.checkin_status] || p.checkin_status || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Manifiestos;
