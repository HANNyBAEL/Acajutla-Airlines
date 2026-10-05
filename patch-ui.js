const fs = require('fs');
let code = fs.readFileSync('frontend-backoffice/src/pages/CumplimientoFiscal.jsx', 'utf8');

code = code.replace(
  'const [aplicando, setAplicando] = useState(false);',
  "const [aplicando, setAplicando] = useState(false);\n  const [filtroRetorno, setFiltroRetorno] = useState('');"
);

code = code.replace(
  "const sellados = dtes.filter((d) => d.reception_seal && ['01','11','14'].includes(String(d.dte_type)));",
  "const sellados = dtes.filter((d) => d.reception_seal && ['01','11','14'].includes(String(d.dte_type)));\n  const selladosFiltrados = sellados.filter(d => (d.uuid_generation || '').toLowerCase().includes(filtroRetorno.toLowerCase()) || (d.pnr || '').toLowerCase().includes(filtroRetorno.toLowerCase()) || (d.receiver_name || '').toLowerCase().includes(filtroRetorno.toLowerCase()));"
);

code = code.replace(
  '<label className="block text-sm font-medium text-gray-700 mb-1">DTEs sellados (mǭx 50, mismo tipo/emisor/receptor)</label>',
  '<label className="block text-sm font-medium text-gray-700 mb-1">DTEs sellados (máx 50)</label>\n            <input type="text" className="input-field mb-2 text-xs" placeholder="Buscar UUID o PNR..." value={filtroRetorno} onChange={(e) => setFiltroRetorno(e.target.value)} />'
);

code = code.replace(
  '{sellados.length === 0 ? <p className="text-sm text-gray-500">Sin DTEs sellados FE/FEXE/FSEE</p> :\n                sellados.map((d) => (',
  '{selladosFiltrados.length === 0 ? <p className="text-sm text-gray-500">Sin DTEs</p> :\n                selladosFiltrados.map((d) => ('
);

fs.writeFileSync('frontend-backoffice/src/pages/CumplimientoFiscal.jsx', code);
