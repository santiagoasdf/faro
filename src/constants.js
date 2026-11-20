// Columnas del tablero, en orden. `color` alimenta la escalera y los puntos de etapa.
export const COLUMNAS = [
  { key: 'candidato', label: 'Candidato', color: '#8C96A8' },
  { key: 'elegido', label: 'Elegido', color: '#6F80A6' },
  { key: 'demo_lista', label: 'Demo lista', color: '#5672B4' },
  { key: 'aprobado', label: 'Aprobada por Santi', color: '#3B63C4' },
  { key: 'contactado', label: 'Contactado', color: '#2479B5' },
  { key: 'seguimiento', label: 'En seguimiento', color: '#14868F' },
  { key: 'respondio', label: 'Respondió', color: '#11876A' },
  { key: 'ganado', label: 'Ganado', color: '#0B6E4F' },
  { key: 'descartado', label: 'Descartado', color: '#A0A6B0' },
];
export const COLUMNA = Object.fromEntries(COLUMNAS.map((c, i) => [c.key, { ...c, orden: i + 1 }]));
export const ETAPAS_CERRADAS = ['ganado', 'descartado', 'perdido'];

export const GRUPOS = [
  { key: 'Caliente', orden: 1 },
  { key: 'Nos toca', orden: 2 },
  { key: 'Esperando', orden: 3 },
  { key: 'Sin respuesta', orden: 4 },
  { key: 'Excluido', orden: 9 },
];
export const grupoOrden = (g) => GRUPOS.find((x) => x.key === g)?.orden ?? 5;

export const CANALES = [
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'llamada', label: 'Llamada' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'email', label: 'Mail' },
  { key: 'linkedin', label: 'LinkedIn' },
];
export const CANAL_LABEL = Object.fromEntries(CANALES.map((c) => [c.key, c.label]));

// Resultados que se ofrecen al registrar un contacto.
export const RESULTADOS = [
  { key: 'enviado', label: 'Le escribimos' },
  { key: 'respondio', label: 'Respondió' },
  { key: 'sin_respuesta', label: 'Sin respuesta' },
];
export const ESTADO_INTERACCION = {
  enviado: 'Le escribimos',
  respondio: 'Respondió',
  sin_respuesta: 'Sin respuesta',
  borrador: 'Borrador',
  aprobado: 'Aprobado',
};
