const csvCell = (value) => {
  let text = value == null ? '' : String(value);
  // Prevent spreadsheet applications from evaluating untrusted text as a formula.
  const numericLiteral = /^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text);
  if (typeof value === 'string' && !numericLiteral && /^[\t\r ]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

export const csvText = (headers, rows) => {
  const records = [headers, ...rows];
  return '\uFEFF' + records.map((row) => row.map(csvCell).join(';')).join('\r\n') + '\r\n';
};

export const descargarCSV = (filename, headers, rows) => {
  const blob = new Blob([csvText(headers, rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const nombreCSVConPeriodo = (nombre, desde, hasta) => `${nombre}_${desde}_${hasta}.csv`;
