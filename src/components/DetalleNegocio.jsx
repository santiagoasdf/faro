import { useEffect, useState } from 'preact/hooks';
import { api } from '../api.js';
import { CANALES, COLUMNA, RESULTADOS } from '../constants.js';
import {
  cuando, fecha, fechaHora, haceCuanto, linkInstagram, linkTel, linkUrl, linkWhatsapp,
} from '../format.js';
import { FormNota, Historial } from './Historial.jsx';
import { emailCanónico } from '../calendario.js';
import { EnlacesFaro } from './EnlacesFaro.jsx';
import { Rating, SelectEtapa } from './Pipeline.jsx';
import { SelectResponsable } from './Responsable.jsx';
import { Cargando, Icon, mensajeError, toast } from './ui.jsx';

function Contactos({ n }) {
  const links = [
    { key: 'whatsapp', label: 'WhatsApp', href: linkWhatsapp(n.whatsapp || n.telefono) },
    { key: 'llamada', label: 'Llamar', href: linkTel(n.telefono) },
    { key: 'instagram', label: 'Instagram', href: linkInstagram(n.instagram) },
    { key: 'email', label: 'Mail', href: n.email_general ? `mailto:${n.email_general}` : null },
    { key: 'mapa', label: 'Maps', href: linkUrl(n.url_google_maps) },
    { key: 'web', label: 'Web actual', href: linkUrl(n.web_url) },
  ].filter((l) => l.href);
  if (!links.length) return <p class="dato-vacio">Sin datos de contacto cargados.</p>;
  return (
    <ul class="contactos" aria-label="Abrir contacto">
      {links.map((l) => (
        <li key={l.key}>
          <a class="contacto" href={l.href} target={l.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">
            <Icon name={l.key} size={16} />
            {l.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

function Dato({ label, children }) {
  if (children === null || children === undefined || children === '' || children === false) return null;
  return (
    <div class="dato">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function FormContacto({ decisores, onGuardar, onCancelar }) {
  const [canal, setCanal] = useState('whatsapp');
  const [estado, setEstado] = useState('enviado');
  const [nota, setNota] = useState('');
  const [decisor, setDecisor] = useState('');
  const [ocupado, setOcupado] = useState(false);
  return (
    <form
      class="form-inline"
      onSubmit={async (e) => {
        e.preventDefault();
        setOcupado(true);
        const ok = await onGuardar({ canal, estado, notas: nota.trim() || null, decisor_id: decisor || null });
        setOcupado(false);
        if (ok) onCancelar();
      }}
    >
      <p class="form-ayuda">Esto registra un contacto que ya pasó. La web no manda mensajes.</p>
      <fieldset class="segmentado">
        <legend class="campo-label">Canal</legend>
        <div class="segmentado-op">
          {CANALES.map((c) => (
            <label key={c.key}>
              <input type="radio" name="canal" value={c.key} checked={canal === c.key} onChange={() => setCanal(c.key)} />
              <span>{c.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset class="segmentado">
        <legend class="campo-label">Resultado</legend>
        <div class="segmentado-op">
          {RESULTADOS.map((r) => (
            <label key={r.key}>
              <input type="radio" name="resultado" value={r.key} checked={estado === r.key} onChange={() => setEstado(r.key)} />
              <span>{r.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {decisores.length > 1 && (
        <label class="campo">
          <span class="campo-label">Con quién (opcional)</span>
          <select value={decisor} onChange={(e) => setDecisor(e.currentTarget.value)}>
            <option value="">Sin especificar</option>
            {decisores.map((d) => <option key={d.id} value={d.id}>{d.nombre}{d.cargo ? ` (${d.cargo})` : ''}</option>)}
          </select>
        </label>
      )}
      <label class="campo">
        <span class="campo-label">Nota (opcional)</span>
        <textarea rows={2} value={nota} onInput={(e) => setNota(e.currentTarget.value)} placeholder="Qué le dijimos o qué respondió" />
      </label>
      <div class="form-acciones">
        <button type="button" class="btn btn-fantasma" onClick={onCancelar}>Cancelar</button>
        <button type="submit" class="btn btn-primario" disabled={ocupado}>
          {ocupado ? 'Guardando…' : 'Registrar contacto'}
        </button>
      </div>
    </form>
  );
}

export function DetalleNegocio({ negocio: n, ctx, onCerrar }) {
  const [detalle, setDetalle] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState(null); // 'contacto' | 'nota' | null
  const puedeResp = Object.prototype.hasOwnProperty.call(n, 'responsable_email');
  const [seg, setSeg] = useState({
    proxima_accion: n.proxima_accion || '', proxima_fecha: n.proxima_fecha || '', notas: n.notas || '',
    ...(puedeResp ? { responsable_email: n.responsable_email || '' } : {}),
  });
  const [guardando, setGuardando] = useState(false);

  const cargar = () => {
    setError('');
    api.detalleNegocio(n.id).then(setDetalle).catch((e) => setError(mensajeError(e, 'cargar el historial')));
  };
  useEffect(cargar, [n.id]);

  const original = {
    proxima_accion: n.proxima_accion || '', proxima_fecha: n.proxima_fecha || '', notas: n.notas || '',
    ...(puedeResp ? { responsable_email: n.responsable_email || '' } : {}),
  };
  const cambios = Object.fromEntries(
    Object.entries(seg).filter(([k, v]) => v !== original[k]).map(([k, v]) => [k, v === '' ? null : v]),
  );
  const sucio = Object.keys(cambios).length > 0;

  async function guardarSeg(e) {
    e.preventDefault();
    if (!sucio) return;
    setGuardando(true);
    await ctx.editarNegocio(n.id, cambios);
    setGuardando(false);
  }

  async function registrarContacto(datos) {
    try {
      const fila = await api.registrarContacto({ negocio_id: n.id, ...datos });
      setDetalle((d) => ({ ...d, interacciones: [fila, ...(d?.interacciones || [])] }));
      ctx.refrescarNegocio(n.id);
      toast('Contacto registrado');
      return true;
    } catch (e) {
      toast(mensajeError(e, 'registrar el contacto'), 'error');
      return false;
    }
  }

  async function agregarNota(texto) {
    try {
      const fila = await api.agregarNota({ negocio_id: n.id, texto });
      setDetalle((d) => ({ ...d, notas: [fila, ...(d?.notas || [])] }));
      ctx.refrescarNegocio(n.id);
      toast('Nota agregada');
      setForm(null);
      return true;
    } catch (e) {
      toast(mensajeError(e, 'agregar la nota'), 'error');
      return false;
    }
  }

  async function borrarNota(id) {
    try {
      await api.borrarNota(id);
      setDetalle((d) => ({ ...d, notas: d.notas.filter((x) => x.id !== id) }));
      ctx.refrescarNegocio(n.id);
      toast('Nota borrada');
    } catch (e) {
      toast(mensajeError(e, 'borrar la nota'), 'error');
    }
  }

  const col = COLUMNA[n.columna];
  const decisores = detalle?.decisores || [];
  const demo = detalle?.demos?.[0];

  return (
    <article class="detalle">
      <header class="detalle-cabeza">
        <button class="btn-icono detalle-cerrar" onClick={onCerrar} aria-label="Cerrar detalle">
          <Icon name="volver" class="solo-mobile" size={22} />
          <Icon name="cerrar" class="solo-desktop" size={20} />
        </button>
        <div class="detalle-titulos">
          <h2 class="detalle-nombre">{n.nombre}</h2>
          <p class="detalle-sub">
            {[n.rubro, n.barrio].filter(Boolean).join(', ')}
            {n.rating_google != null && <Rating valor={n.rating_google} resenas={n.resenas_google} />}
          </p>
          <EnlacesFaro item={n} class="enlaces-detalle" />
        </div>
      </header>

      <div class="detalle-cuerpo">
        <div class="etapa-actual" style={{ '--c': col?.color }}>
          <span class="etapa-actual-txt">
            <span class="punto" aria-hidden="true" />
            <span>
              <span class="etapa-actual-label">Etapa</span>
              <strong>{col?.label || n.columna}</strong>
              {n.etapa_legado && <span class="chip chip-legado" title={`Etapa original: ${n.etapa}`}>legado</span>}
            </span>
          </span>
          <SelectEtapa valor={n.columna} etiqueta="Cambiar etapa…" onCambiar={(etapa) => ctx.moverNegocio(n.id, etapa)} />
        </div>
        {n.vencido && (
          <p class="aviso-vencido"><Icon name="alerta" size={16} /> La próxima acción venció {cuando(n.proxima_fecha)}.</p>
        )}

        <Contactos n={n} />

        <section class="detalle-sec" aria-labelledby="sec-seg">
          <h3 id="sec-seg">Próximo paso</h3>
          <form class="form-seg" onSubmit={guardarSeg}>
            <div class="form-fila">
              <label class="campo campo-crece">
                <span class="campo-label">Próxima acción</span>
                <input type="text" value={seg.proxima_accion} placeholder="Ej.: mandarle la demo por WhatsApp"
                  onInput={(e) => setSeg({ ...seg, proxima_accion: e.currentTarget.value })} />
              </label>
              <label class="campo campo-fecha">
                <span class="campo-label">Fecha</span>
                <input type="date" value={seg.proxima_fecha}
                  onInput={(e) => setSeg({ ...seg, proxima_fecha: e.currentTarget.value })} />
              </label>
            </div>
            {puedeResp ? (
              <SelectResponsable
                valor={seg.responsable_email}
                onCambiar={(email) => setSeg({ ...seg, responsable_email: emailCanónico(email) || '' })}
              />
            ) : (
              <SelectResponsable valor="" onCambiar={() => {}} disabled />
            )}
            <label class="campo">
              <span class="campo-label">Notas del negocio</span>
              <textarea rows={3} value={seg.notas} onInput={(e) => setSeg({ ...seg, notas: e.currentTarget.value })} />
            </label>
            <div class="form-acciones">
              {sucio && (
                <button type="button" class="btn btn-fantasma" onClick={() => setSeg(original)}>Descartar cambios</button>
              )}
              <button type="submit" class="btn btn-primario" disabled={!sucio || guardando}>
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
            {n.editado_web_at && (
              <p class="meta-edicion">Última edición web: {ctx.nombreDe(n.editado_por) || 'alguien'}, {fechaHora(n.editado_web_at)}</p>
            )}
          </form>
        </section>

        <section class="detalle-sec" aria-labelledby="sec-hist">
          <div class="sec-cabeza">
            <h3 id="sec-hist">Historial</h3>
            {n.interacciones_total > 0 && <span class="sec-nota">{n.interacciones_total} contactos</span>}
          </div>
          <div class="acciones-hist">
            <button class="btn btn-secundario" aria-expanded={form === 'contacto'} onClick={() => setForm(form === 'contacto' ? null : 'contacto')}>
              <Icon name="mas" size={16} /> Registrar contacto
            </button>
            <button class="btn btn-secundario" aria-expanded={form === 'nota'} onClick={() => setForm(form === 'nota' ? null : 'nota')}>
              <Icon name="nota" size={16} /> Agregar nota
            </button>
          </div>
          {form === 'contacto' && <FormContacto decisores={decisores} onGuardar={registrarContacto} onCancelar={() => setForm(null)} />}
          {form === 'nota' && <FormNota onGuardar={agregarNota} onCancelar={() => setForm(null)} />}
          {error ? (
            <div class="error-inline">
              <p>{error}</p>
              <button class="btn btn-fantasma btn-chico" onClick={cargar}>Reintentar</button>
            </div>
          ) : !detalle ? (
            <Cargando texto="Cargando historial…" />
          ) : (
            <Historial
              interacciones={detalle.interacciones}
              notas={detalle.notas}
              miEmail={ctx.yo?.email}
              nombreDe={ctx.nombreDe}
              onBorrarNota={borrarNota}
            />
          )}
        </section>

        <section class="detalle-sec" aria-labelledby="sec-datos">
          <h3 id="sec-datos">Datos</h3>
          <dl class="datos">
            <Dato label="Decisor">
              {n.decisor_nombre ? `${n.decisor_nombre}${n.decisor_cargo ? `, ${n.decisor_cargo}` : ''}` : null}
            </Dato>
            {decisores.slice(1).map((d) => (
              <Dato key={d.id} label="Otro contacto">{`${d.nombre}${d.cargo ? `, ${d.cargo}` : ''}`}</Dato>
            ))}
            <Dato label="Demo">
              {n.demo_id || demo ? (
                <span class="dato-demo">
                  {n.demo_estado || demo?.estado || 'Sin estado'}
                  {n.demo_url && (
                    <a href={linkUrl(n.demo_url)} target="_blank" rel="noopener noreferrer" class="link-ext">
                      Ver demo <Icon name="externo" size={14} />
                    </a>
                  )}
                </span>
              ) : null}
            </Dato>
            <Dato label="Web actual">{n.web_estado}</Dato>
            <Dato label="Argumento de venta">{n.argumento_venta}</Dato>
            <Dato label="Feedback de la web">{n.web_feedback}</Dato>
            <Dato label="Nicho">{n.nicho}</Dato>
            <Dato label="Dirección">{n.direccion}</Dato>
            <Dato label="Teléfono">{n.telefono}</Dato>
            <Dato label="Mail">{n.email_general}</Dato>
            <Dato label="Instagram">{n.instagram}</Dato>
            <Dato label="Último contacto">
              {n.ultima_interaccion_at ? `${fecha(n.ultima_interaccion_at)} (${haceCuanto(n.ultima_interaccion_at)})` : null}
            </Dato>
            <Dato label="En Faro desde">{n.created_at ? fecha(n.created_at) : null}</Dato>
          </dl>
        </section>
      </div>
    </article>
  );
}
