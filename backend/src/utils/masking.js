const maskDoc = (v) => {
  if (v == null) return v;
  const s = String(v);
  if (s.length <= 4) return '****';
  return s.slice(0, 3) + '*'.repeat(Math.max(0, s.length - 5)) + s.slice(-2);
};
const maskEmail = (v) => {
  if (!v) return v;
  const [u, d] = String(v).split('@');
  if (!d) return v;
  const uu = u.length <= 2 ? u[0] + '*' : u.slice(0, 2) + '*'.repeat(Math.max(0, u.length - 3)) + u.slice(-1);
  return uu + '@' + d;
};
const maskCard = (v) => {
  if (!v) return v;
  const s = String(v).replace(/\s/g, '');
  if (s.length < 6) return '****';
  return s.slice(0, 4) + ' **** **** ' + s.slice(-4);
};
const KEY_DOC = /doc|documento|dui|nit|passport|pasaporte|pan|card|tarjeta/i;
const KEY_MAIL = /email|correo/i;
const maskDeep = (obj) => {
  if (obj == null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(maskDeep);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') {
      if (KEY_MAIL.test(k)) out[k] = maskEmail(v);
      else if (KEY_DOC.test(k)) out[k] = maskDoc(v);
      else out[k] = v;
    } else out[k] = maskDeep(v);
  }
  return out;
};
module.exports = { maskDoc, maskEmail, maskCard, maskDeep };