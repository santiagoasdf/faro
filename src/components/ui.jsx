import { useEffect, useRef, useState } from 'preact/hooks';
import {
  ArrowRight, Briefcase, Camera, Check, ChevronLeft, CircleAlert, CircleUser, Clock, ExternalLink, Eye,
  EyeOff, Flame, Globe, House, ListChecks, LogOut, Mail, MapPin, MessageCircle, Phone, Plus, RefreshCw, Search,
  SquareKanban, Star, StickyNote, Trash2, X,
} from 'lucide';

const ICONOS = {
  flecha: ArrowRight, linkedin: Briefcase, instagram: Camera, ok: Check, volver: ChevronLeft,
  alerta: CircleAlert, reloj: Clock, externo: ExternalLink, urgente: Flame, web: Globe, inicio: House,
  seguimiento: ListChecks, salir: LogOut, email: Mail, mapa: MapPin, whatsapp: MessageCircle,
  llamada: Phone, mas: Plus, actualizar: RefreshCw, buscar: Search, pipeline: SquareKanban,
  estrella: Star, nota: StickyNote, borrar: Trash2, cerrar: X, perfil: CircleUser, ver: Eye,
  ocultar: EyeOff,
};

/** Ícono de lucide renderizado como SVG inline (trazo uniforme). */
export function Icon({ name, size = 18, class: cls = '', fill }) {
  const node = ICONOS[name];
  if (!node) return null;
  return (
    <svg
      class={`icon ${cls}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill || 'none'}
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {node.map(([tag, attrs], i) => {
        const T = tag;
        return <T key={i} {...attrs} />;
      })}
    </svg>
  );
}

/** Marca: tres escalones. */
export function Marca({ size = 28 }) {
  return (
    <svg class="marca" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--ink)" />
      <path d="M7 24h6v-5h6v-5h6V8" fill="none" stroke="var(--mint)" stroke-width="3"
        stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span class="wordmark">
      <Marca />
      <span class="wordmark-text">
        Faro
      </span>
    </span>
  );
}

/**
 * Campo de contraseña con botón para mostrarla u ocultarla.
 * El resto de las props van directo al <input>.
 */
export function CampoClave({ label, inputRef, id, ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <label class="campo">
      <span class="campo-label">{label}</span>
      <span class="campo-clave">
        <input
          ref={inputRef}
          id={id}
          type={visible ? 'text' : 'password'}
          autoCapitalize="none"
          autoCorrect="off"
          spellcheck={false}
          {...props}
        />
        <button
          type="button"
          class="btn-ver-clave"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={visible}
          title={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          <Icon name={visible ? 'ocultar' : 'ver'} size={18} />
        </button>
      </span>
    </label>
  );
}

/* ---------- Toasts ---------- */
let toastId = 0;
const oyentes = new Set();
let toasts = [];
function emitir() {
  oyentes.forEach((fn) => fn(toasts));
}
/** toast('Guardado') · toast('No se pudo guardar', 'error') */
export function toast(texto, tipo = 'ok') {
  const id = ++toastId;
  toasts = [...toasts.slice(-2), { id, texto, tipo }];
  emitir();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emitir();
  }, tipo === 'error' ? 5200 : 2600);
}

export function Toaster() {
  const [lista, setLista] = useState(toasts);
  const ref = useRef(null);
  useEffect(() => {
    oyentes.add(setLista);
    return () => oyentes.delete(setLista);
  }, []);
  // Popover manual: así queda en la capa superior incluso sobre un <dialog> modal abierto.
  useEffect(() => {
    const el = ref.current;
    if (!el?.showPopover) return;
    try {
      if (el.matches(':popover-open')) el.hidePopover();
      if (lista.length) el.showPopover();
    } catch {
      /* navegador sin popover: queda como capa fija normal */
    }
  }, [lista]);
  return (
    <div ref={ref} popover="manual" class="toaster" role="status" aria-live="polite">
      {lista.map((t) => (
        <div key={t.id} class={`toast toast-${t.tipo}`}>
          <Icon name={t.tipo === 'error' ? 'alerta' : 'ok'} size={16} />
          <span>{t.texto}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Panel de detalle (dialog nativo: foco atrapado + Escape) ---------- */
export function Panel({ abierto, onCerrar, titulo, children, pie }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierto && !d.open) d.showModal();
    if (!abierto && d.open) d.close();
  }, [abierto]);
  return (
    <dialog
      ref={ref}
      class="panel"
      aria-label={titulo}
      onCancel={(e) => {
        e.preventDefault();
        onCerrar();
      }}
      onClick={(e) => {
        // clic en el fondo (fuera de la hoja) cierra
        if (e.target === ref.current) onCerrar();
      }}
    >
      <div class="panel-hoja">
        {abierto && children}
        {abierto && pie}
      </div>
    </dialog>
  );
}

export function Cargando({ texto = 'Cargando…' }) {
  return (
    <div class="cargando" role="status">
      <span class="spinner" aria-hidden="true" />
      <span>{texto}</span>
    </div>
  );
}

export function Vacio({ titulo, children }) {
  return (
    <div class="vacio">
      <p class="vacio-titulo">{titulo}</p>
      {children && <p class="vacio-texto">{children}</p>}
    </div>
  );
}

/** Mensaje de error de la base, en criollo. */
export function mensajeError(e, accion = 'guardar') {
  if (!navigator.onLine || e?.code === 'NETWORK' || e instanceof TypeError) {
    return 'Sin conexión. Revisá internet y probá de nuevo.';
  }
  if (e?.code === '42501' || e?.code === 'SIN_FILAS') {
    return `No tenés permiso para ${accion} esto.`;
  }
  return `No se pudo ${accion}. Probá de nuevo.`;
}
