import { useEffect, useRef, useState } from 'react';
import { FiChevronDown, FiSearch } from 'react-icons/fi';

// Selector para catálogos extensos: permite escribir cualquier parte del
// nombre, código o identificador en vez de recorrer un menú nativo largo.
const SearchableSelect = ({ options = [], value, onChange, placeholder = 'Escribe para buscar...', emptyText = 'Sin coincidencias', className = '' }) => {
  const boxRef = useRef(null);
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => String(option.value) === String(value));
  const [query, setQuery] = useState(selected ? selected.label : '');

  useEffect(() => { setQuery(selected ? selected.label : ''); }, [value, selected && selected.label]);
  useEffect(() => {
    const close = (event) => { if (boxRef.current && !boxRef.current.contains(event.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const normalized = (open && selected && query === selected.label ? '' : query).trim().toLowerCase();
  // No saturar el formulario aunque el catálogo tenga miles de registros.
  const matches = options.filter((option) => (option.searchText || option.label || '').toLowerCase().includes(normalized)).slice(0, 10);
  const elegir = (option) => { onChange(option.value); setQuery(option.label); setOpen(false); };

  return (
    <div ref={boxRef} className={'relative ' + className}>
      <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <input className="input-field pl-10 pr-9" value={query} placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(event) => { setQuery(event.target.value); setOpen(true); }} />
      <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      {open && <div className="absolute z-30 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
        {matches.length ? matches.map((option) => <button type="button" key={String(option.value)} onClick={() => elegir(option)} className="block w-full border-b border-gray-100 px-3 py-2 text-left text-sm text-gray-700 last:border-0 hover:bg-primary-50">{option.label}</button>)
          : <div className="px-3 py-2 text-sm text-gray-500">{emptyText}</div>}
      </div>}
    </div>
  );
};

export default SearchableSelect;
