import { useEffect, useState } from 'react';
import { checkinAPI } from '../services/api';
import { FiSearch, FiUserCheck, FiLogIn, FiX, FiPrinter } from 'react-icons/fi';
import toast from 'react-hot-toast';

const ESTADO_PAX = {
  pending: ['Pendiente', 'bg-gray-100 text-gray-700'],
  checked_in: ['Checked-In', 'bg-green-100 text-green-700'],
  boarded: ['Abordado', 'bg-blue-100 text-blue-700'],
  no_show: ['No Show', 'bg-red-100 text-red-700'],
};

const Checkin = () => {
  const [tab, setTab] = useState('pnr');
  const [pnr, setPnr] = useState('');
  const [datos, setDatos] = useState(null);
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [vuelos, setVuelos] = useState([]);
  const [vueloSel, setVueloSel] = useState('');
  const [manifiesto, setManifiesto] = useState([]);
  const [mapa, setMapa] = useState(null);
  const [segmentoMapa, setSegmentoMapa] = useState(null);
  const [seatSel, setSeatSel] = useState(null);
  const [pase, setPase] = useState(null);

  const cargarVuelos = () => {
    checkinAPI.vuelos({ fecha: fecha }).then((r) => setVuelos(r.data.datos || [])).catch(() => {});
  };
  useEffect(() => { if (tab === 'vuelo') cargarVuelos(); }, [tab, fecha]);

  const buscar = async () => {
    if (!pnr) return toast.error('Ingresa un PNR');
    try {
      const r = await checkinAPI.reserva(pnr);
      setDatos(r.data.datos);
    } catch (e) {
      setDatos(null);
      toast.error(e.response && e.response.data ? e.response.data.error : 'Error');
    }
  };

  const cargarManifiesto = async (id) => {
    setVueloSel(id);
    const r = await checkinAPI.manifiesto(id);
    setManifiesto(r.data.datos || []);
  };

  const abrirMapa = async (segmento) => {
    try {
      const r = await checkinAPI.mapa(segmento.flight_id);
      setMapa(r.data.datos);
      setSegmentoMapa(segmento);
      setSeatSel(segmento.seat || null);
    } catch (e) { toast.error('Error al cargar mapa'); }
  };

  const confirmarAsiento = async () => {
    if (!seatSel) return toast.error('Selecciona un asiento');
    try {
      await checkinAPI.asignarAsiento(segmentoMapa.segment_id, { seat: seatSel });
      toast.success('Asiento ' + seatSel + ' asignado');
      setMapa(null);
      buscar();
      if (vueloSel) cargarManifiesto(vueloSel);
    } catch (e) { toast.error(e.response && e.response.data ? e.response.data.error : 'Error'); }
  };

  const hacerCheckin = async (segmento) => {
    try {
      const r = await checkinAPI.checkin(segmento.segment_id);
      toast.success('Check-in listo. Asiento ' + r.data.datos.seat);
      setPase({ pasajero: segmento, bp: r.data.datos.boarding_pass_code, seat: r.data.datos.seat });
      buscar();
      if (vueloSel) cargarManifiesto(vueloSel);
    } catch (e) { toast.error(e.response && e.response.data ? e.response.data.error : 'Error'); }
  };

  const abordar = async (segmento) => {
    try {
      await checkinAPI.abordar(segmento.segment_id);
      toast.success('Pasajero abordado');
      buscar();
      if (vueloSel) cargarManifiesto(vueloSel);
    } catch (e) { toast.error(e.response && e.response.data ? e.response.data.error : 'Error'); }
  };

  const cerrarVuelo = async () => {
    if (!vueloSel) return;
    if (!window.confirm('¿Cerrar el vuelo y reconciliar el manifiesto?')) return;
    try {
      await checkinAPI.cerrarVuelo(vueloSel);
      toast.success('Vuelo cerrado');
      cargarVuelos();
      setManifiesto([]);
      setVueloSel('');
    } catch (e) { toast.error(e.response && e.response.data ? e.response.data.error : 'Error'); }
  };

  const ocupados = new Set(mapa ? mapa.ocupados : []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Check-in y Embarque</h1>
        <p className="text-gray-500 mt-1">RF-004 / CU-004 — Asignación de asientos, pases y manifiesto</p>
      </div>

      <div className="flex space-x-2">
        <button className={tab === 'pnr' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('pnr')}>Por PNR</button>
        <button className={tab === 'vuelo' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('vuelo')}>Por Vuelo (manifiesto)</button>
      </div>

      {tab === 'pnr' && (
        <div className="space-y-4">
          <div className="card p-4 flex space-x-2">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input-field pl-10 uppercase" placeholder="PNR (ej: K7M2P9)" value={pnr} onChange={(e) => setPnr(e.target.value)} />
            </div>
            <button className="btn-primary" onClick={buscar}>Buscar</button>
          </div>

          {datos && (
            <div className="card overflow-hidden">
              <div className="px-6 py-3 bg-gray-50 border-b text-sm">
                Reserva <strong>{datos.reserva.pnr}</strong> · estado {datos.reserva.status}
              </div>
              <table className="w-full">
                <thead className="bg-gray-50 border-b"><tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Pasajero</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Vuelo</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Asiento</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Acciones</th>
                </tr></thead>
                <tbody className="divide-y">
                  {datos.pasajeros.map((p) => (
                    <tr key={p.segment_id}>
                      <td className="px-4 py-3 text-sm">{p.first_names} {p.last_names} <span className="text-xs text-gray-400">({p.passenger_type})</span></td>
                      <td className="px-4 py-3 text-sm">{p.flight_number} · {p.origen}→{p.destino}</td>
                      <td className="px-4 py-3 text-sm font-bold">{p.seat || '—'}</td>
                      <td className="px-4 py-3"><span className={'px-2 py-1 rounded-full text-xs font-medium ' + (ESTADO_PAX[p.checkin_status] || ['-'])[1]}>{(ESTADO_PAX[p.checkin_status] || ['-'])[0]}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex space-x-2">
                          <button className="btn-secondary py-1 px-2 text-xs" onClick={() => abrirMapa(p)}>Asiento</button>
                          {p.checkin_status === 'pending' && <button className="btn-primary py-1 px-2 text-xs" onClick={() => hacerCheckin(p)}>Check-in</button>}
                          {p.checkin_status === 'checked_in' && <button className="btn-primary py-1 px-2 text-xs" onClick={() => abordar(p)}>Abordar</button>}
                          {p.boarding_pass_code && <button className="btn-secondary py-1 px-2 text-xs" onClick={() => setPase({ pasajero: p, bp: p.boarding_pass_code, seat: p.seat })}><FiPrinter size={12} /> Pase</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'vuelo' && (
        <div className="space-y-4">
          <div className="card p-4 flex space-x-2 items-center">
            <input type="date" className="input-field" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            <select className="input-field" value={vueloSel} onChange={(e) => e.target.value && cargarManifiesto(e.target.value)}>
              <option value="">-- Selecciona vuelo --</option>
              {vuelos.map((v) => (
                <option key={v.id} value={v.id}>{v.flight_number} · {v.origen}→{v.destino} · pax {v.pax} · CI {v.checked_in} · AB {v.boarded}</option>
              ))}
            </select>
            <button className="btn-danger whitespace-nowrap" onClick={cerrarVuelo}>Cerrar vuelo</button>
          </div>
          {vueloSel && (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b"><tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Asiento</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Pasajero</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">PNR</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
                </tr></thead>
                <tbody className="divide-y">
                  {manifiesto.length === 0 ? (
                    <tr><td colSpan="4" className="text-center py-6 text-gray-500">Sin pasajeros</td></tr>
                  ) : manifiesto.map((m) => (
                    <tr key={m.segment_id}>
                      <td className="px-4 py-2 text-sm font-bold">{m.seat || '—'}</td>
                      <td className="px-4 py-2 text-sm">{m.first_names} {m.last_names}</td>
                      <td className="px-4 py-2 text-sm font-mono">{m.pnr}</td>
                      <td className="px-4 py-2"><span className={'px-2 py-1 rounded-full text-xs font-medium ' + (ESTADO_PAX[m.checkin_status] || ['-'])[1]}>{(ESTADO_PAX[m.checkin_status] || ['-'])[0]}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {mapa && segmentoMapa && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Mapa de asientos · {segmentoMapa.flight_number}</h2>
              <button onClick={() => setMapa(null)} className="text-gray-500"><FiX size={22} /></button>
            </div>
            <div className="flex justify-center space-x-1 mb-2">
              <div className="w-8" />
              {mapa.columnas.map((c) => <div key={c} className="w-9 text-center text-xs font-bold text-gray-500">{c}</div>)}
            </div>
            <div className="flex flex-col items-center space-y-1 max-h-72 overflow-y-auto">
              {Array.from({ length: mapa.filas }, (_, i) => i + 1).map((fila) => (
                <div key={fila} className="flex space-x-1 items-center">
                  <div className="w-8 text-right text-xs text-gray-500 pr-1">{fila}</div>
                  {mapa.columnas.map((c) => {
                    const id = fila + c;
                    const occ = ocupados.has(id) && id !== seatSel;
                    const salida = mapa.filasSalida.includes(fila);
                    const sel = seatSel === id;
                    return (
                      <button
                        key={id}
                        disabled={occ}
                        onClick={() => setSeatSel(id)}
                        title={salida ? 'Fila de salida de emergencia (adultos +15)' : id}
                        className={
                          'w-9 h-9 rounded-md text-xs font-semibold border ' +
                          (occ ? 'bg-gray-300 text-gray-500 cursor-not-allowed ' :
                           sel ? 'bg-primary-600 text-white border-primary-700 ' :
                           salida ? 'bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200 ' :
                           'bg-green-100 text-green-700 border-green-300 hover:bg-green-200 ')
                        }
                      >{id}</button>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-3">
              <span className="text-green-700">■ Libre</span>
              <span className="text-orange-700">■ Salida emergencia</span>
              <span className="text-gray-500">■ Ocupado</span>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <button className="btn-secondary" onClick={() => setMapa(null)}>Cancelar</button>
              <button className="btn-primary" onClick={confirmarAsiento}>Asignar {seatSel || ''}</button>
            </div>
          </div>
        </div>
      )}

      {pase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Pase de Abordar</h2>
              <button onClick={() => setPase(null)} className="text-gray-500"><FiX size={22} /></button>
            </div>
            <div className="border-2 border-dashed border-primary-300 rounded-xl p-4 space-y-2 text-sm">
              <p className="text-lg font-bold text-primary-700">{pase.pasajero.first_names} {pase.pasajero.last_names}</p>
              <p>Vuelo <strong>{pase.pasajero.flight_number}</strong> · {pase.pasajero.origen} → {pase.pasajero.destino}</p>
              <p>Asiento <strong className="text-2xl">{pase.seat}</strong> · Clase {pase.pasajero.fare_class}</p>
              <p className="font-mono text-xs bg-gray-100 rounded p-2">{pase.bp}</p>
              <p className="text-xs text-gray-500">Presenta este código en la puerta de embarque.</p>
            </div>
            <button className="btn-primary w-full mt-4" onClick={() => window.print()}><FiPrinter className="inline mr-1" /> Imprimir</button>
          </div>
        </div>
      )}
    </div>
  );
};
export default Checkin;