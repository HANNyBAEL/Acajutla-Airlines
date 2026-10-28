const TAMANO_PAGINA = 50;

const Paginacion = ({ total, pagina, onCambiar, tamano = TAMANO_PAGINA }) => {
  const paginas = Math.ceil(total / tamano);
  if (paginas <= 1) return null;

  const desde = (pagina - 1) * tamano + 1;
  const hasta = Math.min(pagina * tamano, total);

  return (
    <nav className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100 px-4 py-3" aria-label="Paginación de resultados">
      <p className="text-sm text-gray-500">Mostrando {desde}–{hasta} de {total}</p>
      <div className="flex items-center gap-2">
        <button type="button" className="btn-secondary px-3 py-1.5 text-sm" onClick={() => onCambiar(Math.max(1, pagina - 1))} disabled={pagina <= 1}>Anterior</button>
        <span className="text-sm text-gray-600">Página {pagina} de {paginas}</span>
        <button type="button" className="btn-secondary px-3 py-1.5 text-sm" onClick={() => onCambiar(Math.min(paginas, pagina + 1))} disabled={pagina >= paginas}>Siguiente</button>
      </div>
    </nav>
  );
};

export const paginar = (lista, pagina, tamano = TAMANO_PAGINA) => lista.slice((pagina - 1) * tamano, pagina * tamano);
export default Paginacion;
