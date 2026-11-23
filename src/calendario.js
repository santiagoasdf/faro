// Calendario y kanban por fecha. Fechas en America/Argentina/Buenos_Aires (hoyBA).
import { COLUMNA, ETAPAS_CERRADAS } from './constants.js';
import { cuando, fecha, fechaHora, hoyBA } from './format.js';

/** Suma (o resta) días a un 'aaaa-mm-dd' sin correr el huso. */
export function addDays(iso, n) {
  const t = Date.parse(`${iso}T00:00:00Z`) + n * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

/** 0 = domingo … 6 = sábado, sobre la fecha de calendario. */
function dow(iso) {
  return new Date(`${iso}T00:00:00Z`).getUTCDay();
}

/** Domingo de la semana de `iso` (lunes–domingo). */
export function domingoDeLaSemana(iso) {
  const d = dow(iso);
  return d === 0 ? iso : addDays(iso, 7 - d);
}

export function lunesDeLaSemana(iso) {
  const d = dow(iso);
  return addDays(iso, d === 0 ? -6 : 1 - d);
}

export const BALDES = [
  { key: 'para_ayer', label: 'Para ayer', tono: 'vencido' },
  { key: 'para_hoy', label: 'Para hoy', tono: 'hoy' },
  { key: 'para_manana', label: 'Para mañana', tono: 'proximo' },
  { key: 'esta_semana', label: 'Esta semana', tono: 'semana' },
  { key: 'semana_que_viene', label: 'Semana que viene', tono: 'semana' },
  { key: 'mas_adelante', label: 'Más adelante', tono: 'luego' },
  { key: 'sin_fecha', label: 'Sin fecha', tono: 'muted', colapsado: true },
];

export const BALDE = Object.fromEntries(BALDES.map((b) => [b.key, b]));

/**
 * Balde de una próxima fecha.
 * Esta semana = desde pasado mañana hasta el domingo de ESTA semana.
 * Semana que viene = lunes a domingo de la semana siguiente.
 */
export function baldeProxima(fechaIso, hoy = hoyBA()) {
  if (!fechaIso) return 'sin_fecha';
  const f = String(fechaIso).slice(0, 10);
  if (f < hoy) return 'para_ayer';
  if (f === hoy) return 'para_hoy';
  if (f === addDays(hoy, 1)) return 'para_manana';
  const domingoEsta = domingoDeLaSemana(hoy);
  const pasadoManana = addDays(hoy, 2);
  if (f >= pasadoManana && f <= domingoEsta) return 'esta_semana';
  const lunesProx = addDays(domingoEsta, 1);
  const domingoProx = addDays(lunesProx, 6);
  if (f >= lunesProx && f <= domingoProx) return 'semana_que_viene';
  return 'mas_adelante';
}

/** Santi y Guido: 4 mails de login → 2 personas. No usar el `perfil` de campaña. */
export const PERSONAS = [
  {
    key: 'santi',
    nombre: 'Santi',
    email: 'spaoletta@levelupsc.cloud',
    emails: ['spaoletta@levelupsc.cloud'],
  },
  {
    key: 'guido',
    nombre: 'Guido',
    email: 'guidolosardo@levelup.cloud',
    emails: ['guidolosardo@levelup.cloud', 'glosardo@levelupsc.cloud', 'guido@levelupsc.io'],
  },
];

export function personaDeEmail(email) {
  const e = (email || '').trim().toLowerCase();
  if (!e) return null;
  return PERSONAS.find((p) => p.email === e || p.emails.includes(e)) || null;
}

export function emailCanónico(email) {
  return personaDeEmail(email)?.email || null;
}

/** Solo si ya hay una URL real: no inventamos el path de cele.be a partir del crm_id. */
export function urlCelebe(x) {
  const u = x?.celebe_url || x?.url_celebe;
  return u && /^https?:\/\//i.test(u) ? u : null;
}

export function urlLinkedin(x) {
  const u = x?.linkedin_url || x?.linkedin;
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return u;
  const t = String(u).trim().replace(/^\/\//, '');
  if (/linkedin\.com/i.test(t)) return `https://${t}`;
  return null;
}

/**
 * Una tarjeta por negocio (con fecha) y por lead activo.
 * El kanban/lista leen proxima_fecha + proxima_accion; nunca eventos de Calendly.
 */
export function tareasDesdeListas(pipeline, seguimiento) {
  const items = [];
  for (const n of pipeline || []) {
    if (ETAPAS_CERRADAS.includes(n.etapa) || ETAPAS_CERRADAS.includes(n.columna)) continue;
    if (!n.proxima_fecha) continue;
    items.push({
      tipo: 'n',
      id: n.id,
      titulo: n.nombre,
      sub: [n.rubro, n.barrio].filter(Boolean).join(', '),
      accion: n.proxima_accion || '',
      fecha: String(n.proxima_fecha).slice(0, 10),
      vencido: !!n.vencido,
      area: COLUMNA[n.columna]?.label || n.columna,
      responsable_email: n.responsable_email || null,
      celebe_url: urlCelebe(n),
      linkedin_url: urlLinkedin(n),
      urgente: false,
    });
  }
  for (const l of seguimiento || []) {
    if (!l.activo) continue;
    items.push({
      tipo: 'l',
      id: l.id,
      titulo: l.empresa,
      sub: [l.contacto, l.pais].filter(Boolean).join(', '),
      accion: l.proxima_accion || '',
      fecha: l.proxima_fecha ? String(l.proxima_fecha).slice(0, 10) : null,
      vencido: !!l.vencido,
      area: l.grupo || '',
      responsable_email: l.responsable_email || null,
      celebe_url: urlCelebe(l),
      linkedin_url: urlLinkedin(l),
      urgente: !!l.urgente,
    });
  }
  return items;
}

export function agruparPorBalde(tareas, hoy = hoyBA()) {
  const m = Object.fromEntries(BALDES.map((b) => [b.key, []]));
  for (const t of tareas) {
    const k = baldeProxima(t.fecha, hoy);
    (m[k] || m.sin_fecha).push(t);
  }
  for (const lista of Object.values(m)) {
    lista.sort(
      (a, b) =>
        (a.fecha || '9999').localeCompare(b.fecha || '9999') ||
        a.titulo.localeCompare(b.titulo, 'es'),
    );
  }
  return m;
}

/** Eventos all-day derivados de proxima_fecha, hasta que exista v_calendario. */
export function eventosDesdeProximas(tareas) {
  return (tareas || [])
    .filter((t) => t.fecha)
    .map((t) => ({
      tipo: 'seguimiento',
      fuente: 'proxima',
      titulo: t.accion || `Seguimiento: ${t.titulo}`,
      inicia_en: `${t.fecha}T00:00:00-03:00`,
      termina_en: null,
      todo_el_dia: true,
      fecha_local: t.fecha,
      estado: t.vencido ? 'vencido' : 'pendiente',
      responsable: t.responsable_email,
      meet_url: null,
      derivado: true,
      lead: {
        tipo: t.tipo,
        id: t.id,
        empresa: t.titulo,
        contacto: t.sub,
        grupo: t.area,
        proxima_accion: t.accion,
        proxima_fecha: t.fecha,
      },
    }));
}

/** Normaliza filas de v_calendario (columnas en producción). */
export function normalizarEventosVista(rows) {
  return (rows || []).map((r) => ({
    id: r.id,
    tipo: r.tipo || 'seguimiento',
    fuente: r.fuente || 'v_calendario',
    titulo: r.titulo,
    descripcion: r.descripcion,
    inicia_en: r.inicia_en,
    termina_en: r.termina_en,
    todo_el_dia: r.todo_el_dia !== false && r.tipo !== 'reunion',
    fecha_local: r.fecha_local || String(r.inicia_en || '').slice(0, 10),
    estado: r.estado,
    responsable: r.responsable,
    ubicacion: r.ubicacion,
    meet_url: r.meet_url,
    derivado: false,
    lead: {
      tipo: 'l',
      id: r.seguimiento_id,
      clave: r.clave,
      crm_id: r.crm_id,
      empresa: r.empresa,
      contacto: r.contacto,
      email: r.email,
      perfil: r.perfil,
      area: r.area,
      grupo: r.grupo,
      etapa_crm: r.etapa_crm,
      proxima_accion: r.proxima_accion,
      proxima_fecha: r.proxima_fecha,
      activo: r.activo,
    },
  }));
}

/** Las reuniones (Calendly) se ven en el mes/semana, no mueven la tarjeta del kanban. */
export function esReunion(ev) {
  return ev?.tipo === 'reunion' || ev?.fuente === 'calendly';
}

export function eventosEnFecha(eventos, iso) {
  return (eventos || []).filter((e) => e.fecha_local === iso);
}

export function horaCorta(ts) {
  if (!ts || /T00:00:00/.test(ts)) return '';
  const p = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(ts));
  const g = (t) => p.find((x) => x.type === t)?.value;
  return `${g('hour')}:${g('minute')}`;
}

export function diasDelMes(anio, mes) {
  const first = `${anio}-${String(mes).padStart(2, '0')}-01`;
  const offset = dow(first) === 0 ? 6 : dow(first) - 1;
  const start = addDays(first, -offset);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function diasDeLaSemana(iso) {
  const lunes = lunesDeLaSemana(iso);
  return Array.from({ length: 7 }, (_, i) => addDays(lunes, i));
}

export function mesLargo(anio, mes) {
  const s = new Intl.DateTimeFormat('es-AR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(anio, mes - 1, 1)));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/** Relato corto para "Lo último en cele.be". */
export function relatoCelebe(l) {
  const pasaron = [];
  if (l.ultima_accion) {
    pasaron.push(l.ultima_fecha ? `${fecha(l.ultima_fecha)} · ${l.ultima_accion}` : l.ultima_accion);
  }
  if (l.ultimo_comentario && l.ultimo_comentario !== l.ultima_accion) {
    pasaron.push(l.ultimo_comentario);
  }
  if (l.nota_snapshot && !pasaron.some((p) => p.includes(l.nota_snapshot))) {
    pasaron.push(l.nota_snapshot);
  }

  let agendar;
  if (l.proxima_accion && l.proxima_fecha) {
    agendar = l.vencido
      ? `Había que hacer esto ${cuando(l.proxima_fecha)} y sigue pendiente: ${l.proxima_accion}.`
      : `Agendar: ${l.proxima_accion} — ${cuando(l.proxima_fecha)}.`;
  } else if (l.proxima_accion) {
    agendar = `Próximo paso, todavía sin fecha: ${l.proxima_accion}.`;
  } else {
    agendar = 'Todavía no hay una próxima acción agendada.';
  }

  const contexto = [l.etapa_crm && `Etapa: ${l.etapa_crm}`, l.campana && `Campaña: ${l.campana}`, l.perfil && `Perfil: ${l.perfil}`, l.area && `Área: ${l.area}`]
    .filter(Boolean);

  return {
    pasaron,
    agendar,
    vencido: !!l.vencido,
    contexto,
    tomado: l.fecha_snapshot
      ? `Dato de cele.be al ${fechaHora(l.fecha_snapshot)}${l.fuente ? `, ${l.fuente}` : ''}`
      : '',
    vacio: pasaron.length === 0 && !l.proxima_accion && !l.etapa_crm,
  };
}
