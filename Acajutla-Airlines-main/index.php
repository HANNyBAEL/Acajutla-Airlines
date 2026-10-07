<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Acajutla Airlines | Reserva de Vuelos</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="libs/leaflet.css">
<script src="libs/leaflet.js"></script>
<style>
/* =========================================================
   1. VARIABLES GLOBALES
========================================================= */
:root{
  --azul: #003B95;
  --azul-oscuro: #002855;
  --amarillo: #F4B400;
  --blanco: #FFFFFF;
  --gris-oscuro: #333333;
  --gris-claro: #F5F7FA;
  --verde: #2E8B57;
  --rojo: #C24D4D;
  --radio: 12px;
  --sombra: 0 8px 24px rgba(0,40,85,.10);
  --sombra-hover: 0 14px 32px rgba(0,40,85,.18);
  --transicion: all .25s ease;
}

/* =========================================================
   2. RESET
========================================================= */
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
html{scroll-behavior:smooth;}
body{
  font-family:'Poppins',sans-serif;
  background:var(--gris-claro);
  color:var(--gris-oscuro);
  line-height:1.5;
  min-height:100vh;
}
img{max-width:100%;display:block;}
button{font-family:inherit;cursor:pointer;border:none;background:none;}
input,select,textarea{font-family:inherit;}
ul{list-style:none;}
a{text-decoration:none;color:inherit;}
.oculto{display:none !important;}
::-webkit-scrollbar{width:8px;}
::-webkit-scrollbar-thumb{background:var(--azul);border-radius:4px;}

/* =========================================================
   3. NAVBAR
========================================================= */
.navbar{
  position:sticky;top:0;z-index:1000;
  background:var(--azul-oscuro);
  color:var(--blanco);
  box-shadow:0 2px 12px rgba(0,0,0,.15);
}
.navbar-inner{
  max-width:1280px;margin:0 auto;padding:14px 24px;
  display:flex;align-items:center;justify-content:space-between;
}
.logo{display:flex;align-items:center;gap:10px;font-weight:700;font-size:1.3rem;cursor:pointer;}
.logo-icon{
  width:38px;height:38px;border-radius:50%;
  background:var(--amarillo);color:var(--azul-oscuro);
  display:flex;align-items:center;justify-content:center;font-size:1.2rem;
}
.nav-links{display:flex;align-items:center;gap:6px;}
.nav-links button{
  color:var(--blanco);padding:10px 16px;border-radius:8px;font-size:.92rem;font-weight:500;
  transition:var(--transicion);
}
.nav-links button:hover,.nav-links button.activo{background:rgba(255,255,255,.12);color:var(--amarillo);}
.nav-cta{
  background:var(--amarillo) !important;color:var(--azul-oscuro) !important;font-weight:600 !important;
}
.nav-cta:hover{background:#ffc933 !important;color:var(--azul-oscuro) !important;}
.hamburguesa{display:none;flex-direction:column;gap:5px;padding:6px;}
.hamburguesa span{width:26px;height:3px;background:var(--blanco);border-radius:2px;transition:var(--transicion);}

@media(max-width:900px){
  .hamburguesa{display:flex;}
  .nav-links{
    position:fixed;top:64px;right:0;bottom:0;width:78%;max-width:320px;
    background:var(--azul-oscuro);flex-direction:column;align-items:stretch;
    padding:20px;transform:translateX(100%);transition:var(--transicion);gap:4px;
    box-shadow:-4px 0 20px rgba(0,0,0,.25);
  }
  .nav-links.abierto{transform:translateX(0);}
  .nav-links button{text-align:left;width:100%;}
}

/* =========================================================
   4. BOTONES
========================================================= */
.btn{
  display:inline-flex;align-items:center;justify-content:center;gap:8px;
  padding:13px 26px;border-radius:10px;font-weight:600;font-size:.95rem;
  transition:var(--transicion);white-space:nowrap;
}
.btn-primario{background:var(--azul);color:var(--blanco);}
.btn-primario:hover{background:var(--azul-oscuro);transform:translateY(-2px);box-shadow:var(--sombra-hover);}
.btn-amarillo{background:var(--amarillo);color:var(--azul-oscuro);}
.btn-amarillo:hover{background:#ffc933;transform:translateY(-2px);}
.btn-outline{background:transparent;border:2px solid var(--azul);color:var(--azul);}
.btn-outline:hover{background:var(--azul);color:var(--blanco);}
.btn-texto{color:var(--azul);font-weight:600;padding:10px 6px;}
.btn-texto:hover{text-decoration:underline;}
.btn-block{width:100%;}
.btn:disabled{opacity:.5;cursor:not-allowed;transform:none !important;}
.btn-sm{padding:8px 14px;font-size:.82rem;border-radius:8px;}

/* =========================================================
   5. LAYOUT / CONTENEDORES
========================================================= */
.pantalla{min-height:calc(100vh - 68px);padding-bottom:60px;}
.contenedor{max-width:1180px;margin:0 auto;padding:0 22px;}
.seccion-titulo{font-size:1.7rem;font-weight:700;color:var(--azul-oscuro);margin-bottom:6px;}
.seccion-sub{color:#667;margin-bottom:26px;font-size:.95rem;}

/* HERO */
.hero{
  position:relative;min-height:520px;display:flex;align-items:center;color:#fff;
  background:
    linear-gradient(120deg,rgba(0,40,85,.92),rgba(0,59,149,.82)),
    url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600"><rect width="1200" height="600" fill="%23003b95"/><circle cx="150" cy="120" r="220" fill="%23002855" opacity="0.4"/><circle cx="1050" cy="450" r="260" fill="%23002855" opacity="0.4"/></svg>');
  background-size:cover;background-position:center;
}
.hero::after{
  content:"✈";position:absolute;right:6%;top:14%;font-size:9rem;opacity:.12;transform:rotate(20deg);
  overflow:hidden;pointer-events:none;
}
.hero-contenido{position:relative;z-index:2;max-width:1180px;margin:0 auto;padding:60px 22px;width:100%;}
.hero h1{font-size:2.6rem;font-weight:800;margin-bottom:10px;}
.hero p{font-size:1.08rem;opacity:.92;max-width:560px;margin-bottom:34px;}

/* BUSCADOR */
.buscador{
  background:var(--blanco);border-radius:var(--radio);box-shadow:var(--sombra-hover);
  padding:24px;position:relative;z-index:3;
}
.tipo-viaje{display:flex;gap:22px;margin-bottom:18px;flex-wrap:wrap;}
.radio-item{display:flex;align-items:center;gap:7px;cursor:pointer;font-weight:500;font-size:.92rem;color:var(--gris-oscuro);}
.radio-item input{accent-color:var(--azul);width:16px;height:16px;}
.buscador-grid{
  display:grid;grid-template-columns:1fr auto 1fr 1fr 1fr auto;gap:12px;align-items:end;
}
.campo{display:flex;flex-direction:column;gap:5px;position:relative;}
.campo label{font-size:.75rem;font-weight:600;color:#667;text-transform:uppercase;letter-spacing:.03em;}
.campo input,.campo select{
  padding:12px 12px;border:1.5px solid #dfe4ea;border-radius:9px;font-size:.92rem;color:var(--gris-oscuro);
  transition:var(--transicion);background:var(--blanco);
}
.campo input:focus,.campo select:focus{outline:none;border-color:var(--azul);box-shadow:0 0 0 3px rgba(0,59,149,.12);}
.btn-swap{
  width:42px;height:42px;border-radius:50%;background:var(--gris-claro);color:var(--azul);
  align-self:center;font-size:1.1rem;transition:var(--transicion);
}
.btn-swap:hover{background:var(--azul);color:#fff;transform:rotate(180deg);}
.autocomplete-lista{
  position:absolute;top:100%;left:0;right:0;background:#fff;border-radius:10px;box-shadow:var(--sombra-hover);
  max-height:230px;overflow-y:auto;z-index:50;margin-top:6px;border:1px solid #eee;
}
.autocomplete-item{padding:11px 14px;cursor:pointer;font-size:.88rem;border-bottom:1px solid #f2f2f2;}
.autocomplete-item:hover{background:var(--gris-claro);}
.autocomplete-item b{color:var(--azul);}
.autocomplete-item small{display:block;color:#888;}
.pasajeros-selector{position:relative;}
.pasajeros-box{
  border:1.5px solid #dfe4ea;border-radius:9px;padding:12px;cursor:pointer;font-size:.92rem;display:flex;justify-content:space-between;align-items:center;
  color:var(--gris-oscuro);
}
.pasajeros-panel{
  position:absolute;top:100%;left:0;margin-top:6px;background:#fff;border-radius:10px;box-shadow:var(--sombra-hover);
  width:280px;z-index:200;border:1px solid #eee;
  max-height:min(70vh,420px);
  display:flex;flex-direction:column;
  color:var(--gris-oscuro);
  overflow:hidden;
}
.pasajeros-panel-header{
  display:flex;justify-content:space-between;align-items:center;
  padding:16px 16px 6px;flex-shrink:0;
}
.pasajeros-panel-header b{font-size:.9rem;color:var(--azul-oscuro);}
.pasajeros-panel-body{
  padding:0 16px;overflow-y:auto;flex:1 1 auto;min-height:0;
}
.pasajeros-panel-footer{width:calc(100% - 32px);margin:10px 16px 16px;flex-shrink:0;}
.pasajeros-cerrar{font-size:1.1rem;color:#889;line-height:1;padding:2px 6px;border-radius:6px;}
.pasajeros-cerrar:hover{background:var(--gris-claro);color:var(--gris-oscuro);}
.pasajeros-fila{display:flex;justify-content:space-between;align-items:center;padding:8px 0;color:var(--gris-oscuro);}
.pasajeros-fila b{color:var(--gris-oscuro);}
.pasajeros-fila small{display:block;color:#888;}
.contador{display:flex;align-items:center;gap:10px;}
.contador span{color:var(--gris-oscuro);}
.contador button{
  width:28px;height:28px;border-radius:50%;border:1.5px solid var(--azul);color:var(--azul);font-weight:700;
}
.contador button:disabled{opacity:.3;border-color:#ccc;color:#ccc;}
.buscador-footer{margin-top:16px;display:flex;justify-content:flex-end;}

/* CARRUSEL DE FECHAS */
.carrusel-fechas{background:#fff;border-radius:var(--radio);box-shadow:var(--sombra);padding:14px;margin-bottom:20px;display:flex;align-items:center;gap:8px;}
.carrusel-flecha{
  width:34px;height:34px;min-width:34px;border-radius:50%;background:var(--gris-claro);color:var(--azul);font-weight:700;
  display:flex;align-items:center;justify-content:center;transition:var(--transicion);
}
.carrusel-flecha:hover:not(:disabled){background:var(--azul);color:#fff;}
.carrusel-flecha:disabled{opacity:.3;cursor:not-allowed;}
.carrusel-dias{display:flex;gap:8px;overflow-x:auto;scroll-behavior:smooth;padding-bottom:2px;flex:1;}
.carrusel-dia{
  min-width:78px;border-radius:10px;padding:10px 6px;text-align:center;background:#f5f7fa;cursor:pointer;
  transition:var(--transicion);flex-shrink:0;
}
.carrusel-dia .dia-semana{font-size:.68rem;color:#889;text-transform:uppercase;font-weight:700;}
.carrusel-dia .dia-numero{font-size:1.1rem;font-weight:800;color:var(--azul-oscuro);margin:2px 0;}
.carrusel-dia .dia-precio{font-size:.72rem;font-weight:700;}
.carrusel-dia.nivel-bajo{background:#e2f6ea;} .carrusel-dia.nivel-bajo .dia-precio{color:#1c6b3f;}
.carrusel-dia.nivel-medio{background:#fff3cd;} .carrusel-dia.nivel-medio .dia-precio{color:#946200;}
.carrusel-dia.nivel-alto{background:#fbe4e4;} .carrusel-dia.nivel-alto .dia-precio{color:#a13434;}
.carrusel-dia.seleccionado{background:var(--azul);box-shadow:0 0 0 2px var(--azul-oscuro);}
.carrusel-dia.seleccionado .dia-semana,.carrusel-dia.seleccionado .dia-numero,.carrusel-dia.seleccionado .dia-precio{color:#fff;}
.carrusel-dia.deshabilitado{opacity:.4;cursor:not-allowed;}
.carrusel-mes-label{font-size:.72rem;color:#889;text-align:center;min-width:70px;font-weight:600;text-transform:capitalize;}

/* VUELO NO DISPONIBLE (cancelado) */
.vuelo-card.no-reservable{opacity:.72;}
.badge-no-disponible{background:#f0f1f3;color:#889;}

/* CALENDARIO DE PRECIOS */
.campo-fecha-btn{
  padding:12px;border:1.5px solid #dfe4ea;border-radius:9px;font-size:.92rem;color:var(--gris-oscuro);
  background:#fff;text-align:left;width:100%;transition:var(--transicion);
}
.campo-fecha-btn:hover{border-color:var(--azul);}
.campo-fecha-btn .placeholder{color:#98a2b3;}
.calendario-panel{
  position:absolute;top:100%;left:0;margin-top:6px;background:#fff;border-radius:12px;box-shadow:var(--sombra-hover);
  padding:16px;width:320px;z-index:70;border:1px solid #eee;
}
.calendario-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
.calendario-header button{width:30px;height:30px;border-radius:50%;color:var(--azul);font-weight:700;}
.calendario-header button:hover{background:var(--gris-claro);}
.calendario-header span{font-weight:700;color:var(--azul-oscuro);font-size:.92rem;text-transform:capitalize;}
.calendario-dias-semana{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:4px;}
.calendario-dias-semana span{text-align:center;font-size:.68rem;color:#889;font-weight:700;}
.calendario-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;}
.calendario-dia{
  aspect-ratio:1;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;
  font-size:.72rem;font-weight:700;cursor:pointer;transition:var(--transicion);gap:1px;position:relative;
  background:#f5f7fa;color:#889;
}
.calendario-dia.vacio{background:transparent;cursor:default;}
.calendario-dia .precio-dia{font-size:.58rem;font-weight:600;}
.calendario-dia.nivel-bajo{background:#e2f6ea;color:#1c6b3f;}
.calendario-dia.nivel-medio{background:#fff3cd;color:#946200;}
.calendario-dia.nivel-alto{background:#fbe4e4;color:#a13434;}
.calendario-dia:hover:not(.deshabilitado):not(.vacio){transform:scale(1.08);box-shadow:0 2px 8px rgba(0,0,0,.15);}
.calendario-dia.seleccionado{background:var(--azul) !important;color:#fff !important;box-shadow:0 0 0 2px var(--azul-oscuro);}
.calendario-dia.deshabilitado{background:#f0f1f3;color:#c3c8d1;cursor:not-allowed;}
.calendario-dia.sin-disponibilidad{background:#f0f1f3;color:#c3c8d1;cursor:not-allowed;}
.calendario-leyenda{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px;padding-top:12px;border-top:1px solid #eef0f3;justify-content:center;}
.calendario-leyenda span{display:flex;align-items:center;gap:5px;font-size:.7rem;color:#556;}
.calendario-leyenda i{width:10px;height:10px;border-radius:3px;display:inline-block;}
.calendario-cargando{text-align:center;padding:30px 10px;color:#889;font-size:.85rem;}
.calendario-tooltip{
  position:absolute;bottom:105%;left:50%;transform:translateX(-50%);background:var(--azul-oscuro);color:#fff;
  padding:4px 8px;border-radius:6px;font-size:.68rem;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .15s;
}
.calendario-dia:hover .calendario-tooltip{opacity:1;}

/* DATOS DE CONTACTO */
.contacto-bloque{margin-bottom:22px;}
.contacto-bloque h3{background:var(--azul-oscuro);color:#fff;padding:12px 16px;border-radius:10px 10px 0 0;font-size:.95rem;}
.contacto-form{background:#fff;border-radius:0 0 10px 10px;padding:20px;box-shadow:var(--sombra);}

.hero-stats{display:flex;gap:34px;margin-top:38px;flex-wrap:wrap;}
.hero-stats div b{font-size:1.5rem;display:block;color:var(--amarillo);}
.hero-stats div span{font-size:.8rem;opacity:.85;}

/* DESTINOS DESTACADOS */
.destacados{padding:70px 0;}
.grid-destinos{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px;}
.card-destino{
  border-radius:var(--radio);overflow:hidden;background:#fff;box-shadow:var(--sombra);transition:var(--transicion);cursor:pointer;display:flex;flex-direction:column;
}
.card-destino:hover{transform:translateY(-6px);box-shadow:var(--sombra-hover);}
.card-destino-img{
  height:160px;
  position:relative;
  background:linear-gradient(135deg,var(--azul),var(--azul-oscuro));
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:2.4rem;
  color:#fff;
  overflow:hidden;
}
.card-destino-img img{
  width:100%;
  height:100%;
  object-fit:cover;
  display:block;
  transition:transform .4s ease;
}
.card-destino:hover .card-destino-img img{
  transform:scale(1.08);
}
.card-destino-badge{
  position:absolute;
  top:10px;
  right:10px;
  background:rgba(11, 61, 99, 0.82);
  backdrop-filter:blur(4px);
  color:#fff;
  padding:3px 9px;
  border-radius:14px;
  font-size:.72rem;
  font-weight:700;
  letter-spacing:.5px;
  box-shadow:0 2px 6px rgba(0,0,0,.2);
}
.card-destino-img.sin-foto img{
  display:none;
}
.card-destino-img.sin-foto .card-destino-icono-fallback{
  display:flex;
}
.card-destino-icono-fallback{
  display:none;
  font-size:2.4rem;
  color:#fff;
}
.card-destino-info{padding:16px;}
.card-destino-info h4{font-size:1.02rem;margin-bottom:2px;}
.card-destino-info span{color:#888;font-size:.82rem;}
.card-destino-info .precio-desde{color:var(--azul);font-weight:700;margin-top:8px;display:block;font-size:1.05rem;}

/* =========================================================
   6. TARJETAS / CONTENEDORES GENERALES
========================================================= */
.card{background:#fff;border-radius:var(--radio);box-shadow:var(--sombra);padding:22px;}
.breadcrumbs{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:22px 0;font-size:.82rem;color:#889;}
.breadcrumbs span.activo{color:var(--azul);font-weight:600;}
.progreso{display:flex;align-items:center;margin:20px 0 30px;flex-wrap:wrap;gap:4px;}
.progreso-paso{display:flex;align-items:center;gap:8px;}
.progreso-circulo{
  width:30px;height:30px;border-radius:50%;background:#e2e6ec;color:#889;display:flex;align-items:center;justify-content:center;
  font-weight:700;font-size:.82rem;transition:var(--transicion);flex-shrink:0;
}
.progreso-paso.activo .progreso-circulo{background:var(--azul);color:#fff;}
.progreso-paso.completado .progreso-circulo{background:var(--verde);color:#fff;}
.progreso-paso span.label{font-size:.78rem;color:#889;font-weight:500;}
.progreso-paso.activo span.label{color:var(--azul);font-weight:700;}
.progreso-linea{width:26px;height:2px;background:#e2e6ec;margin:0 4px;}
@media(max-width:750px){.progreso-paso span.label{display:none;} }

/* FILTROS + RESULTADOS DE VUELOS */
.layout-resultados{display:grid;grid-template-columns:250px 1fr;gap:24px;align-items:start;}
.filtros{position:sticky;top:90px;}
.filtro-grupo{margin-bottom:20px;}
.filtro-grupo h4{font-size:.85rem;text-transform:uppercase;color:var(--azul-oscuro);margin-bottom:10px;letter-spacing:.03em;}
.filtro-item{display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:.88rem;}
.filtro-item input{accent-color:var(--azul);}
.rango-precio{width:100%;accent-color:var(--azul);}

.vuelo-card{
  background:#fff;border-radius:var(--radio);box-shadow:var(--sombra);padding:20px;margin-bottom:16px;
  transition:var(--transicion);border:2px solid transparent;
}
.vuelo-card:hover{box-shadow:var(--sombra-hover);border-color:#e3ecf9;}
.vuelo-card-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;}
.vuelo-numero{font-weight:600;color:var(--azul);font-size:.85rem;}
.badge{padding:4px 11px;border-radius:20px;font-size:.72rem;font-weight:700;letter-spacing:.02em;}
.badge-programado{background:#e3ecf9;color:var(--azul);}
.badge-embarcando{background:#fff3cd;color:#946200;}
.badge-despegado{background:#e2f6ea;color:var(--verde);}
.badge-aterrizado{background:#e2f6ea;color:var(--verde);}
.badge-cancelado{background:#fbe4e4;color:var(--rojo);}
.badge-retrasado{background:#fff3cd;color:#946200;}
.badge-desviado{background:#f0e2fb;color:#6a2e9c;}
.vuelo-card-body{display:flex;align-items:center;gap:24px;flex-wrap:wrap;}
.tramo{flex:1;min-width:200px;display:flex;align-items:center;gap:14px;}
.tramo-hora{text-align:center;}
.tramo-hora b{font-size:1.35rem;color:var(--azul-oscuro);display:block;}
.tramo-hora span{font-size:.75rem;color:#889;}
.tramo-linea{flex:1;text-align:center;position:relative;}
.tramo-linea .duracion{font-size:.75rem;color:#889;margin-bottom:4px;display:block;}
.tramo-linea .linea{height:2px;background:#dfe4ea;position:relative;}
.tramo-linea .linea::before,.tramo-linea .linea::after{content:"";position:absolute;top:-3px;width:8px;height:8px;border-radius:50%;background:var(--azul);}
.tramo-linea .linea::before{left:0;}
.tramo-linea .linea::after{right:0;}
.tramo-linea .escalas{font-size:.72rem;color:#889;margin-top:4px;display:block;}
.vuelo-precio{text-align:right;min-width:150px;}
.vuelo-precio b{font-size:1.5rem;color:var(--azul);display:block;}
.vuelo-precio span{font-size:.75rem;color:#889;}
.vuelo-card-footer{display:flex;justify-content:space-between;align-items:center;margin-top:14px;padding-top:14px;border-top:1px dashed #e3e6ea;font-size:.82rem;color:#667;flex-wrap:wrap;gap:8px;}

/* TARIFAS */
.grid-tarifas{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px;}
.tarifa-card{
  background:#fff;border-radius:var(--radio);box-shadow:var(--sombra);padding:22px;border:2px solid transparent;transition:var(--transicion);cursor:pointer;position:relative;
}
.tarifa-card:hover{transform:translateY(-4px);box-shadow:var(--sombra-hover);}
.tarifa-card.seleccionada{border-color:var(--azul);}
.tarifa-card.destacada::before{
  content:"Recomendado";position:absolute;top:-12px;right:16px;background:var(--amarillo);color:var(--azul-oscuro);
  padding:4px 12px;border-radius:20px;font-size:.7rem;font-weight:700;
}
.tarifa-card h3{color:var(--azul-oscuro);font-size:1.15rem;margin-bottom:4px;}
.tarifa-card .tarifa-precio{font-size:1.8rem;font-weight:800;color:var(--azul);margin:10px 0;}
.tarifa-card ul{margin:14px 0;}
.tarifa-card ul li{font-size:.85rem;padding:6px 0;display:flex;gap:8px;align-items:flex-start;color:#556;}
.tarifa-card ul li::before{content:"✓";color:var(--verde);font-weight:700;}

/* RESUMEN */
.resumen-flex{display:grid;grid-template-columns:1fr 320px;gap:22px;align-items:start;}
.resumen-item{border-bottom:1px solid #eef0f3;padding:14px 0;}
.resumen-item:last-child{border-bottom:none;}
.resumen-item h4{font-size:.95rem;color:var(--azul-oscuro);margin-bottom:6px;}
.resumen-item p{font-size:.83rem;color:#667;}
.total-box{position:sticky;top:90px;}
.total-fila{display:flex;justify-content:space-between;font-size:.9rem;padding:8px 0;color:#556;}
.total-fila.total-final{font-weight:800;font-size:1.2rem;color:var(--azul-oscuro);border-top:2px solid #eef0f3;margin-top:8px;padding-top:14px;}

/* PASAJEROS FORM */
.pasajero-bloque{margin-bottom:22px;}
.pasajero-bloque h3{
  background:var(--azul);color:#fff;padding:12px 16px;border-radius:10px 10px 0 0;font-size:.95rem;
}
.pasajero-form{background:#fff;border-radius:0 0 10px 10px;padding:20px;box-shadow:var(--sombra);}
.form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;}
.form-grid .full{grid-column:1/-1;}
.campo-form{display:flex;flex-direction:column;gap:5px;}
.campo-form label{font-size:.78rem;font-weight:600;color:#556;}
.campo-form input,.campo-form select,.campo-form textarea{
  padding:11px;border:1.5px solid #dfe4ea;border-radius:8px;font-size:.9rem;
}
.campo-form input:focus,.campo-form select:focus,.campo-form textarea:focus{outline:none;border-color:var(--azul);}
.campo-form.error input,.campo-form.error select{border-color:var(--rojo);}
.msg-error{color:var(--rojo);font-size:.75rem;margin-top:2px;}
.check-item{display:flex;align-items:center;gap:8px;font-size:.87rem;}

/* ASIENTOS */
.segmento-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;}
.segmento-tab{
  padding:10px 16px;border-radius:9px;background:#fff;box-shadow:var(--sombra);font-size:.83rem;font-weight:600;color:#556;
}
.segmento-tab.activo{background:var(--azul);color:#fff;}
.mapa-avion{display:grid;grid-template-columns:1fr 260px;gap:24px;align-items:start;}
.avion-wrap{background:#fff;border-radius:var(--radio);box-shadow:var(--sombra);padding:24px;}
.avion-nariz{
  width:120px;height:60px;margin:0 auto 10px;background:var(--azul);border-radius:60px 60px 0 0;
}
.fila-asientos{display:flex;justify-content:center;align-items:center;gap:8px;margin-bottom:9px;}
.fila-num{width:22px;font-size:.72rem;color:#889;text-align:center;font-weight:700;}
.asiento{
  width:34px;height:34px;border-radius:7px 7px 10px 10px;background:#e3ecf9;color:var(--azul);
  display:flex;align-items:center;justify-content:center;font-size:.68rem;font-weight:700;transition:var(--transicion);
}
.asiento:hover:not(.ocupado):not(.disabled){transform:scale(1.12);}
.asiento.preferencial{background:#ffe9b3;color:#946200;}
.asiento.emergencia{background:#f0c3c3;color:var(--rojo);}
.asiento.ocupado{background:#d6d9de;color:#999;cursor:not-allowed;}
.asiento.seleccionado{background:var(--verde) !important;color:#fff !important;}
.pasillo{width:20px;}
.leyenda{display:flex;flex-wrap:wrap;gap:16px;margin-top:18px;justify-content:center;}
.leyenda-item{display:flex;align-items:center;gap:6px;font-size:.78rem;color:#556;}
.leyenda-caja{width:16px;height:16px;border-radius:4px;}
.panel-asiento-lateral{position:sticky;top:90px;}
.pasajero-asiento-fila{
  display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #eef0f3;font-size:.85rem;
}
.pasajero-asiento-fila.activo{background:#eef4ff;border-radius:8px;padding:10px;margin:4px 0;}
.chip-asiento{background:var(--verde);color:#fff;padding:3px 10px;border-radius:20px;font-size:.75rem;font-weight:700;}
.chip-vacio{background:#eee;color:#889;padding:3px 10px;border-radius:20px;font-size:.75rem;}

/* SERVICIOS */
.grid-servicios{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px;}
.servicio-card{background:#fff;border-radius:var(--radio);box-shadow:var(--sombra);padding:18px;}
.servicio-card .icono{font-size:1.7rem;margin-bottom:8px;}
.servicio-card h4{font-size:.95rem;margin-bottom:4px;}
.servicio-card p{font-size:.78rem;color:#889;margin-bottom:10px;min-height:32px;}
.servicio-card .precio{font-weight:700;color:var(--azul);margin-bottom:10px;display:block;}
.servicio-card select{width:100%;padding:9px;border:1.5px solid #dfe4ea;border-radius:8px;font-size:.83rem;}

/* PAGO */
.metodos-pago{display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;}
.metodo-pago{
  padding:12px 18px;border:2px solid #dfe4ea;border-radius:10px;font-size:.85rem;font-weight:600;color:#556;display:flex;gap:8px;align-items:center;
}
.metodo-pago.activo{border-color:var(--azul);color:var(--azul);background:#eef4ff;}
.metodo-pago:disabled{opacity:.5;}

/* CONFIRMACION / TICKET */
.ticket{
  background:#fff;border-radius:var(--radio);box-shadow:var(--sombra-hover);overflow:hidden;max-width:760px;margin:0 auto;
}
.ticket-header{background:linear-gradient(120deg,var(--azul),var(--azul-oscuro));color:#fff;padding:30px;text-align:center;}
.ticket-header .check{font-size:2.6rem;margin-bottom:8px;}
.pnr-box{background:var(--amarillo);color:var(--azul-oscuro);display:inline-block;padding:10px 26px;border-radius:10px;font-size:1.5rem;font-weight:800;letter-spacing:.15em;margin-top:12px;}
.ticket-body{padding:26px;}
.ticket-linea{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px dashed #eef0f3;font-size:.88rem;}
.ticket-linea b{color:var(--azul-oscuro);}
.ticket-perf{height:1px;background:repeating-linear-gradient(90deg,#ccc 0 8px,transparent 8px 16px);margin:18px 0;}

/* FORMULARIO GENERICO / LOGIN */
.form-ancho{max-width:440px;margin:0 auto;}
.tabs-auth{display:flex;margin-bottom:22px;border-radius:10px;overflow:hidden;box-shadow:var(--sombra);}
.tab-auth{flex:1;padding:14px;background:#fff;font-weight:600;color:#889;font-size:.9rem;}
.tab-auth.activo{background:var(--azul);color:#fff;}

/* ESTADOS VACIOS / ALERTAS */
.estado-vacio{text-align:center;padding:60px 20px;color:#889;}
.estado-vacio .icono{font-size:3rem;margin-bottom:14px;}
.alerta{
  padding:14px 18px;border-radius:10px;font-size:.88rem;margin-bottom:18px;display:flex;gap:10px;align-items:flex-start;
  animation:entrada .25s ease;
}
.alerta-error{background:#fbe4e4;color:var(--rojo);border-left:4px solid var(--rojo);}
.alerta-exito{background:#e2f6ea;color:var(--verde);border-left:4px solid var(--verde);}
.alerta-info{background:#e3ecf9;color:var(--azul);border-left:4px solid var(--azul);}

/* TOASTS */
.toast-contenedor{position:fixed;top:80px;right:20px;z-index:5000;display:flex;flex-direction:column;gap:10px;}
.toast{
  background:#fff;box-shadow:var(--sombra-hover);border-radius:10px;padding:14px 18px;min-width:250px;max-width:340px;
  border-left:4px solid var(--azul);animation:entrada .3s ease;font-size:.85rem;
}
.toast.exito{border-color:var(--verde);}
.toast.error{border-color:var(--rojo);}
@keyframes entrada{from{opacity:0;transform:translateY(-10px);}to{opacity:1;transform:translateY(0);}}

/* LOADER */
.loader-overlay{
  position:fixed;inset:0;background:rgba(0,40,85,.65);display:flex;align-items:center;justify-content:center;z-index:9000;
  flex-direction:column;gap:14px;color:#fff;
}
.spinner{width:52px;height:52px;border:5px solid rgba(255,255,255,.3);border-top-color:var(--amarillo);border-radius:50%;animation:girar .8s linear infinite;}
@keyframes girar{to{transform:rotate(360deg);}}

/* MODAL */
.modal-overlay{
  position:fixed;inset:0;background:rgba(0,20,40,.55);z-index:4000;display:flex;align-items:center;justify-content:center;padding:20px;
}
.modal-box{background:#fff;border-radius:var(--radio);max-width:480px;width:100%;padding:26px;box-shadow:var(--sombra-hover);position:relative;animation:entrada .25s ease;}
.modal-cerrar{position:absolute;top:14px;right:16px;font-size:1.3rem;color:#889;}

/* FOOTER */
.footer{background:var(--azul-oscuro);color:#cfd9ea;padding:44px 0 20px;margin-top:60px;}
.footer-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:24px;margin-bottom:24px;}
.footer h4{color:#fff;margin-bottom:12px;font-size:.95rem;}
.footer li{font-size:.83rem;padding:4px 0;color:#adc0dd;}
.footer-bottom{text-align:center;font-size:.78rem;padding-top:20px;border-top:1px solid rgba(255,255,255,.1);color:#8ea3c4;}

/* PERFIL */
.perfil-header{display:flex;align-items:center;gap:16px;margin-bottom:24px;}
.perfil-avatar{width:64px;height:64px;border-radius:50%;background:var(--amarillo);color:var(--azul-oscuro);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.4rem;}
.tabla-simple{width:100%;border-collapse:collapse;}
.tabla-simple th,.tabla-simple td{padding:12px 10px;text-align:left;font-size:.85rem;border-bottom:1px solid #eef0f3;}
.tabla-simple th{color:#889;text-transform:uppercase;font-size:.72rem;letter-spacing:.03em;}

/* RESPONSIVE GENERAL */
@media(max-width:900px){
  .buscador-grid{grid-template-columns:1fr 1fr;}
  .btn-swap{display:none;}
  .layout-resultados{grid-template-columns:1fr;}
  .filtros{position:static;}
  .resumen-flex{grid-template-columns:1fr;}
  .mapa-avion{grid-template-columns:1fr;}
  .panel-asiento-lateral{position:static;}
}
@media(max-width:560px){
  .hero h1{font-size:1.8rem;}
  .buscador-grid{grid-template-columns:1fr;}
  .buscador{padding:16px;}
  .vuelo-card-body{flex-direction:column;align-items:stretch;}
  .vuelo-precio{text-align:left;}
  .tramo{flex-direction:column;}
  .pasajeros-panel{width:min(280px,86vw);max-height:min(60vh,380px);}
}

/* === RECUPERAR CONTRASEÑA === */
.link-olvido{font-size:.82rem;color:var(--azul);cursor:pointer;text-decoration:underline;}
.link-olvido:hover{color:var(--azul-oscuro);}
.modal-recuperar-overlay{
  display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);
  z-index:3000;align-items:center;justify-content:center;padding:20px;
}
.modal-recuperar-box{
  background:#fff;border-radius:16px;padding:28px 30px;max-width:420px;width:100%;
  box-shadow:0 12px 40px rgba(0,40,85,.22);position:relative;
}
.modal-recuperar-cerrar{
  position:absolute;top:12px;right:14px;font-size:1.1rem;
  color:#889;cursor:pointer;background:none;border:none;line-height:1;
}
.modal-recuperar-cerrar:hover{color:var(--rojo);}

/* === VUELOS EN VIVO (mapa tipo FlightRadar24) === */
.envivo-layout{display:grid;grid-template-columns:1fr 320px;gap:18px;align-items:start;}
.envivo-mapa{height:60vh;min-height:420px;width:100%;background:var(--gris-claro);}
.envivo-leyenda{
  display:flex;align-items:center;gap:8px;padding:10px 16px;font-size:.78rem;
  color:#667;border-top:1px solid #e8edf3;
}
.envivo-punto{width:8px;height:8px;border-radius:50%;background:var(--verde);display:inline-block;animation:envivo-parpadeo 1.6s infinite;}
@keyframes envivo-parpadeo{0%,100%{opacity:1;}50%{opacity:.25;}}
.envivo-panel{display:flex;flex-direction:column;gap:12px;max-height:72vh;overflow-y:auto;padding-right:2px;}
.envivo-contador{font-size:.9rem;color:var(--gris-oscuro);}
.envivo-contador b{color:var(--azul);font-size:1.15rem;}
.envivo-card{
  background:#fff;border:1px solid #e2e8f0;border-radius:var(--radio);
  padding:12px 14px;cursor:pointer;transition:border-color .15s, box-shadow .15s;
}
.envivo-card:hover{border-color:var(--azul);}
.envivo-card.activa{border-color:var(--azul);box-shadow:0 0 0 2px rgba(0,59,149,.12);}
.envivo-card-titulo{display:flex;justify-content:space-between;align-items:center;font-size:.85rem;color:#667;}
.envivo-card-titulo b{color:var(--azul-oscuro);font-size:.95rem;}
.envivo-card-barra{height:4px;border-radius:2px;background:#e6ecf3;overflow:hidden;margin:10px 0 6px;}
.envivo-card-barra div{height:100%;background:var(--azul);transition:width 1s linear;}
.envivo-card-info{font-size:.76rem;color:#889;}
.envivo-detalle{animation:envivo-entra .2s ease;}
@keyframes envivo-entra{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;}}
.envivo-cerrar{
  background:none;border:none;color:#889;cursor:pointer;font-size:1rem;line-height:1;
}
.envivo-cerrar:hover{color:var(--rojo);}
.envivo-avion-icon{background:none;border:none;}
.envivo-avion{
  font-size:24px;font-weight:bold;color:#FFD500;
  text-shadow:-1.5px -1.5px 0 #002855, 1.5px -1.5px 0 #002855, -1.5px 1.5px 0 #002855, 1.5px 1.5px 0 #002855, 0 0 6px rgba(0,40,85,.9);
  display:flex;align-items:center;justify-content:center;width:34px;height:34px;
  cursor:pointer;transform-origin:center;
}
.envivo-etiqueta-aeropuerto{
  background:rgba(0,40,85,.82);color:#fff;border:none;font-size:10px;font-weight:600;
  padding:2px 6px;border-radius:4px;box-shadow:none;
}
.envivo-etiqueta-aeropuerto::before{border-top-color:rgba(0,40,85,.82);}
.leaflet-container{font-family:inherit;}
@media(max-width:900px){
  .envivo-layout{grid-template-columns:1fr;}
  .envivo-panel{max-height:none;overflow:visible;}
}
</style>
</head>
<body data-build="2026-10-06-redeploy">

<!-- ============================================================
     NAVBAR
============================================================ -->
<nav class="navbar">
  <div class="navbar-inner">
    <div class="logo" onclick="Navegacion.ir('inicio')">
      <div class="logo-icon">✈</div>
      <span>Acajutla <span style="color:var(--amarillo)">Airlines</span></span>
    </div>
    <div class="nav-links" id="navLinks">
      <button onclick="Navegacion.ir('inicio')" data-ruta="inicio">Inicio</button>
      <button onclick="Navegacion.ir('vuelos')" data-ruta="vuelos">Buscar vuelos</button>
      <button onclick="Navegacion.ir('consultarReserva')" data-ruta="consultarReserva">Mis reservas</button>
      <button onclick="Navegacion.ir('estadoVuelo')" data-ruta="estadoVuelo">Estado de vuelo</button>
      <button onclick="Navegacion.ir('vuelosEnVivo')" data-ruta="vuelosEnVivo">Vuelos en vivo</button>
      <button class="nav-cta" id="btnAuthNav" onclick="Navegacion.ir('login')">Iniciar sesión</button>
    </div>
    <button class="hamburguesa" id="btnHamburguesa" aria-label="Abrir menú"><span></span><span></span><span></span></button>
  </div>
</nav>

<div id="app"></div>

<!-- ============================================================
     FOOTER
============================================================ -->
<footer class="footer">
  <div class="contenedor footer-grid">
    <div>
      <h4>Acajutla Airlines</h4>
      <ul><li>Volando desde El Salvador hacia el mundo</li></ul>
    </div>
    <div>
      <h4>Enlaces</h4>
      <ul>
        <li><a href="#" onclick="Navegacion.ir('vuelos')">Buscar vuelos</a></li>
        <li><a href="#" onclick="Navegacion.ir('consultarReserva')">Consultar reserva</a></li>
        <li><a href="#" onclick="Navegacion.ir('estadoVuelo')">Estado de vuelo</a></li>
        <li><a href="#" onclick="Navegacion.ir('vuelosEnVivo')">Vuelos en vivo</a></li>
      </ul>
    </div>
    <div>
      <h4>Ayuda</h4>
      <ul><li>Centro de ayuda</li><li>Equipaje</li><li>Políticas</li></ul>
    </div>
    <div>
      <h4>Contacto</h4>
      <ul><li>info@acajutla-airlines.com</li><li>+503 2222-0000</li></ul>
    </div>
  </div>
  <div class="footer-bottom">© 2026 Acajutla Airlines — Proyecto académico. Todos los derechos reservados.</div>
</footer>

<div class="toast-contenedor" id="toastContenedor"></div>

<script>
/* =====================================================================
   ACAJUTLA AIRLINES — APLICACIÓN SPA (index.php + vuelos.php, Fase 1 de separación)
   Estructura del JS:
     1. CONFIGURACIÓN DE API
     2. DATOS MOCK (centralizados)
     3. ESTADO GLOBAL
     4. UTILIDADES / VALIDACIONES
     5. CAPA DE API (con fallback a mocks)
     6. NAVEGACIÓN (router SPA)
     7. RENDER DE PANTALLAS
     8. LÓGICA: buscador, vuelos, tarifas, pasajeros, asientos,
        servicios, pago, confirmación, consulta reserva, auth, perfil,
        estado de vuelo
===================================================================== */

/* =====================================================================
   1. CONFIGURACIÓN DE API
   -> Cuando exista el backend en Render, cambiar únicamente esta URL.
===================================================================== */
const API_CONFIG = {
  // URL PROVISIONAL: reemplazar por la URL real del backend en Render
  API_BASE_URL: 'https://acajutla-airlines-api.onrender.com/api',
  // Mientras el backend no exista, USE_MOCKS debe permanecer en true.
  USE_MOCKS: true,
  TIMEOUT_MS: 8000,
  // Endpoint que el backend deberá exponer para el envío del comprobante por correo.
  // El frontend solo conoce esta ruta pública; NUNCA credenciales SMTP.
  // POST {API_BASE_URL}{ENDPOINT_COMPROBANTE_EMAIL(pnr)}
  ENDPOINT_COMPROBANTE_EMAIL(pnr){ return `/reservas/${pnr}/comprobante/email`; },

  // -----------------------------------------------------------------------
  // API LOCAL (PHP + MySQLi, XAMPP) — Etapa de conexión real con Aiven.
  // Este backend local es independiente del futuro backend de Render.
  //
  // FASE 1 DE SEPARACIÓN: aeropuertos y búsqueda de vuelos ahora usan
  // endpoints dedicados en php/, en vez del antiguo api.php?action=...
  // (api.php se conserva sin cambios en la raíz, no se eliminó).
  // El resto de funciones de Api sigue usando MOCK (controlado por
  // USE_MOCKS) hasta que se conecten en etapas posteriores.
  // -----------------------------------------------------------------------
  API_LOCAL_URL: 'http://localhost/Acajutla_Airlines/api.php', // legacy, ya no se usa para aeropuertos/vuelos

  // Directorio donde vive index.php, calculado en tiempo real a partir de
  // la URL actual del navegador. Esto hace que ENDPOINT_AEROPUERTOS y
  // ENDPOINT_BUSCAR_VUELOS apunten SIEMPRE al lugar correcto sin importar
  // si la app corre en la raíz del dominio (Render: https://dominio/) o
  // bajo una subcarpeta (XAMPP: http://localhost/Acajutla_Airlines/).
  // Antes estas rutas eran cadenas fijas ('php/aeropuertos.php'); ahora se
  // resuelven explícitamente contra window.location, que es más robusto
  // y fácil de depurar que depender de la resolución relativa implícita
  // del navegador.
  rutaBaseApp(){
    let ruta = window.location.pathname;
    if(!ruta.endsWith('/')) ruta = ruta.substring(0, ruta.lastIndexOf('/') + 1);
    return ruta;
  },
  get ENDPOINT_AEROPUERTOS(){ return this.rutaBaseApp() + 'php/aeropuertos.php'; },
  get ENDPOINT_METRICAS_INICIO(){ return this.rutaBaseApp() + 'php/metricas_inicio.php'; },
  get ENDPOINT_BUSCAR_VUELOS(){ return this.rutaBaseApp() + 'php/buscar_vuelos.php'; },
  // Endpoint LOCAL real (php/enviar_comprobante.php) para el envío del
  // comprobante por correo. Es independiente de USE_MOCKS: solo esta
  // función de Api.sendBookingEmail() lo usa; el resto de Api sigue
  // en modo mock hasta que se conecte en una etapa posterior.
  get ENDPOINT_COMPROBANTE_EMAIL_REAL(){ return this.rutaBaseApp() + 'php/enviar_comprobante.php'; },
  // Endpoints LOCALES reales para asientos/reservas (independientes de
  // USE_MOCKS, misma técnica ya usada para el comprobante por correo).
  get ENDPOINT_ASIENTOS_OCUPADOS_REAL(){ return this.rutaBaseApp() + 'php/asientos_ocupados.php'; },
  get ENDPOINT_CREAR_RESERVA_REAL(){ return this.rutaBaseApp() + 'php/crear_reserva.php'; },
  get ENDPOINT_LOGIN_REAL(){ return this.rutaBaseApp() + 'php/auth_login.php'; },
  get ENDPOINT_REGISTRO_REAL(){ return this.rutaBaseApp() + 'php/auth_registro.php'; },
  get ENDPOINT_MIS_RESERVAS_REAL(){ return this.rutaBaseApp() + 'php/mis_reservas.php'; },
  get ENDPOINT_CONSULTAR_RESERVA_REAL(){ return this.rutaBaseApp() + 'php/consultar_reserva.php'; },
  get ENDPOINT_ESTADO_VUELO_REAL(){ return this.rutaBaseApp() + 'php/estado_vuelo.php'; },
  get ENDPOINT_VUELOS_EN_VIVO_REAL(){ return this.rutaBaseApp() + 'php/vuelos_en_vuelo.php'; },
  get ENDPOINT_PAISES_REAL(){ return this.rutaBaseApp() + 'php/paises.php'; },
  get ENDPOINT_RECUPERAR_REAL(){ return this.rutaBaseApp() + 'php/auth_recuperar.php'; },
  get ENDPOINT_RESET_PASSWORD_REAL(){ return this.rutaBaseApp() + 'php/auth_reset_password.php'; }
};

/* -----------------------------------------------------------------------
   NOTA SOBRE EL CORREO DE ENVÍO DE COMPROBANTES
   El correo REMITENTE de los comprobantes será diegoramireze658@gmail.com.
   Ese dato y el envío real ocurren ÚNICAMENTE en el backend (Render), que se
   conectará a Gmail SMTP usando variables de entorno (SMTP_USER, SMTP_PASSWORD).
   El frontend jamás debe conocer, mostrar, almacenar ni enviar la contraseña
   de aplicación de Gmail: no se guarda en localStorage/sessionStorage/cookies
   ni se escribe en este archivo. El navegador únicamente hace fetch() al
   endpoint del backend definido arriba.
----------------------------------------------------------------------- */

/* =====================================================================
   2. DATOS MOCK CENTRALIZADOS
   Respetan los nombres reales de tablas/campos según DESCRIBE de MySQL.
===================================================================== */
const MOCK = {

  aeropuertos: [
    {id:1, codigo_iata:'SAL', codigo_icao:'MSLP', nombre:'Aeropuerto Internacional El Salvador', ciudad:'San Salvador', pais:'El Salvador', zona_horaria:'America/El_Salvador', activo:1},
    {id:2, codigo_iata:'MIA', codigo_icao:'KMIA', nombre:'Aeropuerto Internacional de Miami', ciudad:'Miami', pais:'Estados Unidos', zona_horaria:'America/New_York', activo:1},
    {id:3, codigo_iata:'JFK', codigo_icao:'KJFK', nombre:'Aeropuerto John F. Kennedy', ciudad:'Nueva York', pais:'Estados Unidos', zona_horaria:'America/New_York', activo:1},
    {id:4, codigo_iata:'MAD', codigo_icao:'LEMD', nombre:'Aeropuerto Adolfo Suárez Madrid-Barajas', ciudad:'Madrid', pais:'España', zona_horaria:'Europe/Madrid', activo:1},
    {id:5, codigo_iata:'MEX', codigo_icao:'MMMX', nombre:'Aeropuerto Internacional de la Ciudad de México', ciudad:'Ciudad de México', pais:'México', zona_horaria:'America/Mexico_City', activo:1},
    {id:6, codigo_iata:'PTY', codigo_icao:'MPTO', nombre:'Aeropuerto Internacional de Tocumen', ciudad:'Panamá', pais:'Panamá', zona_horaria:'America/Panama', activo:1},
    {id:7, codigo_iata:'BOG', codigo_icao:'SKBO', nombre:'Aeropuerto El Dorado', ciudad:'Bogotá', pais:'Colombia', zona_horaria:'America/Bogota', activo:1},
    {id:8, codigo_iata:'LAX', codigo_icao:'KLAX', nombre:'Aeropuerto Internacional de Los Ángeles', ciudad:'Los Ángeles', pais:'Estados Unidos', zona_horaria:'America/Los_Angeles', activo:1},
    {id:9, codigo_iata:'CUN', codigo_icao:'MMUN', nombre:'Aeropuerto Internacional de Cancún', ciudad:'Cancún', pais:'México', zona_horaria:'America/Cancun', activo:1},
    {id:10,codigo_iata:'GUA', codigo_icao:'MGGT', nombre:'Aeropuerto Internacional La Aurora', ciudad:'Guatemala', pais:'Guatemala', zona_horaria:'America/Guatemala', activo:1}
  ],

  tipos_aeronave: [
    {id:1, fabricante:'Airbus', modelo:'A320neo', capacidad_total:180, configuracion_asientos:{filas:30, columnas:['A','B','C','D','E','F']}, peso_maximo_despegue:79000, alcance_km:6300},
    {id:2, fabricante:'Boeing', modelo:'737-800', capacidad_total:160, configuracion_asientos:{filas:27, columnas:['A','B','C','D','E','F']}, peso_maximo_despegue:79015, alcance_km:5400},
    {id:3, fabricante:'Airbus', modelo:'A330-300', capacidad_total:290, configuracion_asientos:{filas:49, columnas:['A','B','C','D','E','F']}, peso_maximo_despegue:242000, alcance_km:11750},
    {id:4, fabricante:'Embraer', modelo:'E190', capacidad_total:100, configuracion_asientos:{filas:17, columnas:['A','B','C','D']}, peso_maximo_despegue:51800, alcance_km:4537}
  ],

  aeronaves: [
    {id:1, matricula:'YS-AAL', tipo_aeronave_id:1, aerolinea:'Acajutla Airlines', estado:'ACTIVA'},
    {id:2, matricula:'YS-AAM', tipo_aeronave_id:2, aerolinea:'Acajutla Airlines', estado:'ACTIVA'},
    {id:3, matricula:'YS-AAN', tipo_aeronave_id:3, aerolinea:'Acajutla Airlines', estado:'ACTIVA'},
    {id:4, matricula:'YS-AAO', tipo_aeronave_id:4, aerolinea:'Acajutla Airlines', estado:'ACTIVA'}
  ],

  rutas: [
    {id:1, origen_id:1, destino_id:2, distancia_km:1900, duracion_estimada_min:190, estacionalidad:'TODO_EL_AÑO'},
    {id:2, origen_id:1, destino_id:3, distancia_km:3080, duracion_estimada_min:290, estacionalidad:'TODO_EL_AÑO'},
    {id:3, origen_id:1, destino_id:4, distancia_km:8800, duracion_estimada_min:600, estacionalidad:'TODO_EL_AÑO'},
    {id:4, origen_id:1, destino_id:5, distancia_km:1150, duracion_estimada_min:140, estacionalidad:'TODO_EL_AÑO'},
    {id:5, origen_id:1, destino_id:6, distancia_km:660, duracion_estimada_min:100, estacionalidad:'TODO_EL_AÑO'},
    {id:6, origen_id:1, destino_id:7, distancia_km:1650, duracion_estimada_min:175, estacionalidad:'TODO_EL_AÑO'},
    {id:7, origen_id:1, destino_id:8, distancia_km:3450, duracion_estimada_min:320, estacionalidad:'TODO_EL_AÑO'},
    {id:8, origen_id:1, destino_id:9, distancia_km:1350, duracion_estimada_min:150, estacionalidad:'TODO_EL_AÑO'},
    {id:9, origen_id:1, destino_id:10, distancia_km:290, duracion_estimada_min:60, estacionalidad:'TODO_EL_AÑO'},
    {id:10, origen_id:2, destino_id:1, distancia_km:1900, duracion_estimada_min:190, estacionalidad:'TODO_EL_AÑO'},
    {id:11, origen_id:3, destino_id:1, distancia_km:3080, duracion_estimada_min:290, estacionalidad:'TODO_EL_AÑO'},
    {id:12, origen_id:4, destino_id:1, distancia_km:8800, duracion_estimada_min:600, estacionalidad:'TODO_EL_AÑO'},
    {id:13, origen_id:5, destino_id:1, distancia_km:1150, duracion_estimada_min:140, estacionalidad:'TODO_EL_AÑO'},
    {id:14, origen_id:6, destino_id:1, distancia_km:660, duracion_estimada_min:100, estacionalidad:'TODO_EL_AÑO'},
    {id:15, origen_id:7, destino_id:1, distancia_km:1650, duracion_estimada_min:175, estacionalidad:'TODO_EL_AÑO'},
    {id:16, origen_id:8, destino_id:1, distancia_km:3450, duracion_estimada_min:320, estacionalidad:'TODO_EL_AÑO'},
    {id:17, origen_id:9, destino_id:1, distancia_km:1350, duracion_estimada_min:150, estacionalidad:'TODO_EL_AÑO'},
    {id:18, origen_id:10, destino_id:1, distancia_km:290, duracion_estimada_min:60, estacionalidad:'TODO_EL_AÑO'},
    {id:19, origen_id:6, destino_id:7, distancia_km:960, duracion_estimada_min:110, estacionalidad:'TODO_EL_AÑO'},
    {id:20, origen_id:2, destino_id:3, distancia_km:1750, duracion_estimada_min:160, estacionalidad:'TODO_EL_AÑO'}
  ],

  // vuelos: numero_vuelo, ruta_id, aeronave_id, salida_programada, llegada_programada,
  // salida_real, llegada_real, estado, puerta, terminal (según DESCRIBE real)
  vuelos: [
    {id:1, numero_vuelo:'AJ101', ruta_id:1, aeronave_id:1, salida_programada:'08:00', llegada_programada:'11:10', salida_real:null, llegada_real:null, estado:'PROGRAMADO', puerta:'A3', terminal:'T1', precio_base:320, escalas:0},
    {id:2, numero_vuelo:'AJ102', ruta_id:1, aeronave_id:2, salida_programada:'14:30', llegada_programada:'17:40', salida_real:null, llegada_real:null, estado:'PROGRAMADO', puerta:'A5', terminal:'T1', precio_base:280, escalas:0},
    {id:3, numero_vuelo:'AJ205', ruta_id:2, aeronave_id:3, salida_programada:'06:15', llegada_programada:'12:35', salida_real:null, llegada_real:null, estado:'EMBARCANDO', puerta:'B2', terminal:'T2', precio_base:410, escalas:1},
    {id:4, numero_vuelo:'AJ206', ruta_id:2, aeronave_id:1, salida_programada:'20:00', llegada_programada:'01:20', salida_real:null, llegada_real:null, estado:'PROGRAMADO', puerta:'B4', terminal:'T2', precio_base:390, escalas:0},
    {id:5, numero_vuelo:'AJ310', ruta_id:3, aeronave_id:3, salida_programada:'22:10', llegada_programada:'14:10', salida_real:null, llegada_real:null, estado:'PROGRAMADO', puerta:'C1', terminal:'T2', precio_base:780, escalas:1},
    {id:6, numero_vuelo:'AJ412', ruta_id:4, aeronave_id:2, salida_programada:'09:45', llegada_programada:'12:05', salida_real:null, llegada_real:null, estado:'RETRASADO', puerta:'A2', terminal:'T1', precio_base:250, escalas:0},
    {id:7, numero_vuelo:'AJ415', ruta_id:4, aeronave_id:4, salida_programada:'17:20', llegada_programada:'19:40', salida_real:null, llegada_real:null, estado:'PROGRAMADO', puerta:'A6', terminal:'T1', precio_base:265, escalas:0},
    {id:8, numero_vuelo:'AJ520', ruta_id:5, aeronave_id:4, salida_programada:'07:00', llegada_programada:'08:40', salida_real:'07:05', llegada_real:null, llegada_real2:null, estado:'DESPEGADO', puerta:'A1', terminal:'T1', precio_base:180, escalas:0},
    {id:9, numero_vuelo:'AJ521', ruta_id:5, aeronave_id:1, salida_programada:'19:00', llegada_programada:'20:40', salida_real:null, llegada_real:null, estado:'PROGRAMADO', puerta:'A4', terminal:'T1', precio_base:195, escalas:0},
    {id:10, numero_vuelo:'AJ630', ruta_id:6, aeronave_id:2, salida_programada:'10:15', llegada_programada:'13:10', salida_real:null, llegada_real:null, estado:'PROGRAMADO', puerta:'B1', terminal:'T2', precio_base:340, escalas:0},
    {id:11, numero_vuelo:'AJ720', ruta_id:7, aeronave_id:3, salida_programada:'12:00', llegada_programada:'17:20', salida_real:null, llegada_real:null, estado:'CANCELADO', puerta:'C3', terminal:'T2', precio_base:520, escalas:0},
    {id:12, numero_vuelo:'AJ721', ruta_id:7, aeronave_id:1, salida_programada:'23:30', llegada_programada:'04:50', salida_real:null, llegada_real:null, estado:'PROGRAMADO', puerta:'C2', terminal:'T2', precio_base:495, escalas:0},
    {id:13, numero_vuelo:'AJ830', ruta_id:8, aeronave_id:4, salida_programada:'08:30', llegada_programada:'11:00', salida_real:null, llegada_real:null, estado:'PROGRAMADO', puerta:'A7', terminal:'T1', precio_base:300, escalas:0},
    {id:14, numero_vuelo:'AJ910', ruta_id:9, aeronave_id:2, salida_programada:'15:00', llegada_programada:'16:00', salida_real:null, llegada_real:null, estado:'PROGRAMADO', puerta:'A2', terminal:'T1', precio_base:140, escalas:0},
    // vuelos de regreso
    {id:15, numero_vuelo:'AJ103', ruta_id:10, aeronave_id:1, salida_programada:'12:20', llegada_programada:'13:30', salida_real:null, llegada_real:null, estado:'PROGRAMADO', puerta:'D1', terminal:'T1', precio_base:310, escalas:0},
    {id:16, numero_vuelo:'AJ207', ruta_id:11, aeronave_id:1, salida_programada:'15:00', llegada_programada:'19:30', salida_real:null, llegada_real:null, estado:'PROGRAMADO', puerta:'D2', terminal:'T2', precio_base:400, escalas:1},
    {id:17, numero_vuelo:'AJ311', ruta_id:12, aeronave_id:3, salida_programada:'16:00', llegada_programada:'22:30', salida_real:null, llegada_real:null, estado:'PROGRAMADO', puerta:'D3', terminal:'T2', precio_base:790, escalas:1},
    {id:18, numero_vuelo:'AJ413', ruta_id:13, aeronave_id:2, salida_programada:'13:00', llegada_programada:'15:10', salida_real:null, llegada_real:null, estado:'PROGRAMADO', puerta:'D4', terminal:'T1', precio_base:255, escalas:0},
    {id:19, numero_vuelo:'AJ631', ruta_id:14, aeronave_id:2, salida_programada:'18:00', llegada_programada:'20:50', salida_real:null, llegada_real:null, estado:'PROGRAMADO', puerta:'D5', terminal:'T2', precio_base:345, escalas:0},
    {id:20, numero_vuelo:'AJ831', ruta_id:16, aeronave_id:4, salida_programada:'13:30', llegada_programada:'16:00', salida_real:null, llegada_real:null, estado:'PROGRAMADO', puerta:'D6', terminal:'T1', precio_base:305, escalas:0}
  ],

  // Clases de tarifa: se hacen corresponder EXACTAMENTE con el enum real de
  // flight_segments.fare_class (economy/premium/business/first). No existe
  // "standard" en la BD, así que ya no se usa esa clase — se reemplazó por
  // 'Business' y 'Primera' (first), que sí son reales.
  // "multiplicador" y "beneficios" solo se usan como respaldo visual para
  // vuelos MOCK antiguos que no traigan vuelo.base_price ni vuelo.tarifas;
  // los vuelos reales usan siempre Util.obtenerPrecioTarifa() → base_price.
  tarifas: {
    ECONOMICA: {nombre:'Económica', codigoClase:'economy', multiplicador:1, beneficios:['1 equipaje de mano (10kg)','Selección de asiento estándar','Cambios con penalidad','Sin reembolso']},
    PREMIUM: {nombre:'Premium', codigoClase:'premium', multiplicador:1.35, beneficios:['1 equipaje de mano + 1 facturado (23kg)','Selección de asiento incluida','Cambios permitidos sin penalidad','Reembolso parcial']},
    BUSINESS: {nombre:'Business', codigoClase:'business', multiplicador:1.9, beneficios:['2 equipajes facturados (32kg c/u)','Asiento preferencial incluido','Cambios flexibles ilimitados','Reembolso total','Acceso a sala VIP']},
    PRIMERA: {nombre:'Primera Clase', codigoClase:'first', multiplicador:2.6, beneficios:['Equipaje sin límite práctico','Suite/asiento totalmente reclinable','Cambios y cancelación sin costo','Reembolso total','Acceso a sala VIP','Abordaje prioritario']}
  },

  servicios: [
    {id:'EQ_EXTRA', nombre:'Equipaje extra', icono:'🧳', descripcion:'Maleta adicional de 23kg', precio:45},
    {id:'EQ_DEPORTIVO', nombre:'Equipaje deportivo', icono:'🏂', descripcion:'Equipo deportivo especial', precio:60},
    {id:'SALA_VIP', nombre:'Sala VIP', icono:'🛋️', descripcion:'Acceso a sala de espera VIP', precio:35},
    {id:'ASIST_MEDICA', nombre:'Asistencia médica', icono:'⚕️', descripcion:'Acompañamiento médico especializado', precio:25},
    {id:'ABORDAJE_PRIORITARIO', nombre:'Abordaje prioritario', icono:'⚡', descripcion:'Aborda antes que el resto de pasajeros', precio:20}
  ],

  precioAsiento: {ECONOMICO:0, PREFERENCIAL:80, EMERGENCIA:80},

  ocupados: {}, // no usado: la disponibilidad real ahora viene de php/asientos_ocupados.php (ver Asientos.cargarOcupados)

  clientes: [
    {id:1, nombre:'Diego', apellido:'Ramírez', correo:'diego@correo.com', password:'123456', telefono:'7000-1111', documento:'01234567-8'}
  ],

  reservas: [
    {
      pnr:'AC7XQ2', cliente_id:1, estado:'CONFIRMADA', creado_en:'2026-08-15',
      total:640, tipo_viaje:'IDA_VUELTA',
      pasajeros:[{nombres:'Diego', apellidos:'Ramírez', documento:'01234567-8'}],
      segmentos:[
        {numero_vuelo:'AJ101', origen:'SAL', destino:'MIA', fecha:'2026-09-10', asiento:'10A', estado_check_in:0, pase_abordar_emitido:0},
        {numero_vuelo:'AJ103', origen:'MIA', destino:'SAL', fecha:'2026-09-17', asiento:'12C', estado_check_in:0, pase_abordar_emitido:0}
      ],
      pago:{metodo:'TARJETA', estado:'APROBADO', monto:640}
    }
  ]
};

/* =====================================================================
   3. ESTADO GLOBAL DE LA APLICACIÓN
===================================================================== */
const Estado = {
  ruta: 'inicio',

  // Aeropuertos que se muestran en el selector de origen/destino del buscador.
  // Se inicializa con el respaldo mock y se sustituye por los datos reales
  // de Aiven (vía api.php) tan pronto la carga inicial responde con éxito.
  aeropuertosDisponibles: MOCK.aeropuertos,
  metricasInicio: null,

  busqueda: {
    tipoViaje: 'IDA_VUELTA',   // IDA_VUELTA | SOLO_IDA
    origen: null,              // objeto aeropuerto
    destino: null,
    fechaIda: '',
    fechaRegreso: '',
    adultos: 1,
    jovenes: 0,
    ninos: 0,
    bebes: 0
  },

  resultados: [],
  modoResultados: 'IDA', // IDA | REGRESO

  vueloIda: null,
  tarifaIda: null,
  precioTarifaIda: null,   // precio REAL de la tarifa de ida (desde vuelo.tarifas)
  vueloRegreso: null,
  tarifaRegreso: null,
  precioTarifaRegreso: null, // precio REAL de la tarifa de regreso (desde vuelo.tarifas)

  pasajeros: [],       // datos de formulario de cada pasajero
  segmentos: [],        // [{tipo:'IDA'|'REGRESO', vuelo, tarifa}]
  asientos: {},          // clave `${segmentoIdx}_${pasajeroIdx}` -> {codigo, tipo, precio}
  servicios: {},          // clave `${pasajeroIdx}` -> [servicioId,...]

  // Datos de contacto para el envío del comprobante (booking.contact)
  contacto: {
    nombre: '',
    email: '',
    emailConfirmacion: '',
    telefono: ''
  },

  precios: {vuelos:0, asientos:0, servicios:0, total:0},

  reservaActual: null,

  usuario: null // sesión simulada
};

/* -----------------------------------------------------------------------
   PERSISTENCIA DEL ESTADO (sessionStorage)
   Sobrevive al botón de refrescar (F5 / flecha del navegador): la sesión,
   vuelos, asientos, pasajeros y contacto se restauran tal como estaban.
   Al CERRAR la pestaña o el navegador el storage se borra solo: la
   próxima visita arranca limpia, como si fuera la primera vez.
   aeropuertosDisponibles NO se guarda: se recarga del backend al iniciar.
----------------------------------------------------------------------- */
const Persistencia = {
  CLAVE: 'acajutla_estado_v1',
  CAMPOS: ['ruta','busqueda','resultados','modoResultados','vueloIda','tarifaIda','precioTarifaIda',
           'vueloRegreso','tarifaRegreso','precioTarifaRegreso','pasajeros','segmentos','asientos',
           'servicios','contacto','precios','reservaActual','usuario'],

  guardar(){
    try{
      const datos = {};
      this.CAMPOS.forEach(c=>{ datos[c] = Estado[c]; });
      sessionStorage.setItem(this.CLAVE, JSON.stringify(datos));
    }catch(e){ /* storage lleno o bloqueado: la app sigue funcionando sin persistencia */ }
  },

  restaurar(){
    try{
      // Limpiar residuo de la versión anterior que usaba localStorage
      // (persistía incluso al cerrar el navegador).
      localStorage.removeItem(this.CLAVE);
      const crudo = sessionStorage.getItem(this.CLAVE);
      if(!crudo) return;
      const datos = JSON.parse(crudo);
      if(!datos || typeof datos !== 'object') return;
      this.CAMPOS.forEach(c=>{
        if(datos[c] !== undefined) Estado[c] = datos[c];
      });
    }catch(e){ /* estado corrupto: se arranca limpio */ }
  }
};

function totalPasajeros(){
  return Estado.busqueda.adultos + Estado.busqueda.jovenes + Estado.busqueda.ninos + Estado.busqueda.bebes;
}

// Los bebés (lap infant) NO ocupan asiento propio: viajan en brazos de un adulto.
function totalPasajerosConAsiento(){
  return Estado.busqueda.adultos + Estado.busqueda.jovenes + Estado.busqueda.ninos;
}

/* =====================================================================
   4. UTILIDADES / VALIDACIONES / HELPERS
===================================================================== */
const Util = {
  // Catálogo de fotografías optimizadas de cada destino (mapeado por código IATA).
  // Si deseas usar fotos locales en el futuro, puedes colocar rutas como 'img/destinos/TGU.jpg'.
  FOTOS_DESTINOS: {
    'MEX': 'img/Ciudad_de_Mexico.jpg',
    'GUA': 'img/Guatemala_City.jpg',
    'LUA': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
    'LIR': 'img/Liberia.jpg',
    'MGA': 'img/Managua.jpg',
    'MIA': 'img/Miami.jpg',
    'PTY': 'img/Ciudad_de_Panama.jpg',
    'SFO': 'img/San_Francisco.jpg',
    'SJO': 'img/San_Jose_CR.jpg',
    'TGU': 'img/Tegucigalpa.jpg',
    'JFK': 'img/Nueva_York.jpg',
    'MAD': 'img/Madrid.jpg',
    'BOG': 'img/Bogota.jpg',
    'LAX': 'img/Los_Angeles.jpg',
    'CUN': 'img/Cancun.jpg'
  },

  fotoDestino(codigoIata){
    if(!codigoIata) return null;
    const ruta = this.FOTOS_DESTINOS[String(codigoIata).trim().toUpperCase()];
    if(!ruta) return null;
    if(ruta.startsWith('http://') || ruta.startsWith('https://')) return ruta;
    const base = (typeof API_CONFIG !== 'undefined' && API_CONFIG.rutaBaseApp) ? API_CONFIG.rutaBaseApp() : '';
    return base + ruta;
  },

  formatoMoneda(n){ return '$' + Number(n).toFixed(2); },

  formatoNumero(n){ return Number(n).toLocaleString('es-SV', {maximumFractionDigits:0}); },

  // minutos decimales -> "2 h 15 min" / "45 min"
  formatoDuracion(minutos){
    const min = Math.max(0, Math.round(Number(minutos)||0));
    const h = Math.floor(min/60), m = min%60;
    if(h === 0) return `${m} min`;
    return m === 0 ? `${h} h` : `${h} h ${m} min`;
  },

  formatoFechaLarga(fechaStr){
    if(!fechaStr) return '';
    const meses=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    // Acepta "YYYY-MM-DD" y también timestamps MySQL "YYYY-MM-DD HH:MM:SS":
    // se toma solo la parte de fecha para que el día no salga como NaN.
    const [y,m,d]=String(fechaStr).slice(0,10).split('-').map(Number);
    return `${d} ${meses[m-1]} ${y}`;
  },

  duracionMin(minTotal){
    const h=Math.floor(minTotal/60), m=minTotal%60;
    return `${h}h ${m}m`;
  },

  generarPNR(){
    const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out='';
    for(let i=0;i<6;i++) out+=chars[Math.floor(Math.random()*chars.length)];
    return out;
  },

  hoyISO(){ return new Date().toISOString().slice(0,10); },

  // Los vuelos mock guardan la hora como "08:00"; los vuelos reales llegan
  // como timestamp completo de MySQL ("2026-09-15 08:00:00"). Este helper
  // normaliza ambos casos a "HH:MM" para mostrar y filtrar por hora.
  horaCorta(valor){
    if(!valor) return '--:--';
    if(/^\d{2}:\d{2}$/.test(valor)) return valor; // ya es HH:MM (mock)
    const partes = String(valor).split(' ');
    const horaParte = partes[1] || partes[0];
    return horaParte ? horaParte.slice(0,5) : '--:--';
  },

  // Busca primero en los aeropuertos reales cargados desde Aiven
  // (Estado.aeropuertosDisponibles); si no se encuentra, cae al mock
  // como respaldo para no romper las partes del sistema que aún no
  // están conectadas (rutas/vuelos mock siguen usando ids del mock).
  // Obtiene el precio de una clase de tarifa (ECONOMICA/PREMIUM/BUSINESS/PRIMERA)
  // para un vuelo. Orden de prioridad, siempre datos reales primero:
  //  1) vuelo.tarifas[] — precio REAL por clase, viene de flight_fares+
  //     fare_classes (ver php/buscar_vuelos.php). Es la fuente de verdad;
  //     si el vuelo trae este array, SIEMPRE se usa antes que cualquier otra cosa.
  //  2) vuelo.base_price (flights.base_price) — SOLO respaldo cuando el
  //     vuelo no tiene ninguna fila en flight_fares todavía (por ejemplo,
  //     vuelos creados antes de que existiera el trigger que las genera).
  //     En ese caso se usa el mismo precio para cualquier clase porque no
  //     hay un precio diferenciado real disponible para ese vuelo.
  //  3) vuelo.precio_base * MOCK.tarifas[clave].multiplicador — SOLO como
  //     respaldo para vuelos mock antiguos que no traigan ninguno de los dos
  //     campos anteriores.
  obtenerPrecioTarifa(vuelo, clave){
    if(!vuelo) return null;
    if(Array.isArray(vuelo.tarifas)){
      const t = vuelo.tarifas.find(x=>x.clase===clave);
      return t ? t.precio : null;
    }
    if(vuelo.base_price!=null) return vuelo.base_price;
    if(vuelo.precio_base!=null && MOCK.tarifas[clave]) return vuelo.precio_base * MOCK.tarifas[clave].multiplicador;
    return null;
  },

  aeropuertoPorId(id){
    return Estado.aeropuertosDisponibles.find(a=>a.id===id) || MOCK.aeropuertos.find(a=>a.id===id);
  },

  // -----------------------------------------------------------------------
  // FUNCIONES CENTRALIZADAS (evitar reglas duplicadas en distintos lugares)
  // -----------------------------------------------------------------------

  // Deja solo dígitos, recortando a maxLen si se indica.
  sanitizeNumericInput(str, maxLen){
    let limpio = String(str||'').replace(/\D/g,'');
    if(maxLen) limpio = limpio.slice(0, maxLen);
    return limpio;
  },

  // Formatea un teléfono salvadoreño de 8 dígitos como XXXX-XXXX en vivo.
  formatPhoneNumber(valorCrudo){
    const digitos = Util.sanitizeNumericInput(valorCrudo, 8);
    return digitos.length > 4 ? digitos.slice(0,4)+'-'+digitos.slice(4) : digitos;
  },

  // Formatea un número de tarjeta en grupos de 4 dígitos (máx. 19 dígitos).
  formatCardNumber(valorCrudo){
    const digitos = Util.sanitizeNumericInput(valorCrudo, 19);
    return digitos.replace(/(\d{4})(?=\d)/g, '$1 ');
  },

  // Formatea el vencimiento como MM/AA en vivo a partir de dígitos.
  // El mes no puede pasar de 12: si al escribir se forma un mes inválido
  // (ej. "55"), se descarta el segundo dígito para que nunca llegue a existir.
  formatExpiry(valorCrudo){
    let digitos = Util.sanitizeNumericInput(valorCrudo, 4);
    if(digitos.length >= 2 && /^[2-9]/.test(digitos) && parseInt(digitos.slice(0,2),10) > 12){
      digitos = '0' + digitos[0] + digitos.slice(1);
    }
    while(digitos.length >= 2 && parseInt(digitos.slice(0,2),10) > 12){
      digitos = digitos[0] + digitos.slice(2);
    }
    if(digitos.length === 2 && digitos[0] === '0' && digitos[1] === '0') digitos = '0';
    return digitos.length > 2 ? digitos.slice(0,2)+'/'+digitos.slice(2) : digitos;
  },

  // Estados de vuelo equivalentes a "cancelado" (por si la API futura usa otras variantes).
  ESTADOS_CANCELADOS: ['CANCELADO','CANCELED','CANCELLED'],

  // Validación centralizada: un vuelo cancelado NUNCA es reservable.
  // Debe usarse en cada punto donde se seleccione, avance o confirme un vuelo.
  isFlightBookable(vuelo){
    if(!vuelo || !vuelo.estado) return false;
    return !Util.ESTADOS_CANCELADOS.includes(String(vuelo.estado).toUpperCase());
  },

  // La fecha de ida no puede ser anterior a hoy.
  isValidDepartureDate(fechaISO){
    if(!fechaISO) return false;
    return fechaISO >= Util.hoyISO();
  },

  // La fecha de vuelta no puede ser anterior a la fecha de ida.
  isValidReturnDate(fechaISO, fechaIdaISO){
    if(!fechaISO || !fechaIdaISO) return false;
    return fechaISO >= fechaIdaISO;
  },

  // Determina si una tarifa incluye asiento preferencial/cualquiera sin costo adicional
  tarifaIncluyeAsiento(claveTarifa){
    return claveTarifa === 'BUSINESS' || claveTarifa === 'PRIMERA';
  },

  // Determina si una tarifa incluye un servicio adicional de cortesía ($0)
  tarifaIncluyeServicio(claveTarifa, servicioId){
    if(claveTarifa === 'PRIMERA'){
      return servicioId === 'SALA_VIP' || servicioId === 'ABORDAJE_PRIORITARIO';
    }
    if(claveTarifa === 'BUSINESS'){
      return servicioId === 'SALA_VIP';
    }
    return false;
  },

  // Determina si la tarifa del vuelo de IDA incluye un servicio dado.
  // Los beneficios (Sala VIP, Abordaje Prioritario) solo se otorgan
  // cuando la clase premium es en el vuelo de ida — no en el de regreso.
  viajeIncluyeServicio(servicioId){
    const tIda = Estado.tarifaIda;
    return this.tarifaIncluyeServicio(tIda, servicioId);
  },

  // Determina si un servicio para un pasajero específico está incluido ($0)
  // ya sea por tarifa de IDA o porque es un bebé acompañando a un adulto responsable
  // que tiene dicho servicio (SALA_VIP o ABORDAJE_PRIORITARIO).
  servicioEstaIncluidoParaPasajero(pasajeroIdx, servicioId){
    // 1. Si está incluido por tarifa de ida para todos
    if(this.viajeIncluyeServicio(servicioId)) return true;

    // 2. Si es un bebé (requiresSeat === false o type === 'infant')
    const p = Estado.pasajeros ? Estado.pasajeros[pasajeroIdx] : null;
    const esBebe = p && (p.requiresSeat === false || p.type === 'infant');

    if(esBebe && (servicioId === 'SALA_VIP' || servicioId === 'ABORDAJE_PRIORITARIO')){
      // Comprobar si algún adulto/responsable tiene contratado o incluido este servicio
      const algunAdultoTiene = Estado.pasajeros.some((adulto, aIdx)=>{
        if(adulto.requiresSeat === false || adulto.type === 'infant') return false;
        if(this.viajeIncluyeServicio(servicioId)) return true;
        const servsAdulto = Estado.servicios[aIdx] || [];
        return servsAdulto.includes(servicioId);
      });
      if(algunAdultoTiene) return true;
    }

    return false;
  },

  // Retorna la lista detallada de servicios contratados o incluidos por pasajero
  obtenerDetalleServicios(){
    const lista = [];
    if(!Array.isArray(Estado.pasajeros)) return lista;
    const razonTarifa = (sid) => sid==='SALA_VIP' ? (Estado.tarifaIda==='PRIMERA'||Estado.tarifaRegreso==='PRIMERA'?'Primera Clase':'Business') : (sid==='ABORDAJE_PRIORITARIO'?'Primera Clase':'');
    Estado.pasajeros.forEach((p, pi)=>{
      const sIds = Estado.servicios[pi] || [];
      sIds.forEach(sid=>{
        const servMock = MOCK.servicios.find(x=>x.id===sid);
        if(!servMock) return;
        const incluido = this.servicioEstaIncluidoParaPasajero(pi, sid);
        const esBebe = (p.requiresSeat === false || p.type === 'infant');
        let nota = 'Adicional';
        if(incluido){
          if(this.viajeIncluyeServicio(sid)){
            nota = `Incluido en tarifa ${razonTarifa(sid)}`;
          } else if(esBebe){
            nota = 'Cortesía acompañante bebé ($0)';
          } else {
            nota = 'Incluido';
          }
        }
        lista.push({
          pasajeroIdx: pi,
          pasajeroNombre: (p.nombres ? `${p.nombres} ${p.apellidos||''}`.trim() : `Pasajero ${pi+1}`),
          servicioId: sid,
          nombre: servMock.nombre,
          precio: incluido ? 0 : servMock.precio,
          incluido: incluido,
          nota: nota
        });
      });
    });
    return lista;
  },

  // Clasifica un precio en bajo/medio/alto según el conjunto de precios disponibles (terciles reales).
  // Convierte un nivel (bajo/medio/alto) en el indicador visual $/$$/$$$
  // que usan el calendario y el carrusel de fechas (sin mostrar montos numéricos).
  // Alterna un input de contraseña entre password/text sin tocar su valor.
  // Funciona igual en escritorio y móvil (solo cambia el atributo type).
  togglePasswordVisibility(inputId, btn){
    const input = document.getElementById(inputId);
    if(!input) return;
    const mostrando = input.type === 'text';
    input.type = mostrando ? 'password' : 'text';
    if(btn){
      btn.textContent = mostrando ? '👁️' : '🙈';
      btn.setAttribute('aria-label', mostrando ? 'Mostrar contraseña' : 'Ocultar contraseña');
    }
  },

  // Filtra en tiempo real solo los caracteres que Validar.soloTexto ya
  // acepta (letras con tildes/ñ, espacios, apóstrofe) — mismo criterio que
  // la validación real antes de enviar, no uno nuevo inventado aquí.
  filtrarSoloTexto(input){
    input.value = input.value.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ\s']/g, '');
  },

  // Auto-formatea el campo de teléfono salvadoreño: XXXX-XXXX (solo dígitos, máx 8)
  formatearTelefono(input){
    let v = input.value.replace(/\D/g, '').slice(0, 8);
    if(v.length > 4) v = v.slice(0,4) + '-' + v.slice(4);
    input.value = v;
  },

  // Auto-formatea DUI salvadoreño: XXXXXXXX-X (8 dígitos + guión + 1 dígito)
  formatearDUI(input){
    let v = input.value.replace(/\D/g, '').slice(0, 9);
    if(v.length > 8) v = v.slice(0,8) + '-' + v.slice(8);
    input.value = v;
  },

  indicadorNivelPrecio(nivel){
    if(nivel==='bajo') return '$';
    if(nivel==='medio') return '$$';
    if(nivel==='alto') return '$$$';
    return '';
  },

  getDatePriceLevel(precio, listaPrecios){
    const validos = listaPrecios.filter(p=>p!==null && p!==undefined).slice().sort((a,b)=>a-b);
    if(!validos.length || precio===null || precio===undefined) return null;
    if(validos.length === 1) return 'bajo'; // un solo precio real ese mes: no hay con qué comparar
    // Clasificación por PERCENTIL (posición en el ranking de precios ordenados),
    // no por posición lineal dentro del rango min-max. Con datos reales, unos
    // pocos días caros estiran el rango y aplastan a todos los demás hacia
    // 'bajo' si se usa (precio-min)/(max-min); por percentil, cada tercio de
    // fechas (por cantidad, no por distancia de precio) recibe su color.
    const rango = validos[validos.length-1] - validos[0];
    if(rango === 0) return 'bajo'; // todos los precios reales del mes son idénticos
    const posicionRanking = validos.findIndex(p => p >= precio);
    const percentil = posicionRanking / (validos.length - 1);
    return percentil <= 0.33 ? 'bajo' : (percentil <= 0.66 ? 'medio' : 'alto');
  },

  // Determina la categoría de pasajero según su índice, en el orden:
  // adultos -> jóvenes -> niños -> bebés. Los bebés no requieren asiento (lap infant).
  categoriaPorIndice(i){
    const b = Estado.busqueda;
    if(i < b.adultos) return {type:'adult', label:'Adulto', requiresSeat:true};
    if(i < b.adultos+b.jovenes) return {type:'young', label:'Joven', requiresSeat:true};
    if(i < b.adultos+b.jovenes+b.ninos) return {type:'child', label:'Niño', requiresSeat:true};
    return {type:'infant', label:'Bebé', requiresSeat:false};
  },

  // Calcula la edad exacta considerando año, mes y día (no solo la resta de años).
  calculateAge(birthDate, referenceDate){
    if(!birthDate) return null;
    const nacimiento = new Date(birthDate+'T00:00:00');
    const referencia = referenceDate ? new Date(referenceDate+'T00:00:00') : new Date();
    if(isNaN(nacimiento.getTime()) || isNaN(referencia.getTime())) return null;
    let edad = referencia.getFullYear() - nacimiento.getFullYear();
    const mesDiff = referencia.getMonth() - nacimiento.getMonth();
    if(mesDiff < 0 || (mesDiff===0 && referencia.getDate() < nacimiento.getDate())) edad--;
    return edad;
  },

  // Valida que la fecha de nacimiento del pasajero corresponda con su categoría seleccionada.
  validatePassengerAgeCategory(passenger){
    const referencia = Estado.busqueda.fechaIda || Util.hoyISO();
    const edad = Util.calculateAge(passenger.fechaNacimiento, referencia);
    if(edad === null) return null; // sin fecha aún, se valida en otro punto
    const rangos = {
      adult: {min:15, max:200, texto:'15 años o más'},
      young: {min:12, max:14, texto:'de 12 a 14 años'},
      child: {min:2, max:11, texto:'de 2 a 11 años'},
      infant:{min:0, max:1, texto:'menor de 2 años'}
    };
    const r = rangos[passenger.type];
    if(!r) return null;
    if(edad < r.min || edad > r.max){
      return `La fecha de nacimiento no corresponde a la categoría seleccionada (${r.texto}).`;
    }
    return null;
  },

  rutaPorId(id){ return MOCK.rutas.find(r=>r.id===id); },
  tipoAeronavePorAeronaveId(id){
    const a = MOCK.aeronaves.find(x=>x.id===id);
    return a ? MOCK.tipos_aeronave.find(t=>t.id===a.tipo_aeronave_id) : null;
  },
  aeronavePorId(id){ return MOCK.aeronaves.find(a=>a.id===id); },

  // Mapa único de estado (clase visual + etiqueta legible). Cubre tanto el
  // enum antiguo en español (vuelos mock: PROGRAMADO/EMBARCANDO/...) como el
  // nuevo enum real en inglés de flights.status (scheduled/confirmed/...).
  ESTADO_INFO: {
    PROGRAMADO:{label:'Programado', clase:'badge-programado'},
    EMBARCANDO:{label:'Embarcando', clase:'badge-embarcando'},
    DESPEGADO:{label:'Despegado', clase:'badge-despegado'},
    ATERRIZADO:{label:'Aterrizado', clase:'badge-aterrizado'},
    CANCELADO:{label:'Cancelado', clase:'badge-cancelado'},
    RETRASADO:{label:'Retrasado', clase:'badge-retrasado'},
    DESVIADO:{label:'Desviado', clase:'badge-desviado'},
    // flights.status (nuevo esquema real)
    SCHEDULED:{label:'Programado', clase:'badge-programado'},
    CONFIRMED:{label:'Confirmado', clase:'badge-programado'},
    IN_PROGRESS:{label:'En vuelo', clase:'badge-despegado'},
    DELAYED:{label:'Retrasado', clase:'badge-retrasado'},
    COMPLETED:{label:'Aterrizado', clase:'badge-aterrizado'},
    CANCELLED:{label:'Cancelado', clase:'badge-cancelado'}
  },

  badgeClaseEstado(estado){
    const info = Util.ESTADO_INFO[String(estado).toUpperCase()];
    return info ? info.clase : 'badge-programado';
  },

  // Etiqueta legible del estado para mostrar en pantalla (traduce el enum
  // en inglés del nuevo esquema real a texto en español, sin inventar nada).
  labelEstado(estado){
    const info = Util.ESTADO_INFO[String(estado).toUpperCase()];
    return info ? info.label : estado;
  },

  escapeHtml(str){
    if(str===null || str===undefined) return '';
    return String(str).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  },

  mostrarToast(mensaje, tipo='info'){
    const cont = document.getElementById('toastContenedor');
    const el = document.createElement('div');
    el.className = `toast ${tipo}`;
    el.innerHTML = Util.escapeHtml(mensaje);
    cont.appendChild(el);
    setTimeout(()=>{ el.style.opacity='0'; el.style.transition='opacity .3s'; setTimeout(()=>el.remove(),300); }, 3800);
  },

  async conLoader(mensaje, fn){
    const overlay = document.createElement('div');
    overlay.className='loader-overlay';
    overlay.id='loaderGlobal';
    overlay.innerHTML=`<div class="spinner"></div><div>${Util.escapeHtml(mensaje||'Cargando...')}</div>`;
    document.body.appendChild(overlay);
    try{
      const res = await fn();
      return res;
    } finally {
      const o=document.getElementById('loaderGlobal');
      if(o) o.remove();
    }
  },

  // Mueve el foco al campo "siguienteId" al presionar Enter.
  // Si siguienteId es null llama a la función acción (si se pasó).
  handleEnter(e, siguienteId, accion){
    if(e.key !== 'Enter') return;
    e.preventDefault();
    if(siguienteId){
      const el = document.getElementById(siguienteId);
      if(el){ el.focus(); el.select && el.select(); }
    } else if(typeof accion === 'function'){
      accion();
    }
  }
};

const Validar = {
  requerido(v){ return v!==null && v!==undefined && String(v).trim()!==''; },

  busquedaVuelos(b){
    const errores=[];
    if(!b.origen) errores.push('Debes seleccionar un aeropuerto de origen.');
    if(!b.destino) errores.push('Debes seleccionar un aeropuerto de destino.');
    if(b.origen && b.destino && b.origen.id===b.destino.id) errores.push('El origen y el destino no pueden ser iguales.');
    if(!b.fechaIda) errores.push('Debes seleccionar la fecha de salida.');
    if(b.fechaIda && !Util.isValidDepartureDate(b.fechaIda)) errores.push('La fecha de salida no puede ser anterior a hoy.');
    if(b.tipoViaje==='IDA_VUELTA'){
      if(!b.fechaRegreso) errores.push('Debes seleccionar la fecha de regreso.');
      if(b.fechaRegreso && b.fechaIda && !Util.isValidReturnDate(b.fechaRegreso, b.fechaIda)) errores.push('La fecha de regreso no puede ser anterior a la de salida.');
    }
    if(b.adultos < 1) errores.push('Debe existir al menos un pasajero adulto.');
    if(b.bebes > b.adultos) errores.push('Solo puede viajar 1 bebé por adulto.');
    return errores;
  },

  // Formato final exigido según el tipo de documento:
  // - DUI: EXACTAMENTE 8 dígitos + guion + 1 dígito (9 dígitos en total),
  //   el mismo formato oficial que ya usa el mapeo document_type=13.
  // - PASAPORTE / CARNET_MENOR: estrictamente letras y números (sin puntos,
  //   guiones, espacios ni símbolos), de 5 a 20 caracteres.
  documentoValido(v, tipoDocumento){
    if(tipoDocumento === 'DUI'){
      return /^\d{8}-\d$/.test(v||'');
    }
    return /^[A-Za-z0-9]{5,20}$/.test(v||'');
  },
  correoValido(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v||''); },
  soloTexto(v){ return /^[A-Za-zÁÉÍÓÚÑáéíóúñ\s']{2,60}$/.test(v||''); },

  contacto(c){
    const err={};
    if(!Validar.soloTexto(c.nombre)) err.nombre='Ingresa un nombre de contacto válido.';
    if(!Validar.requerido(c.email)) err.email='El correo electrónico es obligatorio.';
    else if(!Validar.correoValido(c.email)) err.email='Ingresa un correo electrónico con formato válido.';
    if(!Validar.requerido(c.emailConfirmacion)) err.emailConfirmacion='Confirma tu correo electrónico.';
    else if(c.email !== c.emailConfirmacion) err.emailConfirmacion='Los correos electrónicos no coinciden.';
    if(!Validar.requerido(c.telefono)) err.telefono='Ingresa un número de teléfono.';
    else if(!/^\d{4}-\d{4}$/.test(c.telefono)) err.telefono='Ingresa un número de teléfono válido de 8 dígitos.';
    return err;
  },

  pasajero(p){
    const err={};
    if(!Validar.soloTexto(p.nombres)) err.nombres='Ingresa nombres válidos.';
    if(!Validar.soloTexto(p.apellidos)) err.apellidos='Ingresa apellidos válidos.';
    if(!Validar.requerido(p.tipoDocumento)) err.tipoDocumento='Selecciona un tipo de documento.';
    if(!Validar.documentoValido(p.numeroDocumento, p.tipoDocumento)){
      err.numeroDocumento = p.tipoDocumento==='DUI' ? 'El DUI debe tener el formato 12345678-9.' : 'Documento inválido (5-20 caracteres, solo letras y números).';
    }
    if(!Validar.requerido(p.nacionalidad)) err.nacionalidad='Ingresa la nacionalidad.';
    if(!Validar.requerido(p.fechaNacimiento)) err.fechaNacimiento='Selecciona la fecha de nacimiento.';
    if(!Validar.requerido(p.genero)) err.genero='Selecciona el género.';
    return err;
  }
};

/* =====================================================================
   5. CAPA DE API — funciones centralizadas
   Mientras API_CONFIG.USE_MOCKS = true, se resuelven con datos mock
   simulando latencia de red. Al conectar el backend real, basta con
   reemplazar el cuerpo (fetch a `${API_CONFIG.API_BASE_URL}/...`)
   dejando la misma firma de funciones.
===================================================================== */
function simularRed(data, ms=350){
  return new Promise(resolve=>setTimeout(()=>resolve(JSON.parse(JSON.stringify(data))), ms));
}

async function apiFetch(endpoint, opciones={}){
  // Punto único de integración real con la API REST (Render).
  const resp = await fetch(`${API_CONFIG.API_BASE_URL}${endpoint}`, {
    headers:{'Content-Type':'application/json', ...(opciones.headers||{})},
    ...opciones
  });
  if(!resp.ok) throw new Error(`Error API (${resp.status})`);
  return resp.json();
}

const Api = {
  // -----------------------------------------------------------------------
  // ETAPA DE CONEXIÓN REAL CON AIVEN (vía PHP + MySQLi).
  // Esta función es la ÚNICA que, por ahora, ignora USE_MOCKS e intenta
  // primero el endpoint real. El resto de funciones de Api sigue usando
  // el flag USE_MOCKS normalmente (ver más abajo).
  // Backend real (Fase 1 de separación): GET {API_CONFIG.ENDPOINT_AEROPUERTOS}
  // -----------------------------------------------------------------------
  async obtenerAeropuertos(){
    try{
      const response = await fetch(API_CONFIG.ENDPOINT_AEROPUERTOS);
      const json = await response.json();
      if(!json.ok){
        throw new Error(json.error || 'No se pudieron cargar los aeropuertos.');
      }
      // Adaptar la respuesta real de la API al mismo "shape" que el resto
      // del frontend ya espera (mismos nombres de campo que usa MOCK.aeropuertos).
      return json.data.map(a=>({
        id: a.id,
        codigo_iata: a.codigo_iata,
        codigo_icao: a.codigo_icao,
        nombre: a.nombre,
        ciudad: a.ciudad,
        pais: a.codigo_pais,
        zona_horaria: a.zona_horaria,
        activo: a.activo
      }));
    } catch(e){
      // El endpoint real no respondió correctamente: avisar de forma amigable
      // y permitir que el resto de la página siga funcionando con los mocks.
      // console.error queda para poder diagnosticar en producción (Render)
      // abriendo las herramientas de desarrollador del navegador.
      console.error('obtenerAeropuertos() falló al consultar', API_CONFIG.ENDPOINT_AEROPUERTOS, e);
      Util.mostrarToast('No se pudieron cargar los aeropuertos desde el servidor. Mostrando datos de referencia.', 'error');
      return MOCK.aeropuertos;
    }
  },

  async obtenerMetricasInicio(){
    const response = await fetch(API_CONFIG.ENDPOINT_METRICAS_INICIO);
    const json = await response.json();
    if(!json.ok) throw new Error(json.error || 'No se pudieron cargar las métricas.');
    return json.data;
  },

  // -----------------------------------------------------------------------
  // ETAPA DE CONEXIÓN REAL — búsqueda de vuelos.
  // Al igual que obtenerAeropuertos(), esta función ignora USE_MOCKS e
  // intenta primero el endpoint real dedicado (Fase 1 de separación):
  // php/buscar_vuelos.php, que consulta flights -> routes -> airports
  // (con aircraft/aircraft_types opcionales) en MySQL/Aiven.
  // Ya NO se usan MOCK.rutas ni MOCK.vuelos para la búsqueda.
  // -----------------------------------------------------------------------
  async buscarVuelos(params){
    // params: {origenId, destinoId, fecha} — fecha en formato YYYY-MM-DD
    try{
      const url = `${API_CONFIG.ENDPOINT_BUSCAR_VUELOS}?origen=${params.origenId}&destino=${params.destinoId}&fecha=${params.fecha}`;
      const response = await fetch(url);
      const json = await response.json();
      if(!json.ok){
        throw new Error(json.error || 'No se pudieron cargar los vuelos.');
      }
      return json.data; // ya viene con el formato que espera el frontend (ver Vistas.tarjetaVuelo)
    } catch(e){
      console.error('buscarVuelos() falló al consultar', API_CONFIG.ENDPOINT_BUSCAR_VUELOS, e);
      Util.mostrarToast('No se pudo consultar la disponibilidad de vuelos en el servidor.', 'error');
      return []; // sin vuelos inventados: la pantalla debe mostrar "no hay vuelos disponibles"
    }
  },

  async obtenerVuelo(id){
    if(API_CONFIG.USE_MOCKS) return simularRed(MOCK.vuelos.find(v=>v.id===id), 150);
    return apiFetch(`/vuelos/${id}`);
  },

  async crearReserva(payload){
    // Conectado al backend REAL (php/crear_reserva.php), independiente de
    // USE_MOCKS (misma técnica ya usada en sendBookingEmail/obtenerAsientos).
    // Persiste de verdad en reservations/passengers/flight_segments.
    const resp = await fetch(API_CONFIG.ENDPOINT_CREAR_RESERVA_REAL, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    const data = await resp.json().catch(()=>null);
    if(!data || !data.ok){
      const mensaje = (data && data.error) ? data.error : 'No se pudo completar la reserva. Intenta nuevamente.';
      throw new Error(mensaje);
    }
    return {
      pnr: data.data.pnr,
      ...payload,
      estado: 'CONFIRMADA',
      creado_en: Util.hoyISO()
    };
  },

  async obtenerReserva(pnr, documentoOCorreo){
    // Conectado al backend REAL (php/consultar_reserva.php), independiente
    // de USE_MOCKS (misma técnica que sendBookingEmail/crearReserva).
    try{
      const url = `${API_CONFIG.ENDPOINT_CONSULTAR_RESERVA_REAL}?pnr=${encodeURIComponent(pnr)}&ref=${encodeURIComponent(documentoOCorreo)}`;
      const resp = await fetch(url);
      const data = await resp.json().catch(()=>null);
      if(!data || !data.ok) return null;
      return data.data; // null si no existe o el segundo dato no coincide
    } catch(e){
      console.error('obtenerReserva() falló al consultar el backend real', e);
      return null;
    }
  },

  async obtenerMisReservas(customerId, email){
    // Conectado al backend REAL (php/mis_reservas.php), independiente de
    // USE_MOCKS. Lista reservas por customer_id o por correo electrónico.
    try{
      let url = `${API_CONFIG.ENDPOINT_MIS_RESERVAS_REAL}?`;
      const params = [];
      if(customerId) params.push(`customer_id=${encodeURIComponent(customerId)}`);
      if(email) params.push(`email=${encodeURIComponent(email)}`);
      url += params.join('&');
      const resp = await fetch(url);
      const data = await resp.json().catch(()=>null);
      if(!data || !data.ok || !Array.isArray(data.data)) return [];
      return data.data;
    } catch(e){
      console.error('obtenerMisReservas() falló al consultar el backend real', e);
      return [];
    }
  },

  async crearPasajeros(reservaId, pasajeros){
    if(API_CONFIG.USE_MOCKS) return simularRed({ok:true, pasajeros}, 300);
    return apiFetch(`/reservas/${reservaId}/pasajeros`, {method:'POST', body:JSON.stringify(pasajeros)});
  },

  async obtenerAsientos(vueloId){
    // Conectado al backend REAL (php/asientos_ocupados.php), independiente
    // de USE_MOCKS, igual que sendBookingEmail(). Fuente de verdad: BD.
    // IMPORTANTE: nunca devuelve [] ante un fallo — un [] real (vuelo sin
    // ningún asiento ocupado) sería indistinguible de "no se pudo consultar",
    // y eso mostraría todos los asientos como libres incorrectamente.
    // Ante cualquier fallo, lanza Error para que el caller lo sepa con certeza.
    const url = `${API_CONFIG.ENDPOINT_ASIENTOS_OCUPADOS_REAL}?vuelo_id=${encodeURIComponent(vueloId)}`;
    let resp;
    try{
      resp = await fetch(url);
    } catch(e){
      // A) ruta incorrecta / red caída — nunca llegó a haber respuesta HTTP
      console.error('obtenerAsientos(): fallo de red al llamar', url, e);
      throw new Error('No se pudo consultar la disponibilidad de asientos.');
    }
    // Se lee como texto primero (no .json() directo) para poder mostrar el
    // cuerpo crudo en consola si no es JSON válido — así se distingue un
    // JSON contaminado (warnings de PHP, HTML de error, etc.) de una
    // respuesta bien formada pero con estructura inesperada.
    const textoRespuesta = await resp.text();
    let data = null;
    try{ data = JSON.parse(textoRespuesta); } catch(e){ data = null; }

    if(data && data.ok && data.data && Array.isArray(data.data.ocupados)){
      return data.data.ocupados;
    }

    // Diagnóstico completo en consola: URL, status HTTP y cuerpo crudo,
    // para identificar exactamente cuál de las causas (B: parámetro,
    // C: error PHP, D: error SQL, E: conexión BD, F: JSON inválido) ocurrió.
    console.error('obtenerAsientos(): respuesta inválida o inesperada', {
      url,
      httpStatus: resp.status,
      cuerpoCrudo: textoRespuesta
    });
    throw new Error('No se pudo consultar la disponibilidad de asientos.');
  },

  async reservarAsientos(payload){
    if(API_CONFIG.USE_MOCKS) return simularRed({ok:true}, 250);
    return apiFetch('/asientos-reservados', {method:'POST', body:JSON.stringify(payload)});
  },

  async crearPago(payload){
    if(API_CONFIG.USE_MOCKS){
      return simularRed({ok:true, estado:'APROBADO', comprobante:'CMP-'+Date.now()}, 900);
    }
    return apiFetch('/pagos', {method:'POST', body:JSON.stringify(payload)});
  },

  async iniciarSesion(correo, password){
    // Conectado al backend REAL (php/auth_login.php), independiente de
    // USE_MOCKS (misma técnica ya usada en sendBookingEmail/crearReserva).
    try{
      const resp = await fetch(API_CONFIG.ENDPOINT_LOGIN_REAL, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({correo, password})
      });
      const data = await resp.json().catch(()=>null);
      if(!data){
        return {ok:false, mensaje:'No se pudo iniciar sesión. Intenta nuevamente.'};
      }
      return data; // ya viene con la forma {ok, cliente} o {ok:false, mensaje}
    } catch(e){
      return {ok:false, mensaje:'No se pudo iniciar sesión. Intenta nuevamente.'};
    }
  },

  async registrarCliente(datos){
    // Conectado al backend REAL (php/auth_registro.php), independiente de
    // USE_MOCKS. Nunca se guarda ni se transmite la contraseña en texto
    // plano fuera de esta llamada HTTPS al propio backend.
    try{
      const resp = await fetch(API_CONFIG.ENDPOINT_REGISTRO_REAL, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(datos)
      });
      const data = await resp.json().catch(()=>null);
      if(!data){
        return {ok:false, mensaje:'No se pudo crear la cuenta. Intenta nuevamente.'};
      }
      return data;
    } catch(e){
      return {ok:false, mensaje:'No se pudo crear la cuenta. Intenta nuevamente.'};
    }
  },

  async consultarEstadoVuelo(numeroVuelo, fecha){
    // Conectado al backend REAL (php/estado_vuelo.php), independiente de
    // USE_MOCKS (misma técnica que sendBookingEmail/crearReserva).
    try{
      const url = `${API_CONFIG.ENDPOINT_ESTADO_VUELO_REAL}?numero_vuelo=${encodeURIComponent(numeroVuelo)}&fecha=${encodeURIComponent(fecha||'')}`;
      const resp = await fetch(url);
      const data = await resp.json().catch(()=>null);
      if(!data || !data.ok) return null;
      return data.data; // null si no existe ese vuelo/fecha
    } catch(e){
      console.error('consultarEstadoVuelo() falló al consultar el backend real', e);
      return null;
    }
  },

  async obtenerVuelosEnVivo(){
    // Conectado al backend REAL (php/vuelos_en_vuelo.php), independiente de
    // USE_MOCKS (misma técnica que consultarEstadoVuelo).
    try{
      const resp = await fetch(API_CONFIG.ENDPOINT_VUELOS_EN_VIVO_REAL);
      const data = await resp.json().catch(()=>null);
      if(!data || !data.ok || !Array.isArray(data.data)) return null;
      return {ahoraTs: data.ahora_ts, vuelos: data.data};
    } catch(e){
      console.error('obtenerVuelosEnVivo() falló al consultar el backend real', e);
      return null;
    }
  },

  async buscarPaises(q){
    // Conectado al backend REAL (php/paises.php), tabla countries.
    try{
      const url = `${API_CONFIG.ENDPOINT_PAISES_REAL}?q=${encodeURIComponent(q||'')}`;
      const resp = await fetch(url);
      const data = await resp.json().catch(()=>null);
      if(!data || !data.ok || !Array.isArray(data.data)) return [];
      return data.data; // [{code,name}, ...]
    } catch(e){
      console.error('buscarPaises() falló al consultar el backend real', e);
      return [];
    }
  },

  // -----------------------------------------------------------------------
  // Calendario de precios — ETAPA DE CONEXIÓN REAL.
  // El backend NO expone un endpoint de "precios por mes", así que esta
  // función construye el indicador $/$$/$$$ consultando el endpoint REAL
  // que ya existe (buscar_vuelos) para cada día del mes, en paralelo, y
  // usando SIEMPRE Util.obtenerPrecioTarifa(vuelo,'ECONOMICA') para leer el
  // precio de cada vuelo devuelto. Nunca se inventa, randomiza ni deriva un
  // precio de precio_base/MOCK.tarifas. Si un día no tiene vuelos, queda
  // marcado como no disponible. El resultado se cachea en memoria (no vuelve
  // a pedirse el mismo mes/ruta dos veces) para no golpear la API en cada
  // render del calendario/carrusel.
  // -----------------------------------------------------------------------
  _cachePreciosMes: {},

  async getFlightPricesByDate(origenId, destinoId, anioMes){
    const clave = `${origenId}_${destinoId}_${anioMes}`;
    if(this._cachePreciosMes[clave]) return this._cachePreciosMes[clave];

    const [anio, mes] = anioMes.split('-').map(Number);
    const diasEnMes = new Date(anio, mes, 0).getDate();
    const fechas = Array.from({length:diasEnMes}, (_,i)=>
      `${anio}-${String(mes).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`);

    const dias = await Promise.all(fechas.map(async fecha=>{
      let vuelosDelDia = [];
      try{
        const url = `${API_CONFIG.ENDPOINT_BUSCAR_VUELOS}?origen=${origenId}&destino=${destinoId}&fecha=${fecha}`;
        const response = await fetch(url);
        const json = await response.json();
        if(json.ok) vuelosDelDia = json.data;
      } catch(e){ /* día sin datos disponibles: se marca como no disponible más abajo */ }

      const preciosEconomicos = vuelosDelDia
        .filter(v=>Util.isFlightBookable(v))
        .map(v=>Util.obtenerPrecioTarifa(v,'ECONOMICA'))
        .filter(p=>p!=null);
      const precio = preciosEconomicos.length ? Math.min(...preciosEconomicos) : null;
      return {fecha, precio, disponible: precio!=null};
    }));

    // Nivel bajo/medio/alto calculado por terciles sobre los precios ECONOMICOS
    // reales disponibles ese mes para esa ruta (nunca aleatorio, nunca inventado).
    const preciosValidos = dias.filter(d=>d.disponible).map(d=>d.precio);
    dias.forEach(d=>{ d.nivel = d.disponible ? Util.getDatePriceLevel(d.precio, preciosValidos) : null; });

    // Solo cachear si hay al menos un día disponible.
    // Si no hay vuelos este mes, NO se cachea para que vuelos nuevos
    // que se agreguen a la BD aparezcan sin necesidad de recargar la página.
    if(preciosValidos.length > 0){
      this._cachePreciosMes[clave] = dias;
    }
    return dias;
  },

  // -----------------------------------------------------------------------
  // ENVÍO DE COMPROBANTE POR CORREO
  // Conectado al backend LOCAL real: php/enviar_comprobante.php (XAMPP/Render).
  // Deliberadamente NO depende de API_CONFIG.USE_MOCKS: el resto de Api
  // (crearReserva, obtenerReserva, login, etc.) sigue en modo mock hasta
  // una etapa posterior; solo el envío de correo ya está conectado.
  // El frontend NUNCA conoce ni envía la contraseña de aplicación de Gmail;
  // solo hace fetch() al endpoint PHP con los datos no sensibles de la reserva.
  // Endpoint real: POST php/enviar_comprobante.php
  // Body enviado: { pnr, email, nombreCliente, total, estado, segmentos, pasajeros, pago }
  // Respuesta esperada del backend: { success: boolean, message: string }
  // -----------------------------------------------------------------------
  async sendBookingEmail(reserva){
    const payload = {
      pnr: reserva.pnr,
      email: reserva.contacto ? reserva.contacto.email : null,
      nombreCliente: reserva.contacto ? reserva.contacto.nombre : null,
      total: reserva.total,
      estado: reserva.estado,
      segmentos: reserva.segmentos,
      pasajeros: reserva.pasajeros,
      servicios: reserva.servicios || [],
      // Solo el método y estado del pago; jamás número de tarjeta ni CVV.
      pago: reserva.pago ? {metodo: reserva.pago.metodo, estado: reserva.pago.estado} : null
    };

    try{
      const controller = new AbortController();
      const timeoutId = setTimeout(()=>controller.abort(), 30000);
      const resp = await fetch(API_CONFIG.ENDPOINT_COMPROBANTE_EMAIL_REAL, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const data = await resp.json().catch(()=>null);
      return {
        ok: !!(data && data.success),
        demo: false,
        mensaje: (data && data.message) || (data && data.success ? 'Comprobante enviado correctamente.' : 'No pudimos enviar el comprobante. Intenta nuevamente.')
      };
    } catch(e){
      // No exponer detalles técnicos ni de SMTP al usuario.
      return {ok:false, demo:false, mensaje:'No pudimos enviar el comprobante. Intenta nuevamente.'};
    }
  }
};

/* =====================================================================
   6. NAVEGACIÓN (router SPA)
===================================================================== */
const Navegacion = {
  historial: ['inicio'],

  ir(ruta, opciones={}){
    Estado.ruta = ruta;
    if(!opciones.silencioso) this.historial.push(ruta);
    document.querySelectorAll('.nav-links button[data-ruta]').forEach(b=>{
      b.classList.toggle('activo', b.dataset.ruta===ruta);
    });
    document.getElementById('navLinks').classList.remove('abierto');
    Render.pantalla(ruta);
    if(typeof Persistencia !== 'undefined') Persistencia.guardar();
    window.scrollTo({top:0, behavior:'smooth'});
  },

  atras(){
    this.historial.pop();
    const anterior = this.historial[this.historial.length-1] || 'inicio';
    this.ir(anterior, {silencioso:true});
  }
};

document.getElementById('btnHamburguesa').addEventListener('click', ()=>{
  document.getElementById('navLinks').classList.toggle('abierto');
});

// Navegación con ENTER en el formulario de pasajeros y de contacto: pasa al
// siguiente campo lógico en vez de intentar enviar el formulario o cerrar
// nada. Delegado (no se agrega a cada input individualmente) y limitado a
// estos campos específicos para no alterar el comportamiento de ENTER en
// otras partes de la app (buscador, autocompletar de aeropuertos, etc.).
// No interfiere con TAB, que sigue funcionando de forma nativa del navegador.
document.addEventListener('keydown', function(e){
  if(e.key !== 'Enter') return;
  const el = e.target;
  const esCampoPasajero = el.matches && el.matches('input[data-p], select[data-p]');
  const esCampoContacto = el.matches && el.matches('#contactoNombre, #contactoEmail, #contactoEmailConfirmacion, #contactoTelefono');
  if(!esCampoPasajero && !esCampoContacto) return;
  e.preventDefault();
  const enfocables = Array.from(document.querySelectorAll('input, select, textarea'))
    .filter(f => !f.disabled && f.offsetParent !== null);
  const idx = enfocables.indexOf(el);
  if(idx > -1 && idx < enfocables.length - 1){
    const siguiente = enfocables[idx+1];
    siguiente.focus();
    if(siguiente.select) siguiente.select();
  }
});

/* =====================================================================
   7. RENDER PRINCIPAL
===================================================================== */
const Render = {
  pantalla(ruta){
    const app = document.getElementById('app');
    const vistas = {
      inicio: Vistas.inicio,
      vuelos: Vistas.resultadosVuelos,
      tarifas: Vistas.tarifas,
      resumen: Vistas.resumen,
      pasajeros: Vistas.pasajeros,
      asientos: Vistas.asientos,
      servicios: Vistas.servicios,
      pago: Vistas.pago,
      confirmacion: Vistas.confirmacion,
      consultarReserva: Vistas.consultarReserva,
      login: Vistas.login,
      registro: Vistas.registro,
      perfil: Vistas.perfil,
      estadoVuelo: Vistas.estadoVuelo,
      vuelosEnVivo: Vistas.vuelosEnVivo
    };
    app.innerHTML = (vistas[ruta] || Vistas.inicio)();
    if(PostRender[ruta]) PostRender[ruta]();
  }
};

/* =====================================================================
   8. VISTAS (HTML de cada pantalla)
===================================================================== */
const Vistas = {

  breadcrumb(pasos){
    return `<div class="breadcrumbs">${pasos.map((p,i)=>`<span class="${i===pasos.length-1?'activo':''}">${p}</span>${i<pasos.length-1?'<span>›</span>':''}`).join('')}</div>`;
  },

  progreso(activoIdx){
    const pasos = ['Vuelo','Tarifa','Resumen','Pasajeros','Asientos','Servicios','Pago','Confirmación'];
    return `<div class="progreso">${pasos.map((p,i)=>`
      <div class="progreso-paso ${i===activoIdx?'activo':i<activoIdx?'completado':''}">
        <div class="progreso-circulo">${i<activoIdx?'✓':i+1}</div>
        <span class="label">${p}</span>
      </div>
      ${i<pasos.length-1?'<div class="progreso-linea"></div>':''}
    `).join('')}</div>`;
  },

  /* ---------- INICIO ---------- */
  inicio(){
    const b = Estado.busqueda;
    return `
    <section class="hero">
      <div class="hero-contenido">
        <h1>Vuela con Acajutla Airlines</h1>
        <p>Conectamos El Salvador con el mundo. Encuentra las mejores tarifas y vive una experiencia de viaje profesional.</p>
        <div class="buscador" id="buscadorBox">
          <div class="tipo-viaje">
            <label class="radio-item"><input type="radio" name="tipoViaje" value="IDA_VUELTA" ${b.tipoViaje==='IDA_VUELTA'?'checked':''} onchange="Buscador.setTipoViaje('IDA_VUELTA')"> Ida y vuelta</label>
            <label class="radio-item"><input type="radio" name="tipoViaje" value="SOLO_IDA" ${b.tipoViaje==='SOLO_IDA'?'checked':''} onchange="Buscador.setTipoViaje('SOLO_IDA')"> Solo ida</label>
          </div>
          <div class="buscador-grid" id="buscadorGrid">
            <div class="campo">
              <label>Origen</label>
              <input type="text" id="inputOrigen" placeholder="Ciudad o aeropuerto" autocomplete="off"
                value="${b.origen ? Util.escapeHtml(b.origen.ciudad+' ('+b.origen.codigo_iata+')') : ''}"
                oninput="Buscador.autocompletar('origen', this.value)" onfocus="this.select(); Buscador.autocompletar('origen', '')">
              <div class="autocomplete-lista oculto" id="listaOrigen"></div>
            </div>
            <button class="btn-swap" type="button" onclick="Buscador.intercambiar()" aria-label="Intercambiar origen y destino">⇄</button>
            <div class="campo">
              <label>Destino</label>
              <input type="text" id="inputDestino" placeholder="Ciudad o aeropuerto" autocomplete="off"
                value="${b.destino ? Util.escapeHtml(b.destino.ciudad+' ('+b.destino.codigo_iata+')') : ''}"
                oninput="Buscador.autocompletar('destino', this.value)" onfocus="this.select(); Buscador.autocompletar('destino', '')">
              <div class="autocomplete-lista oculto" id="listaDestino"></div>
            </div>
            <div class="campo" style="position:relative">
              <label>Salida</label>
              <button type="button" class="campo-fecha-btn" id="btnFechaIda" onclick="CalendarioPrecios.abrir('ida')">
                ${b.fechaIda ? Util.formatoFechaLarga(b.fechaIda) : '<span class="placeholder">Selecciona fecha</span>'}
              </button>
              <div class="calendario-panel oculto" id="panelCalendarioIda"></div>
            </div>
            <div class="campo" id="campoRegreso" style="position:relative;${b.tipoViaje==='SOLO_IDA'?'opacity:.4;pointer-events:none':''}">
              <label>Regreso</label>
              <button type="button" class="campo-fecha-btn" id="btnFechaRegreso" onclick="CalendarioPrecios.abrir('regreso')">
                ${b.fechaRegreso ? Util.formatoFechaLarga(b.fechaRegreso) : '<span class="placeholder">Selecciona fecha</span>'}
              </button>
              <div class="calendario-panel oculto" id="panelCalendarioRegreso"></div>
            </div>
            <div class="campo pasajeros-selector">
              <label>Pasajeros</label>
              <div class="pasajeros-box" onclick="Buscador.togglePanelPasajeros()">
                <span id="resumenPasajeros">${Buscador.textoResumenPasajeros()}</span> <span>▾</span>
              </div>
              <div class="pasajeros-panel oculto" id="panelPasajeros">
                <div class="pasajeros-panel-header">
                  <b>¿Quiénes vuelan?</b>
                  <button type="button" class="pasajeros-cerrar" onclick="Buscador.cerrarPanelPasajeros()" aria-label="Cerrar">✕</button>
                </div>
                <div class="pasajeros-panel-body">
                  ${Vistas.filaPasajeros('Adultos','Desde 15 años','adultos', b.adultos, 1)}
                  ${Vistas.filaPasajeros('Jóvenes','De 12 a 14 años','jovenes', b.jovenes, 0)}
                  ${Vistas.filaPasajeros('Niños','De 2 a 11 años','ninos', b.ninos, 0)}
                  ${Vistas.filaPasajeros('Bebés','Menores de 2 años (1 por adulto)','bebes', b.bebes, 0)}
                  <p id="avisoPasajeros" style="font-size:.72rem;color:#889;margin-top:6px;min-height:14px"></p>
                </div>
                <button class="btn btn-primario btn-block btn-sm pasajeros-panel-footer" onclick="Buscador.cerrarPanelPasajeros()">Confirmar</button>
              </div>
            </div>
          </div>
          <div id="alertaBuscador"></div>
          <div class="buscador-footer">
            <button class="btn btn-amarillo" onclick="Buscador.buscar()">🔍 Buscar vuelos</button>
          </div>
        </div>
        <div class="hero-stats">
          <div><b>${Estado.metricasInicio ? Estado.metricasInicio.destinos : '—'}</b><span>Destinos</span></div>
          <div><b>${Estado.metricasInicio ? Estado.metricasInicio.vuelos_diarios : '—'}</b><span>Vuelos diarios</span></div>
          <div><b>${Estado.metricasInicio ? Estado.metricasInicio.tipos_aeronave : '—'}</b><span>Tipos de aeronave</span></div>
        </div>
      </div>
    </section>

    <section class="destacados contenedor">
      <h2 class="seccion-titulo">Destinos populares desde San Salvador</h2>
      <p class="seccion-sub">Explora los destinos más buscados por nuestros pasajeros</p>
      <div class="grid-destinos">
        ${Estado.aeropuertosDisponibles.filter(a=>a.codigo_iata!=='SAL').map(a=>{
          const ruta = MOCK.rutas.find(r=>r.origen_id===1 && r.destino_id===a.id);
          const vuelo = ruta ? MOCK.vuelos.find(v=>v.ruta_id===ruta.id) : null;
          const foto = Util.fotoDestino(a.codigo_iata);
          return `
          <div class="card-destino" onclick="Vistas.irDestinoRapido(${a.id})">
            <div class="card-destino-img ${foto ? '' : 'sin-foto'}">
              ${foto ? `<img src="${foto}" alt="${Util.escapeHtml(a.ciudad)}" loading="lazy" onerror="this.onerror=null; this.closest('.card-destino-img').classList.add('sin-foto');">` : ''}
              <span class="card-destino-icono-fallback">✈</span>
              <span class="card-destino-badge">${a.codigo_iata}</span>
            </div>
            <div class="card-destino-info">
              <h4>${Util.escapeHtml(a.ciudad)}</h4>
              <span>${Util.escapeHtml(a.pais)} · ${a.codigo_iata}</span>
              <span class="precio-desde">${vuelo ? 'Desde '+Util.formatoMoneda(vuelo.precio_base) : 'Consultar'}</span>
            </div>
          </div>`;
        }).join('')}
      </div>
    </section>`;
  },

  irDestinoRapido(id){
    Estado.busqueda.origen = Estado.aeropuertosDisponibles.find(a=>a.codigo_iata==='SAL') || Estado.aeropuertosDisponibles[0];
    Estado.busqueda.destino = Estado.aeropuertosDisponibles.find(a=>a.id===id);
    Estado.busqueda.fechaIda = Util.hoyISO();
    Navegacion.ir('inicio');
  },

  filaPasajeros(titulo, sub, key, valor, min){
    const b = Estado.busqueda;
    const bloquearMas = key==='bebes' && b.bebes >= b.adultos;
    return `
    <div class="pasajeros-fila">
      <div><b style="font-size:.88rem">${titulo}</b><small>${sub}</small></div>
      <div class="contador">
        <button type="button" ${valor<=min?'disabled':''} onclick="Buscador.cambiarPasajero('${key}', -1)">−</button>
        <span style="min-width:16px;text-align:center">${valor}</span>
        <button type="button" ${bloquearMas?'disabled':''} onclick="Buscador.cambiarPasajero('${key}', 1)">+</button>
      </div>
    </div>`;
  },

  /* ---------- RESULTADOS DE VUELOS / TARIFAS ---------- */
  // Estos métodos se definen en vuelos.php, insertado mediante un include de PHP
  // justo después de este objeto Vistas (ver más abajo en este archivo).

  /* ---------- RESUMEN ---------- */
  resumen(){
    Precios.calcular();
    const p = Estado.precios;
    const bloqueVuelo = (vuelo, tarifa, titulo)=>{
      if(!vuelo) return '';
      const esReal = !!vuelo.origen && !!vuelo.destino;
      const ruta = esReal ? null : Util.rutaPorId(vuelo.ruta_id);
      const origen = esReal ? vuelo.origen : Util.aeropuertoPorId(ruta.origen_id);
      const destino = esReal ? vuelo.destino : Util.aeropuertoPorId(ruta.destino_id);
      const matricula = esReal
        ? (vuelo.aeronave && vuelo.aeronave.matricula ? ' · '+vuelo.aeronave.matricula : '')
        : (Util.aeronavePorId(vuelo.aeronave_id) ? ' · '+Util.aeronavePorId(vuelo.aeronave_id).matricula : '');
      return `<div class="resumen-item">
        <h4>${titulo} · Vuelo ${vuelo.numero_vuelo}</h4>
        <p>${origen.ciudad} (${origen.codigo_iata}) → ${destino.ciudad} (${destino.codigo_iata})</p>
        <p>${Util.horaCorta(vuelo.salida_programada)} - ${Util.horaCorta(vuelo.llegada_programada)}${matricula} · Tarifa ${MOCK.tarifas[tarifa].nombre}</p>
      </div>`;
    };
    return `
    <div class="pantalla contenedor" style="padding-top:24px">
      ${Vistas.breadcrumb(['Inicio','Vuelos','Tarifa','Resumen'])}
      ${Vistas.progreso(2)}
      <div class="seccion-titulo">Resumen de tu viaje</div>
      <p class="seccion-sub">Revisa los detalles antes de continuar con los datos de los pasajeros</p>
      <div class="resumen-flex">
        <div class="card">
          ${bloqueVuelo(Estado.vueloIda, Estado.tarifaIda, 'Vuelo de ida')}
          ${bloqueVuelo(Estado.vueloRegreso, Estado.tarifaRegreso, 'Vuelo de regreso')}
          <div class="resumen-item">
            <h4>Pasajeros</h4>
            <p>${Estado.busqueda.adultos} adulto(s), ${Estado.busqueda.jovenes} joven(es), ${Estado.busqueda.ninos} niño(s), ${Estado.busqueda.bebes} bebé(s)</p>
            <p>${totalPasajeros()} pasajero(s) en total · ${totalPasajerosConAsiento()} asiento(s) necesario(s) ${Estado.busqueda.bebes>0?'(los bebés viajan en brazos y no ocupan asiento)':''}</p>
          </div>
        </div>
        <div class="card total-box">
          <h4 style="margin-bottom:10px;color:var(--azul-oscuro)">Total estimado</h4>
          <div class="total-fila"><span>Vuelos</span><span>${Util.formatoMoneda(p.vuelos)}</span></div>
          <div class="total-fila total-final"><span>Total</span><span>${Util.formatoMoneda(p.vuelos)}</span></div>
          <button class="btn btn-primario btn-block" style="margin-top:16px" onclick="Reserva.irAPasajeros()">Continuar</button>
          <button class="btn-texto btn-block" style="margin-top:8px;text-align:center" onclick="Navegacion.atras()">← Modificar selección</button>
        </div>
      </div>
    </div>`;
  },

  /* ---------- PASAJEROS ---------- */
  pasajeros(){
    const n = totalPasajeros();
    let html = '';
    for(let i=0;i<n;i++){
      const cat = Util.categoriaPorIndice(i);
      const p = Estado.pasajeros[i] || {};
      const fn = p.fechaNacimiento ? p.fechaNacimiento.split('-') : ['','',''];
      const [fnAnio, fnMes, fnDia] = fn;
      html += `
      <div class="pasajero-bloque">
        <h3>Pasajero ${i+1} · ${cat.label} ${cat.requiresSeat ? '' : '· No requiere asiento (viaja en brazos)'}</h3>
        <div class="pasajero-form">
          <div class="form-grid">
            <div class="campo-form"><label>Nombres *</label><input type="text" data-p="${i}" data-f="nombres" value="${Util.escapeHtml(p.nombres||'')}" oninput="Util.filtrarSoloTexto(this)"></div>
            <div class="campo-form"><label>Apellidos *</label><input type="text" data-p="${i}" data-f="apellidos" value="${Util.escapeHtml(p.apellidos||'')}" oninput="Util.filtrarSoloTexto(this)"></div>
            <div class="campo-form">
              <label>Tipo de documento *</label>
              <select data-p="${i}" data-f="tipoDocumento" onchange="Pasajeros.onTipoDocumentoChange(this)">
                <option value="">Seleccionar</option>
                ${cat.type==='adult' ? `<option value="DUI" ${p.tipoDocumento==='DUI'?'selected':''}>DUI</option>` : ''}
                <option value="PASAPORTE" ${p.tipoDocumento==='PASAPORTE'?'selected':''}>Pasaporte</option>
                ${cat.type!=='adult' ? `<option value="CARNET_MENOR" ${p.tipoDocumento==='CARNET_MENOR'?'selected':''}>Carnet de menor</option>` : ''}
              </select>
            </div>
            <div class="campo-form"><label>Número de documento *</label><input type="text" maxlength="20" data-p="${i}" data-f="numeroDocumento" value="${Util.escapeHtml(p.numeroDocumento||'')}" oninput="Pasajeros.formatearDocumento(this); Pasajeros.limpiarErrorDocumento(this)" onblur="Pasajeros.validarDocumentosDuplicados()" aria-describedby="msgDocumento_${i}"><small class="msg-error" id="msgDocumento_${i}"></small></div>
            <div class="campo-form" style="position:relative">
              <label>Nacionalidad *</label>
              <input type="text" id="nacionalidadInput_${i}" autocomplete="off"
                     value="${Util.escapeHtml(p.nacionalidad ? (p.nacionalidadNombre ? (p.nacionalidad+' — '+p.nacionalidadNombre) : p.nacionalidad) : '')}"
                     oninput="Pasajeros.buscarNacionalidad(${i}, this.value)"
                     onfocus="Pasajeros.buscarNacionalidad(${i}, this.value)"
                     onkeydown="Pasajeros.navegarNacionalidad(event, ${i})"
                     onblur="setTimeout(()=>Pasajeros.ocultarListaNacionalidad(${i}), 150)">
              <input type="hidden" data-p="${i}" data-f="nacionalidad" id="nacionalidadCodigo_${i}" value="${Util.escapeHtml(p.nacionalidad||'')}">
              <div id="nacionalidadLista_${i}" class="lista-autocompletar" style="display:none;position:absolute;z-index:20;top:100%;left:0;background:#fff;border:1px solid #d7dde5;border-radius:8px;max-height:210px;overflow-y:auto;width:100%;box-shadow:0 6px 16px rgba(0,0,0,.12);margin-top:2px"></div>
              <small class="msg-error" id="msgNacionalidad_${i}"></small>
            </div>
            <div class="campo-form full">
              <label>Fecha de nacimiento *</label>
              <div style="display:grid;grid-template-columns:1fr 1.4fr 1fr;gap:8px">
                <select id="fnDia_${i}" onchange="Pasajeros.actualizarFecha(${i})">
                  <option value="">Día</option>
                  ${Array.from({length:31},(_,d)=>d+1).map(d=>`<option value="${String(d).padStart(2,'0')}" ${fnDia===String(d).padStart(2,'0')?'selected':''}>${d}</option>`).join('')}
                </select>
                <select id="fnMes_${i}" onchange="Pasajeros.actualizarFecha(${i})">
                  <option value="">Mes</option>
                  ${['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((m,idx)=>`<option value="${String(idx+1).padStart(2,'0')}" ${fnMes===String(idx+1).padStart(2,'0')?'selected':''}>${m}</option>`).join('')}
                </select>
                <select id="fnAnio_${i}" onchange="Pasajeros.actualizarFecha(${i})">
                  <option value="">Año</option>
                  ${Array.from({length:new Date().getFullYear()-1925+1},(_,idx)=>new Date().getFullYear()-idx).map(a=>`<option value="${a}" ${fnAnio===String(a)?'selected':''}>${a}</option>`).join('')}
                </select>
              </div>
              <small class="msg-error" id="msgFecha_${i}"></small>
            </div>
            <div class="campo-form">
              <label>Género *</label>
              <select data-p="${i}" data-f="genero">
                <option value="">Seleccionar</option>
                <option value="F" ${p.genero==='F'?'selected':''}>Femenino</option>
                <option value="M" ${p.genero==='M'?'selected':''}>Masculino</option>
                <option value="OTRO" ${p.genero==='OTRO'?'selected':''}>Otro</option>
              </select>
            </div>
            <div class="campo-form full"><label>Solicitudes especiales</label><textarea rows="2" data-p="${i}" data-f="solicitudesEspeciales">${Util.escapeHtml(p.solicitudesEspeciales||'')}</textarea></div>
          </div>
        </div>
      </div>`;
    }
    const c = Estado.contacto;
    return `
    <div class="pantalla contenedor" style="padding-top:24px">
      ${Vistas.breadcrumb(['Inicio','Vuelos','Resumen','Pasajeros'])}
      ${Vistas.progreso(3)}
      <div class="seccion-titulo">Datos de los pasajeros</div>
      <p class="seccion-sub">Completa la información tal como aparece en el documento de identidad · ${totalPasajeros()} pasajero(s) · ${totalPasajerosConAsiento()} asiento(s)</p>
      <div id="alertaPasajeros"></div>
      <div id="formPasajeros">${html}</div>

      <div class="contacto-bloque">
        <h3>Datos de contacto</h3>
        <div class="contacto-form">
          <p style="font-size:.8rem;color:#889;margin-bottom:14px">Usaremos estos datos para enviarte el comprobante de tu reserva.</p>
          <div id="alertaContacto"></div>
          <div class="form-grid">
            <div class="campo-form full"><label>Nombre completo *</label><input type="text" id="contactoNombre" value="${Util.escapeHtml(c.nombre)}" oninput="Util.filtrarSoloTexto(this)"></div>
            <div class="campo-form"><label>Correo electrónico *</label><input type="email" id="contactoEmail" value="${Util.escapeHtml(c.email)}" placeholder="tu@correo.com"></div>
            <div class="campo-form"><label>Confirmar correo electrónico *</label><input type="email" id="contactoEmailConfirmacion" value="${Util.escapeHtml(c.emailConfirmacion)}" placeholder="tu@correo.com"></div>
            <div class="campo-form">
              <label>Número telefónico *</label>
              <input type="tel" id="contactoTelefono" inputmode="numeric" maxlength="9" placeholder="7845-2314" value="${Util.escapeHtml(c.telefono)}" oninput="Pasajeros.formatearTelefono(this)">
            </div>
          </div>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;margin-top:20px">
        <button class="btn-texto" onclick="Navegacion.atras()">← Volver</button>
        <button class="btn btn-primario" onclick="Pasajeros.continuar()">Continuar a asientos →</button>
      </div>
    </div>`;
  },

  /* ---------- ASIENTOS ---------- */
  asientos(){
    const seg = Estado.segmentos[Asientos.segmentoActual];
    return `
    <div class="pantalla contenedor" style="padding-top:24px">
      ${Vistas.breadcrumb(['Inicio','Vuelos','Pasajeros','Asientos'])}
      ${Vistas.progreso(4)}
      <div class="seccion-titulo">Selección de asientos</div>
      <p class="seccion-sub">Elige un asiento por cada pasajero, para cada segmento de vuelo</p>
      <div class="segmento-tabs" id="segmentoTabs">
        ${Estado.segmentos.map((s,i)=>{
          const esReal = !!s.vuelo.origen && !!s.vuelo.destino;
          const ruta = esReal ? null : Util.rutaPorId(s.vuelo.ruta_id);
          const o = esReal ? s.vuelo.origen  : Util.aeropuertoPorId(ruta.origen_id);
          const d = esReal ? s.vuelo.destino : Util.aeropuertoPorId(ruta.destino_id);
          return `<button class="segmento-tab ${i===Asientos.segmentoActual?'activo':''}" onclick="Asientos.irSegmento(${i})">${s.tipo==='IDA'?'Ida':'Regreso'} · ${o.codigo_iata}-${d.codigo_iata}</button>`;
        }).join('')}
      </div>
      <div id="contenidoAsientos"></div>
      <div style="display:flex;justify-content:space-between;margin-top:20px">
        <button class="btn-texto" onclick="Navegacion.atras()">← Volver</button>
        <button class="btn btn-primario" id="btnContinuarAsientos" onclick="Asientos.continuar()">Continuar a servicios →</button>
      </div>
    </div>`;
  },

  mapaAsientosHTML(vuelo, segmentoIdx){
    // Vuelos reales traen la aeronave (y su configuracion_asientos real de tipos_aeronave) embebida.
    // Vuelos mock siguen resolviéndose por MOCK.aeronaves/MOCK.tipos_aeronave.
    const esReal = !!vuelo.origen && !!vuelo.destino;
    const infoAeronave = esReal ? vuelo.aeronave : Util.tipoAeronavePorAeronaveId(vuelo.aeronave_id);
    // Si no hay aeronave relacionada (LEFT JOIN nulo) o no trae configuración válida,
    // se usa una disposición genérica de referencia para no bloquear el flujo de selección.
    const cfg = (infoAeronave && infoAeronave.configuracion_asientos && infoAeronave.configuracion_asientos.columnas)
      ? infoAeronave.configuracion_asientos
      : {filas:20, columnas:['A','B','C','D','E','F']};
    const columnas = cfg.columnas;
    const filas = cfg.filas;
    const ocupados = Asientos.ocupadosPorSegmento(segmentoIdx);
    let filasHtml = '';
    for(let f=1; f<=Math.min(filas,20); f++){
      let celdas = `<span class="fila-num">${f}</span>`;
      columnas.forEach((c,ci)=>{
        const codigo = `${f}${c}`;
        let claseTipo = 'economico';
        if(f<=2) claseTipo='preferencial';
        else if(f===Math.ceil(filas*0.4)) claseTipo='emergencia';
        const ocupado = ocupados.includes(codigo);
        const seleccionadoPor = Asientos.quienTiene(segmentoIdx, codigo);
        celdas += `<div class="asiento ${claseTipo!=='economico'?claseTipo:''} ${ocupado?'ocupado':''} ${seleccionadoPor!==null?'seleccionado':''}"
          title="${codigo}" onclick="${ocupado?'':`Asientos.click(${segmentoIdx}, '${codigo}', '${claseTipo}')`}">${codigo}</div>`;
        if(ci === Math.floor(columnas.length/2)-1) celdas += `<div class="pasillo"></div>`;
      });
      filasHtml += `<div class="fila-asientos">${celdas}</div>`;
    }
    const seg = Estado.segmentos[segmentoIdx];
    const claveTarifa = seg ? seg.tarifa : (segmentoIdx === 0 ? Estado.tarifaIda : Estado.tarifaRegreso);
    const incluyeAsiento = Util.tarifaIncluyeAsiento(claveTarifa);
    const nombreTarifa = MOCK.tarifas[claveTarifa]?.nombre || '';

    return `
    ${incluyeAsiento ? `<div class="alerta alerta-exito" style="margin-bottom:14px">✨ Tu tarifa <b>${Util.escapeHtml(nombreTarifa)}</b> incluye selección de asiento (estándar, preferencial o emergencia) sin ningún cargo extra ($0.00).</div>` : ''}
    <div class="mapa-avion">
      <div class="avion-wrap">
        <div class="avion-nariz"></div>
        ${filasHtml}
        <div class="leyenda">
          <div class="leyenda-item"><div class="leyenda-caja" style="background:#e3ecf9"></div>Disponible</div>
          <div class="leyenda-item"><div class="leyenda-caja" style="background:var(--verde)"></div>Seleccionado</div>
          <div class="leyenda-item"><div class="leyenda-caja" style="background:#d6d9de"></div>Ocupado</div>
          <div class="leyenda-item"><div class="leyenda-caja" style="background:#ffe9b3"></div>Preferencial ${incluyeAsiento ? '(Incluido)' : '($80)'}</div>
          <div class="leyenda-item"><div class="leyenda-caja" style="background:#f0c3c3"></div>Emergencia ${incluyeAsiento ? '(Incluido)' : '($80)'}</div>
        </div>
      </div>
      <div class="panel-asiento-lateral card">
        <h4 style="margin-bottom:10px;color:var(--azul-oscuro)">Pasajeros</h4>
        ${Estado.pasajeros.map((p,pi)=>{
          if(p.requiresSeat===false) return ''; // los bebés viajan en brazos y no requieren asiento
          const asignado = Estado.asientos[`${segmentoIdx}_${pi}`];
          const activo = Asientos.pasajeroActivo === pi;
          const precioBadge = asignado ? (asignado.precio > 0 ? ` +$${asignado.precio}` : ' ($0)') : '';
          return `<div class="pasajero-asiento-fila ${activo?'activo':''}" onclick="Asientos.setPasajeroActivo(${pi})" style="cursor:pointer">
            <span>${Util.escapeHtml(p.nombres||('Pasajero '+(pi+1)))}</span>
            ${asignado ? `<span class="chip-asiento">${asignado.codigo}${precioBadge}</span>` : `<span class="chip-vacio">Sin asiento</span>`}
          </div>`;
        }).join('')}
        ${Estado.pasajeros.some(p=>p.requiresSeat===false) ? `
        <p style="font-size:.75rem;color:#889;margin-top:10px">👶 ${Estado.pasajeros.filter(p=>p.requiresSeat===false).map(p=>Util.escapeHtml(p.nombres||'Bebé')).join(', ')} viaja(n) en brazos y no requiere(n) asiento.</p>
        ` : ''}
        <p style="font-size:.78rem;color:#889;margin-top:12px">Selecciona un pasajero y luego toca un asiento disponible en el mapa.</p>
      </div>
    </div>`;
  },

  /* ---------- SERVICIOS ---------- */
  servicios(){
    Servicios.sincronizarIncluidos();
    return `
    <div class="pantalla contenedor" style="padding-top:24px">
      ${Vistas.breadcrumb(['Inicio','Vuelos','Asientos','Servicios'])}
      ${Vistas.progreso(5)}
      <div class="seccion-titulo">Servicios adicionales</div>
      <p class="seccion-sub">Personaliza la experiencia de viaje de cada pasajero (opcional)</p>
      ${Estado.pasajeros.map((p,pi)=>`
        <h4 style="margin:18px 0 10px;color:var(--azul-oscuro)">${Util.escapeHtml(p.nombres||('Pasajero '+(pi+1)))} ${Util.escapeHtml(p.apellidos||'')}</h4>
        <div class="grid-servicios">
          ${MOCK.servicios.map(s=>{
            const incluido = Util.servicioEstaIncluidoParaPasajero(pi, s.id);
            const activo = incluido || (Estado.servicios[pi]||[]).includes(s.id);
            const esBebe = (p.requiresSeat === false || p.type === 'infant');
            let razonBadge = 'Incluido';
            if(Util.viajeIncluyeServicio(s.id)){
              const razon = s.id==='SALA_VIP' ? (Estado.tarifaIda==='PRIMERA'||Estado.tarifaRegreso==='PRIMERA'?'Primera Clase':'Business') : (s.id==='ABORDAJE_PRIORITARIO'?'Primera Clase':'');
              razonBadge = `✓ Incluido en tu tarifa ${razon}`;
            } else if(esBebe && (s.id==='SALA_VIP' || s.id==='ABORDAJE_PRIORITARIO')){
              razonBadge = '✓ Cortesía acompañante bebé ($0)';
            }
            return `<div class="servicio-card" style="${incluido?'border:1.5px solid var(--verde);background:#f9fdfb;':''}">
              <div class="icono">${s.icono}</div>
              <h4>${s.nombre}</h4>
              <p>${s.descripcion}</p>
              ${incluido ? `
                <div style="margin-bottom:8px">
                  <span class="badge badge-programado" style="background:#e2f6ea;color:#1c6b3f;font-size:.75rem;padding:3px 8px;border-radius:6px;display:inline-block">${razonBadge}</span>
                </div>
                <span class="precio" style="color:var(--verde);font-weight:700">$0.00 (Incluido)</span>
                <label class="check-item" style="color:var(--verde);font-weight:600"><input type="checkbox" checked disabled> Incluido</label>
              ` : `
                <span class="precio">${Util.formatoMoneda(s.precio)}</span>
                <label class="check-item"><input type="checkbox" ${activo?'checked':''} onchange="Servicios.toggle(${pi}, '${s.id}', this.checked)"> Agregar</label>
              `}
            </div>`;
          }).join('')}
        </div>
      `).join('')}
      <div style="display:flex;justify-content:space-between;margin-top:24px">
        <button class="btn-texto" onclick="Navegacion.atras()">← Volver</button>
        <button class="btn btn-primario" onclick="Navegacion.ir('pago')">Continuar a pago →</button>
      </div>
    </div>`;
  },

  /* ---------- PAGO ---------- */
  pago(){
    Precios.calcular();
    const p = Estado.precios;
    const m = Pago.metodo;
    return `
    <div class="pantalla contenedor" style="padding-top:24px">
      ${Vistas.breadcrumb(['Inicio','Vuelos','Servicios','Pago'])}
      ${Vistas.progreso(6)}
      <div class="seccion-titulo">Pago</div>
      <p class="seccion-sub">Pago simulado — no se procesan transacciones reales</p>
      <div class="resumen-flex">
        <div class="card">
          <div class="metodos-pago">
            <button type="button" class="metodo-pago ${m==='TARJETA'?'activo':''}" onclick="Pago.setMetodo('TARJETA')">💳 Tarjeta</button>
            <button type="button" class="metodo-pago ${m==='TRANSFERENCIA'?'activo':''}" onclick="Pago.setMetodo('TRANSFERENCIA')">🏦 Banca electrónica</button>
            <button type="button" class="metodo-pago ${m==='BILLETERA'?'activo':''}" onclick="Pago.setMetodo('BILLETERA')">📱 Billetera digital</button>
          </div>
          <div id="alertaPago"></div>
          <div id="formularioPago">${Vistas.formularioPago(m)}</div>
          <p style="font-size:.72rem;color:#889;margin-top:10px">🔒 Tus datos de pago no se almacenan; este es un entorno académico de demostración.</p>
        </div>
        <div class="card total-box">
          <h4 style="margin-bottom:10px;color:var(--azul-oscuro)">Total a pagar</h4>
          <div class="total-fila"><span>Vuelos</span><span>${Util.formatoMoneda(p.vuelos)}</span></div>
          <div class="total-fila"><span>Asientos</span><span>${Util.formatoMoneda(p.asientos)}</span></div>
          <div class="total-fila"><span>Servicios</span><span>${Util.formatoMoneda(p.servicios)}</span></div>
          ${(()=>{
            const detServ = Util.obtenerDetalleServicios();
            if(!detServ.length) return '';
            return `<div style="font-size:.78rem;background:#f8fafc;padding:8px 10px;border-radius:6px;margin:8px 0;border:1px solid #eef0f3;">
              <b style="color:var(--azul-oscuro);display:block;margin-bottom:4px">Desglose de servicios:</b>
              ${detServ.map(ds=>`
                <div style="display:flex;justify-content:space-between;padding:2px 0;color:#556;">
                  <span>${Util.escapeHtml(ds.nombre)} (${Util.escapeHtml(ds.pasajeroNombre)})</span>
                  <span style="${ds.incluido?'color:var(--verde);font-weight:600':''}">${ds.incluido ? 'Incluido ($0)' : Util.formatoMoneda(ds.precio)}</span>
                </div>
              `).join('')}
            </div>`;
          })()}
          <div class="total-fila total-final"><span>Total</span><span>${Util.formatoMoneda(p.total)}</span></div>
          <button class="btn btn-amarillo btn-block" style="margin-top:16px" onclick="Pago.procesar()">Pagar ahora</button>
        </div>
      </div>
    </div>`;
  },

  formularioPago(metodo){
    if(metodo==='TARJETA'){
      return `
      <div class="form-grid">
        <div class="campo-form full"><label>Nombre en la tarjeta *</label><input type="text" id="pagoNombre" placeholder="Como aparece en la tarjeta"></div>
        <div class="campo-form full">
          <label>Número de tarjeta *</label>
          <input type="text" id="pagoNumero" inputmode="numeric" maxlength="23" placeholder="•••• •••• •••• ••••" oninput="Pago.formatearNumeroTarjeta(this)">
        </div>
        <div class="campo-form">
          <label>Vencimiento (MM/AA) *</label>
          <input type="text" id="pagoVencimiento" inputmode="numeric" maxlength="5" placeholder="MM/AA" oninput="Pago.formatearVencimiento(this)" onkeydown="Pago.moverAlAnioVencimiento(event, this)">
        </div>
        <div class="campo-form">
          <label>CVV *</label>
          <input type="password" id="pagoCvv" inputmode="numeric" maxlength="4" placeholder="•••" oninput="Pago.formatearCvv(this)">
        </div>
      </div>`;
    }
    if(metodo==='TRANSFERENCIA'){
      return `
      <div class="form-grid">
        <div class="campo-form full">
          <label>Banco *</label>
          <select id="transBanco">
            <option value="">Seleccionar</option>
            <option value="BANCO_AGRICOLA">Banco Agrícola</option>
            <option value="BANCO_CUSCATLAN">Banco Cuscatlán</option>
            <option value="BANCO_DAVIVIENDA">Davivienda</option>
            <option value="BANCO_PROMERICA">Banco Promerica</option>
          </select>
        </div>
        <div class="campo-form full">
          <label>Número de cuenta / referencia *</label>
          <input type="text" id="transReferencia" inputmode="numeric" maxlength="20" placeholder="Solo números" oninput="this.value=Util.sanitizeNumericInput(this.value,20)">
        </div>
      </div>
      <p style="font-size:.78rem;color:#889;margin-top:8px">Se generará una referencia de pago simulada mediante banca electrónica.</p>`;
    }
    if(metodo==='BILLETERA'){
      return `
      <div class="form-grid">
        <div class="campo-form full">
          <label>Billetera digital *</label>
          <select id="billeteraTipo">
            <option value="">Seleccionar</option>
            <option value="TIGO_MONEY">Tigo Money</option>
            <option value="CHIVO_WALLET">Chivo Wallet</option>
            <option value="PAYPAL">PayPal</option>
          </select>
        </div>
        <div class="campo-form full">
          <label>Número de teléfono o cuenta asociada *</label>
          <input type="text" id="billeteraCuenta" inputmode="numeric" maxlength="9" placeholder="7845-2314" oninput="this.value=Util.formatPhoneNumber(this.value)">
        </div>
      </div>`;
    }
    return '';
  },

  /* ---------- CONFIRMACION ---------- */
  confirmacion(){
    const r = Estado.reservaActual;
    if(!r) return `<div class="pantalla contenedor"><div class="estado-vacio"><div class="icono">⚠</div>No hay una reserva reciente.</div></div>`;
    return `
    <div class="pantalla contenedor" style="padding-top:24px">
      <div class="ticket">
        <div class="ticket-header">
          <div class="check">✅</div>
          <h2>¡Reserva confirmada!</h2>
          <p>Tu código de reserva (PNR) es:</p>
          <div class="pnr-box">${r.pnr}</div>
        </div>
        <div class="ticket-body">
          ${r.segmentos.map(s=>`
            <div class="ticket-linea"><span>Vuelo</span><b>${s.numero_vuelo} · ${s.origen} → ${s.destino}</b></div>
            <div class="ticket-linea"><span>Fecha</span><b>${Util.formatoFechaLarga(s.fecha)}</b></div>
          `).join('<div class="ticket-perf"></div>')}
          <div class="ticket-perf"></div>
          <div class="ticket-linea"><span>Pasajeros</span><b>${r.pasajeros.map(p=>p.nombres+' '+p.apellidos).join(', ')}</b></div>
          <div class="ticket-linea"><span>Estado de la reserva</span><b>${r.estado}</b></div>
          <div class="ticket-linea"><span>Método de pago</span><b>${r.pago.metodo}</b></div>
          ${Array.isArray(r.servicios) && r.servicios.length > 0 ? `
            <div class="ticket-perf"></div>
            <div style="margin-bottom:6px"><b style="color:var(--azul-oscuro);font-size:.9rem">Servicios:</b></div>
            ${r.servicios.map(s=>`
              <div class="ticket-linea" style="font-size:.84rem;padding:6px 0">
                <span>${Util.escapeHtml(s.nombre)} (${Util.escapeHtml(s.pasajeroNombre)}) ${s.incluido ? `<small style="color:var(--verde)">· ${Util.escapeHtml(s.nota)}</small>` : ''}</span>
                <b>${s.incluido ? '<span style="color:var(--verde)">Incluido ($0.00)</span>' : Util.formatoMoneda(s.precio)}</b>
              </div>
            `).join('')}
          ` : ''}
          <div class="ticket-linea"><span>Total pagado</span><b>${Util.formatoMoneda(r.total)}</b></div>
          ${r.contacto && r.contacto.email ? `
          <div class="alerta alerta-info" style="margin-top:18px">
            📧 Tu comprobante será enviado al correo: <b>${Util.escapeHtml(r.contacto.email)}</b>
          </div>
          <div id="alertaEnvioComprobante"></div>
          ` : ''}
          <div style="display:flex;gap:10px;margin-top:22px;flex-wrap:wrap">
            <button class="btn btn-outline" onclick="window.print()">🖨 Imprimir</button>
            ${r.contacto && r.contacto.email ? `<button class="btn btn-amarillo" id="btnEnviarComprobante" onclick="Comprobante.enviar()">✉ Enviar comprobante por correo</button>` : ''}
            <button class="btn btn-primario" onclick="Reserva.reiniciar()">Nueva reserva</button>
            <button class="btn btn-texto" onclick="Navegacion.ir('consultarReserva')">Consultar reserva</button>
          </div>
        </div>
      </div>
    </div>`;
  },

  /* ---------- CONSULTAR RESERVA ---------- */
  consultarReserva(){
    return `
    <div class="pantalla contenedor" style="padding-top:24px">
      <div class="seccion-titulo">Consultar reserva</div>
      <p class="seccion-sub">Ingresa tu código PNR y tu documento o correo para ver el estado de tu reserva</p>
      <div class="card form-ancho">
        <div class="campo-form" style="margin-bottom:12px"><label>Código PNR *</label><input type="text" id="inputPNR" maxlength="6" placeholder="Ej. AC7XQ2" style="text-transform:uppercase"></div>
        <div class="campo-form" style="margin-bottom:16px"><label>Documento o correo *</label><input type="text" id="inputRef" placeholder="Documento o correo registrado"></div>
        <div id="alertaConsulta"></div>
        <button class="btn btn-primario btn-block" onclick="ConsultaReserva.buscar()">Consultar</button>
      </div>
      <div id="resultadoConsulta" style="margin-top:24px;max-width:700px"></div>
    </div>`;
  },

  tarjetaReserva(r){
    const estados={PENDIENTE:'badge-embarcando',CONFIRMADA:'badge-programado',CHECK_IN:'badge-despegado',ABORDADO:'badge-aterrizado',CANCELADA:'badge-cancelado',NO_SHOW:'badge-cancelado',REEMBOLSADA:'badge-desviado'};
    return `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <h3 style="color:var(--azul-oscuro)">PNR: ${r.pnr}</h3>
        <span class="badge ${estados[r.estado]||'badge-programado'}">${r.estado}</span>
      </div>
      ${r.segmentos.map(s=>`
        <div class="resumen-item">
          <h4>Vuelo ${s.numero_vuelo} · ${s.origen} → ${s.destino}</h4>
          <p>Fecha: ${Util.formatoFechaLarga(s.fecha)} · Check-in: ${s.estado_check_in?'Realizado':'Pendiente'} · Pase de abordar: ${s.pase_abordar_emitido?'Emitido':'No emitido'}</p>
          ${Array.isArray(s.pasajeros_asientos) ? `<ul style="margin:6px 0 0 18px;padding:0">${s.pasajeros_asientos.map(pa=>`<li>${pa.nombre} — ${pa.asiento||'-'}</li>`).join('')}</ul>` : ''}
        </div>`).join('')}
      <div class="resumen-item">
        <h4>Pasajeros</h4>
        <p>${r.pasajeros.map(p=>`${p.nombres} ${p.apellidos} (${p.documento})`).join(', ')}</p>
      </div>
      <div class="resumen-item">
        <h4>Pago</h4>
        <p>Método: ${r.pago.metodo} · Estado: ${r.pago.estado} · Monto: ${Util.formatoMoneda(r.pago.monto)}</p>
      </div>
    </div>`;
  },

  /* ---------- LOGIN / REGISTRO ---------- */
  login(){
    return `
    <div class="pantalla contenedor" style="padding-top:40px">
      <div class="form-ancho">
        <div class="tabs-auth">
          <button class="tab-auth activo" onclick="Navegacion.ir('login')">Iniciar sesión</button>
          <button class="tab-auth" onclick="Navegacion.ir('registro')">Registrarse</button>
        </div>
        <div class="card">
          <p style="font-size:.75rem;color:#889;margin-bottom:14px">Proyecto académico — Acajutla Airlines.</p>
          <div id="alertaLogin"></div>
          <div class="campo-form" style="margin-bottom:12px"><label>Correo</label><input type="email" id="loginCorreo" placeholder="tu@correo.com" onkeydown="Util.handleEnter(event,'loginPassword')"></div>
          <div class="campo-form" style="margin-bottom:8px">
            <label>Contraseña</label>
            <div style="position:relative">
              <input type="password" id="loginPassword" placeholder="••••••" style="width:100%;padding-right:40px;box-sizing:border-box" onkeydown="Util.handleEnter(event,null,Auth.login.bind(Auth))">
              <button type="button" onclick="Util.togglePasswordVisibility('loginPassword', this)" aria-label="Mostrar contraseña" style="position:absolute;right:6px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:1rem;padding:4px">👁️</button>
            </div>
          </div>
          <div style="text-align:right;margin-bottom:16px">
            <a class="link-olvido" onclick="Auth.abrirRecuperar()">¿Olvidaste tu contraseña?</a>
          </div>
          <button class="btn btn-primario btn-block" onclick="Auth.login()">Ingresar</button>
        </div>
      </div>
    </div>`;
  },

  registro(){
    return `
    <div class="pantalla contenedor" style="padding-top:40px">
      <div class="form-ancho">
        <div class="tabs-auth">
          <button class="tab-auth" onclick="Navegacion.ir('login')">Iniciar sesión</button>
          <button class="tab-auth activo" onclick="Navegacion.ir('registro')">Registrarse</button>
        </div>
        <div class="card">
          <div id="alertaRegistro"></div>
          <div class="campo-form" style="margin-bottom:12px"><label>Nombre</label><input type="text" id="regNombre" onkeydown="Util.handleEnter(event,'regApellido')"></div>
          <div class="campo-form" style="margin-bottom:12px"><label>Apellido</label><input type="text" id="regApellido" onkeydown="Util.handleEnter(event,'regCorreo')"></div>
          <div class="campo-form" style="margin-bottom:12px"><label>Correo</label><input type="email" id="regCorreo" onkeydown="Util.handleEnter(event,'regTelefono')"></div>
          <div class="campo-form" style="margin-bottom:12px"><label>Teléfono</label><input type="tel" id="regTelefono" placeholder="XXXX-XXXX" maxlength="9" oninput="Util.formatearTelefono(this)" onkeydown="Util.handleEnter(event,'regDocumento')"></div>
          <div class="campo-form" style="margin-bottom:12px"><label>Documento (DUI)</label><input type="text" id="regDocumento" placeholder="00000000-0" maxlength="10" oninput="Util.formatearDUI(this)" onkeydown="Util.handleEnter(event,'regPassword')"></div>
          <div class="campo-form" style="margin-bottom:12px">
            <label>Contraseña</label>
            <div style="position:relative">
              <input type="password" id="regPassword" style="width:100%;padding-right:40px;box-sizing:border-box" onkeydown="Util.handleEnter(event,'regPasswordConfirm')">
              <button type="button" onclick="Util.togglePasswordVisibility('regPassword', this)" aria-label="Mostrar contraseña" style="position:absolute;right:6px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:1rem;padding:4px">👁️</button>
            </div>
          </div>
          <div class="campo-form" style="margin-bottom:16px">
            <label>Confirmar contraseña</label>
            <div style="position:relative">
              <input type="password" id="regPasswordConfirm" style="width:100%;padding-right:40px;box-sizing:border-box" onkeydown="Util.handleEnter(event,null,Auth.registrar.bind(Auth))">
              <button type="button" onclick="Util.togglePasswordVisibility('regPasswordConfirm', this)" aria-label="Mostrar contraseña" style="position:absolute;right:6px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:1rem;padding:4px">👁️</button>
            </div>
          </div>
          <button class="btn btn-primario btn-block" onclick="Auth.registrar()">Crear cuenta</button>
        </div>
      </div>
    </div>`;
  },

  /* ---------- PERFIL ---------- */
  perfil(){
    if(!Estado.usuario){
      return `<div class="pantalla contenedor" style="padding-top:40px"><div class="estado-vacio"><div class="icono">🔒</div>Debes iniciar sesión para ver tu perfil.<br><br><button class="btn btn-primario" onclick="Navegacion.ir('login')">Iniciar sesión</button></div></div>`;
    }
    const u = Estado.usuario;
    const nombre = (u.nombre || '').trim();
    const apellido = (u.apellido || '').trim();
    const inicial1 = nombre ? nombre[0].toUpperCase() : (u.correo ? u.correo[0].toUpperCase() : 'U');
    const inicial2 = apellido ? apellido[0].toUpperCase() : '';
    const avatarTexto = inicial1 + inicial2;
    const nombreCompleto = (nombre || apellido) ? `${nombre} ${apellido}`.trim() : (u.correo || 'Usuario');

    return `
    <div class="pantalla contenedor" style="padding-top:24px">
      <div class="perfil-header">
        <div class="perfil-avatar">${avatarTexto}</div>
        <div>
          <h2 style="color:var(--azul-oscuro)">${Util.escapeHtml(nombreCompleto)}</h2>
          <span style="color:#889;font-size:.85rem">${Util.escapeHtml(u.correo || '')}</span>
        </div>
        <button class="btn btn-outline" style="margin-left:auto" onclick="Auth.logout()">Cerrar sesión</button>
      </div>
      <div class="card">
        <h4 style="margin-bottom:14px;color:var(--azul-oscuro)">Mis reservas</h4>
        <div id="contenidoMisReservas"><div class="estado-vacio"><div class="icono">⏳</div>Cargando tus reservas...</div></div>
      </div>
    </div>`;
  },

  /* ---------- ESTADO DE VUELO ---------- */
  estadoVuelo(){
    return `
    <div class="pantalla contenedor" style="padding-top:24px">
      <div class="seccion-titulo">Estado de vuelo</div>
      <p class="seccion-sub">Consulta el estado en tiempo real de tu vuelo</p>
      <div class="card form-ancho">
        <div class="form-grid" style="margin-bottom:16px">
          <div class="campo-form"><label>Número de vuelo *</label><input type="text" id="inputNumeroVuelo" placeholder="Ej. AJ101" style="text-transform:uppercase"></div>
          <div class="campo-form"><label>Fecha</label><input type="date" id="inputFechaVuelo" value="${Util.hoyISO()}"></div>
        </div>
        <div id="alertaEstadoVuelo"></div>
        <button class="btn btn-primario btn-block" onclick="EstadoVuelo.buscar()">Consultar</button>
      </div>
      <div id="resultadoEstadoVuelo" style="margin-top:24px;max-width:760px"></div>
    </div>`;
  },

  /* ---------- VUELOS EN VIVO (mapa tipo FlightRadar24) ---------- */
  vuelosEnVivo(){
    return `
    <div class="pantalla contenedor" style="padding-top:24px">
      <div class="seccion-titulo">Vuelos en vivo</div>
      <p class="seccion-sub">Nuestra flota en el aire en este momento, actualizado en tiempo real</p>
      <div class="envivo-layout">
        <div class="envivo-mapa-wrap card" style="padding:0;overflow:hidden">
          <div id="mapaVuelosEnVivo" class="envivo-mapa"></div>
          <div class="envivo-leyenda">
            <span class="envivo-punto"></span> Actualización automática cada segundo
          </div>
        </div>
        <div class="envivo-panel">
          <div class="envivo-contador"><b id="envivoContador">0</b> aviones en el aire</div>
          <div id="envivoListaVuelos"><div class="estado-vacio"><div class="icono">⏳</div>Cargando vuelos...</div></div>
          <div id="envivoDetalle"></div>
        </div>
      </div>
    </div>`;
  }
};

/* =====================================================================
   9. LÓGICA — BUSCADOR (Inicio)
===================================================================== */
const Buscador = {
  setTipoViaje(v){
    Estado.busqueda.tipoViaje = v;
    const campoRegreso = document.getElementById('campoRegreso');
    if(campoRegreso) campoRegreso.style.opacity = v==='SOLO_IDA' ? '.4' : '1';
    if(campoRegreso) campoRegreso.style.pointerEvents = v==='SOLO_IDA' ? 'none' : 'auto';
  },

  set(campo, valor){ Estado.busqueda[campo] = valor; },

  intercambiar(){
    const b = Estado.busqueda;
    [b.origen, b.destino] = [b.destino, b.origen];
    Navegacion.ir('inicio');
  },

  autocompletar(campo, texto){
    const lista = document.getElementById(campo==='origen' ? 'listaOrigen' : 'listaDestino');
    if(!lista) return;
    const q = (texto || '').trim().toLowerCase();
    let listaAeropuertos = Estado.aeropuertosDisponibles || [];
    if(campo === 'destino' && Estado.busqueda.origen){
      listaAeropuertos = listaAeropuertos.filter(a => a.id !== Estado.busqueda.origen.id);
    } else if(campo === 'origen' && Estado.busqueda.destino){
      listaAeropuertos = listaAeropuertos.filter(a => a.id !== Estado.busqueda.destino.id);
    }
    const resultados = q.length === 0
      ? listaAeropuertos.slice(0, 8)
      : listaAeropuertos.filter(a =>
          a.ciudad.toLowerCase().includes(q) || a.nombre.toLowerCase().includes(q) || a.codigo_iata.toLowerCase().includes(q)
        ).slice(0, 8);

    if(resultados.length===0){ lista.innerHTML = `<div class="autocomplete-item">Sin resultados</div>`; }
    else {
      lista.innerHTML = resultados.map(a=>`
        <div class="autocomplete-item" onclick="Buscador.elegir('${campo}', ${a.id})">
          <b>${a.ciudad} (${a.codigo_iata})</b>
          <small>${Util.escapeHtml(a.nombre)}, ${a.pais}</small>
        </div>`).join('');
    }
    lista.classList.remove('oculto');
  },

  elegir(campo, id){
    Estado.busqueda[campo] = Estado.aeropuertosDisponibles.find(a=>a.id===id);
    document.getElementById(campo==='origen'?'listaOrigen':'listaDestino').classList.add('oculto');
    document.getElementById(campo==='origen'?'inputOrigen':'inputDestino').value = `${Estado.busqueda[campo].ciudad} (${Estado.busqueda[campo].codigo_iata})`;

    if(campo === 'origen'){
      // Auto-avance a Destino: enfocar y mostrar opciones inmediatamente
      setTimeout(()=>{
        const inputDestino = document.getElementById('inputDestino');
        if(inputDestino){
          inputDestino.focus();
          Buscador.autocompletar('destino', '');
        }
      }, 120);
    } else if(campo === 'destino'){
      // Auto-avance a Salida: abrir el selector de fecha de ida
      setTimeout(()=>{
        if(typeof CalendarioPrecios !== 'undefined' && CalendarioPrecios.abrir){
          CalendarioPrecios.abrir('ida');
        }
      }, 120);
    }
  },

  abrirPanelPasajerosAuto(){
    const panel = document.getElementById('panelPasajeros');
    if(!panel) return;
    if(panel.classList.contains('oculto')){
      panel.classList.remove('oculto');
      Buscador._activarCierrePanelPasajeros();
    }
  },

  textoResumenPasajeros(){
    const b = Estado.busqueda;
    const partes = [];
    if(b.adultos>0) partes.push(`${b.adultos} Adulto${b.adultos!==1?'s':''}`);
    if(b.jovenes>0) partes.push(`${b.jovenes} Joven${b.jovenes!==1?'es':''}`);
    if(b.ninos>0) partes.push(`${b.ninos} Niño${b.ninos!==1?'s':''}`);
    if(b.bebes>0) partes.push(`${b.bebes} Bebé${b.bebes!==1?'s':''}`);
    return `${partes.join(', ')} · ${totalPasajerosConAsiento()} asiento(s)`;
  },

  togglePanelPasajeros(){
    const panel = document.getElementById('panelPasajeros');
    if(!panel) return;
    const estabaOculto = panel.classList.contains('oculto');
    panel.classList.toggle('oculto');
    if(estabaOculto) Buscador._activarCierrePanelPasajeros();
  },

  cerrarPanelPasajeros(){
    document.getElementById('panelPasajeros')?.classList.add('oculto');
  },

  // Registra (una sola vez por apertura) el cierre mediante clic fuera o tecla ESC,
  // sin enviar el formulario ni alterar los valores ya seleccionados.
  _activarCierrePanelPasajeros(){
    const cerrar = (e)=>{
      if(e.type==='keydown' && e.key!=='Escape') return;
      if(e.type==='click' && e.target.closest('.pasajeros-selector')) return;
      Buscador.cerrarPanelPasajeros();
      document.removeEventListener('click', cerrar);
      document.removeEventListener('keydown', cerrar);
    };
    setTimeout(()=>{
      document.addEventListener('click', cerrar);
      document.addEventListener('keydown', cerrar);
    }, 0);
  },

  cambiarPasajero(key, delta){
    const b = Estado.busqueda;
    const LIMITE_MAX = 9;
    let nuevo = b[key] + delta;
    if(key==='adultos' && nuevo < 1) return;
    if((key==='jovenes' || key==='ninos' || key==='bebes') && nuevo < 0) return;
    if(nuevo > LIMITE_MAX) return;

    // Regla: nunca puede haber más bebés que adultos (1 bebé por adulto).
    if(key==='bebes' && nuevo > b.adultos){
      const aviso = document.getElementById('avisoPasajeros');
      if(aviso) aviso.textContent = 'Solo puede viajar 1 bebé por adulto.';
      Util.mostrarToast('Solo puede viajar 1 bebé por adulto.', 'error');
      return;
    }

    b[key] = nuevo;

    // Si se reduce la cantidad de adultos, ajustar bebés automáticamente para no dejar un estado inválido.
    if(key==='adultos' && b.bebes > b.adultos) b.bebes = b.adultos;

    Navegacion.ir('inicio'); // re-render simple y confiable
    document.getElementById('panelPasajeros')?.classList.remove('oculto');
    Buscador._activarCierrePanelPasajeros();
  },

  async buscar(){
    const errores = Validar.busquedaVuelos(Estado.busqueda);
    const cont = document.getElementById('alertaBuscador');
    if(errores.length){
      cont.innerHTML = `<div class="alerta alerta-error">⚠ ${errores.join('<br>')}</div>`;
      return;
    }
    cont.innerHTML = '';
    Estado.modoResultados = 'IDA';
    Navegacion.ir('vuelos');
  }
};

/* =====================================================================
   9-B/9-C/10/11. CALENDARIO, CARRUSEL, RESULTADOS DE VUELOS Y TARIFAS
   -> Extraídos a vuelos.php (Fase 1 de separación). Incluye:
   CalendarioPrecios, CarruselFechas, ResultadosVuelos, Tarifas,
   y agrega Vistas.resultadosVuelos / Vistas.tarjetaVuelo / Vistas.tarifas
   mediante Object.assign(Vistas, {...}).
===================================================================== */
<?php include __DIR__ . '/vuelos.php'; ?>


/* =====================================================================
   12. LÓGICA — PRECIOS
===================================================================== */
const Precios = {
  calcular(){
    // Los bebés (lap infant) no ocupan asiento y no pagan tarifa completa de vuelo.
    const n = totalPasajerosConAsiento();
    let vuelos = 0;
    // El precio del vuelo se obtiene SIEMPRE mediante Util.obtenerPrecioTarifa(),
    // que prioriza vuelo.tarifas (precios reales del API) y solo cae a precio_base
    // como respaldo para vuelos mock que aún no tengan ese arreglo.
    const precioIda = Util.obtenerPrecioTarifa(Estado.vueloIda, Estado.tarifaIda);
    const precioRegreso = Util.obtenerPrecioTarifa(Estado.vueloRegreso, Estado.tarifaRegreso);
    if(Estado.vueloIda && Estado.tarifaIda) vuelos += (precioIda||0) * n;
    if(Estado.vueloRegreso && Estado.tarifaRegreso) vuelos += (precioRegreso||0) * n;

    let asientos = 0;
    Object.values(Estado.asientos).forEach(a=>{ asientos += a.precio; });

    let servicios = 0;
    Object.entries(Estado.servicios).forEach(([piStr, lista])=>{
      const pi = parseInt(piStr, 10);
      (lista||[]).forEach(sid=>{
        if(!Util.servicioEstaIncluidoParaPasajero(pi, sid)){
          const s = MOCK.servicios.find(x=>x.id===sid);
          if(s) servicios += s.precio;
        }
      });
    });

    Estado.precios = {vuelos, asientos, servicios, total: vuelos+asientos+servicios};
  }
};

/* =====================================================================
   13. LÓGICA — RESERVA (transición entre pasos)
===================================================================== */
const Reserva = {
  irAPasajeros(){
    // Última verificación: nunca continuar con un vuelo cancelado, aunque ya se haya seleccionado antes.
    if((Estado.vueloIda && !Util.isFlightBookable(Estado.vueloIda)) || (Estado.vueloRegreso && !Util.isFlightBookable(Estado.vueloRegreso))){
      Util.mostrarToast('Uno de los vuelos seleccionados está cancelado y no puede reservarse.', 'error');
      Navegacion.ir('vuelos');
      return;
    }
    // Construir segmentos según la selección de vuelo/tarifa
    Estado.segmentos = [];
    if(Estado.vueloIda) Estado.segmentos.push({tipo:'IDA', vuelo:Estado.vueloIda, tarifa:Estado.tarifaIda});
    if(Estado.vueloRegreso) Estado.segmentos.push({tipo:'REGRESO', vuelo:Estado.vueloRegreso, tarifa:Estado.tarifaRegreso});
    // Inicializar arreglo de pasajeros si no existe, asignando categoría y si requiere asiento
    const n = totalPasajeros();
    if(Estado.pasajeros.length !== n){
      Estado.pasajeros = Array.from({length:n}, (_,i)=>Estado.pasajeros[i] || {});
    }
    Estado.pasajeros.forEach((p,i)=>{
      const cat = Util.categoriaPorIndice(i);
      p.type = cat.type;
      p.requiresSeat = cat.requiresSeat;
    });
    Navegacion.ir('pasajeros');
  },

  reiniciar(){
    Estado.busqueda = {tipoViaje:'IDA_VUELTA', origen:null, destino:null, fechaIda:'', fechaRegreso:'', adultos:1, jovenes:0, ninos:0, bebes:0};
    Estado.resultados = []; Estado.modoResultados='IDA';
    Estado.vueloIda=null; Estado.tarifaIda=null; Estado.precioTarifaIda=null;
    Estado.vueloRegreso=null; Estado.tarifaRegreso=null; Estado.precioTarifaRegreso=null;
    Estado.pasajeros=[]; Estado.segmentos=[]; Estado.asientos={}; Estado.servicios={};
    Estado.contacto={nombre:'', email:'', emailConfirmacion:'', telefono:''};
    Estado.precios={vuelos:0,asientos:0,servicios:0,total:0};
    Estado.reservaActual=null;
    Navegacion.ir('inicio');
  }
};

/* =====================================================================
   14. LÓGICA — PASAJEROS
===================================================================== */
const Pasajeros = {
  leerFormulario(){
    document.querySelectorAll('#formPasajeros [data-p]').forEach(el=>{
      const i = parseInt(el.dataset.p);
      const campo = el.dataset.f;
      if(!Estado.pasajeros[i]) Estado.pasajeros[i] = {};
      Estado.pasajeros[i][campo] = el.value;
    });
  },

  // Actualiza la fecha de nacimiento del pasajero i a partir de los selects Día/Mes/Año
  // (navegación rápida por año, sin retroceder mes a mes).
  actualizarFecha(i){
    const dia = document.getElementById(`fnDia_${i}`).value;
    const mes = document.getElementById(`fnMes_${i}`).value;
    const anio = document.getElementById(`fnAnio_${i}`).value;
    if(!Estado.pasajeros[i]) Estado.pasajeros[i] = {};
    Estado.pasajeros[i].fechaNacimiento = (dia && mes && anio) ? `${anio}-${mes}-${dia}` : '';
    this.validarEdadPasajero(i);
  },

  validarEdadPasajero(i){
    const p = Estado.pasajeros[i];
    const msg = document.getElementById(`msgFecha_${i}`);
    if(!msg || !p || !p.fechaNacimiento){ if(msg) msg.textContent=''; return true; }
    const error = Util.validatePassengerAgeCategory(p);
    msg.textContent = error || '';
    return !error;
  },

  // Formatea el teléfono en tiempo real como XXXX-XXXX, permitiendo solo dígitos.
  // -----------------------------------------------------------------------
  // NACIONALIDAD: buscador/autocompletado real contra la tabla countries
  // (vía php/paises.php). El input visible es solo para buscar/mostrar;
  // el código real que se envía (passengers.nationality) vive en el input
  // oculto nacionalidadCodigo_i, que leerFormulario() ya recoge por su
  // data-f="nacionalidad". Al escribir se borra el código oculto, así que
  // un texto libre sin seleccionar una opción real de la lista NUNCA queda
  // guardado como nacionalidad válida (Validar.pasajero ya exige que no
  // esté vacío).
  // -----------------------------------------------------------------------
  _nacResultados: {},
  _nacResaltado: {},

  async buscarNacionalidad(i, texto){
    const inputCodigo = document.getElementById(`nacionalidadCodigo_${i}`);
    if(inputCodigo) inputCodigo.value = '';
    if(Estado.pasajeros[i]){ Estado.pasajeros[i].nacionalidad = ''; Estado.pasajeros[i].nacionalidadNombre = ''; }

    const resultados = await Api.buscarPaises(texto);
    this._nacResultados[i] = resultados;
    this._nacResaltado[i] = resultados.length ? 0 : -1;
    this.renderNacionalidadLista(i);
  },

  renderNacionalidadLista(i){
    const lista = document.getElementById(`nacionalidadLista_${i}`);
    if(!lista) return;
    const resultados = this._nacResultados[i] || [];
    const resaltado = this._nacResaltado[i] ?? -1;
    if(resultados.length === 0){
      lista.style.display = 'none';
      lista.innerHTML = '';
      return;
    }
    lista.innerHTML = resultados.map((p,idx)=>`
      <div onmousedown="Pasajeros.seleccionarNacionalidad(${i}, '${p.code}', '${Util.escapeHtml(p.name).replace(/'/g,"\\'")}')"
           style="padding:8px 10px;cursor:pointer;font-size:.9rem;${idx===resaltado?'background:#eef3f8':''}">
        ${Util.escapeHtml(p.code)} — ${Util.escapeHtml(p.name)}
      </div>`).join('');
    lista.style.display = 'block';
  },

  seleccionarNacionalidad(i, code, name){
    const inputTexto = document.getElementById(`nacionalidadInput_${i}`);
    const inputCodigo = document.getElementById(`nacionalidadCodigo_${i}`);
    if(inputTexto) inputTexto.value = `${code} — ${name}`;
    if(inputCodigo) inputCodigo.value = code;
    if(!Estado.pasajeros[i]) Estado.pasajeros[i] = {};
    Estado.pasajeros[i].nacionalidad = code;
    Estado.pasajeros[i].nacionalidadNombre = name;
    this.ocultarListaNacionalidad(i);
    const msg = document.getElementById(`msgNacionalidad_${i}`);
    if(msg) msg.textContent = '';
  },

  ocultarListaNacionalidad(i){
    const lista = document.getElementById(`nacionalidadLista_${i}`);
    if(lista) lista.style.display = 'none';
  },

  navegarNacionalidad(event, i){
    const resultados = this._nacResultados[i] || [];
    if(event.key === 'Escape'){
      this.ocultarListaNacionalidad(i);
      return;
    }
    if(event.key === 'ArrowDown'){
      event.preventDefault();
      if(!resultados.length) return;
      this._nacResaltado[i] = Math.min((this._nacResaltado[i] ?? -1) + 1, resultados.length - 1);
      this.renderNacionalidadLista(i);
      return;
    }
    if(event.key === 'ArrowUp'){
      event.preventDefault();
      if(!resultados.length) return;
      this._nacResaltado[i] = Math.max((this._nacResaltado[i] ?? 0) - 1, 0);
      this.renderNacionalidadLista(i);
      return;
    }
    if(event.key === 'Enter'){
      // Selecciona la opción resaltada de la lista; NUNCA envía el
      // formulario ni cierra el modal/pantalla.
      event.preventDefault();
      event.stopPropagation();
      const resaltado = this._nacResaltado[i];
      if(resultados.length && resaltado !== undefined && resaltado >= 0){
        const pais = resultados[resaltado];
        this.seleccionarNacionalidad(i, pais.code, pais.name);
      }
      return;
    }
  },

  // Al cambiar el tipo de documento, se limpia el campo de número de
  // documento por completo — evita dejar residuo del formato/máscara del
  // tipo anterior (por ejemplo, un "12345678-9" de DUI quedando tal cual
  // en el campo al cambiar a Pasaporte o Carnet de menor).
  onTipoDocumentoChange(selectEl){
    const contenedor = selectEl.closest('.pasajero-form');
    if(!contenedor) return;
    const inputDoc = contenedor.querySelector('input[data-f="numeroDocumento"]');
    if(inputDoc){
      inputDoc.value = '';
      this.formatearDocumento(inputDoc);
      this.limpiarErrorDocumento(inputDoc);
    }
  },

  // DUI: máscara automática ########-# (8 dígitos, guion, 1 dígito
  // verificador) — formato oficial del DUI de El Salvador, el mismo que ya
  // usa el proyecto como ejemplo (MOCK.clientes: '01234567-8'). El usuario
  // solo escribe/pega números; el guion se inserta automáticamente.
  // PASAPORTE / CARNET_MENOR: solo letras y números (sin puntos, guiones,
  // espacios ni emojis), máximo 20 caracteres — se filtra en vivo.
  formatearDocumento(input){
    const contenedor = input.closest('.pasajero-form');
    const selectTipo = contenedor ? contenedor.querySelector('select[data-f="tipoDocumento"]') : null;
    const tipo = selectTipo ? selectTipo.value : '';
    if(tipo === 'DUI'){
      let digitos = input.value.replace(/\D/g,'').slice(0,9);
      if(digitos.length > 8) digitos = digitos.slice(0,8) + '-' + digitos.slice(8);
      input.value = digitos;
    } else {
      input.value = input.value.replace(/[^A-Za-z0-9]/g,'').slice(0,20);
    }
  },

  limpiarErrorDocumento(input){
    const mensaje = document.getElementById(`msgDocumento_${input.dataset.p}`);
    if(mensaje) mensaje.textContent = '';
  },

  validarDocumentosDuplicados(){
    const vistos = {};
    document.querySelectorAll('#formPasajeros input[data-f="numeroDocumento"]').forEach(input=>{
      const mensaje = document.getElementById(`msgDocumento_${input.dataset.p}`);
      if(mensaje) mensaje.textContent = '';
      const documento = input.value.trim().toUpperCase();
      if(!documento) return;
      if(vistos[documento]){
        const pasajeroActual = Number(input.dataset.p) + 1;
        const pasajeroAnterior = Number(vistos[documento].dataset.p) + 1;
        const texto = `Este documento ya fue ingresado para el pasajero ${pasajeroAnterior}.`;
        const mensajeActual = document.getElementById(`msgDocumento_${input.dataset.p}`);
        const mensajeAnterior = document.getElementById(`msgDocumento_${vistos[documento].dataset.p}`);
        if(mensajeActual) mensajeActual.textContent = texto;
        if(mensajeAnterior) mensajeAnterior.textContent = `Este documento está repetido con el pasajero ${pasajeroActual}.`;
      } else {
        vistos[documento] = input;
      }
    });
  },

  formatearTelefono(input){
    input.value = Util.formatPhoneNumber(input.value);
  },

  leerContacto(){
    Estado.contacto = {
      nombre: document.getElementById('contactoNombre').value.trim(),
      email: document.getElementById('contactoEmail').value.trim(),
      emailConfirmacion: document.getElementById('contactoEmailConfirmacion').value.trim(),
      telefono: document.getElementById('contactoTelefono').value.trim()
    };
  },

  continuar(){
    this.leerFormulario();
    let huboError = false;
    let mensajes = [];
    Estado.pasajeros.forEach((p,i)=>{
      const err = Validar.pasajero(p);
      if(Object.keys(err).length){
        huboError = true;
        mensajes.push(`Pasajero ${i+1}: revisa los campos marcados.`);
      }
      const edadOk = this.validarEdadPasajero(i);
      if(!edadOk){
        huboError = true;
        mensajes.push(`Pasajero ${i+1}: la fecha de nacimiento no corresponde a la categoría seleccionada.`);
      }
    });
    // Documentos duplicados: dos pasajeros de la misma reserva no pueden
    // usar el mismo número de documento (DUI, pasaporte o carné de menor).
    const docsVistos = {};
    Estado.pasajeros.forEach((p,i)=>{
      const doc = (p.numeroDocumento||'').trim().toUpperCase();
      if(!doc) return;
      if(docsVistos[doc] !== undefined){
        huboError = true;
        mensajes.push(`Pasajeros ${docsVistos[doc]+1} y ${i+1}: el documento ${p.numeroDocumento} está repetido. Cada pasajero debe tener su propio documento.`);
      } else {
        docsVistos[doc] = i;
      }
    });
    const cont = document.getElementById('alertaPasajeros');
    if(huboError){
      cont.innerHTML = `<div class="alerta alerta-error">⚠ ${mensajes.join('<br>')}</div>`;
      window.scrollTo({top:0,behavior:'smooth'});
      return;
    }
    cont.innerHTML='';

    this.leerContacto();
    const errContacto = Validar.contacto(Estado.contacto);
    const contContacto = document.getElementById('alertaContacto');
    if(Object.keys(errContacto).length){
      contContacto.innerHTML = `<div class="alerta alerta-error">⚠ ${Object.values(errContacto).join('<br>')}</div>`;
      window.scrollTo({top:0,behavior:'smooth'});
      return;
    }
    contContacto.innerHTML='';

    Navegacion.ir('asientos');
  }
};

/* =====================================================================
   15. LÓGICA — ASIENTOS (por segmento)
===================================================================== */
const Asientos = {
  segmentoActual: 0,
  pasajeroActivo: 0,
  ocupadosCache: {}, // vueloId -> [codigos]
  _renderToken: 0, // se incrementa en cada render() para descartar respuestas que lleguen fuera de orden

  // Carga real desde la BD (php/asientos_ocupados.php) los asientos ya
  // ocupados de un vuelo. Ya no genera datos aleatorios. Se cachea en
  // memoria solo para no repetir la petición dentro de la misma sesión de
  // navegación por este vuelo; al reservar, el backend (crear_reserva.php)
  // vuelve a verificar disponibilidad real dentro de una transacción, así
  // que este caché nunca es la fuente de verdad para bloquear una reserva.
  async cargarOcupados(vueloId){
    if(vueloId in this.ocupadosCache){
      return this.ocupadosCache[vueloId];
    }
    // Si Api.obtenerAsientos() lanza (fallo real/estructura inesperada),
    // NO se escribe nada en ocupadosCache — así una consulta fallida nunca
    // queda "cacheada" como si el vuelo tuviera 0 asientos ocupados. El
    // error se repropaga tal cual para que render() lo maneje.
    const ocupados = await Api.obtenerAsientos(vueloId);
    this.ocupadosCache[vueloId] = ocupados;
    return ocupados;
  },

  ocupadosPorSegmento(segmentoIdx){
    const vuelo = Estado.segmentos[segmentoIdx].vuelo;
    // Si no hay una entrada real en caché (nunca se consultó con éxito),
    // NO se asume "sin ocupados": se devuelve null para que el llamador
    // sepa que la disponibilidad real todavía no se conoce.
    return (vuelo.id in this.ocupadosCache) ? this.ocupadosCache[vuelo.id] : null;
  },

  quienTiene(segmentoIdx, codigo){
    for(let pi=0; pi<Estado.pasajeros.length; pi++){
      const a = Estado.asientos[`${segmentoIdx}_${pi}`];
      if(a && a.codigo===codigo) return pi;
    }
    return null;
  },

  setPasajeroActivo(pi){
    if(Estado.pasajeros[pi] && Estado.pasajeros[pi].requiresSeat===false) return;
    this.pasajeroActivo = pi;
    this.render();
  },

  async irSegmento(idx){
    this.segmentoActual = idx;
    this.pasajeroActivo = 0;
    await this.render();
    if(this.segmentoActual !== idx) return; // otro cambio de segmento ocurrió mientras se esperaba
    document.querySelectorAll('#segmentoTabs .segmento-tab').forEach((b,i)=>b.classList.toggle('activo', i===idx));
  },

  click(segmentoIdx, codigo, claseTipo){
    // liberar si el pasajero activo ya tenía asiento en este segmento
    const key = `${segmentoIdx}_${this.pasajeroActivo}`;
    // evitar seleccionar un asiento realmente ocupado en la BD (defensa
    // adicional: el HTML ya no genera onclick para asientos ocupados,
    // pero esta comprobación evita inconsistencias si el DOM quedó desactualizado)
    const ocupados = this.ocupadosPorSegmento(segmentoIdx);
    if(ocupados && ocupados.includes(codigo)){
      Util.mostrarToast('Ese asiento ya está ocupado.', 'error');
      this.render();
      return;
    }
    // evitar seleccionar un asiento ya tomado por otro pasajero en este mismo segmento
    const ocupante = this.quienTiene(segmentoIdx, codigo);
    if(ocupante !== null && ocupante !== this.pasajeroActivo){
      Util.mostrarToast('Ese asiento ya fue seleccionado por otro pasajero.', 'error');
      return;
    }
    const tipo = claseTipo==='economico' ? 'ECONOMICO' : claseTipo.toUpperCase();
    const seg = Estado.segmentos[segmentoIdx];
    const claveTarifa = seg ? seg.tarifa : (segmentoIdx === 0 ? Estado.tarifaIda : Estado.tarifaRegreso);
    const incluyeAsientoGratis = Util.tarifaIncluyeAsiento(claveTarifa);
    const precioAsiento = incluyeAsientoGratis ? 0 : (MOCK.precioAsiento[tipo] || 0);

    Estado.asientos[key] = {codigo, tipo, precio: precioAsiento};
    if(incluyeAsientoGratis && tipo !== 'ECONOMICO'){
      Util.mostrarToast(`Asiento ${codigo} incluido sin costo por tu tarifa ${MOCK.tarifas[claveTarifa]?.nombre || ''}`, 'exito');
    }
    // avanzar automáticamente al siguiente pasajero que sí requiere asiento y aún no tiene uno en este segmento
    const siguiente = Estado.pasajeros.findIndex((p,i)=> p.requiresSeat && !Estado.asientos[`${segmentoIdx}_${i}`]);
    if(siguiente !== -1) this.pasajeroActivo = siguiente;
    this.render();
  },

  async render(){
    const cont = document.getElementById('contenidoAsientos');
    if(!cont) return;
    const miToken = ++this._renderToken;
    const vuelo = Estado.segmentos[this.segmentoActual].vuelo;
    if(!(vuelo.id in this.ocupadosCache)){
      cont.innerHTML = '<p class="seccion-sub">Consultando disponibilidad real de asientos…</p>';
    }
    try{
      await this.cargarOcupados(vuelo.id);
    } catch(e){
      // Si mientras esperábamos esta consulta el usuario ya disparó otro
      // render() (cambió de segmento/pasajero), esta respuesta llegó tarde
      // y no debe pisar el DOM del render más reciente.
      if(this._renderToken !== miToken) return;
      // No se pudo confirmar la disponibilidad real: NO se pinta el mapa
      // (eso mostraría todo como libre incorrectamente). Se informa
      // claramente y se ofrece reintentar.
      cont.innerHTML = `
        <div class="alerta alerta-error">
          ⚠ No se pudo consultar la disponibilidad de asientos. Intenta nuevamente.
          <div style="margin-top:10px"><button class="btn btn-outline btn-sm" onclick="Asientos.render()">Reintentar</button></div>
        </div>`;
      return;
    }
    if(this._renderToken !== miToken) return; // idem: descartar si quedó obsoleto
    cont.innerHTML = Vistas.mapaAsientosHTML(vuelo, this.segmentoActual);
  },

  continuar(){
    // No permitir avanzar si para algún segmento nunca se logró una
    // consulta real y válida de disponibilidad (ocupadosCache sin entrada
    // para ese vuelo) — evita continuar con asientos elegidos sobre una
    // disponibilidad que nunca se pudo confirmar contra la BD.
    const segmentoSinConsulta = Estado.segmentos.find(s => !(s.vuelo.id in this.ocupadosCache));
    if(segmentoSinConsulta){
      Util.mostrarToast('No se pudo confirmar la disponibilidad real de asientos. Vuelve a intentarlo antes de continuar.', 'error');
      return;
    }
    // validar que todos los pasajeros que requieren asiento (no bebés) lo tengan en todos los segmentos
    let faltantes = [];
    Estado.segmentos.forEach((s,si)=>{
      Estado.pasajeros.forEach((p,pi)=>{
        if(p.requiresSeat===false) return; // los bebés viajan en brazos, no requieren asiento
        if(!Estado.asientos[`${si}_${pi}`]) faltantes.push(`Segmento ${si+1}, Pasajero ${pi+1}`);
      });
    });
    if(faltantes.length){
      Util.mostrarToast('Faltan asientos por asignar: '+faltantes.slice(0,3).join(', ')+(faltantes.length>3?'...':''), 'error');
      return;
    }
    Navegacion.ir('servicios');
  }
};

/* =====================================================================
   16. LÓGICA — SERVICIOS
===================================================================== */
const Servicios = {
  sincronizarIncluidos(){
    if(!Array.isArray(Estado.pasajeros)) return;
    // 1. Sincronizar los que vienen por tarifa para todos
    Estado.pasajeros.forEach((_, pi)=>{
      if(!Estado.servicios[pi]) Estado.servicios[pi] = [];
      MOCK.servicios.forEach(s=>{
        if(Util.viajeIncluyeServicio(s.id)){
          if(!Estado.servicios[pi].includes(s.id)){
            Estado.servicios[pi].push(s.id);
          }
        }
      });
    });

    // 2. Sincronizar bebés con los servicios (SALA_VIP y ABORDAJE_PRIORITARIO) que sus responsables tengan
    this.sincronizarBebes();
  },

  sincronizarBebes(){
    if(!Array.isArray(Estado.pasajeros)) return;
    const serviciosVipAdultos = {
      SALA_VIP: false,
      ABORDAJE_PRIORITARIO: false
    };

    Estado.pasajeros.forEach((adulto, aIdx)=>{
      if(adulto.requiresSeat === false || adulto.type === 'infant') return;
      const servs = Estado.servicios[aIdx] || [];
      if(Util.viajeIncluyeServicio('SALA_VIP') || servs.includes('SALA_VIP')) serviciosVipAdultos.SALA_VIP = true;
      if(Util.viajeIncluyeServicio('ABORDAJE_PRIORITARIO') || servs.includes('ABORDAJE_PRIORITARIO')) serviciosVipAdultos.ABORDAJE_PRIORITARIO = true;
    });

    Estado.pasajeros.forEach((p, pi)=>{
      if(p.requiresSeat !== false && p.type !== 'infant') return; // solo bebés
      if(!Estado.servicios[pi]) Estado.servicios[pi] = [];
      ['SALA_VIP', 'ABORDAJE_PRIORITARIO'].forEach(sid=>{
        if(serviciosVipAdultos[sid]){
          if(!Estado.servicios[pi].includes(sid)) Estado.servicios[pi].push(sid);
        } else {
          // Si ningún adulto lo tiene, el bebé no lo tiene
          Estado.servicios[pi] = Estado.servicios[pi].filter(id => id !== sid);
        }
      });
    });
  },

  toggle(pasajeroIdx, servicioId, activo){
    if(Util.servicioEstaIncluidoParaPasajero(pasajeroIdx, servicioId)) return; // No se puede desmarcar si está incluido
    if(!Estado.servicios[pasajeroIdx]) Estado.servicios[pasajeroIdx] = [];
    if(activo){
      if(!Estado.servicios[pasajeroIdx].includes(servicioId)) Estado.servicios[pasajeroIdx].push(servicioId);
    } else {
      Estado.servicios[pasajeroIdx] = Estado.servicios[pasajeroIdx].filter(id=>id!==servicioId);
    }

    // Si un adulto cambió Sala VIP o Abordaje Prioritario, actualizar a los bebés y re-renderizar la vista
    if(servicioId === 'SALA_VIP' || servicioId === 'ABORDAJE_PRIORITARIO'){
      this.sincronizarBebes();
      Render.pantalla('servicios');
    }
  }
};

/* =====================================================================
   17. LÓGICA — PAGO
===================================================================== */
const Pago = {
  metodo: 'TARJETA',

  setMetodo(m){
    this.metodo = m;
    // Re-renderizar el bloque de métodos de pago y el formulario correspondiente
    Navegacion.ir('pago', {silencioso:true});
  },

  formatearNumeroTarjeta(input){ input.value = Util.formatCardNumber(input.value); },
  formatearVencimiento(input){ input.value = Util.formatExpiry(input.value); },
  moverAlAnioVencimiento(event, input){
    if(event.key !== 'ArrowRight') return;
    const digitos = input.value.replace(/\D/g,'');
    if(digitos.length === 1 && digitos !== '0'){
      event.preventDefault();
      input.value = '0' + digitos + '/';
      input.setSelectionRange(3, 3);
    } else if(digitos.length === 2 && /^(0[1-9]|1[0-2])$/.test(digitos)){
      event.preventDefault();
      input.value = digitos + '/';
      input.setSelectionRange(3, 3);
    }
  },
  formatearCvv(input){ input.value = Util.sanitizeNumericInput(input.value, 4); },

  validarTarjeta(){
    const nombre = document.getElementById('pagoNombre').value.trim();
    const numero = document.getElementById('pagoNumero').value.replace(/\s/g,'');
    const venc = document.getElementById('pagoVencimiento').value.trim();
    const cvv = document.getElementById('pagoCvv').value.trim();
    const errores = [];
    if(!nombre) errores.push('Ingresa el nombre del titular.');
    if(!/^\d{13,19}$/.test(numero)) errores.push('Número de tarjeta inválido.');
    const mVenc = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(venc);
    if(!mVenc){
      errores.push('Vencimiento inválido (MM/AA, mes 01-12).');
    } else {
      // Ni vencida ni a más de 12 meses hacia adelante (mes incluido).
      const fechaVenc = new Date(2000 + parseInt(mVenc[2],10), parseInt(mVenc[1],10) - 1, 1);
      const hoy = new Date();
      const mesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      const limite12Meses = new Date(hoy.getFullYear(), hoy.getMonth() + 12, 1);
      if(fechaVenc < mesActual) errores.push('La tarjeta está vencida.');
      else if(fechaVenc > limite12Meses) errores.push('El vencimiento no puede ser mayor a 12 meses.');
    }
    if(!/^\d{3,4}$/.test(cvv)) errores.push('CVV inválido.');
    return {errores, detalle:{tarjeta_terminacion: numero.slice(-4)}};
  },

  validarTransferencia(){
    const banco = document.getElementById('transBanco').value;
    const referencia = document.getElementById('transReferencia').value.trim();
    const errores = [];
    if(!banco) errores.push('Selecciona el banco emisor.');
    if(!/^\d{4,20}$/.test(referencia)) errores.push('Ingresa un número de cuenta o referencia válido (solo números).');
    return {errores, detalle:{banco, referencia}};
  },

  validarBilletera(){
    const tipo = document.getElementById('billeteraTipo').value;
    const cuenta = document.getElementById('billeteraCuenta').value.trim();
    const errores = [];
    if(!tipo) errores.push('Selecciona la billetera digital.');
    if(!/^\d{4}-\d{4}$/.test(cuenta)) errores.push('Ingresa un número de cuenta/teléfono válido de 8 dígitos.');
    return {errores, detalle:{billetera:tipo, cuenta}};
  },

  validarMetodoActual(){
    if(this.metodo==='TARJETA') return this.validarTarjeta();
    if(this.metodo==='TRANSFERENCIA') return this.validarTransferencia();
    if(this.metodo==='BILLETERA') return this.validarBilletera();
    return {errores:['Selecciona un método de pago.'], detalle:{}};
  },

  async procesar(){
    // Doble verificación: un vuelo cancelado nunca debe poder pagarse, aunque ya se haya avanzado.
    if((Estado.vueloIda && !Util.isFlightBookable(Estado.vueloIda)) || (Estado.vueloRegreso && !Util.isFlightBookable(Estado.vueloRegreso))){
      Util.mostrarToast('Uno de los vuelos seleccionados está cancelado y no puede reservarse.', 'error');
      Navegacion.ir('vuelos');
      return;
    }

    const {errores, detalle} = this.validarMetodoActual();
    const cont = document.getElementById('alertaPago');
    if(errores.length){
      cont.innerHTML = `<div class="alerta alerta-error">⚠ ${errores.join('<br>')}</div>`;
      return;
    }
    cont.innerHTML='';
    Precios.calcular();

    let errorReserva = null;
    await Util.conLoader('Procesando pago...', async ()=>{
      const resultadoPago = await Api.crearPago({
        metodo:this.metodo, monto:Estado.precios.total, detalle
      });

      // Mapeo de clave de tarifa (frontend) a fare_class real de la BD
      // (fare_classes.code / flight_segments.fare_class): economy, premium,
      // business, first. No se inventan valores nuevos.
      const mapaFareClass = {ECONOMICA:'economy', PREMIUM:'premium', BUSINESS:'business', PRIMERA:'first'};

      // construir payload de reserva (nunca se guarda número completo ni CVV)
      const segmentosPayload = Estado.segmentos.map((s,si)=>{
        const esReal = !!s.vuelo.origen && !!s.vuelo.destino;
        const ruta = esReal ? null : Util.rutaPorId(s.vuelo.ruta_id);
        const origen = esReal ? s.vuelo.origen : Util.aeropuertoPorId(ruta.origen_id);
        const destino = esReal ? s.vuelo.destino : Util.aeropuertoPorId(ruta.destino_id);
        const claveTarifa = s.tipo==='IDA' ? Estado.tarifaIda : Estado.tarifaRegreso;
        // Un asiento por cada pasajero, en el mismo orden que Estado.pasajeros.
        const asientos = Estado.pasajeros.map((p,pi)=> Estado.asientos[`${si}_${pi}`] ? Estado.asientos[`${si}_${pi}`].codigo : null);
        return {
          numero_vuelo: s.vuelo.numero_vuelo,
          origen: origen.codigo_iata,
          destino: destino.codigo_iata,
          fecha: s.tipo==='IDA' ? Estado.busqueda.fechaIda : Estado.busqueda.fechaRegreso,
          flight_id: esReal ? s.vuelo.id : null,
          fare_class: mapaFareClass[claveTarifa] || 'economy',
          precio_unitario: esReal ? (Util.obtenerPrecioTarifa(s.vuelo, claveTarifa) || 0) : 0,
          asientos,
          // Se conservan para el HTML del comprobante (no usados por crear_reserva.php):
          asiento: asientos[0] || '-',
          estado_check_in: 0,
          pase_abordar_emitido: 0
        };
      });

      const payload = {
        cliente_id: Estado.usuario ? Estado.usuario.id : null,
        tipo_viaje: Estado.busqueda.tipoViaje,
        total: Estado.precios.total,
        pasajeros: Estado.pasajeros.map(p=>({nombres:p.nombres, apellidos:p.apellidos, documento:p.numeroDocumento, tipo:p.type, tipoDocumento:p.tipoDocumento, nacionalidad:p.nacionalidad})),
        segmentos: segmentosPayload,
        pago: {metodo:this.metodo, estado: resultadoPago.estado || 'APROBADO', monto: Estado.precios.total, ultimos4: detalle.tarjeta_terminacion || null},
        servicios: Util.obtenerDetalleServicios(),
        // Datos de contacto para el envío del comprobante (booking.contact)
        contacto: {
          nombre: Estado.contacto.nombre,
          email: Estado.contacto.email,
          telefono: Estado.contacto.telefono
        }
      };

      try{
        const reserva = await Api.crearReserva(payload);
        Estado.reservaActual = reserva;
      } catch(e){
        // Puede ocurrir si, entre la selección de asientos y este momento,
        // otra reserva concurrente ya tomó el mismo asiento (verificado por
        // el backend dentro de una transacción — ver crear_reserva.php).
        errorReserva = e.message || 'No se pudo completar la reserva. Intenta nuevamente.';
      }
    });

    if(errorReserva){
      cont.innerHTML = `<div class="alerta alerta-error">⚠ ${errorReserva}</div>`;
      return;
    }

    Navegacion.ir('confirmacion');
  }
};

/* =====================================================================
   17-B. LÓGICA — ENVÍO DE COMPROBANTE POR CORREO
   sendBookingEmail(): hace fetch() real cuando USE_MOCKS=false.
   Arquitectura: index.php -> API REST (Render) -> Gmail SMTP -> cliente.
   El frontend nunca conoce contraseñas ni credenciales SMTP.
===================================================================== */
const Comprobante = {
  enviando: false,

  async enviar(){
    if(this.enviando) return;
    const r = Estado.reservaActual;
    if(!r || !r.contacto || !r.contacto.email) return;

    const cont = document.getElementById('alertaEnvioComprobante');
    const btn = document.getElementById('btnEnviarComprobante');

    this.enviando = true;
    if(btn){ btn.disabled = true; btn.textContent = 'Enviando comprobante...'; }
    if(cont) cont.innerHTML = '';

    try{
      const res = await Api.sendBookingEmail(r);

      if(res.ok){
        if(cont) cont.innerHTML = `<div class="alerta alerta-exito">✅ Comprobante enviado correctamente a: <b>${Util.escapeHtml(r.contacto.email)}</b></div>`;
        Util.mostrarToast('Comprobante enviado a '+r.contacto.email, 'exito');
        if(btn){ btn.textContent = '✓ Comprobante enviado'; btn.disabled = false; }
      } else if(res.demo){
        // Modo demostración: el backend de correo todavía no está conectado.
        // Nunca se afirma que el correo fue enviado si realmente no ocurrió.
        if(cont) cont.innerHTML = `<div class="alerta alerta-info">ℹ ${Util.escapeHtml(res.mensaje)}</div>`;
        Util.mostrarToast(res.mensaje, 'info');
        if(btn){ btn.textContent = '✉ Enviar comprobante por correo'; btn.disabled = false; }
      } else {
        if(cont) cont.innerHTML = `<div class="alerta alerta-error">⚠ No pudimos enviar el comprobante. Intenta nuevamente.</div>`;
        if(btn){ btn.textContent = 'Reintentar envío'; btn.disabled = false; }
      }
    } catch(e){
      if(cont) cont.innerHTML = `<div class="alerta alerta-error">⚠ No pudimos enviar el comprobante. Intenta nuevamente.</div>`;
      if(btn){ btn.textContent = 'Reintentar envío'; btn.disabled = false; }
    } finally {
      this.enviando = false;
    }
  }
};

/* =====================================================================
   18. LÓGICA — CONSULTAR RESERVA
===================================================================== */
const ConsultaReserva = {
  async buscar(){
    const pnr = document.getElementById('inputPNR').value.trim().toUpperCase();
    const ref = document.getElementById('inputRef').value.trim();
    const cont = document.getElementById('alertaConsulta');
    const resultado = document.getElementById('resultadoConsulta');
    if(!pnr || !ref){
      cont.innerHTML = `<div class="alerta alerta-error">⚠ Debes ingresar el PNR y tu documento o correo.</div>`;
      return;
    }
    cont.innerHTML='';
    resultado.innerHTML = `<div class="estado-vacio"><div class="icono">🔎</div>Buscando reserva...</div>`;
    const r = await Api.obtenerReserva(pnr, ref);
    if(!r){
      resultado.innerHTML = `<div class="alerta alerta-error">No se encontró ninguna reserva con ese PNR.</div>`;
      return;
    }
    resultado.innerHTML = Vistas.tarjetaReserva(r);
  }
};

/* =====================================================================
   19. LÓGICA — AUTENTICACIÓN (simulada)
===================================================================== */
const Auth = {
  async login(){
    const correo = document.getElementById('loginCorreo').value.trim();
    const password = document.getElementById('loginPassword').value;
    const cont = document.getElementById('alertaLogin');
    const res = await Api.iniciarSesion(correo, password);
    if(!res.ok){
      cont.innerHTML = `<div class="alerta alerta-error">⚠ ${res.mensaje||'No se pudo iniciar sesión.'}</div>`;
      return;
    }
    this._aplicarSesion(res.cliente, 'Bienvenido, ' + res.cliente.nombre);
  },

  _aplicarSesion(cliente, mensajeToast){
    Estado.usuario = cliente;
    const btnNav = document.getElementById('btnAuthNav');
    if(btnNav){
      btnNav.textContent = cliente.nombre || cliente.correo || 'Mi cuenta';
      btnNav.onclick = ()=>Navegacion.ir('perfil');
    }
    if(mensajeToast) Util.mostrarToast(mensajeToast, 'exito');
    Navegacion.ir('perfil');
  },

  async registrar(){
    const datos = {
      nombre: document.getElementById('regNombre').value.trim(),
      apellido: document.getElementById('regApellido').value.trim(),
      correo: document.getElementById('regCorreo').value.trim(),
      telefono: document.getElementById('regTelefono').value.trim(),
      documento: document.getElementById('regDocumento').value.trim(),
      password: document.getElementById('regPassword').value
    };
    const passwordConfirm = document.getElementById('regPasswordConfirm').value;
    const cont = document.getElementById('alertaRegistro');
    if(!datos.nombre || !datos.apellido || !Validar.correoValido(datos.correo) || !datos.password){
      cont.innerHTML = `<div class="alerta alerta-error">⚠ Completa todos los campos con un correo válido.</div>`;
      return;
    }
    if(datos.password !== passwordConfirm){
      cont.innerHTML = `<div class="alerta alerta-error">⚠ Las contraseñas no coinciden.</div>`;
      return;
    }
    const res = await Api.registrarCliente(datos);
    if(!res.ok){
      cont.innerHTML = `<div class="alerta alerta-error">⚠ ${res.mensaje}</div>`;
      return;
    }
    // Iniciar sesión automáticamente al crear la cuenta
    this._aplicarSesion(res.cliente, '¡Cuenta creada! Bienvenido, ' + res.cliente.nombre);
  },

  logout(){
    Estado.usuario = null;
    const btnNav = document.getElementById('btnAuthNav');
    if(btnNav){
      btnNav.textContent = 'Iniciar sesión';
      btnNav.onclick = ()=>Navegacion.ir('login');
    }
    Util.mostrarToast('Sesión cerrada', 'info');
    Navegacion.ir('inicio');
  },

  abrirRecuperar(){
    // Mostrar modal de recuperación de contraseña
    let overlay = document.getElementById('modalRecuperar');
    if(!overlay){
      overlay = document.createElement('div');
      overlay.id = 'modalRecuperar';
      overlay.className = 'modal-recuperar-overlay';
      overlay.innerHTML = `
        <div class="modal-recuperar-box">
          <button class="modal-recuperar-cerrar" onclick="Auth.cerrarRecuperar()" aria-label="Cerrar">✕</button>
          <h3 style="color:var(--azul-oscuro);margin-bottom:8px">🔑 Recuperar contraseña</h3>
          <p style="font-size:.85rem;color:#889;margin-bottom:16px">Ingresa tu correo registrado y te enviaremos instrucciones para restablecer tu contraseña.</p>
          <div id="alertaRecuperar"></div>
          <div class="campo-form" style="margin-bottom:14px">
            <label>Correo electrónico</label>
            <input type="email" id="recuperarCorreo" placeholder="tu@correo.com" onkeydown="if(event.key==='Enter') Auth.recuperar()">
          </div>
          <button class="btn btn-primario btn-block" onclick="Auth.recuperar()">Enviar instrucciones</button>
        </div>`;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', function(e){ if(e.target === overlay) Auth.cerrarRecuperar(); });
    }
    overlay.style.display = 'flex';
    setTimeout(()=>{ const el = document.getElementById('recuperarCorreo'); if(el) el.focus(); }, 80);
  },

  cerrarRecuperar(){
    const overlay = document.getElementById('modalRecuperar');
    if(overlay) overlay.style.display = 'none';
    const alerta = document.getElementById('alertaRecuperar');
    if(alerta) alerta.innerHTML = '';
  },

  async recuperar(){
    const correo = (document.getElementById('recuperarCorreo')?.value || '').trim();
    const alerta = document.getElementById('alertaRecuperar');
    if(!correo || !Validar.correoValido(correo)){
      if(alerta) alerta.innerHTML = `<div class="alerta alerta-error">⚠ Ingresa un correo válido.</div>`;
      return;
    }
    if(alerta) alerta.innerHTML = `<div class="alerta alerta-info">⏳ Enviando instrucciones a tu correo...</div>`;
    try{
      const res = await fetch(API_CONFIG.ENDPOINT_RECUPERAR_REAL, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({correo})
      });
      const data = await res.json();
      if(data.ok){
        if(alerta) alerta.innerHTML = `<div class="alerta alerta-exito">✅ Si el correo existe en nuestros registros, recibirás las instrucciones en breve. Revisa también tu carpeta de spam.</div>`;
        Util.mostrarToast('Instrucciones enviadas', 'exito');
      } else {
        if(alerta) alerta.innerHTML = `<div class="alerta alerta-error">⚠ ${Util.escapeHtml(data.mensaje || 'No se pudo procesar la solicitud.')}</div>`;
      }
    } catch(e){
      if(alerta) alerta.innerHTML = `<div class="alerta alerta-error">⚠ Error de conexión al procesar la solicitud.</div>`;
    }
  },

  abrirResetPassword(token){
    let overlay = document.getElementById('modalResetPassword');
    if(!overlay){
      overlay = document.createElement('div');
      overlay.id = 'modalResetPassword';
      overlay.className = 'modal-recuperar-overlay';
      overlay.innerHTML = `
        <div class="modal-recuperar-box">
          <button class="modal-recuperar-cerrar" onclick="Auth.cerrarResetPassword()" aria-label="Cerrar">✕</button>
          <h3 style="color:var(--azul-oscuro);margin-bottom:8px">🔒 Nueva contraseña</h3>
          <p style="font-size:.85rem;color:#889;margin-bottom:16px">Ingresa tu nueva contraseña para acceder a Acajutla Airlines.</p>
          <div id="alertaResetPassword"></div>
          <input type="hidden" id="resetTokenVal" value="">
          <div class="campo-form" style="margin-bottom:12px">
            <label>Nueva contraseña (mínimo 6 caracteres)</label>
            <div style="position:relative">
              <input type="password" id="resetNuevaPassword" placeholder="••••••" style="width:100%;padding-right:40px;box-sizing:border-box" onkeydown="Util.handleEnter(event,'resetConfirmarPassword')">
              <button type="button" onclick="Util.togglePasswordVisibility('resetNuevaPassword', this)" aria-label="Mostrar contraseña" style="position:absolute;right:6px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:1rem;padding:4px">👁️</button>
            </div>
          </div>
          <div class="campo-form" style="margin-bottom:16px">
            <label>Confirmar contraseña</label>
            <div style="position:relative">
              <input type="password" id="resetConfirmarPassword" placeholder="••••••" style="width:100%;padding-right:40px;box-sizing:border-box" onkeydown="Util.handleEnter(event,null,Auth.guardarNuevaPassword.bind(Auth))">
              <button type="button" onclick="Util.togglePasswordVisibility('resetConfirmarPassword', this)" aria-label="Mostrar contraseña" style="position:absolute;right:6px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:1rem;padding:4px">👁️</button>
            </div>
          </div>
          <button class="btn btn-primario btn-block" onclick="Auth.guardarNuevaPassword()">Guardar contraseña</button>
        </div>`;
      document.body.appendChild(overlay);
    }
    document.getElementById('resetTokenVal').value = token;
    const alerta = document.getElementById('alertaResetPassword');
    if(alerta) alerta.innerHTML = '';
    overlay.style.display = 'flex';
    setTimeout(()=>{ const el = document.getElementById('resetNuevaPassword'); if(el) el.focus(); }, 80);
  },

  cerrarResetPassword(){
    const overlay = document.getElementById('modalResetPassword');
    if(overlay) overlay.style.display = 'none';
  },

  async guardarNuevaPassword(){
    const token = document.getElementById('resetTokenVal')?.value;
    const p1 = document.getElementById('resetNuevaPassword')?.value;
    const p2 = document.getElementById('resetConfirmarPassword')?.value;
    const alerta = document.getElementById('alertaResetPassword');

    if(!p1 || p1.length < 6){
      if(alerta) alerta.innerHTML = `<div class="alerta alerta-error">⚠ La contraseña debe tener al menos 6 caracteres.</div>`;
      return;
    }
    if(p1 !== p2){
      if(alerta) alerta.innerHTML = `<div class="alerta alerta-error">⚠ Las contraseñas no coinciden.</div>`;
      return;
    }

    if(alerta) alerta.innerHTML = `<div class="alerta alerta-info">⏳ Guardando nueva contraseña...</div>`;
    try{
      const res = await fetch(API_CONFIG.ENDPOINT_RESET_PASSWORD_REAL, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({token, password: p1})
      });
      const data = await res.json();
      if(data.ok){
        Util.mostrarToast('Contraseña restablecida con éxito', 'exito');
        Auth.cerrarResetPassword();
        window.history.replaceState({}, document.title, window.location.pathname);
        Navegacion.ir('login');
      } else {
        if(alerta) alerta.innerHTML = `<div class="alerta alerta-error">⚠ ${Util.escapeHtml(data.mensaje || 'Error al actualizar contraseña.')}</div>`;
      }
    } catch(e){
      if(alerta) alerta.innerHTML = `<div class="alerta alerta-error">⚠ Error de red al comunicarse con el servidor.</div>`;
    }
  }
};

/* =====================================================================
   20. LÓGICA — ESTADO DE VUELO
===================================================================== */
const EstadoVuelo = {
  async buscar(){
    const numero = document.getElementById('inputNumeroVuelo').value.trim();
    const fecha = document.getElementById('inputFechaVuelo').value;
    const cont = document.getElementById('alertaEstadoVuelo');
    const resultado = document.getElementById('resultadoEstadoVuelo');
    if(!numero){
      cont.innerHTML = `<div class="alerta alerta-error">⚠ Ingresa un número de vuelo.</div>`;
      return;
    }
    cont.innerHTML='';
    resultado.innerHTML = `<div class="estado-vacio"><div class="icono">🛰</div>Consultando...</div>`;
    const v = await Api.consultarEstadoVuelo(numero, fecha);
    if(!v){
      resultado.innerHTML = `<div class="alerta alerta-error">No se encontró información para ese número de vuelo.</div>`;
      return;
    }
    const esReal = !!v.origen && !!v.destino;
    const ruta = esReal ? null : Util.rutaPorId(v.ruta_id);
    const origen = esReal ? v.origen : Util.aeropuertoPorId(ruta.origen_id);
    const destino = esReal ? v.destino : Util.aeropuertoPorId(ruta.destino_id);
    resultado.innerHTML = `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
          <h3 style="color:var(--azul-oscuro)">Vuelo ${v.numero_vuelo}</h3>
          <span class="badge ${Util.badgeClaseEstado(v.estado)}">${Util.labelEstado(v.estado)}</span>
        </div>
        <div class="resumen-item"><h4>Ruta</h4><p>${origen.ciudad} (${origen.codigo_iata}) → ${destino.ciudad} (${destino.codigo_iata})</p></div>
        <div class="resumen-item"><h4>Salida programada</h4><p>${v.salida_programada}</p></div>
        <div class="resumen-item"><h4>Llegada programada</h4><p>${v.llegada_programada}</p></div>
        <div class="resumen-item"><h4>Salida real</h4><p>${v.salida_real || 'No registrada aún'}</p></div>
        <div class="resumen-item"><h4>Llegada real</h4><p>${v.llegada_real || 'No registrada aún'}</p></div>
        <div class="resumen-item"><h4>Puerta / Terminal</h4><p>${v.puerta||'-'} / ${v.terminal||'-'}</p></div>
      </div>`;
  }
};

/* =====================================================================
   20-B. LÓGICA — VUELOS EN VIVO (mapa tipo FlightRadar24)
   Los aviones en el aire se calculan con los horarios reales de la BD;
   la posición se interpola sobre la ruta ortodrómica entre aeropuertos.
   Coordenadas fijas por código IATA (la tabla airports no tiene lat/lng).
===================================================================== */
const VuelosEnVivo = {
  mapa: null,
  observadorTamano: null,
  intervaloTick: null,
  intervaloRefresco: null,
  vuelos: {},            // numero_vuelo -> {datos, marcador, polyline, progreso}
  offsetServidor: 0,     // Date.now()/1000 - reloj del servidor
  seleccionado: null,

  COORDENADAS: {
    SAL: [13.4409, -89.0558],  // San Salvador
    GUA: [14.5833, -90.5275],  // Ciudad de Guatemala
    MGA: [12.1408, -86.1736],  // Managua
    SJO: [9.9939, -84.2088],   // San José
    LIR: [10.5931, -85.5439],  // Liberia
    TGU: [14.0608, -87.2172],  // Tegucigalpa
    CUN: [21.0365, -86.8771],  // Cancún
    MEX: [19.4363, -99.0721],  // Ciudad de México
    PTY: [9.0714, -79.3835],   // Panamá
    BOG: [4.7016, -74.1469],   // Bogotá
    MIA: [25.7959, -80.2870],  // Miami
    JFK: [40.6413, -73.7781],  // Nueva York
    LAX: [33.9416, -118.4085], // Los Ángeles
    SFO: [37.6213, -122.3790], // San Francisco
    MAD: [40.4983, -3.5676]    // Madrid
  },

  iniciar(){
    this.detener();
    const contMapa = document.getElementById('mapaVuelosEnVivo');
    if(!contMapa) return;
    if(typeof L === 'undefined'){
      contMapa.innerHTML = '';
      document.getElementById('envivoListaVuelos').innerHTML = `<div class="estado-vacio"><div class="icono">🗺️</div>No se pudo cargar el mapa (sin conexión a internet).</div>`;
      return;
    }
    this.mapa = L.map(contMapa, {zoomControl:true, attributionControl:true}).setView([14.5, -87.5], 5);
    // Vista SATÉLITE (imágenes reales: ciudades, vegetación, lagos) con
    // capa de referencia de Esri, gratuita, estilo Google Maps satélite.
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 17,
      attribution: 'Imágenes &copy; Esri, Maxar, Earthstar Geographics'
    }).addTo(this.mapa);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 17,
      opacity: 0.9
    }).addTo(this.mapa);
    // El contenedor puede tardar en asentar su tamaño dentro del SPA:
    // sin invalidateSize las teselas quedan desalineadas o fragmentadas.
    // El ResizeObserver reajusta el mapa SIEMPRE que el contenedor cambie
    // de tamaño (grid/fonts/carga de la página), no solo en window.resize.
    this.observadorTamano = new ResizeObserver(()=>{ if(this.mapa) this.mapa.invalidateSize(); });
    this.observadorTamano.observe(contMapa);
    setTimeout(()=>{ if(this.mapa) this.mapa.invalidateSize(); }, 250);
    setTimeout(()=>{ if(this.mapa) this.mapa.invalidateSize(); }, 1200);
    this.refrescar();
    this.intervaloTick = setInterval(()=>this.tick(), 1000);
    this.intervaloRefresco = setInterval(()=>this.refrescar(), 60000);
  },

  detener(){
    if(this.intervaloTick){ clearInterval(this.intervaloTick); this.intervaloTick = null; }
    if(this.intervaloRefresco){ clearInterval(this.intervaloRefresco); this.intervaloRefresco = null; }
    if(this.observadorTamano){ try{ this.observadorTamano.disconnect(); }catch(e){} this.observadorTamano = null; }
    if(this.mapa){ try{ this.mapa.remove(); }catch(e){} this.mapa = null; }
    this.vuelos = {};
    this.seleccionado = null;
  },

  ahoraServidor(){
    return Date.now()/1000 - this.offsetServidor;
  },

  async refrescar(){
    // Guard de ruta: si el usuario salió de la sección, limpiar y no seguir.
    if(Estado.ruta !== 'vuelosEnVivo'){ this.detener(); return; }
    const res = await Api.obtenerVuelosEnVivo();
    if(Estado.ruta !== 'vuelosEnVivo'){ this.detener(); return; }
    const lista = document.getElementById('envivoListaVuelos');
    if(!res){
      if(lista) lista.innerHTML = `<div class="estado-vacio"><div class="icono">⚠️</div>No se pudieron cargar los vuelos en vivo.</div>`;
      return;
    }
    this.offsetServidor = Date.now()/1000 - res.ahoraTs;
    const recibidos = res.vuelos.filter(v => this.COORDENADAS[v.origen.codigo_iata] && this.COORDENADAS[v.destino.codigo_iata]);

    // Quitar vuelos que ya aterrizaron o desaparecieron del backend
    Object.keys(this.vuelos).forEach(nv => {
      if(!recibidos.some(v => v.numero_vuelo === nv)){
        if(this.seleccionado === nv){ this.seleccionado = null; const d = document.getElementById('envivoDetalle'); if(d) d.innerHTML=''; }
        this.mapa.removeLayer(this.vuelos[nv].marcador);
        this.mapa.removeLayer(this.vuelos[nv].polyline);
        delete this.vuelos[nv];
      }
    });

    let primero = true;
    recibidos.forEach(v => {
      const existente = this.vuelos[v.numero_vuelo];
      if(existente){
        existente.datos = v; // solo actualizar datos (evita parpadeo de marcadores)
      } else {
        this.crearVuelo(v);
        if(primero) this.mapa.setView(this.COORDENADAS[v.origen.codigo_iata], 4);
        primero = false;
      }
    });

    const contador = document.getElementById('envivoContador');
    if(contador) contador.textContent = recibidos.length;
    if(lista){
      lista.innerHTML = recibidos.length === 0
        ? `<div class="estado-vacio"><div class="icono">🛫</div>No hay aviones de Acajutla Airlines en el aire en este momento.</div>`
        : recibidos.map(v => `
          <div class="envivo-card ${this.seleccionado===v.numero_vuelo?'activa':''}" onclick="VuelosEnVivo.seleccionar('${v.numero_vuelo}')">
            <div class="envivo-card-titulo"><b>${v.numero_vuelo}</b><span>${v.origen.codigo_iata} → ${v.destino.codigo_iata}</span></div>
            <div class="envivo-card-progreso"><div class="envivo-card-barra"><div id="envivoBarra_${v.numero_vuelo}"></div></div></div>
            <div class="envivo-card-info" id="envivoInfo_${v.numero_vuelo}"></div>
          </div>`).join('');
    }
    this.tick();
  },

  crearVuelo(v){
    const cOrigen = this.COORDENADAS[v.origen.codigo_iata];
    const cDestino = this.COORDENADAS[v.destino.codigo_iata];
    const rumbo = this.rumbo(cOrigen, cDestino);
    const icono = L.divIcon({
      className: 'envivo-avion-icon',
      html: `<div class="envivo-avion" style="transform:rotate(${rumbo}deg)">✈</div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });
    const marcador = L.marker(cOrigen, {icon: icono, zIndexOffset: 1000})
      .addTo(this.mapa)
      .on('click', ()=>this.seleccionar(v.numero_vuelo));
    const polyline = L.polyline([cOrigen, cDestino], {color:'#F4B400', weight:2.5, opacity:0.9, dashArray:'8,6'})
      .addTo(this.mapa)
      .on('click', ()=>this.seleccionar(v.numero_vuelo));
    L.circleMarker(cOrigen, {radius:6, color:'#ffffff', weight:2, fillColor:'#003B95', fillOpacity:1})
      .addTo(this.mapa)
      .bindTooltip(`${v.origen.codigo_iata} · ${v.origen.ciudad}`, {permanent:true, direction:'top', className:'envivo-etiqueta-aeropuerto'});
    L.circleMarker(cDestino, {radius:6, color:'#ffffff', weight:2, fillColor:'#2E8B57', fillOpacity:1})
      .addTo(this.mapa)
      .bindTooltip(`${v.destino.codigo_iata} · ${v.destino.ciudad}`, {permanent:true, direction:'top', className:'envivo-etiqueta-aeropuerto'});
    this.vuelos[v.numero_vuelo] = {datos: v, marcador, polyline, progreso: v.progreso};
  },

  seleccionar(numeroVuelo){
    const v = this.vuelos[numeroVuelo];
    if(!v) return;
    this.seleccionado = numeroVuelo;
    this.mapa.setView(v.marcador.getLatLng(), 6);
    document.querySelectorAll('.envivo-card').forEach(el => el.classList.remove('activa'));
    const card = document.getElementById('envivoInfo_' + numeroVuelo)?.closest('.envivo-card');
    if(card) card.classList.add('activa');
    this.pintarDetalle(v);
  },

  pintarDetalle(v){
    const cont = document.getElementById('envivoDetalle');
    if(!cont) return;
    const d = v.datos;
    const hhmmsal = d.salida_texto  || new Date(d.salida_ts*1000).toLocaleTimeString('es-SV',{hour:'2-digit',minute:'2-digit'});
    const hhmmll  = d.llegada_texto || new Date(d.llegada_ts*1000).toLocaleTimeString('es-SV',{hour:'2-digit',minute:'2-digit'});
    cont.innerHTML = `
      <div class="card envivo-detalle">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <h3 style="color:var(--azul-oscuro)">Vuelo ${d.numero_vuelo}</h3>
          <button class="envivo-cerrar" onclick="VuelosEnVivo.cerrarDetalle()">✕</button>
        </div>
        <div class="resumen-item"><h4>Ruta</h4><p>${d.origen.ciudad} (${d.origen.codigo_iata}) → ${d.destino.ciudad} (${d.destino.codigo_iata})</p></div>
        <div class="resumen-item"><h4>Horario</h4><p>Salida ${hhmmsal} · Llegada ${hhmmll}</p></div>
        <div class="resumen-item"><h4>Tiempo de vuelo</h4><p id="envivoDetTranscurrido"></p></div>
        <div class="resumen-item"><h4>Tiempo restante</h4><p id="envivoDetRestante"></p></div>
        <div class="resumen-item"><h4>Distancia total</h4><p>${d.distancia_km!==null ? Util.formatoNumero(d.distancia_km)+' km' : 'N/D'}</p></div>
        <div class="resumen-item"><h4>Distancia restante</h4><p id="envivoDetDistRestante"></p></div>
        ${d.aeronave.matricula ? `<div class="resumen-item"><h4>Aeronave</h4><p>${d.aeronave.matricula} · ${d.aeronave.fabricante||''} ${d.aeronave.modelo||''}</p></div>` : ''}
      </div>`;
    this.actualizarDetalle(v);
  },

  cerrarDetalle(){
    this.seleccionado = null;
    const cont = document.getElementById('envivoDetalle');
    if(cont) cont.innerHTML = '';
    document.querySelectorAll('.envivo-card').forEach(el => el.classList.remove('activa'));
  },

  tick(){
    // Guard de ruta: el SPA no tiene hook de salida, así que el propio tick
    // detecta que se abandonó la sección y libera mapa e intervalos.
    if(Estado.ruta !== 'vuelosEnVivo'){ this.detener(); return; }
    const ahora = this.ahoraServidor();
    Object.values(this.vuelos).forEach(v => {
      const d = v.datos;
      const progreso = Math.min(1, Math.max(0, (ahora - d.salida_ts) / (d.llegada_ts - d.salida_ts)));
      v.progreso = progreso;
      const pos = this.interpolar(
        this.COORDENADAS[d.origen.codigo_iata],
        this.COORDENADAS[d.destino.codigo_iata],
        progreso
      );
      v.marcador.setLatLng(pos);
      // Actualizar tarjetas de la lista
      const barra = document.getElementById('envivoBarra_' + d.numero_vuelo);
      if(barra) barra.style.width = (progreso*100).toFixed(1) + '%';
      const info = document.getElementById('envivoInfo_' + d.numero_vuelo);
      if(info) info.textContent = `${Util.formatoDuracion((ahora-d.salida_ts)/60)} transcurridos · quedan ${Util.formatoDuracion((d.llegada_ts-ahora)/60)}`;
      if(this.seleccionado === d.numero_vuelo) this.actualizarDetalle(v);
    });
  },

  actualizarDetalle(v){
    const ahora = this.ahoraServidor();
    const d = v.datos;
    const tTrans = document.getElementById('envivoDetTranscurrido');
    const tRest = document.getElementById('envivoDetRestante');
    const dRest = document.getElementById('envivoDetDistRestante');
    if(tTrans) tTrans.textContent = `${Util.formatoDuracion((ahora-d.salida_ts)/60)} (${Math.round(v.progreso*100)}% del trayecto)`;
    if(tRest) tRest.textContent = Util.formatoDuracion((d.llegada_ts-ahora)/60);
    if(dRest) dRest.textContent = d.distancia_km!==null ? Util.formatoNumero(Math.max(0, d.distancia_km*(1-v.progreso)))+' km' : 'N/D';
  },

  // ----- Matemática de rutas ortodrómicas (tierra esférica, R=6371 km) -----
  rumbo(a, b){
    const rad = Math.PI/180;
    const lat1=a[0]*rad, lat2=b[0]*rad, dLng=(b[1]-a[1])*rad;
    const y = Math.sin(dLng)*Math.cos(lat2);
    const x = Math.cos(lat1)*Math.sin(lat2)-Math.sin(lat1)*Math.cos(lat2)*Math.cos(dLng);
    return (Math.atan2(y,x)*180/Math.PI + 360) % 360;
  },

  interpolar(a, b, fraccion){
    const rad = Math.PI/180;
    const lat1=a[0]*rad, lng1=a[1]*rad, lat2=b[0]*rad, lng2=b[1]*rad;
    const d = 2*Math.asin(Math.sqrt(Math.sin((lat2-lat1)/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin((lng2-lng1)/2)**2));
    if(d === 0) return a;
    const A = Math.sin((1-fraccion)*d)/Math.sin(d);
    const B = Math.sin(fraccion*d)/Math.sin(d);
    const x = A*Math.cos(lat1)*Math.cos(lng1) + B*Math.cos(lat2)*Math.cos(lng2);
    const y = A*Math.cos(lat1)*Math.sin(lng1) + B*Math.cos(lat2)*Math.sin(lng2);
    const z = A*Math.sin(lat1) + B*Math.sin(lat2);
    return [Math.atan2(z, Math.sqrt(x*x+y*y))/rad, Math.atan2(y,x)/rad];
  }
};

/* =====================================================================
   21. POST-RENDER (acciones a ejecutar tras pintar cada pantalla)
===================================================================== */
const PostRender = {
  vuelos(){ ResultadosVuelos.cargar(); CarruselFechas.init(); },
  vuelosEnVivo(){ VuelosEnVivo.iniciar(); },
  async perfil(){
    if(!Estado.usuario) return; // sin sesión
    const cont = document.getElementById('contenidoMisReservas');
    if(!cont) return;
    const misReservas = await Api.obtenerMisReservas(Estado.usuario.id, Estado.usuario.correo);
    if(misReservas.length === 0){
      cont.innerHTML = `<div class="estado-vacio"><div class="icono">🧳</div>Aún no tienes reservas.</div>`;
      return;
    }
    cont.innerHTML = `
      <table class="tabla-simple">
        <thead><tr><th>PNR</th><th>Fecha</th><th>Estado</th><th>Total</th></tr></thead>
        <tbody>
          ${misReservas.map(r=>`<tr><td>${r.pnr}</td><td>${Util.formatoFechaLarga(r.creado_en)}</td><td><span class="badge badge-programado">${r.estado}</span></td><td>${Util.formatoMoneda(r.total)}</td></tr>`).join('')}
        </tbody>
      </table>`;
  },
  asientos(){
    // La caché de Asientos.ocupadosCache solo debe evitar refetch repetido
    // DENTRO de una misma visita a esta pantalla (al cambiar de segmento o
    // pasajero). Al ENTRAR de nuevo a la pantalla se invalida por completo,
    // para que la disponibilidad siempre se consulte fresca contra
    // flight_segments/reservations — así una reserva hecha en una visita
    // anterior (misma sesión del navegador, sin recargar) sí se refleja
    // como ocupada la próxima vez que se abre el mapa del mismo vuelo.
    Asientos.ocupadosCache = {};
    Asientos.segmentoActual = 0;
    Asientos.pasajeroActivo = 0;
    Asientos.render();
  },
  inicio(){
    if(!this._clickListasRegistrado){
      this._clickListasRegistrado = true;
      document.addEventListener('click', function(e){
        if(!e.target.closest('#inputOrigen') && !e.target.closest('#listaOrigen')) document.getElementById('listaOrigen')?.classList.add('oculto');
        if(!e.target.closest('#inputDestino') && !e.target.closest('#listaDestino')) document.getElementById('listaDestino')?.classList.add('oculto');
      });
    }
  }
};

/* =====================================================================
   22. INICIALIZACIÓN
===================================================================== */

// Carga los aeropuertos reales desde api.php (Aiven) para el selector de
// origen/destino del buscador. IMPORTANTE: no se sobrescribe MOCK.aeropuertos,
// porque las rutas y vuelos mock (que todavía NO se conectan en esta etapa)
// dependen de los ids del set de aeropuertos mock original. En su lugar se
// usa una lista independiente para el selector, que es lo único que esta
// etapa debe conectar con datos reales.
async function cargarAeropuertosReales(){
  const aeropuertosReales = await Api.obtenerAeropuertos();
  if(Array.isArray(aeropuertosReales) && aeropuertosReales.length){
    Estado.aeropuertosDisponibles = aeropuertosReales;
  }
  // Si el usuario sigue en Inicio (buscador/destinos), refrescar con los datos reales.
  if(Estado.ruta === 'inicio') Navegacion.ir('inicio', {silencioso:true});
}

async function cargarMetricasInicio(){
  try{
    Estado.metricasInicio = await Api.obtenerMetricasInicio();
    if(Estado.ruta === 'inicio') Navegacion.ir('inicio', {silencioso:true});
  }catch(e){
    console.error('obtenerMetricasInicio() falló al consultar', API_CONFIG.ENDPOINT_METRICAS_INICIO, e);
  }
}

(function init(){
  // Restaurar lo que el usuario tenía (sesión, vuelos, asientos, etc.)
  // y devolverlo a la pantalla donde estaba antes de recargar la página.
  Persistencia.restaurar();
  // Si había sesión guardada, reflejarla en el botón del menú.
  if(Estado.usuario){
    const btnNav = document.getElementById('btnAuthNav');
    if(btnNav){
      btnNav.textContent = Estado.usuario.nombre || Estado.usuario.correo || 'Mi cuenta';
      btnNav.onclick = ()=>Navegacion.ir('perfil');
    }
  }
  Navegacion.ir(Estado.ruta || 'inicio', {silencioso:true});
  // La recarga/descarga de la página también guarda el estado actual.
  window.addEventListener('beforeunload', ()=>Persistencia.guardar());
  window.addEventListener('pagehide', ()=>Persistencia.guardar());
  cargarAeropuertosReales();
  cargarMetricasInicio();

  // Si la URL contiene un token de restablecimiento (?reset_token=...), abrir el modal
  const urlParams = new URLSearchParams(window.location.search);
  const resetToken = urlParams.get('reset_token');
  if(resetToken){
    setTimeout(()=>{ Auth.abrirResetPassword(resetToken); }, 200);
  }
})();
</script>
</body>
</html>