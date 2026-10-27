export const descargarExcelTablas = async (filename, sheets) => {
  const excelModule = await import('exceljs');
  const ExcelJS = excelModule.default || excelModule;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Acajutla Airlines';
  workbook.created = new Date();
  workbook.subject = 'Reportes del sistema';

  sheets.forEach(({ name, tableName, headers, rows, widths = [], numberFormats = {} }) => {
    if (!rows.length) return;
    const sheet = workbook.addWorksheet(name);
    sheet.addTable({
      name: tableName,
      ref: 'A1',
      headerRow: true,
      style: { theme: 'TableStyleMedium2', showRowStripes: true },
      columns: headers.map((header) => ({ name: header, filterButton: true })),
      rows
    });
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.columns = headers.map((header, index) => ({ width: widths[index] || Math.min(Math.max(header.length + 4, 14), 32) }));
    sheet.getRow(1).height = 24;
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', wrapText: true };
    });
    Object.entries(numberFormats).forEach(([column, format]) => {
      sheet.getColumn(Number(column)).numFmt = format;
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
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
