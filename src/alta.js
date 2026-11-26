// Armado y validación de altas manuales (Pipeline y Seguimiento).
import { norm } from './format.js';

export const FUENTE_WEB = 'web';

/** Minúsculas, sin acentos, solo letras/números y guiones. */
export function slugify(texto, fallback = 'item') {
  const s = norm(texto)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return s || fallback;
}

export function slugUnico(base, ocupados) {
  const set = new Set((ocupados || []).filter(Boolean));
  const raiz = base || 'item';
  if (!set.has(raiz)) return raiz;
  for (let i = 2; i < 1000; i++) {
    const cand = `${raiz}-${i}`;
    if (!set.has(cand)) return cand;
  }
  return `${raiz}-${Date.now().toString(36)}`;
}

export function emailValido(v) {
  if (!String(v || '').trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());
}

export function digitosTel(v) {
  return String(v || '').replace(/\D/g, '');
}

/** Dígitos nacionales, sin 0, 54 ni 549, para comparar duplicados. */
export function telCanon(v) {
  let d = digitosTel(v);
  if (!d) return '';
  if (d.startsWith('0')) d = d.slice(1);
  if (d.startsWith('549')) d = d.slice(3);
  else if (d.startsWith('54')) d = d.slice(2);
  return d;
}

/** Acepta vacío, o 8 a 15 dígitos (con o sin +54 / 549). */
export function telefonoValido(v) {
  if (!String(v || '').trim()) return true;
  const d = digitosTel(v);
  return d.length >= 8 && d.length <= 15;
}

function limpio(v) {
  const s = String(v || '').trim();
  return s || null;
}

/** Negocios con el mismo nombre, teléfono o mail (si el dato viene). */
export function duplicadosNegocio(lista, { nombre, telefono, email } = {}) {
  const nom = norm(nombre);
  const tel = telCanon(telefono);
  const mail = String(email || '').trim().toLowerCase();
  return (lista || []).filter((n) => {
    if (nom && norm(n.nombre) === nom) return true;
    if (tel && (telCanon(n.telefono) === tel || telCanon(n.whatsapp) === tel)) return true;
    if (mail && String(n.email_general || '').trim().toLowerCase() === mail) return true;
    return false;
  });
}

/** Leads con la misma empresa o el mismo mail. No hay columna de teléfono. */
export function duplicadosLead(lista, { empresa, email } = {}) {
  const nom = norm(empresa);
  const mail = String(email || '').trim().toLowerCase();
  return (lista || []).filter((l) => {
    if (nom && norm(l.empresa) === nom) return true;
    if (mail && String(l.email || '').trim().toLowerCase() === mail) return true;
    return false;
  });
}

export function claveLead({ empresa, contacto }, ocupadas) {
  return slugUnico(`lead:${slugify(empresa, 'empresa')}:${slugify(contacto, 'manual')}`, ocupadas);
}

function conEsquema(url) {
  const v = limpio(url);
  if (!v) return null;
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

/**
 * Fila para INSERT en negocios.
 * `telefonoWhatsapp` llena teléfono y WhatsApp con el mismo valor.
 */
export function filaNegocio(form, { slugs, email } = {}) {
  const nombre = limpio(form.nombre);
  const tel = limpio(form.telefono);
  const slug = slugUnico(slugify(nombre, 'negocio'), slugs);
  const ahora = new Date().toISOString();
  return {
    nombre,
    slug,
    rubro: limpio(form.rubro),
    barrio: limpio(form.barrio),
    telefono: tel,
    whatsapp: tel,
    instagram: limpio(form.instagram),
    web_url: conEsquema(form.web_url),
    nicho: limpio(form.nicho) || 'landing',
    etapa: limpio(form.etapa) || 'candidato',
    url_google_maps: conEsquema(form.url_google_maps),
    notas: limpio(form.notas),
    fuente: FUENTE_WEB,
    editado_por: email || null,
    editado_web_at: ahora,
  };
}

/** Fila para INSERT en seguimiento_leads. */
export function filaLead(form, { claves, email } = {}) {
  const empresa = limpio(form.empresa);
  const contacto = limpio(form.contacto);
  const ahora = new Date().toISOString();
  const grupo = limpio(form.grupo) || 'Caliente';
  return {
    clave: claveLead({ empresa, contacto }, claves),
    empresa,
    contacto,
    email: limpio(form.email),
    perfil: limpio(form.perfil),
    area: limpio(form.area),
    grupo,
    grupo_original: grupo,
    proxima_accion: limpio(form.proxima_accion),
    proxima_fecha: limpio(form.proxima_fecha),
    notas_equipo: limpio(form.notas),
    activo: true,
    urgente: false,
    fuente: FUENTE_WEB,
    fecha_snapshot: ahora,
    editado_por: email || null,
    editado_web_at: ahora,
  };
}

export function etiquetaDuplicado(item, tipo) {
  if (tipo === 'pipeline') {
    const donde = item.columna || item.etapa || '';
    return donde ? `${item.nombre} (${donde})` : item.nombre;
  }
  const donde = item.grupo || '';
  return donde ? `${item.empresa} (${donde})` : item.empresa;
}

/** ¿El formulario trae datos de decisor? (alta de negocio) */
export function hayDecisor(form) {
  return !!String(form.decisor_nombre || '').trim();
}

/** Fila para INSERT/UPDATE en decisores a partir de un form plano (campos sin prefijo). */
export function filaDecisor(f, { negocioId, email } = {}) {
  const mail = limpio(f.email);
  const fila = {
    nombre: limpio(f.nombre),
    cargo: limpio(f.cargo),
    whatsapp: limpio(f.whatsapp),
    email: mail,
    email_etiqueta: mail ? (f.email_etiqueta || 'general') : null,
    telefono: limpio(f.telefono),
    instagram: limpio(f.instagram),
    linkedin: limpio(f.linkedin),
    fuente_url: limpio(f.fuente_url),
    confirmado: !!f.confirmado,
    notas: limpio(f.notas),
  };
  if (negocioId) {
    fila.negocio_id = negocioId;
    fila.editado_por = email || null;
    fila.editado_web_at = new Date().toISOString();
  }
  return fila;
}

/** Errores de un decisor (objeto vacío si está bien). */
export function erroresDecisor(f) {
  const e = {};
  if (!String(f.nombre || '').trim()) e.nombre = 'El nombre es obligatorio.';
  if (!emailValido(f.email)) e.email = 'Revisá el mail.';
  if (!telefonoValido(f.whatsapp) && !/^https?:\/\//i.test(String(f.whatsapp || '').trim())) e.whatsapp = 'Revisá el WhatsApp (8 a 15 dígitos o un link).';
  if (!telefonoValido(f.telefono)) e.telefono = 'Revisá el teléfono (8 a 15 dígitos).';
  return e;
}
