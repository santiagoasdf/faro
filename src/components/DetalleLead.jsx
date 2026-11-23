import { useEffect, useState } from 'preact/hooks';
import { api } from '../api.js';
import { GRUPOS } from '../constants.js';
import { emailCanónico } from '../calendario.js';
import { relatoCelebe } from '../calendario.js';
import { cuando, fechaHora } from '../format.js';
import { EnlacesFaro } from './EnlacesFaro.jsx';
import { FormNota, Historial } from './Historial.jsx';
import { SelectResponsable } from './Responsable.jsx';
import { Cargando, Icon, mensajeError, toast } from './ui.jsx';

function RelatoCele({ lead: l }) {
  const r = relatoCelebe(l);
  if (r.vacio) {
    return <p class="relato-vacio">Todavía no hay un relevamiento de cele.be para este lead.</p>;
  }
  return (
    <div class={`relato${r.vencido ? ' es-vencido' : ''}`}>
      {r.pasaron.length > 0 && (
        <div class="relato-bloque">
          <h4>Qué pasó</h4>
          {r.pasaron.map((p) => <p key={p}>{p}</p>)}
        </div>
      )}
      <div class="relato-bloque">
        <h4>Qué falta / qué agendar</h4>
        <p class={r.vencido ? 'relato-agendar es-vencido' : 'relato-agendar'}>
          {r.vencido && <Icon name="alerta" size={16} />}
          {r.agendar}
        </p>
      </div>
      {r.contexto.length > 0 && <p class="relato-meta">{r.contexto.join(' · ')}</p>}
      {r.tomado && <p class="relato-meta">{r.tomado}</p>}
    </div>
  );
}

const valoresDe = (l) => {
  const v = {
    grupo: l.grupo || '',
    proxima_accion: l.proxima_accion || '',
    proxima_fecha: l.proxima_fecha || '',
    notas_equipo: l.notas_equipo || '',
    activo: !!l.activo,
  };
  if (Object.prototype.hasOwnProperty.call(l, 'responsable_email')) {
    v.responsable_email = l.responsable_email || '';
  }
  return v;
};

const puedeResponsable = (row) => Object.prototype.hasOwnProperty.call(row, 'responsable_email');

export function DetalleLead({ lead: l, ctx, onCerrar }) {
  const [v, setV] = useState(() => valoresDe(l));
  const [guardando, setGuardando] = useState(false);
  const [notas, setNotas] = useState(null);
  const [error, setError] = useState('');
  const [formNota, setFormNota] = useState(false);

  const cargar = () => {
    setError('');
    api.notasLead(l.id).then(setNotas).catch((e) => setError(mensajeError(e, 'cargar las notas')));
  };
  useEffect(cargar, [l.id]);

  const original = valoresDe(l);
  const cambios = Object.fromEntries(
    Object.entries(v).filter(([k, x]) => x !== original[k]).map(([k, x]) => [k, x === '' ? null : x]),
  );
  const sucio = Object.keys(cambios).length > 0;

  async function guardar(e) {
    e.preventDefault();
    if (!sucio) return;
    setGuardando(true);
    await ctx.editarLead(l.id, cambios);
    setGuardando(false);
  }

  async function agregarNota(texto) {
    try {
      const fila = await api.agregarNota({ seguimiento_id: l.id, texto });
      setNotas((n) => [fila, ...(n || [])]);
      toast('Nota agregada');
      setFormNota(false);
      return true;
    } catch (e) {
      toast(mensajeError(e, 'agregar la nota'), 'error');
      return false;
    }
  }

  async function borrarNota(id) {
    try {
      await api.borrarNota(id);
      setNotas((n) => n.filter((x) => x.id !== id));
      toast('Nota borrada');
    } catch (e) {
      toast(mensajeError(e, 'borrar la nota'), 'error');
    }
  }

  return (
    <article class="detalle">
      <header class="detalle-cabeza">
        <button class="btn-icono detalle-cerrar" onClick={onCerrar} aria-label="Cerrar detalle">
          <Icon name="volver" class="solo-mobile" size={22} />
          <Icon name="cerrar" class="solo-desktop" size={20} />
        </button>
        <div class="detalle-titulos">
          <h2 class="detalle-nombre">
            {l.empresa}
            {l.urgente && <span class="chip chip-urgente"><Icon name="urgente" size={12} />Urgente</span>}
          </h2>
          <p class="detalle-sub">{[l.contacto, l.pais].filter(Boolean).join(', ')}</p>
          <EnlacesFaro item={l} class="enlaces-detalle" />
        </div>
      </header>

      <div class="detalle-cuerpo">
        {l.vencido && (
          <p class="aviso-vencido"><Icon name="alerta" size={16} /> La próxima acción venció {cuando(l.proxima_fecha)}.</p>
        )}
        {l.email && (
          <ul class="contactos">
            <li>
              <a class="contacto" href={`mailto:${l.email}`}><Icon name="email" size={16} />{l.email}</a>
            </li>
          </ul>
        )}

        <section class="detalle-sec" aria-labelledby="sec-lead-seg">
          <h3 id="sec-lead-seg">Seguimiento</h3>
          <form class="form-seg" onSubmit={guardar}>
            <fieldset class="segmentado">
              <legend class="campo-label">Grupo</legend>
              <div class="segmentado-op">
                {GRUPOS.map((g) => (
                  <label key={g.key}>
                    <input type="radio" name="grupo" value={g.key} checked={v.grupo === g.key}
                      onChange={() => setV({ ...v, grupo: g.key })} />
                    <span>{g.key}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div class="form-fila">
              <label class="campo campo-crece">
                <span class="campo-label">Próxima acción</span>
                <input type="text" value={v.proxima_accion} placeholder="Ej.: llamarlo para cerrar reunión"
                  onInput={(e) => setV({ ...v, proxima_accion: e.currentTarget.value })} />
              </label>
              <label class="campo campo-fecha">
                <span class="campo-label">Fecha</span>
                <input type="date" value={v.proxima_fecha}
                  onInput={(e) => setV({ ...v, proxima_fecha: e.currentTarget.value })} />
              </label>
            </div>
            {puedeResponsable(l) ? (
              <SelectResponsable
                valor={v.responsable_email}
                onCambiar={(email) => setV({ ...v, responsable_email: emailCanónico(email) || '' })}
              />
            ) : (
              <SelectResponsable valor="" onCambiar={() => {}} disabled />
            )}
            <label class="campo">
              <span class="campo-label">Notas del equipo</span>
              <textarea rows={3} value={v.notas_equipo}
                onInput={(e) => setV({ ...v, notas_equipo: e.currentTarget.value })} />
            </label>
            <label class="check">
              <input type="checkbox" checked={v.activo} onChange={(e) => setV({ ...v, activo: e.currentTarget.checked })} />
              <span>En seguimiento</span>
            </label>
            <p class="form-ayuda">
              Seguimientin trae estos leads desde cele.be. Lo que cambies acá se respeta hasta que llegue un dato más
              nuevo de cele.be. Las notas del equipo no se pisan nunca.
            </p>
            <div class="form-acciones">
              {sucio && <button type="button" class="btn btn-fantasma" onClick={() => setV(original)}>Descartar cambios</button>}
              <button type="submit" class="btn btn-primario" disabled={!sucio || guardando}>
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
            {l.editado_web_at && (
              <p class="meta-edicion">Última edición web: {ctx.nombreDe(l.editado_por) || 'alguien'}, {fechaHora(l.editado_web_at)}</p>
            )}
          </form>
        </section>

        <section class="detalle-sec relato-cele" aria-labelledby="sec-lead-cele">
          <h3 id="sec-lead-cele">Lo último en cele.be</h3>
          <RelatoCele lead={l} />
        </section>

        <section class="detalle-sec" aria-labelledby="sec-lead-notas">
          <div class="sec-cabeza">
            <h3 id="sec-lead-notas">Notas</h3>
          </div>
          <div class="acciones-hist">
            <button class="btn btn-secundario" aria-expanded={formNota} onClick={() => setFormNota(!formNota)}>
              <Icon name="nota" size={16} /> Agregar nota
            </button>
          </div>
          {formNota && <FormNota onGuardar={agregarNota} onCancelar={() => setFormNota(false)} />}
          {error ? (
            <div class="error-inline">
              <p>{error}</p>
              <button class="btn btn-fantasma btn-chico" onClick={cargar}>Reintentar</button>
            </div>
          ) : !notas ? (
            <Cargando texto="Cargando notas…" />
          ) : (
            <Historial notas={notas} vacio="Todavía no hay notas sobre este lead." miEmail={ctx.yo?.email} nombreDe={ctx.nombreDe} onBorrarNota={borrarNota} />
          )}
        </section>
      </div>
    </article>
  );
}
