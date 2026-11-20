import { useState } from 'preact/hooks';
import { CANAL_LABEL, ESTADO_INTERACCION } from '../constants.js';
import { fechaHora, haceCuanto } from '../format.js';
import { Icon } from './ui.jsx';

/** Historial combinado (interacciones + notas), por fecha descendente. */
export function Historial({
  interacciones = [], notas = [], miEmail, nombreDe, onBorrarNota,
  vacio = 'Todavía no hay contactos ni notas. Registrá el primero con los botones de arriba.',
}) {
  const [confirmar, setConfirmar] = useState(null);
  const items = [
    ...interacciones.map((i) => ({ ...i, _tipo: 'contacto', _at: i.fecha })),
    ...notas.map((n) => ({ ...n, _tipo: 'nota', _at: n.created_at })),
  ].sort((a, b) => (b._at || '').localeCompare(a._at || ''));

  if (items.length === 0) {
    return <p class="historial-vacio">{vacio}</p>;
  }

  return (
    <ol class="historial">
      {items.map((it) => {
        const autor = nombreDe(it.autor_email);
        const esNota = it._tipo === 'nota';
        return (
          <li key={it._tipo + it.id} class={`hito hito-${esNota ? 'nota' : it.estado || 'contacto'}`}>
            <span class="hito-icono" aria-hidden="true">
              <Icon name={esNota ? 'nota' : it.canal in CANAL_LABEL ? it.canal : 'llamada'} size={15} />
            </span>
            <div class="hito-cuerpo">
              <p class="hito-titulo">
                {esNota ? 'Nota' : `${CANAL_LABEL[it.canal] || it.canal}: ${ESTADO_INTERACCION[it.estado] || it.estado || 'registrado'}`}
              </p>
              {!esNota && it.mensaje && <p class="hito-texto hito-mensaje">{it.mensaje}</p>}
              {(esNota ? it.texto : it.notas) && <p class="hito-texto">{esNota ? it.texto : it.notas}</p>}
              <p class="hito-meta">
                <time dateTime={it._at} title={fechaHora(it._at)}>{fechaHora(it._at)}</time>
                <span>{haceCuanto(it._at)}</span>
                {autor && <span>por {autor}</span>}
              </p>
            </div>
            {esNota && onBorrarNota && it.autor_email && it.autor_email === miEmail && (
              confirmar === it.id ? (
                <span class="hito-confirmar">
                  <button class="btn btn-peligro btn-chico" onClick={() => { setConfirmar(null); onBorrarNota(it.id); }}>
                    Borrar
                  </button>
                  <button class="btn btn-fantasma btn-chico" onClick={() => setConfirmar(null)}>Cancelar</button>
                </span>
              ) : (
                <button class="btn-icono hito-borrar" aria-label="Borrar nota" title="Borrar nota" onClick={() => setConfirmar(it.id)}>
                  <Icon name="borrar" size={16} />
                </button>
              )
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Formulario corto para agregar una nota. */
export function FormNota({ onGuardar, onCancelar }) {
  const [texto, setTexto] = useState('');
  const [ocupado, setOcupado] = useState(false);
  return (
    <form
      class="form-inline"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!texto.trim()) return;
        setOcupado(true);
        const ok = await onGuardar(texto.trim());
        setOcupado(false);
        if (ok) setTexto('');
      }}
    >
      <label class="campo">
        <span class="campo-label">Nota</span>
        <textarea rows={3} value={texto} onInput={(e) => setTexto(e.currentTarget.value)}
          placeholder="Qué pasó, qué quedó pendiente…" autoFocus />
      </label>
      <div class="form-acciones">
        <button type="button" class="btn btn-fantasma" onClick={onCancelar}>Cancelar</button>
        <button type="submit" class="btn btn-primario" disabled={ocupado || !texto.trim()}>
          {ocupado ? 'Guardando…' : 'Agregar nota'}
        </button>
      </div>
    </form>
  );
}
