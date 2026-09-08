<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Acajutla Airlines | Reserva de Vuelos</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
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
  overflow:hidden;
}
.hero::after{
  content:"✈";position:absolute;right:6%;top:14%;font-size:9rem;opacity:.12;transform:rotate(20deg);
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
.pasajeros-panel-footer{margin:10px 16px 16px;flex-shrink:0;}
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
  border-radius:var(--radio);overflow:hidden;background:#fff;box-shadow:var(--sombra);transition:var(--transicion);cursor:pointer;
}
.card-destino:hover{transform:translateY(-6px);box-shadow:var(--sombra-hover);}
.card-destino-img{height:150px;background:linear-gradient(135deg,var(--azul),var(--azul-oscuro));display:flex;align-items:center;justify-content:center;font-size:2.4rem;color:#fff;}
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
</style>
</head>
<body>

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
   ACAJUTLA AIRLINES — APLICACIÓN SPA (index.html único)
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
  // Por ahora SOLO se usa para obtenerAeropuertos(); el resto de funciones
  // sigue usando MOCK (controlado por USE_MOCKS) hasta que se conecten
  // los demás endpoints en etapas posteriores.
  // -----------------------------------------------------------------------
  API_LOCAL_URL: 'http://localhost/Acajutla_Airlines/api.php'
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

  tarifas: {
    ECONOMICA: {nombre:'Económica', multiplicador:1, beneficios:['1 equipaje de mano (10kg)','Selección de asiento estándar','Cambios con penalidad','Sin reembolso']},
    ESTANDAR: {nombre:'Estándar', multiplicador:1.35, beneficios:['1 equipaje de mano + 1 facturado (23kg)','Selección de asiento incluida','Cambios permitidos sin penalidad','Reembolso parcial']},
    PREMIUM: {nombre:'Premium / Business', multiplicador:1.9, beneficios:['2 equipajes facturados (32kg c/u)','Asiento preferencial incluido','Cambios flexibles ilimitados','Reembolso total','Acceso a sala VIP','Abordaje prioritario']}
  },

  servicios: [
    {id:'EQ_EXTRA', nombre:'Equipaje extra', icono:'🧳', descripcion:'Maleta adicional de 23kg', precio:45},
    {id:'EQ_DEPORTIVO', nombre:'Equipaje deportivo', icono:'🏂', descripcion:'Equipo deportivo especial', precio:60},
    {id:'SALA_VIP', nombre:'Sala VIP', icono:'🛋️', descripcion:'Acceso a sala de espera VIP', precio:35},
    {id:'ASIST_MEDICA', nombre:'Asistencia médica', icono:'⚕️', descripcion:'Acompañamiento médico especializado', precio:25},
    {id:'ABORDAJE_PRIORITARIO', nombre:'Abordaje prioritario', icono:'⚡', descripcion:'Aborda antes que el resto de pasajeros', precio:20}
  ],

  precioAsiento: {ECONOMICO:0, PREFERENCIAL:80, EMERGENCIA:80},

  // Cache de "peso" relativo por fecha, usado ÚNICAMENTE para calcular el nivel
  // bajo/medio/alto que se muestra como $/$$/$$$ en el calendario y el carrusel.
  // Estructura por clave "origenId_destinoId_YYYY-MM": [{fecha, precio, disponible}]
  // IMPORTANTE: "precio" aquí es solo un peso interno determinista (no depende de
  // precio_base ni de ninguna tarifa real) — nunca se muestra como monto en pantalla.
  cachePreciosFecha: {},

  generarPreciosMes(origenId, destinoId, anioMes){ // anioMes = "YYYY-MM"
    const clave = `${origenId}_${destinoId}_${anioMes}`;
    if(MOCK.cachePreciosFecha[clave]) return MOCK.cachePreciosFecha[clave];

    // Peso base fijo (no proviene de precio_base ni de ninguna tarifa real):
    // solo sirve para derivar variaciones deterministas por día.
    const base = 100;

    const [anio, mes] = anioMes.split('-').map(Number);
    const diasEnMes = new Date(anio, mes, 0).getDate();
    const dias = [];
    for(let d=1; d<=diasEnMes; d++){
      const fechaObj = new Date(anio, mes-1, d);
      const diaSemana = fechaObj.getDay(); // 0=dom .. 6=sab
      // variación determinística por día de semana + una semilla simple por día del mes
      let factor = 1;
      if(diaSemana===5 || diaSemana===0) factor = 1.35;       // viernes/domingo: caro
      else if(diaSemana===6) factor = 1.2;                     // sábado: intermedio-alto
      else if(diaSemana===2 || diaSemana===3) factor = 0.82;   // martes/miércoles: barato
      else factor = 1.0;
      const semilla = ((d*17) % 23) / 100; // pequeña variación adicional 0-0.22
      const precio = Math.round(base * (factor + semilla));
      // aprox. 5% de fechas sin disponibilidad (simulado)
      const sinDisponibilidad = (d % 29 === 0);
      const fechaISO = `${anio}-${String(mes).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      dias.push({fecha:fechaISO, precio: sinDisponibilidad?null:precio, disponible: !sinDisponibilidad});
    }

    // calcular niveles bajo/medio/alto en función del min y max reales del mes
    const preciosValidos = dias.filter(x=>x.disponible).map(x=>x.precio);
    const min = Math.min(...preciosValidos);
    const max = Math.max(...preciosValidos);
    const rango = (max-min) || 1;
    dias.forEach(x=>{
      if(!x.disponible){ x.nivel=null; return; }
      const posicion = (x.precio-min)/rango;
      x.nivel = posicion <= 0.33 ? 'bajo' : (posicion <= 0.66 ? 'medio' : 'alto');
    });

    MOCK.cachePreciosFecha[clave] = dias;
    return dias;
  },

  ocupados: {}, // se genera dinámicamente por vuelo (ver Asientos.generarOcupados)

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
  formatoMoneda(n){ return '$' + Number(n).toFixed(2); },

  formatoFechaLarga(fechaStr){
    if(!fechaStr) return '';
    const meses=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    const [y,m,d]=fechaStr.split('-').map(Number);
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
  // Obtiene el precio de una clase de tarifa (ECONOMICA/ESTANDAR/PREMIUM) para un vuelo.
  // Prioriza SIEMPRE vuelo.tarifas (precios reales de MySQL). Solo si el vuelo no trae
  // ese arreglo (vuelos mock aún no conectados) se recurre al cálculo antiguo con
  // precio_base * multiplicador como respaldo.
  obtenerPrecioTarifa(vuelo, clave){
    if(!vuelo) return null;
    if(Array.isArray(vuelo.tarifas)){
      const t = vuelo.tarifas.find(x=>x.clase===clave);
      return t ? t.precio : null;
    }
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
  formatExpiry(valorCrudo){
    const digitos = Util.sanitizeNumericInput(valorCrudo, 4);
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

  // Clasifica un precio en bajo/medio/alto según el conjunto de precios disponibles (terciles reales).
  // Convierte un nivel (bajo/medio/alto) en el indicador visual $/$$/$$$
  // que usan el calendario y el carrusel de fechas (sin mostrar montos numéricos).
  indicadorNivelPrecio(nivel){
    if(nivel==='bajo') return '$';
    if(nivel==='medio') return '$$';
    if(nivel==='alto') return '$$$';
    return '';
  },

  getDatePriceLevel(precio, listaPrecios){
    const validos = listaPrecios.filter(p=>p!==null && p!==undefined);
    if(!validos.length || precio===null || precio===undefined) return null;
    const min = Math.min(...validos), max = Math.max(...validos);
    const rango = (max-min) || 1;
    const posicion = (precio-min)/rango;
    return posicion <= 0.33 ? 'bajo' : (posicion <= 0.66 ? 'medio' : 'alto');
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

  badgeClaseEstado(estado){
    const map={PROGRAMADO:'badge-programado',EMBARCANDO:'badge-embarcando',DESPEGADO:'badge-despegado',
      ATERRIZADO:'badge-aterrizado',CANCELADO:'badge-cancelado',RETRASADO:'badge-retrasado',DESVIADO:'badge-desviado'};
    return map[estado] || 'badge-programado';
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

  documentoValido(v){ return /^[A-Za-z0-9-]{5,20}$/.test(v||''); },
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
    if(!Validar.documentoValido(p.numeroDocumento)) err.numeroDocumento='Documento inválido (5-20 caracteres).';
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
  // ETAPA DE CONEXIÓN REAL CON AIVEN (vía api.php local, PHP + MySQLi).
  // Esta función es la ÚNICA que, por ahora, ignora USE_MOCKS e intenta
  // primero el endpoint real. El resto de funciones de Api sigue usando
  // el flag USE_MOCKS normalmente (ver más abajo).
  // Backend real: GET {API_CONFIG.API_LOCAL_URL}?action=aeropuertos
  // -----------------------------------------------------------------------
  async obtenerAeropuertos(){
    try{
      const response = await fetch(`${API_CONFIG.API_LOCAL_URL}?action=aeropuertos`);
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
      Util.mostrarToast('No se pudieron cargar los aeropuertos desde el servidor. Mostrando datos de referencia.', 'error');
      return MOCK.aeropuertos;
    }
  },

  // -----------------------------------------------------------------------
  // ETAPA DE CONEXIÓN REAL — búsqueda de vuelos.
  // Al igual que obtenerAeropuertos(), esta función ignora USE_MOCKS e
  // intenta primero el endpoint PHP local (api.php?action=buscar_vuelos),
  // que consulta vuelos -> rutas -> aeropuertos en MySQL/Aiven.
  // Ya NO se usan MOCK.rutas ni MOCK.vuelos para la búsqueda.
  // -----------------------------------------------------------------------
  async buscarVuelos(params){
    // params: {origenId, destinoId, fecha} — fecha en formato YYYY-MM-DD
    try{
      const url = `${API_CONFIG.API_LOCAL_URL}?action=buscar_vuelos&origen=${params.origenId}&destino=${params.destinoId}&fecha=${params.fecha}`;
      const response = await fetch(url);
      const json = await response.json();
      if(!json.ok){
        throw new Error(json.error || 'No se pudieron cargar los vuelos.');
      }
      return json.data; // ya viene con el formato que espera el frontend (ver Vistas.tarjetaVuelo)
    } catch(e){
      Util.mostrarToast('No se pudo consultar la disponibilidad de vuelos en el servidor.', 'error');
      return []; // sin vuelos inventados: la pantalla debe mostrar "no hay vuelos disponibles"
    }
  },

  async obtenerVuelo(id){
    if(API_CONFIG.USE_MOCKS) return simularRed(MOCK.vuelos.find(v=>v.id===id), 150);
    return apiFetch(`/vuelos/${id}`);
  },

  async crearReserva(payload){
    if(API_CONFIG.USE_MOCKS){
      const pnr = Util.generarPNR();
      const nueva = {pnr, ...payload, estado:'CONFIRMADA', creado_en: Util.hoyISO()};
      MOCK.reservas.push(nueva);
      return simularRed(nueva, 600);
    }
    return apiFetch('/reservas', {method:'POST', body:JSON.stringify(payload)});
  },

  async obtenerReserva(pnr, documentoOCorreo){
    if(API_CONFIG.USE_MOCKS){
      const r = MOCK.reservas.find(x=>x.pnr === pnr);
      return simularRed(r || null, 450);
    }
    return apiFetch(`/reservas/${pnr}?ref=${encodeURIComponent(documentoOCorreo)}`);
  },

  async crearPasajeros(reservaId, pasajeros){
    if(API_CONFIG.USE_MOCKS) return simularRed({ok:true, pasajeros}, 300);
    return apiFetch(`/reservas/${reservaId}/pasajeros`, {method:'POST', body:JSON.stringify(pasajeros)});
  },

  async obtenerAsientos(vueloId){
    if(API_CONFIG.USE_MOCKS) return simularRed(Asientos.generarOcupados(vueloId), 350);
    return apiFetch(`/vuelos/${vueloId}/asientos`);
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
    if(API_CONFIG.USE_MOCKS){
      const c = MOCK.clientes.find(u=>u.correo===correo && u.password===password);
      return simularRed(c ? {ok:true, cliente:c} : {ok:false, mensaje:'Credenciales inválidas'}, 500);
    }
    return apiFetch('/auth/login', {method:'POST', body:JSON.stringify({correo,password})});
  },

  async registrarCliente(datos){
    if(API_CONFIG.USE_MOCKS){
      const existe = MOCK.clientes.some(c=>c.correo===datos.correo);
      if(existe) return simularRed({ok:false, mensaje:'El correo ya está registrado'}, 400);
      const nuevo = {id: MOCK.clientes.length+1, ...datos};
      MOCK.clientes.push(nuevo);
      return simularRed({ok:true, cliente:nuevo}, 500);
    }
    return apiFetch('/auth/registro', {method:'POST', body:JSON.stringify(datos)});
  },

  async consultarEstadoVuelo(numeroVuelo, fecha){
    if(API_CONFIG.USE_MOCKS){
      const v = MOCK.vuelos.find(x=>x.numero_vuelo.toUpperCase()===String(numeroVuelo).toUpperCase());
      return simularRed(v || null, 400);
    }
    return apiFetch(`/vuelos/estado?numero=${numeroVuelo}&fecha=${fecha}`);
  },

  // Calendario de precios. Endpoint futuro conceptual:
  // GET /api/vuelos/precios?origen=XXX&destino=XXX&mes=YYYY-MM
  async getFlightPricesByDate(origenId, destinoId, anioMes){
    if(API_CONFIG.USE_MOCKS){
      return simularRed(MOCK.generarPreciosMes(origenId, destinoId, anioMes), 450);
    }
    return apiFetch(`/vuelos/precios?origen=${origenId}&destino=${destinoId}&mes=${anioMes}`);
  },

  // -----------------------------------------------------------------------
  // ENVÍO DE COMPROBANTE POR CORREO
  // Arquitectura obligatoria: index.html -> API REST (Render) -> Gmail SMTP -> cliente.
  // El frontend NUNCA conoce ni envía la contraseña de aplicación de Gmail;
  // solo hace fetch() al endpoint del backend con los datos no sensibles de la reserva.
  // Endpoint esperado del backend: POST {API_BASE_URL}/reservas/{pnr}/comprobante/email
  // Body esperado: { pnr, email, nombreCliente, total, estado, segmentos, pasajeros, pago }
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
      // Solo el método y estado del pago; jamás número de tarjeta ni CVV.
      pago: reserva.pago ? {metodo: reserva.pago.metodo, estado: reserva.pago.estado} : null
    };

    if(!API_CONFIG.USE_MOCKS){
      try{
        const data = await apiFetch(API_CONFIG.ENDPOINT_COMPROBANTE_EMAIL(reserva.pnr), {
          method:'POST',
          body: JSON.stringify(payload)
        });
        return {
          ok: !!data.success,
          demo: false,
          mensaje: data.message || (data.success ? 'Comprobante enviado correctamente.' : 'No pudimos enviar el comprobante. Intenta nuevamente.')
        };
      } catch(e){
        // No exponer detalles técnicos ni de SMTP al usuario.
        return {ok:false, demo:false, mensaje:'No pudimos enviar el comprobante. Intenta nuevamente.'};
      }
    }

    // MODO DEMOSTRACIÓN: el backend/servicio de correo todavía no está conectado.
    // Importante: nunca se debe indicar que el correo fue enviado si no ocurrió realmente.
    await simularRed(null, 500);
    return {ok:false, demo:true, mensaje:'El servicio de correo todavía no está conectado al servidor.'};
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
      estadoVuelo: Vistas.estadoVuelo
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
                oninput="Buscador.autocompletar('origen', this.value)" onfocus="Buscador.autocompletar('origen', this.value)">
              <div class="autocomplete-lista oculto" id="listaOrigen"></div>
            </div>
            <button class="btn-swap" type="button" onclick="Buscador.intercambiar()" aria-label="Intercambiar origen y destino">⇄</button>
            <div class="campo">
              <label>Destino</label>
              <input type="text" id="inputDestino" placeholder="Ciudad o aeropuerto" autocomplete="off"
                value="${b.destino ? Util.escapeHtml(b.destino.ciudad+' ('+b.destino.codigo_iata+')') : ''}"
                oninput="Buscador.autocompletar('destino', this.value)" onfocus="Buscador.autocompletar('destino', this.value)">
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
          <div><b>10</b><span>Destinos</span></div>
          <div><b>20+</b><span>Vuelos diarios</span></div>
          <div><b>4</b><span>Tipos de aeronave</span></div>
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
          return `
          <div class="card-destino" onclick="Vistas.irDestinoRapido(${a.id})">
            <div class="card-destino-img">✈</div>
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

  /* ---------- RESULTADOS DE VUELOS ---------- */
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
        <span class="vuelo-numero">Vuelo ${v.numero_vuelo}${infoAeronave ? ' · '+infoAeronave.fabricante+' '+infoAeronave.modelo : ''}</span>
        <span class="badge ${Util.badgeClaseEstado(v.estado)}">${v.estado}</span>
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
      ${(!Array.isArray(vuelo.tarifas) && vuelo.precio_base==null) ? `<div class="alerta alerta-info">Este vuelo aún no tiene tarifas confirmadas en el servidor; los precios mostrados son referenciales.</div>` : ''}
      <div class="grid-tarifas">
        ${Object.entries(MOCK.tarifas).map(([clave,t])=>{
          const precio = Util.obtenerPrecioTarifa(vuelo, clave);
          return `
          <div class="tarifa-card ${clave==='ESTANDAR'?'destacada':''}" onclick="Tarifas.seleccionar('${clave}')">
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
            <div class="campo-form"><label>Nombres *</label><input type="text" data-p="${i}" data-f="nombres" value="${Util.escapeHtml(p.nombres||'')}"></div>
            <div class="campo-form"><label>Apellidos *</label><input type="text" data-p="${i}" data-f="apellidos" value="${Util.escapeHtml(p.apellidos||'')}"></div>
            <div class="campo-form">
              <label>Tipo de documento *</label>
              <select data-p="${i}" data-f="tipoDocumento">
                <option value="">Seleccionar</option>
                <option value="DUI" ${p.tipoDocumento==='DUI'?'selected':''}>DUI</option>
                <option value="PASAPORTE" ${p.tipoDocumento==='PASAPORTE'?'selected':''}>Pasaporte</option>
                <option value="CARNET_MENOR" ${p.tipoDocumento==='CARNET_MENOR'?'selected':''}>Carnet de menor</option>
              </select>
            </div>
            <div class="campo-form"><label>Número de documento *</label><input type="text" data-p="${i}" data-f="numeroDocumento" value="${Util.escapeHtml(p.numeroDocumento||'')}"></div>
            <div class="campo-form"><label>Nacionalidad *</label><input type="text" data-p="${i}" data-f="nacionalidad" value="${Util.escapeHtml(p.nacionalidad||'')}"></div>
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
            <div class="campo-form full"><label>Nombre completo *</label><input type="text" id="contactoNombre" value="${Util.escapeHtml(c.nombre)}"></div>
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
          const ruta = Util.rutaPorId(s.vuelo.ruta_id);
          const o=Util.aeropuertoPorId(ruta.origen_id), d=Util.aeropuertoPorId(ruta.destino_id);
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
    return `
    <div class="mapa-avion">
      <div class="avion-wrap">
        <div class="avion-nariz"></div>
        ${filasHtml}
        <div class="leyenda">
          <div class="leyenda-item"><div class="leyenda-caja" style="background:#e3ecf9"></div>Disponible</div>
          <div class="leyenda-item"><div class="leyenda-caja" style="background:var(--verde)"></div>Seleccionado</div>
          <div class="leyenda-item"><div class="leyenda-caja" style="background:#d6d9de"></div>Ocupado</div>
          <div class="leyenda-item"><div class="leyenda-caja" style="background:#ffe9b3"></div>Preferencial ($80)</div>
          <div class="leyenda-item"><div class="leyenda-caja" style="background:#f0c3c3"></div>Emergencia ($80)</div>
        </div>
      </div>
      <div class="panel-asiento-lateral card">
        <h4 style="margin-bottom:10px;color:var(--azul-oscuro)">Pasajeros</h4>
        ${Estado.pasajeros.map((p,pi)=>{
          if(p.requiresSeat===false) return ''; // los bebés viajan en brazos y no requieren asiento
          const asignado = Estado.asientos[`${segmentoIdx}_${pi}`];
          const activo = Asientos.pasajeroActivo === pi;
          return `<div class="pasajero-asiento-fila ${activo?'activo':''}" onclick="Asientos.setPasajeroActivo(${pi})" style="cursor:pointer">
            <span>${Util.escapeHtml(p.nombres||('Pasajero '+(pi+1)))}</span>
            ${asignado ? `<span class="chip-asiento">${asignado.codigo}</span>` : `<span class="chip-vacio">Sin asiento</span>`}
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
            const activo = (Estado.servicios[pi]||[]).includes(s.id);
            return `<div class="servicio-card">
              <div class="icono">${s.icono}</div>
              <h4>${s.nombre}</h4>
              <p>${s.descripcion}</p>
              <span class="precio">${Util.formatoMoneda(s.precio)}</span>
              <label class="check-item"><input type="checkbox" ${activo?'checked':''} onchange="Servicios.toggle(${pi}, '${s.id}', this.checked)"> Agregar</label>
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
          <input type="text" id="pagoVencimiento" inputmode="numeric" maxlength="5" placeholder="MM/AA" oninput="Pago.formatearVencimiento(this)">
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
          <p>Fecha: ${Util.formatoFechaLarga(s.fecha)} · Asiento: ${s.asiento} · Check-in: ${s.estado_check_in?'Realizado':'Pendiente'} · Pase de abordar: ${s.pase_abordar_emitido?'Emitido':'No emitido'}</p>
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
          <p style="font-size:.75rem;color:#889;margin-bottom:14px">⚠ Autenticación simulada con fines académicos, no representa un mecanismo de seguridad real.</p>
          <div id="alertaLogin"></div>
          <div class="campo-form" style="margin-bottom:12px"><label>Correo</label><input type="email" id="loginCorreo" placeholder="tu@correo.com" value="diego@correo.com"></div>
          <div class="campo-form" style="margin-bottom:16px"><label>Contraseña</label><input type="password" id="loginPassword" placeholder="••••••" value="123456"></div>
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
          <div class="campo-form" style="margin-bottom:12px"><label>Nombre</label><input type="text" id="regNombre"></div>
          <div class="campo-form" style="margin-bottom:12px"><label>Apellido</label><input type="text" id="regApellido"></div>
          <div class="campo-form" style="margin-bottom:12px"><label>Correo</label><input type="email" id="regCorreo"></div>
          <div class="campo-form" style="margin-bottom:12px"><label>Teléfono</label><input type="text" id="regTelefono"></div>
          <div class="campo-form" style="margin-bottom:12px"><label>Documento</label><input type="text" id="regDocumento"></div>
          <div class="campo-form" style="margin-bottom:16px"><label>Contraseña</label><input type="password" id="regPassword"></div>
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
    const misReservas = MOCK.reservas.filter(r=>r.cliente_id===u.id);
    return `
    <div class="pantalla contenedor" style="padding-top:24px">
      <div class="perfil-header">
        <div class="perfil-avatar">${u.nombre[0]}${u.apellido[0]}</div>
        <div>
          <h2 style="color:var(--azul-oscuro)">${u.nombre} ${u.apellido}</h2>
          <span style="color:#889;font-size:.85rem">${u.correo}</span>
        </div>
        <button class="btn btn-outline" style="margin-left:auto" onclick="Auth.logout()">Cerrar sesión</button>
      </div>
      <div class="card">
        <h4 style="margin-bottom:14px;color:var(--azul-oscuro)">Mis reservas</h4>
        ${misReservas.length===0 ? `<div class="estado-vacio"><div class="icono">🧳</div>Aún no tienes reservas.</div>` : `
        <table class="tabla-simple">
          <thead><tr><th>PNR</th><th>Fecha</th><th>Estado</th><th>Total</th></tr></thead>
          <tbody>
            ${misReservas.map(r=>`<tr><td>${r.pnr}</td><td>${Util.formatoFechaLarga(r.creado_en)}</td><td><span class="badge badge-programado">${r.estado}</span></td><td>${Util.formatoMoneda(r.total)}</td></tr>`).join('')}
          </tbody>
        </table>`}
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
    const q = texto.trim().toLowerCase();
    if(q.length===0){ lista.classList.add('oculto'); lista.innerHTML=''; return; }
    const resultados = Estado.aeropuertosDisponibles.filter(a =>
      a.ciudad.toLowerCase().includes(q) || a.nombre.toLowerCase().includes(q) || a.codigo_iata.toLowerCase().includes(q)
    ).slice(0,6);
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
      : (b.fechaRegreso ? new Date(b.fechaRegreso+'T00:00:00') : new Date(b.fechaIda || Date.now()));
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
    const datos = await Api.getFlightPricesByDate(b.origen.id, b.destino.id, anioMes);
    if(tipo==='ida') this.datosMesIda = datos; else this.datosMesRegreso = datos;
    this.render(tipo);
  },

  cambiarMes(tipo, delta){
    const mesDate = tipo==='ida' ? this.mesActualIda : this.mesActualRegreso;
    const nuevo = new Date(mesDate.getFullYear(), mesDate.getMonth()+delta, 1);
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
        <button type="button" onclick="CalendarioPrecios.cambiarMes('${tipo}', -1)">‹</button>
        <span>${nombresMes[mesDate.getMonth()]} ${mesDate.getFullYear()}</span>
        <button type="button" onclick="CalendarioPrecios.cambiarMes('${tipo}', 1)">›</button>
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
      document.getElementById('btnFechaIda').innerHTML = Util.formatoFechaLarga(fecha);
      document.getElementById('panelCalendarioIda').classList.add('oculto');
    } else {
      Estado.busqueda.fechaRegreso = fecha;
      document.getElementById('btnFechaRegreso').innerHTML = Util.formatoFechaLarga(fecha);
      document.getElementById('panelCalendarioRegreso').classList.add('oculto');
    }
  }
};

/* =====================================================================
   9-C. LÓGICA — CARRUSEL DE FECHAS (sobre los resultados de vuelos)
   Usa MOCK.generarPreciosMes() (precios estables, no aleatorios en cada render)
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

  render(){
    const cont = document.getElementById('carruselFechasCont');
    if(!cont || !this.anchor) return;
    const b = Estado.busqueda;
    const esRegreso = Estado.modoResultados==='REGRESO';
    const origenId = esRegreso ? b.destino.id : b.origen.id;
    const destinoId = esRegreso ? b.origen.id : b.destino.id;
    const minima = esRegreso ? (b.fechaIda || Util.hoyISO()) : Util.hoyISO();
    const seleccionada = esRegreso ? b.fechaRegreso : b.fechaIda;

    // Reunir 7 días consecutivos a partir del anchor, consultando el/los mes(es) que correspondan.
    const dias = [];
    for(let i=0;i<7;i++){
      const fechaISO = this.sumarDias(this.anchor, i);
      const anioMes = fechaISO.slice(0,7);
      const mesDatos = MOCK.generarPreciosMes(origenId, destinoId, anioMes);
      const info = mesDatos.find(x=>x.fecha===fechaISO) || {fecha:fechaISO, precio:null, disponible:false};
      dias.push(info);
    }

    const preciosVisibles = dias.map(d=>d.disponible?d.precio:null);
    const nombresDia = ['dom','lun','mar','mié','jue','vie','sáb'];
    const nombresMes = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

    const celdas = dias.map(d=>{
      const fechaObj = new Date(d.fecha+'T00:00:00');
      const antesDeMinima = d.fecha < minima;
      const cancelSinVuelos = !d.disponible;
      const deshabilitado = antesDeMinima || cancelSinVuelos;
      const nivel = d.disponible ? Util.getDatePriceLevel(d.precio, preciosVisibles) : null;
      const esSeleccionada = d.fecha === seleccionada;
      return `
      <div class="carrusel-dia ${nivel?'nivel-'+nivel:''} ${deshabilitado?'deshabilitado':''} ${esSeleccionada?'seleccionado':''}"
           ${deshabilitado?'':`onclick="CarruselFechas.seleccionar('${d.fecha}')"`}>
        <div class="dia-semana">${nombresDia[fechaObj.getDay()]}</div>
        <div class="dia-numero">${fechaObj.getDate()} ${nombresMes[fechaObj.getMonth()]}</div>
        <div class="dia-precio">${d.disponible ? Util.indicadorNivelPrecio(nivel) : 'Sin vuelos'}</div>
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
    Object.values(Estado.servicios).forEach(lista=>{
      (lista||[]).forEach(sid=>{ const s = MOCK.servicios.find(x=>x.id===sid); if(s) servicios += s.precio; });
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

  generarOcupados(vueloId){
    if(this.ocupadosCache[vueloId]) return this.ocupadosCache[vueloId];
    const columnas=['A','B','C','D','E','F'];
    const ocupados=[];
    const cantidad = 12 + Math.floor(Math.random()*10);
    for(let i=0;i<cantidad;i++){
      const fila = 1+Math.floor(Math.random()*18);
      const col = columnas[Math.floor(Math.random()*columnas.length)];
      ocupados.push(`${fila}${col}`);
    }
    this.ocupadosCache[vueloId] = [...new Set(ocupados)];
    return this.ocupadosCache[vueloId];
  },

  ocupadosPorSegmento(segmentoIdx){
    const vuelo = Estado.segmentos[segmentoIdx].vuelo;
    return this.generarOcupados(vuelo.id);
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

  irSegmento(idx){
    this.segmentoActual = idx;
    this.pasajeroActivo = 0;
    this.render();
    document.querySelectorAll('#segmentoTabs .segmento-tab').forEach((b,i)=>b.classList.toggle('activo', i===idx));
  },

  click(segmentoIdx, codigo, claseTipo){
    // liberar si el pasajero activo ya tenía asiento en este segmento
    const key = `${segmentoIdx}_${this.pasajeroActivo}`;
    // evitar seleccionar un asiento ya tomado por otro pasajero en este mismo segmento
    const ocupante = this.quienTiene(segmentoIdx, codigo);
    if(ocupante !== null && ocupante !== this.pasajeroActivo){
      Util.mostrarToast('Ese asiento ya fue seleccionado por otro pasajero.', 'error');
      return;
    }
    const tipo = claseTipo==='economico' ? 'ECONOMICO' : claseTipo.toUpperCase();
    Estado.asientos[key] = {codigo, tipo, precio: MOCK.precioAsiento[tipo] || 0};
    // avanzar automáticamente al siguiente pasajero que sí requiere asiento y aún no tiene uno en este segmento
    const siguiente = Estado.pasajeros.findIndex((p,i)=> p.requiresSeat && !Estado.asientos[`${segmentoIdx}_${i}`]);
    if(siguiente !== -1) this.pasajeroActivo = siguiente;
    this.render();
  },

  render(){
    const cont = document.getElementById('contenidoAsientos');
    if(!cont) return;
    cont.innerHTML = Vistas.mapaAsientosHTML(Estado.segmentos[this.segmentoActual].vuelo, this.segmentoActual);
  },

  continuar(){
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
  toggle(pasajeroIdx, servicioId, activo){
    if(!Estado.servicios[pasajeroIdx]) Estado.servicios[pasajeroIdx] = [];
    if(activo){
      if(!Estado.servicios[pasajeroIdx].includes(servicioId)) Estado.servicios[pasajeroIdx].push(servicioId);
    } else {
      Estado.servicios[pasajeroIdx] = Estado.servicios[pasajeroIdx].filter(id=>id!==servicioId);
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
  formatearCvv(input){ input.value = Util.sanitizeNumericInput(input.value, 4); },

  validarTarjeta(){
    const nombre = document.getElementById('pagoNombre').value.trim();
    const numero = document.getElementById('pagoNumero').value.replace(/\s/g,'');
    const venc = document.getElementById('pagoVencimiento').value.trim();
    const cvv = document.getElementById('pagoCvv').value.trim();
    const errores = [];
    if(!nombre) errores.push('Ingresa el nombre del titular.');
    if(!/^\d{13,19}$/.test(numero)) errores.push('Número de tarjeta inválido.');
    if(!/^(0[1-9]|1[0-2])\/\d{2}$/.test(venc)) errores.push('Vencimiento inválido (MM/AA).');
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

    await Util.conLoader('Procesando pago...', async ()=>{
      const resultadoPago = await Api.crearPago({
        metodo:this.metodo, monto:Estado.precios.total, detalle
      });

      // construir payload de reserva (nunca se guarda número completo ni CVV)
      const segmentosPayload = Estado.segmentos.map((s,si)=>{
        const esReal = !!s.vuelo.origen && !!s.vuelo.destino;
        const ruta = esReal ? null : Util.rutaPorId(s.vuelo.ruta_id);
        const origen = esReal ? s.vuelo.origen : Util.aeropuertoPorId(ruta.origen_id);
        const destino = esReal ? s.vuelo.destino : Util.aeropuertoPorId(ruta.destino_id);
        return {
          numero_vuelo: s.vuelo.numero_vuelo,
          origen: origen.codigo_iata,
          destino: destino.codigo_iata,
          fecha: s.tipo==='IDA' ? Estado.busqueda.fechaIda : Estado.busqueda.fechaRegreso,
          asiento: Estado.asientos[`${si}_0`] ? Estado.asientos[`${si}_0`].codigo : '-',
          estado_check_in: 0,
          pase_abordar_emitido: 0
        };
      });

      const payload = {
        cliente_id: Estado.usuario ? Estado.usuario.id : null,
        tipo_viaje: Estado.busqueda.tipoViaje,
        total: Estado.precios.total,
        pasajeros: Estado.pasajeros.map(p=>({nombres:p.nombres, apellidos:p.apellidos, documento:p.numeroDocumento})),
        segmentos: segmentosPayload,
        pago: {metodo:this.metodo, estado: resultadoPago.estado || 'APROBADO', monto: Estado.precios.total},
        // Datos de contacto para el envío del comprobante (booking.contact)
        contacto: {
          nombre: Estado.contacto.nombre,
          email: Estado.contacto.email,
          telefono: Estado.contacto.telefono
        }
      };

      const reserva = await Api.crearReserva(payload);
      Estado.reservaActual = reserva;
    });

    Navegacion.ir('confirmacion');
  }
};

/* =====================================================================
   17-B. LÓGICA — ENVÍO DE COMPROBANTE POR CORREO
   sendBookingEmail(): hace fetch() real cuando USE_MOCKS=false.
   Arquitectura: index.html -> API REST (Render) -> Gmail SMTP -> cliente.
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
    Estado.usuario = res.cliente;
    document.getElementById('btnAuthNav').textContent = res.cliente.nombre;
    document.getElementById('btnAuthNav').onclick = ()=>Navegacion.ir('perfil');
    Util.mostrarToast('Bienvenido, '+res.cliente.nombre, 'exito');
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
    const cont = document.getElementById('alertaRegistro');
    if(!datos.nombre || !datos.apellido || !Validar.correoValido(datos.correo) || !datos.password){
      cont.innerHTML = `<div class="alerta alerta-error">⚠ Completa todos los campos con un correo válido.</div>`;
      return;
    }
    const res = await Api.registrarCliente(datos);
    if(!res.ok){
      cont.innerHTML = `<div class="alerta alerta-error">⚠ ${res.mensaje}</div>`;
      return;
    }
    Estado.usuario = res.cliente;
    Util.mostrarToast('Cuenta creada correctamente', 'exito');
    Navegacion.ir('perfil');
  },

  logout(){
    Estado.usuario = null;
    document.getElementById('btnAuthNav').textContent = 'Iniciar sesión';
    document.getElementById('btnAuthNav').onclick = ()=>Navegacion.ir('login');
    Navegacion.ir('inicio');
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
    const ruta = Util.rutaPorId(v.ruta_id);
    const origen = Util.aeropuertoPorId(ruta.origen_id);
    const destino = Util.aeropuertoPorId(ruta.destino_id);
    resultado.innerHTML = `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
          <h3 style="color:var(--azul-oscuro)">Vuelo ${v.numero_vuelo}</h3>
          <span class="badge ${Util.badgeClaseEstado(v.estado)}">${v.estado}</span>
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
   21. POST-RENDER (acciones a ejecutar tras pintar cada pantalla)
===================================================================== */
const PostRender = {
  vuelos(){ ResultadosVuelos.cargar(); CarruselFechas.init(); },
  asientos(){ Asientos.segmentoActual = 0; Asientos.pasajeroActivo = 0; Asientos.render(); },
  inicio(){
    document.addEventListener('click', function cerrarListas(e){
      if(!e.target.closest('#inputOrigen') && !e.target.closest('#listaOrigen')) document.getElementById('listaOrigen')?.classList.add('oculto');
      if(!e.target.closest('#inputDestino') && !e.target.closest('#listaDestino')) document.getElementById('listaDestino')?.classList.add('oculto');
    }, {once:true});
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

(function init(){
  Navegacion.ir('inicio', {silencioso:true});
  cargarAeropuertosReales();
})();
</script>
</body>
</html>