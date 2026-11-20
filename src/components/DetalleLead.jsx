import { useEffect, useState } from 'preact/hooks';
import { api } from '../api.js';
import { GRUPOS } from '../constants.js';
import { cuando, fecha, fechaHora } from '../format.js';
import { FormNota, Historial } from './Historial.jsx';
import { Cargando, Icon, mensajeError, toast } from './ui.jsx';

function Dato({ label, children }) {
  if (children === null || children === undefined || children === '') return null;
  return (
    <div class="dato">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

const valoresDe = (l) => ({
  grupo: l.grupo || '',
  proxima_accion: l.proxima_accion || '',
  proxima_fecha: l.proxima_fecha || '',
  notas_equipo: l.notas_equipo || '',
  activo: !!l.activo,
});

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

        <section class="detalle-sec" aria-labelledby="sec-lead-cele">
          <h3 id="sec-lead-cele">Lo último en cele.be</h3>
          <dl class="datos">
            <Dato label="Última acción">
              {l.ultima_accion ? `${l.ultima_accion}${l.ultima_fecha ? ` (${fecha(l.ultima_fecha)})` : ''}` : null}
            </Dato>
            <Dato label="Último comentario">{l.ultimo_comentario}</Dato>
            <Dato label="Nota del relevamiento">{l.nota_snapshot}</Dato>
            <Dato label="Etapa en cele.be">{l.etapa_crm}</Dato>
            <Dato label="Campaña">{l.campana}</Dato>
            <Dato label="Perfil">{l.perfil}</Dato>
            <Dato label="Área">{l.area}</Dato>
            <Dato label="Dato tomado">
              {l.fecha_snapshot ? `${fechaHora(l.fecha_snapshot)}${l.fuente ? `, de ${l.fuente}` : ''}` : null}
            </Dato>
          </dl>
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
