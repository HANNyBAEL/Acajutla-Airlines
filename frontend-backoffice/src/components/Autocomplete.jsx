import { useEffect, useRef, useState } from 'react';
import { FiSearch } from 'react-icons/fi';

const Autocomplete = ({ placeholder = 'Escribe para buscar...', fetcher, renderLabel, renderSub, onSelect, emptyText = 'Sin resultados (mínimo 2 caracteres)' }) => {
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);
  const timer = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    clearTimeout(timer.current);
    if (!q || q.trim().length < 2) { setItems([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetcher(q.trim());
        setItems(r || []);
        setOpen(true);
      } catch (e) { setItems([]); setOpen(true); }
      finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(timer.current);
  }, [q]);

  const pick = (item) => { setQ(renderLabel(item)); setOpen(false); if (onSelect) onSelect(item); };

  return (
    <div ref={boxRef} className="relative">
      <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        className="input-field pl-10"
        placeholder={placeholder}
        value={q}
        onChange={(e) => { setQ(e.target.value); if (onSelect) onSelect(null); }}
        onFocus={() => { if (items.length) setOpen(true); }}
      />
      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {loading && <div className="px-3 py-2 text-sm text-gray-500">Buscando...</div>}
          {!loading && items.length === 0 && <div className="px-3 py-2 text-sm text-gray-500">{emptyText}</div>}
          {items.map((it, i) => (
            <button key={i} type="button" className="w-full text-left px-3 py-2 hover:bg-primary-50 border-b border-gray-100 last:border-0" onClick={() => pick(it)}>
              <div className="text-sm font-medium text-gray-800">{renderLabel(it)}</div>
              {renderSub && <div className="text-xs text-gray-500">{renderSub(it)}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
export default Autocomplete;