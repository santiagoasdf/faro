import { useState } from 'preact/hooks';
import { api } from '../api.js';
import { erroresDecisor, filaDecisor } from '../alta.js';
import { EMAIL_ETIQUETAS, ESTADO_CORTO, busquedasDecisor, estadoDecisores, linksDecisor } from '../decisores.js';
import { linkUrl } from '../format.js';
import { Icon, TextareaAuto, mensajeError, toast } from './ui.jsx';

const VACIO = {
  nombre: '', cargo: '', whatsapp: '', email: '', email_etiqueta: 'general', telefono: '',
  instagram: '', linkedin: '', fuente_url: '', notas: '', confirmado: false,
};

function Campo({ label, error, children, ancho }) {
  return (
    <label class={`campo${ancho ? ' campo-ancho' : ''}`}>
      <span class="campo-label">{label}</span>
      {children}
      {error && <span class="campo-error">{error}</span>}
    </label>
  );
}

function FormDecisor({ inicial, onGuardar, onCancelar }) {
  const [f, setF] = useState({ ...VACIO, ...inicial });
  const [err, setErr] = useState({});
  const [ocupado, setOcupado] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  async function enviar(e) {
    e.preventDefault();
    const er = erroresDecisor(f);
    setErr(er);
    if (Object.keys(er).length) return;
    setOcupado(true);
    const ok = await onGuardar(f);
    setOcupado(false);
    if (ok) onCancelar();
  }

  return (
    <form class="form-decisor" onSubmit={enviar}>
      <Campo label="Nombre *" error={err.nombre}>
        <input type="text" value={f.nombre} aria-invalid={!!err.nombre} onInput={(e) => set('nombre', e.currentTarget.value)} />
      </Campo>
      <Campo label="Cargo / rol">
        <input type="text" value={f.cargo || ''} placeholder="Dueño, titular, gerente…" onInput={(e) => set('cargo', e.currentTarget.value)} />
      </Campo>
      <Campo label="WhatsApp (número o link)" error={err.whatsapp}>
        <input type="text" inputMode="tel" value={f.whatsapp || ''} placeholder="11 1234-5678" onInput={(e) => set('whatsapp', e.currentTarget.value)} />
      </Campo>
      <Campo label="Mail" error={err.email}>
        <input type="email" value={f.email || ''} onInput={(e) => set('email', e.currentTarget.value)} />
      </Campo>
      {f.email && (
        <Campo label="Ese mail es…">
          <select value={f.email_etiqueta || 'general'} onChange={(e) => set('email_etiqueta', e.currentTarget.value)}>
            {Object.entries(EMAIL_ETIQUETAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Campo>
      )}
      <Campo label="Teléfono (llamada)" error={err.telefono}>
        <input type="tel" value={f.telefono || ''} onInput={(e) => set('telefono', e.currentTarget.value)} />
      </Campo>
      <Campo label="Instagram">
        <input type="text" value={f.instagram || ''} placeholder="@cuenta" onInput={(e) => set('instagram', e.currentTarget.value)} />
      </Campo>
      <Campo label="LinkedIn (URL)">
        <input type="text" inputMode="url" value={f.linkedin || ''} onInput={(e) => set('linkedin', e.currentTarget.value)} />
      </Campo>
      <Campo label="Fuente (URL donde se vio)">
        <input type="text" inputMode="url" value={f.fuente_url || ''} placeholder="https://" onInput={(e) => set('fuente_url', e.currentTarget.value)} />
      </Campo>
      <Campo label="Notas de la fuente" ancho>
        <TextareaAuto value={f.notas || ''} minRows={3} onInput={(e) => set('notas', e.currentTarget.value)} />
      </Campo>
      <label class="check form-decisor-check">
        <input type="checkbox" checked={!!f.confirmado} onChange={(e) => set('confirmado', e.currentTarget.checked)} />
        <span>Confirmado en una fuente propia (su web, su Instagram o hablando con él/ella)</span>
      </label>
      <div class="form-acciones">
        <button type="button" class="btn btn-fantasma" onClick={onCancelar}>Cancelar</button>
        <button type="submit" class="btn btn-primario" disabled={ocupado}>{ocupado ? 'Guardando…' : 'Guardar decisor'}</button>
      </div>
    </form>
  );
}

function TarjetaDecisor({ d, puedeEditar, onEditar }) {
  const links = linksDecisor(d);
  const fuente = d.fuente_url ? linkUrl(d.fuente_url) : null;
  let host = '';
  try { host = fuente ? new URL(fuente).hostname.replace(/^www\./, '') : ''; } catch { host = fuente || ''; }
  return (
    <li class="decisor">
      <div class="decisor-cabeza">
        <div class="decisor-quien">
          <strong class="decisor-nombre">{d.nombre}</strong>
          {d.cargo && <span class="decisor-cargo">{d.cargo}</span>}
        </div>
        <span class={`chip ${d.confirmado ? 'chip-ok' : 'chip-pendiente'}`}>
          {d.confirmado ? 'Confirmado' : 'Sin confirmar'}
        </span>
      </div>
      {links.length > 0 ? (
        <ul class="contactos decisor-contactos" aria-label={`Contactar a ${d.nombre}`}>
          {links.map((l) => (
            <li key={l.key}>
              <a class={`contacto contacto-${l.key}`} href={l.href}
                target={l.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">
                <Icon name={l.key} size={16} />
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p class="dato-vacio">Sin contacto cargado.</p>
      )}
      <dl class="decisor-datos">
        {d.whatsapp && <div><dt>WhatsApp</dt><dd>{d.whatsapp}</dd></div>}
        {d.email && <div><dt>Mail</dt><dd>{d.email} <span class="decisor-etiqueta">({EMAIL_ETIQUETAS[d.email_etiqueta] || 'sin etiqueta'})</span></dd></div>}
        {d.telefono && <div><dt>Teléfono</dt><dd>{d.telefono}</dd></div>}
        {fuente && (
          <div><dt>Fuente</dt><dd><a class="link-ext" href={fuente} target="_blank" rel="noopener noreferrer">{host} <Icon name="externo" size={13} /></a></dd></div>
        )}
      </dl>
      {d.notas && (
        <details class="decisor-notas">
          <summary>Qué dice la fuente</summary>
          <p>{d.notas}</p>
        </details>
      )}
      {puedeEditar && (
        <button type="button" class="btn btn-fantasma btn-chico decisor-editar" onClick={onEditar}>Editar</button>
      )}
    </li>
  );
}

function Busqueda({ n }) {
  const items = busquedasDecisor(n);
  if (!items.length) return null;
  return (
    <div class="decisor-busqueda">
      <p class="decisor-busqueda-titulo">Dónde buscar al decisor</p>
      <p class="decisor-busqueda-texto">
        Probá con nombres de pila que aparezcan en reseñas, la bio de Instagram, el pie de la web propia,
        la matrícula o el registro de la empresa.
      </p>
      <ul class="decisor-herramientas">
        {items.map((i) => (
          <li key={i.key}>
            <a class="herramienta" href={i.href} target="_blank" rel="noopener noreferrer">
              <Icon name="buscar" size={14} />
              {i.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SeccionDecisores({ negocio: n, ctx, detalle, onDetalle }) {
  const [editando, setEditando] = useState(null); // 'nuevo' | id | null
  const [pistas, setPistas] = useState(null); // texto en edición
  const [guardandoPistas, setGuardandoPistas] = useState(false);
  const lista = detalle?.decisores || [];
  const cargado = !!detalle;
  const estado = estadoDecisores(lista);
  const puedeEditar = ctx.puedeEditar;
  const pistasGuardadas = detalle?.pistas ?? '';
  // Un mail de directorio sin verificar no alcanza: igual mostramos dónde buscar.
  const sinWaNiMail = !lista.some((d) => d.whatsapp || (d.email && d.email_etiqueta !== 'directorio_sin_verificar'));

  async function guardar(f, id) {
    try {
      let fila;
      if (id) {
        fila = await api.editarDecisor(id, filaDecisor(f));
      } else {
        fila = await api.crearDecisor(filaDecisor(f, { negocioId: n.id, email: ctx.yo?.email }));
      }
      const nueva = id ? lista.map((d) => (d.id === id ? fila : d)) : [...lista, fila];
      onDetalle({ ...detalle, decisores: nueva });
      ctx.actualizarDecisores(n.id, nueva);
      toast(id ? 'Decisor guardado' : 'Decisor agregado');
      return true;
    } catch (e) {
      toast(mensajeError(e, 'guardar el decisor'), 'error');
      return false;
    }
  }

  async function guardarPistas(e) {
    e.preventDefault();
    setGuardandoPistas(true);
    try {
      const texto = pistas.trim() || null;
      await api.guardarPistas(n.id, texto);
      onDetalle({ ...detalle, pistas: texto || '' });
      setPistas(null);
      toast('Pistas guardadas');
    } catch (err) {
      toast(mensajeError(err, 'guardar las pistas'), 'error');
    } finally {
      setGuardandoPistas(false);
    }
  }

  return (
    <section class="detalle-sec" aria-labelledby="sec-decisores">
      <div class="sec-cabeza">
        <h3 id="sec-decisores">Decisores</h3>
        {cargado && (
          <span class={`chip chip-estado-${estado}`}>
            {ESTADO_CORTO[estado]}
          </span>
        )}
      </div>

      {!cargado ? (
        <p class="dato-vacio">Cargando decisores…</p>
      ) : (
        <>
          {lista.length > 0 && (
            <ul class="decisores">
              {lista.map((d) => (
                editando === d.id ? (
                  <li key={d.id} class="decisor decisor-edicion">
                    <FormDecisor inicial={d} onGuardar={(f) => guardar(f, d.id)} onCancelar={() => setEditando(null)} />
                  </li>
                ) : (
                  <TarjetaDecisor key={d.id} d={d} puedeEditar={puedeEditar} onEditar={() => setEditando(d.id)} />
                )
              ))}
            </ul>
          )}
          {lista.length === 0 && <p class="dato-vacio">Todavía no hay decisores cargados para este negocio.</p>}

          {editando === 'nuevo' && (
            <div class="decisor decisor-edicion">
              <FormDecisor inicial={{}} onGuardar={(f) => guardar(f, null)} onCancelar={() => setEditando(null)} />
            </div>
          )}
          {puedeEditar && editando !== 'nuevo' && (
            <button type="button" class="btn btn-secundario" onClick={() => setEditando('nuevo')}>
              <Icon name="mas" size={16} /> Agregar decisor
            </button>
          )}

          {(pistasGuardadas || pistas !== null || puedeEditar) && detalle.pistas !== null && (
            <div class="decisor-pistas">
              <p class="decisor-busqueda-titulo">Pistas para encontrarlo</p>
              {pistas === null ? (
                <>
                  {pistasGuardadas
                    ? <p class="decisor-pistas-texto">{pistasGuardadas}</p>
                    : <p class="dato-vacio">Sin pistas anotadas todavía.</p>}
                  {puedeEditar && (
                    <button type="button" class="btn btn-fantasma btn-chico" onClick={() => setPistas(pistasGuardadas)}>
                      {pistasGuardadas ? 'Editar pistas' : 'Anotar pistas'}
                    </button>
                  )}
                </>
              ) : (
                <form onSubmit={guardarPistas}>
                  <TextareaAuto value={pistas} minRows={4}
                    placeholder="Nombres de pila en reseñas, cuentas de Instagram, matrícula, CUIT…"
                    onInput={(e) => setPistas(e.currentTarget.value)} />
                  <div class="form-acciones">
                    <button type="button" class="btn btn-fantasma" onClick={() => setPistas(null)}>Cancelar</button>
                    <button type="submit" class="btn btn-primario" disabled={guardandoPistas}>
                      {guardandoPistas ? 'Guardando…' : 'Guardar pistas'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {(lista.length === 0 || sinWaNiMail) && <Busqueda n={n} />}
        </>
      )}
    </section>
  );
}
