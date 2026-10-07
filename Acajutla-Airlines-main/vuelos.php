<?php
/**
 * =====================================================================
 * ACAJUTLA AIRLINES — vuelos.php
 *
 * Fase 1 de separación (búsqueda y selección de vuelos).
 *
 * IMPORTANTE: este archivo se incluye DESDE DENTRO del <script> principal
 * de index.php (include __DIR__ . '/vuelos.php';), en el mismo punto
 * exacto donde antes vivía este código dentro de index.html. Por eso este
 * archivo NO debe abrir sus propias etiquetas <script>: todo su contenido
 * (aparte de este bloque de comentario PHP, que no produce salida) es
 * JavaScript puro que queda dentro del mismo <script> que ya definió
 * Estado, Util, MOCK, Api, Navegacion y Vistas antes de este punto.
 *
 * Contiene:
 *   - CalendarioPrecios   (calendario de fechas con precios/niveles reales)
 *   - CarruselFechas      (carrusel de fechas sobre los resultados)
 *   - ResultadosVuelos    (carga y filtra los vuelos reales desde la API)
 *   - Tarifas             (selección de clase de tarifa tras elegir vuelo)
 *   - Vistas.resultadosVuelos / Vistas.tarjetaVuelo / Vistas.tarifas
 *     (agregados al objeto Vistas ya existente mediante Object.assign,
 *     ya que Vistas se sigue definiendo como un único literal en
 *     index.php; esto NO cambia el comportamiento, solo de qué archivo
 *     provienen estos tres métodos).
 *
 * NO se movió aquí ninguna lógica de pasajeros, asientos, servicios,
 * pago, confirmación, consulta de reserva, autenticación ni estado de
 * vuelo: esas pantallas siguen en index.php hasta su propia fase de
 * separación.
 * =====================================================================
 */
?>
/* =====================================================================
   9-B. LÓGICA — CALENDARIO DE PRECIOS (ida / regreso)
   Usa Api.getFlightPricesByDate() -> mock hoy, API real después.
===================================================================== */
const CalendarioPrecios = {
  mesActualIda: null,     // Date del mes visible en calendario de ida
  mesActualRegreso: null,
  datosMesIda: [],
  datosMesRegreso: [],

  async abrir(tipo){
    const b = Estado.busqueda;
    if(!b.origen || !b.destino){
      Util.mostrarToast('Selecciona primero el origen y el destino.', 'error');
      return;
    }
    const panel = document.getElementById(tipo==='ida' ? 'panelCalendarioIda' : 'panelCalendarioRegreso');
    // cerrar el otro panel si estaba abierto
    document.getElementById('panelCalendarioIda')?.classList.add('oculto');
    document.getElementById('panelCalendarioRegreso')?.classList.add('oculto');
    panel.classList.remove('oculto');

    const base = tipo==='ida'
      ? (b.fechaIda ? new Date(b.fechaIda+'T00:00:00') : new Date())
      : (b.fechaRegreso ? new Date(b.fechaRegreso+'T00:00:00') : (b.fechaIda ? new Date(b.fechaIda+'T00:00:00') : new Date()));
    if(tipo==='ida') this.mesActualIda = new Date(base.getFullYear(), base.getMonth(), 1);
    else this.mesActualRegreso = new Date(base.getFullYear(), base.getMonth(), 1);

    await this.cargarMes(tipo);

    // cerrar al hacer clic fuera
    setTimeout(()=>{
      document.addEventListener('click', function cerrar(e){
        if(!e.target.closest('.calendario-panel') && !e.target.closest('#btnFechaIda') && !e.target.closest('#btnFechaRegreso')){
          document.getElementById('panelCalendarioIda')?.classList.add('oculto');
          document.getElementById('panelCalendarioRegreso')?.classList.add('oculto');
          document.removeEventListener('click', cerrar);
        }
      });
    },0);
  },

  async cargarMes(tipo){
    const panel = document.getElementById(tipo==='ida' ? 'panelCalendarioIda' : 'panelCalendarioRegreso');
    panel.innerHTML = `<div class="calendario-cargando">🔎 Consultando precios...</div>`;
    const mesDate = tipo==='ida' ? this.mesActualIda : this.mesActualRegreso;
    const anioMes = `${mesDate.getFullYear()}-${String(mesDate.getMonth()+1).padStart(2,'0')}`;
    const b = Estado.busqueda;
    const origenId = tipo==='regreso' ? b.destino.id : b.origen.id;
    const destinoId = tipo==='regreso' ? b.origen.id : b.destino.id;
    const datos = await Api.getFlightPricesByDate(origenId, destinoId, anioMes);
    if(tipo==='ida') this.datosMesIda = datos; else this.datosMesRegreso = datos;
    this.render(tipo);
  },

  cambiarMes(tipo, delta){
    const mesDate = tipo==='ida' ? this.mesActualIda : this.mesActualRegreso;
    const hoy = new Date();
    const mesMinimo = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const mesMaximo = new Date(hoy.getFullYear(), hoy.getMonth()+6, 1);
    const nuevo = new Date(mesDate.getFullYear(), mesDate.getMonth()+delta, 1);
    // No avanzar más allá del límite máximo ni retroceder antes del mes actual
    if(nuevo < mesMinimo || nuevo > mesMaximo) return;
    if(tipo==='ida') this.mesActualIda = nuevo; else this.mesActualRegreso = nuevo;
    this.cargarMes(tipo);
  },

  render(tipo){
    const panel = document.getElementById(tipo==='ida' ? 'panelCalendarioIda' : 'panelCalendarioRegreso');
    const mesDate = tipo==='ida' ? this.mesActualIda : this.mesActualRegreso;
    const datos = tipo==='ida' ? this.datosMesIda : this.datosMesRegreso;
    const b = Estado.busqueda;
    const seleccionActual = tipo==='ida' ? b.fechaIda : b.fechaRegreso;
    const nombresMes = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

    const hoy = new Date();
    const mesMinimo = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const mesMaximo = new Date(hoy.getFullYear(), hoy.getMonth()+6, 1);
    const puedeRetroceder = mesDate > mesMinimo;
    const puedeAvanzar   = mesDate < mesMaximo;

    const primerDiaSemana = (new Date(mesDate.getFullYear(), mesDate.getMonth(), 1).getDay()+6)%7; // lunes=0
    let celdas = '';
    for(let i=0;i<primerDiaSemana;i++) celdas += `<div class="calendario-dia vacio"></div>`;

    datos.forEach(dia=>{
      const numeroDia = parseInt(dia.fecha.split('-')[2]);
      const limiteMin = tipo==='regreso' ? (b.fechaIda || Util.hoyISO()) : Util.hoyISO();
      const antesDelLimite = dia.fecha < limiteMin;
      const sinDisponibilidad = !dia.disponible;
      const deshabilitado = antesDelLimite || sinDisponibilidad;
      const nivelClase = dia.nivel ? `nivel-${dia.nivel}` : '';
      const seleccionado = dia.fecha === seleccionActual;
      celdas += `
        <div class="calendario-dia ${nivelClase} ${deshabilitado?'deshabilitado':''} ${seleccionado?'seleccionado':''}"
             ${deshabilitado?'':`onclick="CalendarioPrecios.seleccionar('${tipo}', '${dia.fecha}')"`}>
          <span>${numeroDia}</span>
          ${dia.disponible ? `<span class="precio-dia">${Util.indicadorNivelPrecio(dia.nivel)}</span>` : `<span class="precio-dia">—</span>`}
          <span class="calendario-tooltip">${dia.disponible ? Util.indicadorNivelPrecio(dia.nivel) : 'Sin disponibilidad'}</span>
        </div>`;
    });

    panel.innerHTML = `
      <div class="calendario-header">
        <button type="button" onclick="event.stopPropagation(); CalendarioPrecios.cambiarMes('${tipo}', -1)" ${puedeRetroceder?'':'disabled'} style="${puedeRetroceder?'':'opacity:.35;cursor:not-allowed'}">‹</button>
        <span>${nombresMes[mesDate.getMonth()]} ${mesDate.getFullYear()}</span>
        <button type="button" onclick="event.stopPropagation(); CalendarioPrecios.cambiarMes('${tipo}', 1)" ${puedeAvanzar?'':'disabled'} style="${puedeAvanzar?'':'opacity:.35;cursor:not-allowed'}">›</button>
      </div>
      <div class="calendario-dias-semana"><span>L</span><span>M</span><span>X</span><span>J</span><span>V</span><span>S</span><span>D</span></div>
      <div class="calendario-grid">${celdas}</div>
      <div class="calendario-leyenda">
        <span><i style="background:#e2f6ea;border:1px solid #1c6b3f"></i>Económico</span>
        <span><i style="background:#fff3cd;border:1px solid #946200"></i>Precio intermedio</span>
        <span><i style="background:#fbe4e4;border:1px solid #a13434"></i>Precio alto</span>
      </div>`;
  },

  seleccionar(tipo, fecha){
    if(tipo==='ida'){
      Estado.busqueda.fechaIda = fecha;
      if(Estado.busqueda.fechaRegreso && Estado.busqueda.fechaRegreso < fecha) Estado.busqueda.fechaRegreso = '';
      const btnIda = document.getElementById('btnFechaIda');
      if(btnIda) btnIda.innerHTML = Util.formatoFechaLarga(fecha);
      document.getElementById('panelCalendarioIda')?.classList.add('oculto');

      // Auto-avance: si es ida y vuelta abre regreso; si es solo ida pasa a pasajeros
      setTimeout(()=>{
        if(Estado.busqueda.tipoViaje === 'IDA_VUELTA'){
          CalendarioPrecios.abrir('regreso');
        } else if(typeof Buscador !== 'undefined' && Buscador.abrirPanelPasajerosAuto){
          Buscador.abrirPanelPasajerosAuto();
        }
      }, 120);
    } else {
      Estado.busqueda.fechaRegreso = fecha;
      const btnRegreso = document.getElementById('btnFechaRegreso');
      if(btnRegreso) btnRegreso.innerHTML = Util.formatoFechaLarga(fecha);
      document.getElementById('panelCalendarioRegreso')?.classList.add('oculto');

      // Auto-avance: pasa al panel de pasajeros
      setTimeout(()=>{
        if(typeof Buscador !== 'undefined' && Buscador.abrirPanelPasajerosAuto){
          Buscador.abrirPanelPasajerosAuto();
        }
      }, 120);
    }
  }
};

/* =====================================================================
   9-C. LÓGICA — CARRUSEL DE FECHAS (sobre los resultados de vuelos)
   Usa Api.getFlightPricesByDate() (precios reales desde vuelo.tarifas vía
   buscar_vuelos, cacheados por mes/ruta — no aleatorios, no inventados)
   y respeta isValidDepartureDate()/isValidReturnDate() centralizadas.
===================================================================== */
const CarruselFechas = {
  anchor: null, // fecha (Date) del primer día visible

  sumarDias(fechaISO, n){
    const d = new Date(fechaISO+'T00:00:00');
    d.setDate(d.getDate()+n);
    return d.toISOString().slice(0,10);
  },

  init(){
    const b = Estado.busqueda;
    const esRegreso = Estado.modoResultados==='REGRESO';
    const seleccionada = esRegreso ? b.fechaRegreso : b.fechaIda;
    const minima = esRegreso ? (b.fechaIda || Util.hoyISO()) : Util.hoyISO();
    this.anchor = seleccionada && seleccionada >= minima ? seleccionada : minima;
    this.render();
  },

  mover(dias){
    const b = Estado.busqueda;
    const esRegreso = Estado.modoResultados==='REGRESO';
    const minima = esRegreso ? (b.fechaIda || Util.hoyISO()) : Util.hoyISO();
    let nuevoAnchor = this.sumarDias(this.anchor, dias);
    if(nuevoAnchor < minima) nuevoAnchor = minima;
    this.anchor = nuevoAnchor;
    this.render();
  },

  async render(){
    const cont = document.getElementById('carruselFechasCont');
    if(!cont || !this.anchor) return;
    const b = Estado.busqueda;
    const esRegreso = Estado.modoResultados==='REGRESO';
    const origenId = esRegreso ? b.destino.id : b.origen.id;
    const destinoId = esRegreso ? b.origen.id : b.destino.id;
    const minima = esRegreso ? (b.fechaIda || Util.hoyISO()) : Util.hoyISO();
    const seleccionada = esRegreso ? b.fechaRegreso : b.fechaIda;

    cont.innerHTML = `<div class="carrusel-fechas"><span style="font-size:.82rem;color:#889">🔎 Consultando precios reales...</span></div>`;

    // Reunir 7 días consecutivos a partir del anchor. La disponibilidad y el
    // precio ECONÓMICO de cada día vienen SIEMPRE de vuelo.tarifas real (vía
    // Api.getFlightPricesByDate, que a su vez consulta buscar_vuelos para
    // cada fecha) — el mismo origen de datos que usa el calendario completo,
    // para que el indicador $/$$/$$$ del carrusel coincida con la tarifa real
    // que se ve luego al seleccionar un vuelo de ese día.
    const anchorAlIniciar = this.anchor;
    const fechasVisibles = Array.from({length:7}, (_,i)=>this.sumarDias(anchorAlIniciar, i));
    const mesesNecesarios = [...new Set(fechasVisibles.map(f=>f.slice(0,7)))];
    const datosPorMes = {};
    await Promise.all(mesesNecesarios.map(async anioMes=>{
      datosPorMes[anioMes] = await Api.getFlightPricesByDate(origenId, destinoId, anioMes);
    }));

    // Si el usuario ya navegó a otro rango de fechas mientras se cargaban los
    // datos, no pintar una respuesta desactualizada.
    if(this.anchor !== anchorAlIniciar) return;

    const dias = fechasVisibles.map(fechaISO=>{
      const mesDatos = datosPorMes[fechaISO.slice(0,7)] || [];
      return mesDatos.find(x=>x.fecha===fechaISO) || {fecha:fechaISO, precio:null, disponible:false, nivel:null};
    });

    const nombresDia = ['dom','lun','mar','mié','jue','vie','sáb'];
    const nombresMes = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

    const celdas = dias.map(d=>{
      const fechaObj = new Date(d.fecha+'T00:00:00');
      const antesDeMinima = d.fecha < minima;
      const cancelSinVuelos = !d.disponible;
      const deshabilitado = antesDeMinima || cancelSinVuelos;
      const esSeleccionada = d.fecha === seleccionada;
      return `
      <div class="carrusel-dia ${d.nivel?'nivel-'+d.nivel:''} ${deshabilitado?'deshabilitado':''} ${esSeleccionada?'seleccionado':''}"
           ${deshabilitado?'':`onclick="CarruselFechas.seleccionar('${d.fecha}')"`}>
        <div class="dia-semana">${nombresDia[fechaObj.getDay()]}</div>
        <div class="dia-numero">${fechaObj.getDate()} ${nombresMes[fechaObj.getMonth()]}</div>
        <div class="dia-precio">${d.disponible ? Util.indicadorNivelPrecio(d.nivel) : 'Sin vuelos'}</div>
      </div>`;
    }).join('');

    const puedeRetroceder = this.sumarDias(this.anchor,-7) >= minima || this.anchor > minima;
    const mesLabel = nombresMes[new Date(this.anchor+'T00:00:00').getMonth()] + ' ' + new Date(this.anchor+'T00:00:00').getFullYear();

    cont.innerHTML = `
      <div class="carrusel-fechas">
        <button type="button" class="carrusel-flecha" ${(!puedeRetroceder && this.anchor<=minima)?'disabled':''} onclick="CarruselFechas.mover(-7)" aria-label="Fechas anteriores">‹</button>
        <span class="carrusel-mes-label">${mesLabel}</span>
        <div class="carrusel-dias">${celdas}</div>
        <button type="button" class="carrusel-flecha" onclick="CarruselFechas.mover(7)" aria-label="Fechas siguientes">›</button>
      </div>`;
  },

  seleccionar(fechaISO){
    const b = Estado.busqueda;
    const esRegreso = Estado.modoResultados==='REGRESO';
    if(esRegreso){
      if(!Util.isValidReturnDate(fechaISO, b.fechaIda)) return;
      b.fechaRegreso = fechaISO;
    } else {
      if(!Util.isValidDepartureDate(fechaISO)) return;
      b.fechaIda = fechaISO;
      // Si la fecha de vuelta deja de ser válida respecto a la nueva fecha de ida, se limpia y se avisa.
      if(b.fechaRegreso && !Util.isValidReturnDate(b.fechaRegreso, b.fechaIda)){
        b.fechaRegreso = '';
        Util.mostrarToast('La fecha de regreso ya no era válida y se reinició. Selecciónala nuevamente.', 'info');
      }
    }
    this.render();
    // Mantener origen/destino/pasajeros/preferencias, solo recargar resultados de la fecha elegida.
    ResultadosVuelos.cargar();
    // Actualizar también el texto de la cabecera de resultados sin recargar todo el layout.
    const sub = document.querySelector('.pantalla .seccion-sub');
    if(sub){
      const origen = esRegreso ? b.destino : b.origen;
      const destino = esRegreso ? b.origen : b.destino;
      sub.textContent = `${origen.ciudad} (${origen.codigo_iata}) → ${destino.ciudad} (${destino.codigo_iata}) · ${Util.formatoFechaLarga(esRegreso?b.fechaRegreso:b.fechaIda)} · ${totalPasajeros()} pasajero(s)`;
    }
  }
};

/* =====================================================================
   10. LÓGICA — RESULTADOS DE VUELOS
===================================================================== */
const ResultadosVuelos = {
  vuelosCrudos: [],

  async cargar(){
    const b = Estado.busqueda;
    const esRegreso = Estado.modoResultados==='REGRESO';
    const origenId = esRegreso ? b.destino.id : b.origen.id;
    const destinoId = esRegreso ? b.origen.id : b.destino.id;
    const vuelos = await Api.buscarVuelos({origenId, destinoId, fecha: esRegreso?b.fechaRegreso:b.fechaIda});
    this.vuelosCrudos = vuelos;
    this.aplicarFiltros();
  },

  aplicarFiltros(){
    const cont = document.getElementById('listaVuelos');
    if(!cont) return;
    let vuelos = [...this.vuelosCrudos];

    const precioMax = parseInt(document.getElementById('filtroPrecio')?.value || 900);
    const labelPrecio = document.getElementById('valorFiltroPrecio');
    if(labelPrecio) labelPrecio.textContent = '$'+precioMax;
    // El precio para filtrar/ordenar sale de la tarifa ECONOMICA real (vuelo.tarifas);
    // si un vuelo aún no tiene precio disponible, no se excluye por este filtro.
    vuelos = vuelos.filter(v=>{
      const p = Util.obtenerPrecioTarifa(v, 'ECONOMICA');
      return p==null || p <= precioMax;
    });

    const escalasPermitidas = Array.from(document.querySelectorAll('.filtroEscalas:checked')).map(c=>parseInt(c.value));
    if(escalasPermitidas.length) vuelos = vuelos.filter(v=>v.escalas==null || escalasPermitidas.includes(v.escalas));

    const horaFiltro = document.querySelector('input[name="filtroHora"]:checked')?.value;
    if(horaFiltro && horaFiltro!=='todos'){
      vuelos = vuelos.filter(v=>{
        const h = parseInt(Util.horaCorta(v.salida_programada).split(':')[0]);
        return horaFiltro==='manana' ? h<12 : h>=12;
      });
    }

    const orden = document.getElementById('filtroOrden')?.value || 'precio';
    if(orden==='precio') vuelos.sort((a,b)=>(Util.obtenerPrecioTarifa(a,'ECONOMICA')??0)-(Util.obtenerPrecioTarifa(b,'ECONOMICA')??0));
    else if(orden==='hora') vuelos.sort((a,b)=>Util.horaCorta(a.salida_programada).localeCompare(Util.horaCorta(b.salida_programada)));
    else if(orden==='duracion') vuelos.sort((a,b)=>{
      const da = Util.rutaPorId(a.ruta_id)?.duracion_estimada_min ?? 0;
      const db = Util.rutaPorId(b.ruta_id)?.duracion_estimada_min ?? 0;
      return da-db;
    });

    if(vuelos.length===0){
      cont.innerHTML = `<div class="estado-vacio card"><div class="icono">🛫</div>No hay vuelos disponibles para esta fecha/ruta.</div>`;
      return;
    }
    cont.innerHTML = vuelos.map(v=>Vistas.tarjetaVuelo(v)).join('');
  },

  seleccionar(vueloId){
    const vuelo = this.vuelosCrudos.find(v=>v.id===vueloId);
    if(!Util.isFlightBookable(vuelo)){
      Util.mostrarToast('Este vuelo está cancelado y no puede reservarse.', 'error');
      return;
    }
    if(Estado.modoResultados==='IDA') Estado.vueloIda = vuelo;
    else Estado.vueloRegreso = vuelo;
    Navegacion.ir('tarifas');
  }
};

/* =====================================================================
   11. LÓGICA — TARIFAS
===================================================================== */
const Tarifas = {
  seleccionar(clave){
    const vueloActual = Estado.modoResultados==='IDA' ? Estado.vueloIda : Estado.vueloRegreso;
    if(!Util.isFlightBookable(vueloActual)){
      Util.mostrarToast('Este vuelo está cancelado y no puede reservarse.', 'error');
      Navegacion.ir('vuelos');
      return;
    }
    if(Estado.modoResultados==='IDA'){
      Estado.tarifaIda = clave;
      Estado.precioTarifaIda = Util.obtenerPrecioTarifa(vueloActual, clave);
      if(Estado.busqueda.tipoViaje==='IDA_VUELTA'){
        Estado.modoResultados = 'REGRESO';
        Navegacion.ir('vuelos');
        return;
      }
    } else {
      Estado.tarifaRegreso = clave;
      Estado.precioTarifaRegreso = Util.obtenerPrecioTarifa(vueloActual, clave);
    }
    Navegacion.ir('resumen');
  }
};

/* ---------- Vistas.resultadosVuelos / Vistas.tarjetaVuelo / Vistas.tarifas ---------- */
Object.assign(Vistas, {
  resultadosVuelos(){
    const b = Estado.busqueda;
    const esRegreso = Estado.modoResultados === 'REGRESO';
    const origen = esRegreso ? b.destino : b.origen;
    const destino = esRegreso ? b.origen : b.destino;
    return `
    <div class="pantalla contenedor" style="padding-top:24px">
      ${Vistas.breadcrumb(['Inicio','Buscar vuelos', esRegreso?'Vuelo de regreso':'Vuelo de ida'])}
      ${Vistas.progreso(0)}
      <div class="seccion-titulo">${esRegreso?'Selecciona tu vuelo de regreso':'Selecciona tu vuelo de ida'}</div>
      <p class="seccion-sub">${origen?origen.ciudad+' ('+origen.codigo_iata+')':''} → ${destino?destino.ciudad+' ('+destino.codigo_iata+')':''} · ${Util.formatoFechaLarga(esRegreso?b.fechaRegreso:b.fechaIda)} · ${totalPasajeros()} pasajero(s)</p>

      <div id="carruselFechasCont"></div>

      <div style="margin-bottom:8px">
        <button class="btn-texto" onclick="Navegacion.atras()">← Volver a la búsqueda</button>
      </div>

      <div class="layout-resultados">
        <aside class="filtros card">
          <div class="filtro-grupo">
            <h4>Precio máximo</h4>
            <input type="range" class="rango-precio" id="filtroPrecio" min="100" max="900" value="900" oninput="ResultadosVuelos.aplicarFiltros()">
            <div style="display:flex;justify-content:space-between;font-size:.75rem;color:#889"><span>$100</span><span id="valorFiltroPrecio">$900</span></div>
          </div>
          <div class="filtro-grupo">
            <h4>Escalas</h4>
            <label class="filtro-item"><input type="checkbox" value="0" checked class="filtroEscalas" onchange="ResultadosVuelos.aplicarFiltros()"> Directo</label>
            <label class="filtro-item"><input type="checkbox" value="1" checked class="filtroEscalas" onchange="ResultadosVuelos.aplicarFiltros()"> 1 escala</label>
          </div>
          <div class="filtro-grupo">
            <h4>Horario de salida</h4>
            <label class="filtro-item"><input type="radio" name="filtroHora" value="todos" checked onchange="ResultadosVuelos.aplicarFiltros()"> Todos</label>
            <label class="filtro-item"><input type="radio" name="filtroHora" value="manana" onchange="ResultadosVuelos.aplicarFiltros()"> Mañana (00-12)</label>
            <label class="filtro-item"><input type="radio" name="filtroHora" value="tarde" onchange="ResultadosVuelos.aplicarFiltros()"> Tarde/Noche (12-24)</label>
          </div>
          <div class="filtro-grupo">
            <h4>Ordenar por</h4>
            <select id="filtroOrden" onchange="ResultadosVuelos.aplicarFiltros()" style="width:100%;padding:8px;border-radius:8px;border:1.5px solid #dfe4ea">
              <option value="precio">Precio (menor)</option>
              <option value="duracion">Duración</option>
              <option value="hora">Hora de salida</option>
            </select>
          </div>
        </aside>

        <div id="listaVuelos"><div class="estado-vacio"><div class="icono">✈</div>Cargando vuelos...</div></div>
      </div>
    </div>`;
  },

  tarjetaVuelo(v, contexto){
    // Vuelos reales (desde api.php) traen origen/destino/aeronave ya embebidos por el JOIN en PHP.
    // Vuelos mock (usados en otras partes del sistema aún no conectadas) se resuelven vía MOCK.rutas.
    const esReal = !!v.origen && !!v.destino;
    const ruta = esReal ? null : Util.rutaPorId(v.ruta_id);
    const origen = esReal ? v.origen : Util.aeropuertoPorId(ruta.origen_id);
    const destino = esReal ? v.destino : Util.aeropuertoPorId(ruta.destino_id);
    // Aeronave: en vuelos reales viene embebida (puede ser null si no hay relación en BD);
    // en vuelos mock se resuelve como siempre vía MOCK.
    const infoAeronave = esReal ? v.aeronave : (Util.tipoAeronavePorAeronaveId(v.aeronave_id)
      ? {...Util.tipoAeronavePorAeronaveId(v.aeronave_id), matricula: Util.aeronavePorId(v.aeronave_id)?.matricula}
      : null);
    const reservable = Util.isFlightBookable(v);
    const horaSalida = Util.horaCorta(v.salida_programada);
    const horaLlegada = Util.horaCorta(v.llegada_programada);
    // Duración: los vuelos reales la traen directamente de rutas.duracion_estimada_minutos;
    // los mock la calculan desde MOCK.rutas.
    const duracionMin = esReal ? v.duracion_estimada_minutos : (ruta ? ruta.duracion_estimada_min : null);
    // La búsqueda actual consulta un tramo directo por ruta; no existe columna "escalas"
    // en vuelos reales, por lo que se muestra "Directo" solo a nivel de presentación.
    const escalasTexto = esReal ? 'Directo' : (v.escalas===0?'Directo':(v.escalas>0?v.escalas+' escala':''));
    return `
    <div class="vuelo-card ${reservable?'':'no-reservable'}">
      <div class="vuelo-card-top">
        <span class="vuelo-numero">Vuelo ${v.numero_vuelo}${infoAeronave && infoAeronave.modelo ? ' · '+[infoAeronave.fabricante,infoAeronave.modelo].filter(Boolean).join(' ') : ''}</span>
        <span class="badge ${Util.badgeClaseEstado(v.estado)}">${Util.labelEstado(v.estado)}</span>
      </div>
      <div class="vuelo-card-body">
        <div class="tramo">
          <div class="tramo-hora"><b>${horaSalida}</b><span>${origen.codigo_iata}</span></div>
          <div class="tramo-linea">
            <span class="duracion">${duracionMin!=null ? Util.duracionMin(duracionMin) : ''}</span>
            <div class="linea"></div>
            <span class="escalas">${escalasTexto}</span>
          </div>
          <div class="tramo-hora"><b>${horaLlegada}</b><span>${destino.codigo_iata}</span></div>
        </div>
        <div class="vuelo-precio">
          ${(() => { const p = Util.obtenerPrecioTarifa(v, 'ECONOMICA'); return p!=null ? `<span class="precio-desde">$${p}</span>` : ''; })()}
          ${reservable
            ? `<button class="btn btn-primario btn-sm" onclick="ResultadosVuelos.seleccionar(${v.id})">Seleccionar</button>`
            : `<button class="btn btn-outline btn-sm" disabled title="Este vuelo está cancelado y no puede reservarse">No disponible</button>`
          }
        </div>
      </div>
      <div class="vuelo-card-footer">
        <span>🛄 Equipaje de mano incluido${esReal && v.distancia_km!=null ? ' · '+v.distancia_km+' km' : ''}</span>
        <span>Puerta ${v.puerta||'-'} · Terminal ${v.terminal||'-'}${infoAeronave && infoAeronave.matricula ? ' · Matrícula '+infoAeronave.matricula : ''}</span>
      </div>
    </div>`;
  },

  /* ---------- TARIFAS ---------- */
  tarifas(){
    const esRegreso = Estado.modoResultados==='REGRESO';
    const vuelo = esRegreso ? Estado.vueloRegreso : Estado.vueloIda;
    const esReal = !!vuelo.origen && !!vuelo.destino;
    const ruta = esReal ? null : Util.rutaPorId(vuelo.ruta_id);
    const origen = esReal ? vuelo.origen : Util.aeropuertoPorId(ruta.origen_id);
    const destino = esReal ? vuelo.destino : Util.aeropuertoPorId(ruta.destino_id);
    return `
    <div class="pantalla contenedor" style="padding-top:24px">
      ${Vistas.breadcrumb(['Inicio','Vuelos','Tarifa'])}
      ${Vistas.progreso(1)}
      <div class="seccion-titulo">Elige tu tarifa (${esRegreso?'Regreso':'Ida'})</div>
      <p class="seccion-sub">Vuelo ${vuelo.numero_vuelo} · ${origen.codigo_iata} → ${destino.codigo_iata} · ${Util.horaCorta(vuelo.salida_programada)} - ${Util.horaCorta(vuelo.llegada_programada)}</p>
      ${(!Array.isArray(vuelo.tarifas) && vuelo.base_price==null && vuelo.precio_base==null) ? `<div class="alerta alerta-info">Este vuelo aún no tiene tarifas confirmadas en el servidor; los precios mostrados son referenciales.</div>` : ''}
      ${(!Array.isArray(vuelo.tarifas) && vuelo.base_price!=null) ? `<div class="alerta alerta-info">El precio por clase todavía no está diferenciado en la base de datos; se muestra el precio base real del vuelo (${Util.formatoMoneda(vuelo.base_price)}) para cualquier clase seleccionada.</div>` : ''}
      <div class="grid-tarifas">
        ${Object.entries(MOCK.tarifas).map(([clave,t])=>{
          const precio = Util.obtenerPrecioTarifa(vuelo, clave);
          return `
          <div class="tarifa-card ${clave==='PREMIUM'?'destacada':''}" onclick="Tarifas.seleccionar('${clave}')">
            <h3>${t.nombre}</h3>
            <div class="tarifa-precio">${precio!=null ? Util.formatoMoneda(precio) : 'A confirmar'}</div>
            <ul>${t.beneficios.map(b=>`<li>${b}</li>`).join('')}</ul>
            <button class="btn btn-outline btn-block">Seleccionar</button>
          </div>
        `;}).join('')}
      </div>
      <div style="margin-top:24px"><button class="btn-texto" onclick="Navegacion.atras()">← Volver</button></div>
    </div>`;
  },
});