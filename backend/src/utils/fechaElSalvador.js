const FORMATO_LOCAL = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/El_Salvador', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
});

const partes = (fecha = new Date()) => Object.fromEntries(
  FORMATO_LOCAL.formatToParts(new Date(fecha)).map((parte) => [parte.type, parte.value])
);

const fechaElSalvador = (fecha = new Date()) => {
  const p = partes(fecha);
  return p.year + '-' + p.month + '-' + p.day;
};

const horaElSalvador = (fecha = new Date()) => {
  const p = partes(fecha);
  return p.hour + ':' + p.minute + ':' + p.second;
};

module.exports = { fechaElSalvador, horaElSalvador };
