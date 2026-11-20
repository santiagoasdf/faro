const TZ = 'America/Argentina/Buenos_Aires';

const isoBA = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);

/** Fecha de hoy en Buenos Aires como 'aaaa-mm-dd'. */
export function hoyBA() {
  return isoBA(new Date());
}

/** 'aaaa-mm-dd' (o timestamp) -> 'dd/mm/aaaa'. */
export function fecha(v) {
  if (!v) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [a, m, d] = v.split('-');
    return `${d}/${m}/${a}`;
  }
  return fecha(isoBA(new Date(v)));
}

/** 'aaaa-mm-dd' -> 'dd/mm'. */
export function fechaCorta(v) {
  return v ? fecha(v).slice(0, 5) : '';
}

/** Timestamp -> 'dd/mm/aaaa hh:mm' en hora de Buenos Aires. */
export function fechaHora(ts) {
  if (!ts) return '';
  const p = new Intl.DateTimeFormat('es-AR', {
    timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(ts));
  const g = (t) => p.find((x) => x.type === t)?.value;
  return `${g('day')}/${g('month')}/${g('year')} ${g('hour')}:${g('minute')}`;
}

/** Timestamp -> 'dd/mm hh:mm'. */
export function fechaHoraCorta(ts) {
  const f = fechaHora(ts);
  return f ? `${f.slice(0, 5)} ${f.slice(11)}` : '';
}

/** "Jueves 20 de noviembre". */
export function hoyLargo() {
  const s = new Intl.DateTimeFormat('es-AR', {
    timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date());
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function diffDias(a, b) {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
}

/** "recién", "hace 20 min", "ayer", "hace 3 días", "hace 2 semanas"... */
export function haceCuanto(ts) {
  if (!ts) return '';
  const d = diffDias(isoBA(new Date(ts)), hoyBA());
  if (d <= 0) {
    const min = Math.round((Date.now() - new Date(ts).getTime()) / 60000);
    if (min < 1) return 'recién';
    if (min < 60) return `hace ${min} min`;
    const h = Math.round(min / 60);
    return h < 12 ? `hace ${h} h` : 'hoy';
  }
  if (d === 1) return 'ayer';
  if (d < 14) return `hace ${d} días`;
  if (d < 60) return `hace ${Math.round(d / 7)} semanas`;
  if (d < 365) return `hace ${Math.round(d / 30)} meses`;
  const a = Math.round(d / 365);
  return a === 1 ? 'hace un año' : `hace ${a} años`;
}

/** Días desde hoy hasta 'aaaa-mm-dd' (negativo = ya pasó). */
export function diasHasta(f) {
  if (!f) return null;
  return diffDias(hoyBA(), f);
}

/** Texto relativo corto para una próxima fecha. */
export function cuando(f) {
  const d = diasHasta(f);
  if (d === null) return '';
  if (d === 0) return 'hoy';
  if (d === 1) return 'mañana';
  if (d === -1) return 'ayer';
  if (d < 0) return `hace ${-d} días`;
  if (d < 7) return `en ${d} días`;
  return fechaCorta(f);
}

export function rating(r) {
  if (r === null || r === undefined || r === '') return '';
  return Number(r).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function numero(n) {
  return Number(n || 0).toLocaleString('es-AR');
}

export function plural(n, uno, varios) {
  return `${numero(n)} ${n === 1 ? uno : varios}`;
}

/** Minúsculas y sin acentos, para buscar. */
export function norm(s) {
  return (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Links de contacto: solo abren la app correspondiente; la web no envía nada.
export function linkWhatsapp(v) {
  if (!v) return null;
  if (/^https?:\/\//.test(v)) return v;
  let d = String(v).replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('0')) d = d.slice(1);
  if (!d.startsWith('54')) d = '549' + d;
  return `https://wa.me/${d}`;
}
export function linkTel(v) {
  if (!v) return null;
  const d = String(v).replace(/[^\d+]/g, '');
  return d ? `tel:${d}` : null;
}
export function linkInstagram(v) {
  if (!v) return null;
  if (/^https?:\/\//.test(v)) return v;
  const h = String(v).trim().replace(/^@/, '').replace(/^(www\.)?instagram\.com\//, '');
  return h ? `https://instagram.com/${h}` : null;
}
export function linkUrl(v) {
  if (!v) return null;
  return /^https?:\/\//.test(v) ? v : `https://${v}`;
}

export function primerNombre(nombre, email) {
  if (nombre) return nombre.split(' ')[0];
  if (email) return email.split('@')[0];
  return '';
}
