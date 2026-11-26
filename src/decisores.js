// Decisores de cada negocio web: estado, links de contacto y ayudas de búsqueda.
import { linkInstagram, linkTel, linkUrl, linkWhatsapp } from './format.js';

export const EMAIL_ETIQUETAS = {
  del_decisor: 'Mail del decisor',
  general: 'Mail general del negocio',
  directorio_sin_verificar: 'Mail de directorio (sin verificar)',
};

export const tieneWhatsapp = (d) => !!linkWhatsapp(d?.whatsapp);
export const tieneContacto = (d) => !!(d?.whatsapp || d?.email || d?.telefono);
export const ESTADO_CORTO = { con_contacto: 'Con contacto', solo_telefono: 'Solo teléfono', sin_contacto: 'Sin contacto', sin_decisor: 'Sin decisor' };

/**
 * 'con_contacto' (WhatsApp o mail) | 'solo_telefono' | 'sin_contacto' | 'sin_decisor'.
 * Un teléfono solo no cuenta como WhatsApp: se prefiere WhatsApp o mail.
 */
export function estadoDecisores(lista) {
  if (!lista || !lista.length) return 'sin_decisor';
  if (lista.some((d) => d.whatsapp || d.email)) return 'con_contacto';
  return lista.some(tieneContacto) ? 'solo_telefono' : 'sin_contacto';
}

/** Primer decisor con WhatsApp usable (prioriza el confirmado). */
export function decisorConWhatsapp(lista) {
  const con = (lista || []).filter(tieneWhatsapp);
  return con.find((d) => d.confirmado) || con[0] || null;
}

export const ESTADO_TEXTO = {
  con_contacto: 'Decisor con contacto',
  solo_telefono: 'Decisor: solo teléfono',
  sin_contacto: 'Decisor sin contacto',
  sin_decisor: 'Sin decisor',
};

/** Links de contacto de un decisor, solo los que tienen dato. */
export function linksDecisor(d) {
  return [
    { key: 'whatsapp', label: 'WhatsApp', href: linkWhatsapp(d.whatsapp) },
    { key: 'email', label: 'Mail', href: d.email ? `mailto:${d.email}` : null },
    { key: 'llamada', label: 'Llamar', href: linkTel(d.telefono) },
    { key: 'instagram', label: 'Instagram', href: linkInstagram(d.instagram) },
    { key: 'linkedin', label: 'LinkedIn', href: linkUrl(d.linkedin) },
  ].filter((l) => l.href);
}

const g = (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`;

/** Búsquedas sugeridas (en español) para encontrar al decisor de un negocio. */
export function busquedasDecisor(n) {
  const nombre = (n?.nombre || '').replace(/["“”]/g, '').trim();
  if (!nombre) return [];
  const zona = [n.barrio, 'Buenos Aires'].filter(Boolean)[0];
  const items = [
    { key: 'google', label: 'Google: dueño o titular', href: g(`"${nombre}" dueño OR titular OR propietario ${zona}`) },
    n.url_google_maps && { key: 'resenas', label: 'Reseñas de Google que lo nombran', href: linkUrl(n.url_google_maps) },
    { key: 'linkedin', label: 'LinkedIn: personas', href: `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(nombre)}` },
    { key: 'sales', label: 'Sales Navigator', href: `https://www.linkedin.com/sales/search/people?keywords=${encodeURIComponent(nombre)}` },
    n.instagram
      ? { key: 'ig', label: 'Instagram del negocio (bio y posteos)', href: linkInstagram(n.instagram) }
      : { key: 'ig', label: 'Instagram: buscar la cuenta', href: g(`site:instagram.com "${nombre}"`) },
    { key: 'cuit', label: 'CUIT / razón social', href: g(`"${nombre}" CUIT razón social`) },
    { key: 'boletin', label: 'Boletín Oficial', href: g(`site:boletinoficial.gob.ar "${nombre}"`) },
    { key: 'matricula', label: 'Matrícula profesional', href: g(`"${nombre}" matrícula profesional`) },
  ];
  return items.filter(Boolean);
}
