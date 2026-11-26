import { useMemo, useState } from 'preact/hooks';
import { GRUPOS } from '../constants.js';
import { cuando, fechaHoraCorta, norm, numero } from '../format.js';
import { FormularioNuevoLead } from './FormularioNuevoLead.jsx';
import { EnlacesFaro } from './EnlacesFaro.jsx';
import { BotonMas, Icon, PAGINA, Vacio } from './ui.jsx';

/** Aplica los filtros de Seguimiento. `perfil: ''` = todos. */
export function filtrarSeguimiento(lista, f) {
  const t = norm((f.texto || '').trim());
  return (lista || []).filter(
    (l) =>
      (f.verInactivos || l.activo) &&
      (!f.perfil || l.perfil === f.perfil) &&
      (!f.area || l.area === f.area) &&
      (!f.soloVencidos || l.vencido) &&
      (!t || norm(`${l.empresa} ${l.contacto} ${l.email}`).includes(t)),
  );
}

function FilaLead({ l, abrir }) {
  return (
    <li>
      <button class={`lead${l.vencido ? ' es-vencido' : ''}${l.activo ? '' : ' es-inactivo'}`} onClick={() => abrir('l', l.id)}>
        <span class="lead-cabeza">
          <span class="lead-empresa">{l.empresa}</span>
          {l.urgente && <span class="chip chip-urgente"><Icon name="urgente" size={12} />Urgente</span>}
          {!l.activo && <span class="chip">Fuera de seguimiento</span>}
        </span>
        {(l.contacto || l.pais) && (
          <span class="lead-contacto">{[l.contacto, l.pais].filter(Boolean).join(', ')}</span>
        )}
        <span class="lead-prox">
          {l.proxima_fecha && (
            <span class={`lead-fecha${l.vencido ? ' es-vencido' : ''}`}>
              {l.vencido && <Icon name="alerta" size={13} />}
              {l.vencido ? `Vencido ${cuando(l.proxima_fecha)}` : cuando(l.proxima_fecha)}
            </span>
          )}
          <span class="lead-accion">{l.proxima_accion || 'Sin próxima acción'}</span>
        </span>
        {l.ultima_accion && (
          <span class="lead-ultima">
            Última: {l.ultima_accion}
            {l.dias_sin_movimiento != null && <> ({l.dias_sin_movimiento <= 0 ? 'hoy' : l.dias_sin_movimiento === 1 ? 'ayer' : `hace ${l.dias_sin_movimiento} días`})</>}
          </span>
        )}
        <EnlacesFaro item={l} class="enlaces-en-lead" />
      </button>
    </li>
  );
}

export function Seguimiento({ ctx }) {
  const { seguimiento, filtrosSeg: f, setFiltrosSeg, abrir } = ctx;
  const set = (k, v) => setFiltrosSeg((prev) => ({ ...prev, [k]: v }));
  const [visibles, setVisibles] = useState({});
  const [alta, setAlta] = useState(false);

  const perfiles = useMemo(
    () => [...new Set(seguimiento.map((l) => l.perfil).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')),
    [seguimiento],
  );
  const areas = useMemo(
    () => [...new Set(seguimiento.map((l) => l.area).filter(Boolean))].sort(),
    [seguimiento],
  );
  const lista = useMemo(() => filtrarSeguimiento(seguimiento, f), [seguimiento, f]);
  const snapshot = useMemo(
    () => seguimiento.reduce((m, l) => (l.fecha_snapshot && l.fecha_snapshot > m ? l.fecha_snapshot : m), ''),
    [seguimiento],
  );

  const grupos = useMemo(() => {
    const orden = [...GRUPOS.map((g) => g.key), '(sin grupo)'];
    const m = new Map(orden.map((k) => [k, []]));
    for (const l of lista) {
      const k = m.has(l.grupo) ? l.grupo : '(sin grupo)';
      m.get(k).push(l);
    }
    return [...m.entries()].filter(([, v]) => v.length);
  }, [lista]);

  const vencidos = lista.filter((l) => l.vencido).length;

  return (
    <div class="seguimiento">
      <div class="barra barra-seg">
        <div class="barra-titulos">
          <div class="barra-titulo-fila">
            <h1 class="barra-titulo">Seguimiento</h1>
            <button type="button" class="btn btn-primario btn-chico" onClick={() => setAlta(true)}>
              <Icon name="mas" size={16} />
              Nuevo lead
            </button>
          </div>
          <p class="barra-nota barra-nota-seccion">
            Leads de Provaider y LevelUp. Las páginas web tienen su propia sección:{' '}
            <a href="#/webs" onClick={(e) => { e.preventDefault(); ctx.ir('webs'); }}>Páginas web</a>.
          </p>
          {snapshot && <p class="barra-nota">Datos de cele.be al {fechaHoraCorta(snapshot)}</p>}
        </div>
        <label class="buscador">
          <Icon name="buscar" size={16} />
          <span class="sr-only">Buscar lead</span>
          <input type="search" placeholder="Buscar empresa o contacto" value={f.texto}
            onInput={(e) => set('texto', e.currentTarget.value)} />
        </label>
        <div class="filtros">
          <label class="filtro">
            <span class="sr-only">Perfil</span>
            <select value={f.perfil} onChange={(e) => set('perfil', e.currentTarget.value)}>
              <option value="">Todos los perfiles</option>
              {perfiles.map((p) => <option key={p} value={p}>{p}</option>)}
              {f.perfil && !perfiles.includes(f.perfil) && <option value={f.perfil}>{f.perfil}</option>}
            </select>
          </label>
          <label class="filtro">
            <span class="sr-only">Área</span>
            <select value={f.area} onChange={(e) => set('area', e.currentTarget.value)}>
              <option value="">Todas las áreas</option>
              {areas.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          <label class="check">
            <input type="checkbox" checked={f.soloVencidos} onChange={(e) => set('soloVencidos', e.currentTarget.checked)} />
            <span>Solo vencidos</span>
          </label>
          <label class="check">
            <input type="checkbox" checked={f.verInactivos} onChange={(e) => set('verInactivos', e.currentTarget.checked)} />
            <span>Ver fuera de seguimiento</span>
          </label>
        </div>
        <p class="barra-cuenta">
          {numero(lista.length)} leads{vencidos > 0 && <>, <span class="num-vencidos">{vencidos} vencidos</span></>}
        </p>
      </div>

      {lista.length === 0 ? (
        <Vacio titulo={seguimiento.length ? 'Ningún lead coincide con los filtros.' : 'Todavía no hay leads cargados.'}>
          {seguimiento.length ? 'Probá con otro perfil o sacá "Solo vencidos".' : 'Seguimientin los trae desde cele.be.'}
        </Vacio>
      ) : (
        <div class="grupos-lista">
          {grupos.map(([g, items]) => {
            const orden = GRUPOS.find((x) => x.key === g)?.orden ?? 5;
            const n = visibles[g] || PAGINA;
            const contenido = (
              <>
                <ul class="leads">
                  {items.slice(0, n).map((l) => <FilaLead key={l.id} l={l} abrir={abrir} />)}
                </ul>
                <BotonMas
                  vistos={n}
                  total={items.length}
                  onMas={() => setVisibles((v) => ({ ...v, [g]: n + PAGINA }))}
                />
              </>
            );
            const cabeza = (
              <>
                <span class={`grupo-marca grupo-${orden}`} aria-hidden="true" />
                <span class="grupo-nombre">{g}</span>
                <span class="grupo-cuenta">{items.length}</span>
              </>
            );
            return g === 'Excluido' ? (
              <details key={g} class="grupo-sec">
                <summary class="grupo-cabeza">{cabeza}</summary>
                {contenido}
              </details>
            ) : (
              <section key={g} class="grupo-sec" aria-label={g}>
                <h2 class="grupo-cabeza">{cabeza}</h2>
                {contenido}
              </section>
            );
          })}
        </div>
      )}
      <FormularioNuevoLead
        tipo="seguimiento"
        abierto={alta}
        onCerrar={() => setAlta(false)}
        onGuardar={ctx.crearLead}
        ctx={ctx}
      />
    </div>
  );
}
